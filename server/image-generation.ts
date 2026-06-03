type ImageBackend = 'huggingface' | 'openai' | 'modelscope';
type ImageAction = 'txt2img' | 'img2img';

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

  return await handleOpenAiCompatible(env, body, prompt, charId, roomId);
}
