type ImageBackend = 'huggingface' | 'openai' | 'modelscope';
type ImageAction = 'txt2img' | 'img2img';

const DASHSCOPE_SYNC_PATH = '/api/v1/services/aigc/multimodal-generation/generation';
const DASHSCOPE_ASYNC_PATH = '/api/v1/services/aigc/text2image/image-synthesis';
const DASHSCOPE_TASKS_PATH = '/api/v1/tasks';
const ASYNC_QWEN_IMAGE_MODELS = new Set(['qwen-image', 'qwen-image-plus']);

export interface ImageProxyBody {
  backend: ImageBackend;
  action?: ImageAction;
  model: string;
  apiKey?: string;
  apiBase?: string;
  payload?: Record<string, unknown>;
  char_id?: number;
  room_id?: number;
  prompt?: string;
}

interface ImageGenerationEnv {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
}

const PROMPT_NODE_ID = '70';

const getComfyUIWorkflow = (promptText: string) => {
  const workflow: any = {
    '9': {
      inputs: { filename_prefix: 'z-image-turbo', images: ['65', 0] },
      class_type: 'SaveImage',
    },
    '62': {
      inputs: { clip_name: 'qwen_3_4b.safetensors', type: 'lumina2', device: 'default' },
      class_type: 'CLIPLoader',
    },
    '63': {
      inputs: { vae_name: 'ae.safetensors' },
      class_type: 'VAELoader',
    },
    '64': {
      inputs: { conditioning: ['70', 0] },
      class_type: 'ConditioningZeroOut',
    },
    '65': {
      inputs: { samples: ['69', 0], vae: ['63', 0] },
      class_type: 'VAEDecode',
    },
    '66': {
      inputs: { unet_name: 'z_image_turbo_bf16.safetensors', weight_dtype: 'default' },
      class_type: 'UNETLoader',
    },
    '67': {
      inputs: { width: 1024, height: 1024, batch_size: 1 },
      class_type: 'EmptySD3LatentImage',
    },
    '68': {
      inputs: { shift: 3, model: ['66', 0] },
      class_type: 'ModelSamplingAuraFlow',
    },
    '69': {
      inputs: {
        seed: Math.floor(Math.random() * 1000000000000),
        steps: 8,
        cfg: 1,
        sampler_name: 'res_multistep',
        scheduler: 'simple',
        denoise: 1,
        model: ['68', 0],
        positive: ['70', 0],
        negative: ['64', 0],
        latent_image: ['67', 0],
      },
      class_type: 'KSampler',
    },
    [PROMPT_NODE_ID]: {
      inputs: { text: promptText, clip: ['62', 0] },
      class_type: 'CLIPTextEncode',
    },
  };

  return workflow;
};

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function isDashScopeHost(input?: string): boolean {
  if (!input) return false;
  try {
    const url = new URL(input);
    return /(^|\.)dashscope(?:-intl|-us)?\.aliyuncs\.com$/i.test(url.hostname) || /(^|\.)maas\.aliyuncs\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function isBailianQwenImage(apiBase?: string, model?: string): boolean {
  const normalizedModel = (model || '').trim().toLowerCase();
  return normalizedModel.startsWith('qwen-image') || isDashScopeHost(apiBase);
}

function supportsDashScopeAsync(model: string): boolean {
  const normalizedModel = model.trim().toLowerCase();
  return ASYNC_QWEN_IMAGE_MODELS.has(normalizedModel);
}

function buildDashScopeEndpoint(input: string | undefined, path: string): string {
  const fallbackOrigin = 'https://dashscope.aliyuncs.com';
  if (!input) return `${fallbackOrigin}${path}`;

  try {
    const url = new URL(input);
    const pathname = url.pathname.replace(/\/+$/, '');
    if (
      pathname.endsWith('/multimodal-generation/generation') ||
      pathname.endsWith('/text2image/image-synthesis') ||
      pathname.startsWith('/compatible-mode/') ||
      pathname === '/api/v1' ||
      pathname === '/api/v1/' ||
      pathname === ''
    ) {
      return `${url.origin}${path}`;
    }
    if (pathname.startsWith('/api/v1/services/aigc/')) {
      return `${url.origin}${path}`;
    }
    return `${url.origin}${path}`;
  } catch {
    return `${fallbackOrigin}${path}`;
  }
}

function buildDashScopeTasksEndpoint(input: string | undefined, taskId: string): string {
  const base = buildDashScopeEndpoint(input, DASHSCOPE_TASKS_PATH);
  return `${base}/${encodeURIComponent(taskId)}`;
}

function normalizeDashScopeSize(input: unknown, model: string): string {
  const normalizedModel = model.trim().toLowerCase();
  const defaultSize = normalizedModel.startsWith('qwen-image-2.0') ? '2048*2048' : '1664*928';
  if (typeof input !== 'string') return defaultSize;
  const trimmed = input.trim();
  if (!trimmed) return defaultSize;
  return trimmed.replace(/x/gi, '*');
}

function getBailianImagesFromResponse(data: any): any[] {
  const syncContent = data?.output?.choices?.flatMap((choice: any) => choice?.message?.content || []) || [];
  if (syncContent.length > 0) return syncContent;
  if (Array.isArray(data?.output?.results)) return data.output.results;
  if (Array.isArray(data?.output?.images)) return data.output.images;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.images)) return data.images;
  if (data?.output?.url) return [{ url: data.output.url }];
  if (data?.url) return [{ url: data.url }];
  return [];
}

async function parseJsonOrText(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function generateImageKey(charId?: number, roomId?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const prefix = roomId ? `rooms/${roomId}` : charId ? `chars/${charId}` : 'misc';
  return `${prefix}/${timestamp}-${random}.png`;
}

async function uploadToR2(bucket: R2Bucket, imageBuffer: ArrayBuffer, key: string): Promise<string> {
  await bucket.put(key, imageBuffer, {
    httpMetadata: {
      contentType: 'image/png',
    },
  });
  return key;
}

async function saveImageRecord(db: D1Database, r2Key: string, charId?: number, roomId?: number, prompt?: string) {
  const { meta } = await db
    .prepare('INSERT INTO images (r2_key, char_id, room_id, prompt, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(r2Key, charId || null, roomId || null, prompt || null, Date.now())
    .run();
  return meta.last_row_id;
}

async function processImageResults(
  env: ImageGenerationEnv,
  images: any[],
  charId?: number,
  roomId?: number,
  prompt?: string,
) {
  const urls: string[] = [];
  const keys: string[] = [];
  const imageIds: number[] = [];

  for (const item of images) {
    const imageSource =
      (typeof item === 'string' ? item : null) ||
      item?.b64_json ||
      item?.image ||
      item?.url ||
      item?.result_url ||
      item?.image_url ||
      null;
    if (!imageSource) continue;

    let imageBuffer: ArrayBuffer;
    if (typeof imageSource === 'string' && imageSource.startsWith('http')) {
      const imageResponse = await fetch(imageSource);
      if (!imageResponse.ok) continue;
      imageBuffer = await imageResponse.arrayBuffer();
    } else {
      const normalizedBase64 =
        typeof imageSource === 'string' && imageSource.startsWith('data:')
          ? imageSource.slice(imageSource.indexOf(',') + 1)
          : imageSource;
      const binaryString = atob(normalizedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let index = 0; index < binaryString.length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
      }
      imageBuffer = bytes.buffer;
    }

    const imageKey = generateImageKey(charId, roomId);
    await uploadToR2(env.IMAGES_BUCKET, imageBuffer, imageKey);
    const imageId = await saveImageRecord(env.DB, imageKey, charId, roomId, prompt);
    const imageUrl = `/api/images?key=${encodeURIComponent(imageKey)}`;
    urls.push(imageUrl);
    keys.push(imageKey);
    imageIds.push(imageId);
  }

  return {
    images: [],
    urls,
    keys,
    image_ids: imageIds,
  };
}

async function handleModelScope(env: ImageGenerationEnv, body: ImageProxyBody, prompt: string, charId?: number, roomId?: number) {
  const apiBase = normalizeBase(body.apiBase || 'https://api-inference.modelscope.cn/v1');
  const model = body.model || 'Tongyi-MAI/Z-Image-Turbo';
  const apiKey = body.apiKey;

  if (!apiKey) {
    throw new Error('请配置魔搭社区接口密钥');
  }

  const payload = {
    model,
    prompt,
    size: body.payload?.size || '1024x1024',
    n: body.payload?.n || 1,
    response_format: 'b64_json',
    ...body.payload,
  };

  const res = await fetch(`${apiBase}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-ModelScope-Async-Mode': 'true',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data: any = await res.json();

  if (data.task_id || data.task_status) {
    const taskId = data.task_id;
    const taskStatusUrl = `${apiBase}/tasks/${taskId}`;

    for (let index = 0; index < 120; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusRes = await fetch(taskStatusUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-ModelScope-Async-Mode': 'true',
          'X-ModelScope-Task-Type': 'image_generation',
        },
      });

      if (!statusRes.ok) continue;

      const statusData: any = await statusRes.json();
      if (statusData.task_status === 'SUCCEED' || statusData.task_status === 'SUCCEEDED' || statusData.status === 'succeeded') {
        const images = statusData.output_images || statusData.output?.images || statusData.data || [];
        if (images && images.length > 0) {
          return await processImageResults(env, images, charId, roomId, prompt);
        }
      }

      if (statusData.task_status === 'FAILED' || statusData.status === 'failed') {
        throw new Error(statusData.message || '生成失败');
      }
    }

    throw new Error('生成超时');
  }

  if (data.data || data.images) {
    const images = data.data || data.images || [];
    return await processImageResults(env, images, charId, roomId, prompt);
  }

  throw new Error('未知响应格式');
}

async function handleComfyUi(env: ImageGenerationEnv, body: ImageProxyBody, prompt: string, charId?: number, roomId?: number) {
  const comfyUrl = normalizeBase(body.apiKey || '');
  if (!comfyUrl || !comfyUrl.startsWith('http')) {
    throw new Error('请在系统设置的 HF Access Token 框填入完整的 ComfyUI 穿透 URL');
  }

  const workflow = getComfyUIWorkflow(prompt);
  const promptRes = await fetch(`${comfyUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!promptRes.ok) throw new Error(`ComfyUI 拒绝请求: ${promptRes.status}`);

  const { prompt_id } = (await promptRes.json()) as any;
  if (!prompt_id) throw new Error('未获取到任务 ID');

  let historyData: any = null;
  for (let index = 0; index < 125; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const historyResponse = await fetch(`${comfyUrl}/history/${prompt_id}`);
    if (!historyResponse.ok) continue;
    const historyJson: any = await historyResponse.json();
    if (historyJson[prompt_id]) {
      historyData = historyJson[prompt_id];
      break;
    }
  }

  if (!historyData) throw new Error('生成超时（显卡可能正在忙）');

  const outputs = historyData.outputs['9'];
  if (!outputs || !outputs.images || outputs.images.length === 0) {
    throw new Error('工作流跑完了，但节点 9 没有保存图像');
  }

  const { filename, subfolder, type } = outputs.images[0];
  const viewUrl = `${comfyUrl}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
  const imageResponse = await fetch(viewUrl);
  if (!imageResponse.ok) throw new Error('无法从 ComfyUI 下载生成的图片');

  const imageBuffer = await imageResponse.arrayBuffer();
  const imageKey = generateImageKey(charId, roomId);
  await uploadToR2(env.IMAGES_BUCKET, imageBuffer, imageKey);
  const imageId = await saveImageRecord(env.DB, imageKey, charId, roomId, prompt);
  const imageUrl = `/api/images?key=${encodeURIComponent(imageKey)}`;

  return {
    images: [],
    urls: [imageUrl],
    keys: [imageKey],
    image_ids: [imageId],
  };
}

async function handleOpenAiCompatible(
  env: ImageGenerationEnv,
  body: ImageProxyBody,
  prompt: string,
  charId?: number,
  roomId?: number,
) {
  if (!body.apiBase) throw new Error('Missing apiBase');

  const res = await fetch(`${normalizeBase(body.apiBase)}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.apiKey}` },
    body: JSON.stringify({ ...body.payload, model: body.model, prompt, response_format: 'b64_json' }),
  });

  if (!res.ok) throw new Error(await res.text());
  const data: any = await res.json();
  const images = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.images)
      ? data.images
      : data?.data || data?.images || data?.url
        ? [data?.data || data?.images || data]
        : [];
  return await processImageResults(env, images, charId, roomId, prompt);
}

async function handleBailian(
  env: ImageGenerationEnv,
  body: ImageProxyBody,
  prompt: string,
  charId?: number,
  roomId?: number,
) {
  const apiKey = body.apiKey;
  if (!apiKey) throw new Error('请配置阿里云百练 API Key');

  const payload = (body.payload || {}) as Record<string, unknown>;
  const model = body.model;
  const wantsAsync =
    payload.use_async === true ||
    payload.dashscope_async === true ||
    normalizeBase(body.apiBase || '').includes('/text2image/image-synthesis');

  const negativePrompt = typeof payload.negative_prompt === 'string' ? payload.negative_prompt : undefined;
  const size = normalizeDashScopeSize(payload.size, model);
  const promptExtend = typeof payload.prompt_extend === 'boolean' ? payload.prompt_extend : true;
  const watermark = typeof payload.watermark === 'boolean' ? payload.watermark : false;
  const seed = Number.isFinite(payload.seed as number) ? Number(payload.seed) : undefined;
  const requestedCount = Number.isFinite(payload.n as number) ? Number(payload.n) : 1;
  const imageCount = model.trim().toLowerCase().startsWith('qwen-image-2.0')
    ? Math.min(Math.max(requestedCount, 1), 6)
    : 1;

  const parameters: Record<string, unknown> = {
    size,
    n: imageCount,
    prompt_extend: promptExtend,
    watermark,
  };
  if (negativePrompt) parameters.negative_prompt = negativePrompt;
  if (seed !== undefined) parameters.seed = seed;

  if (wantsAsync && supportsDashScopeAsync(model)) {
    const endpoint = buildDashScopeEndpoint(body.apiBase, DASHSCOPE_ASYNC_PATH);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model,
        input: {
          prompt,
        },
        parameters,
      }),
    });

    const data = await parseJsonOrText(res);
    if (!res.ok) {
      throw new Error(typeof data === 'string' ? data : data?.message || data?.error || '阿里云百练生图请求失败');
    }

    const taskId = data?.output?.task_id || data?.task_id;
    if (!taskId) {
      const images = getBailianImagesFromResponse(data);
      if (images.length > 0) return await processImageResults(env, images, charId, roomId, prompt);
      throw new Error('阿里云百练异步生图未返回 task_id');
    }

    const taskEndpoint = buildDashScopeTasksEndpoint(body.apiBase, taskId);
    for (let index = 0; index < 90; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, index < 6 ? 2000 : 4000));
      const taskRes = await fetch(taskEndpoint, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const taskData = await parseJsonOrText(taskRes);
      if (!taskRes.ok) {
        if (index === 89) {
          throw new Error(typeof taskData === 'string' ? taskData : taskData?.message || '阿里云百练任务查询失败');
        }
        continue;
      }

      const taskStatus = taskData?.output?.task_status || taskData?.task_status;
      if (taskStatus === 'SUCCEEDED') {
        const images = getBailianImagesFromResponse(taskData);
        if (images.length > 0) return await processImageResults(env, images, charId, roomId, prompt);
        throw new Error('阿里云百练任务已完成，但未返回图片结果');
      }
      if (taskStatus === 'FAILED' || taskStatus === 'CANCELED' || taskStatus === 'UNKNOWN') {
        throw new Error(taskData?.output?.message || taskData?.message || `阿里云百练任务状态异常：${taskStatus}`);
      }
    }

    throw new Error('阿里云百练异步生图等待超时');
  }

  const endpoint = buildDashScopeEndpoint(body.apiBase, DASHSCOPE_SYNC_PATH);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
      },
      parameters,
    }),
  });

  const data = await parseJsonOrText(res);
  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : data?.message || data?.error || '阿里云百练生图请求失败');
  }

  const images = getBailianImagesFromResponse(data);
  if (images.length > 0) {
    return await processImageResults(env, images, charId, roomId, prompt);
  }

  throw new Error('阿里云百练返回成功，但未解析到图片结果');
}

export async function runImageGeneration(env: ImageGenerationEnv, body: ImageProxyBody) {
  const backend: ImageBackend = body.backend || 'openai';
  const rawPrompt = body.payload?.prompt || body.prompt || '';
  const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
  if (!prompt) throw new Error('Missing prompt');

  const charId = body.char_id;
  const roomId = body.room_id;

  if (backend === 'modelscope') {
    return await handleModelScope(env, body, prompt, charId, roomId);
  }

  if (backend === 'huggingface') {
    return await handleComfyUi(env, body, prompt, charId, roomId);
  }

  if (backend === 'openai' && isBailianQwenImage(body.apiBase, body.model)) {
    return await handleBailian(env, body, prompt, charId, roomId);
  }

  return await handleOpenAiCompatible(env, body, prompt, charId, roomId);
}
