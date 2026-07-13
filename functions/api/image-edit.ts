type ImageBackend = 'huggingface' | 'openai' | 'modelscope';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
}

type ImageEditBody = {
  backend: ImageBackend;
  model: string;
  apiKey?: string;
  apiBase?: string;
  prompt: string;
  image: string;
  strength?: number;
  char_id?: number;
  room_id?: number;
};

const DASH_SCOPE_PATH = '/api/v1/services/aigc/multimodal-generation/generation';

function normalizeBase(value: string | undefined): string {
  return (value || '').trim().replace(/\/+$/, '');
}

function isDashScopeHost(value?: string): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname;
    return /(^|\.)dashscope(?:-intl|-us)?\.aliyuncs\.com$/i.test(host) || /(^|\.)maas\.aliyuncs\.com$/i.test(host);
  } catch {
    return false;
  }
}

function isDashScopeModel(apiBase?: string, model?: string): boolean {
  const normalizedModel = (model || '').toLowerCase();
  return normalizedModel.startsWith('qwen-image') || isDashScopeHost(apiBase);
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error('原图格式无效，请重新上传。');

  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { bytes, mimeType: match[1] || 'image/png' };
}

function generateImageKey(charId?: number, roomId?: number): string {
  const prefix = roomId ? `rooms/${roomId}` : charId ? `chars/${charId}` : 'misc';
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
}

async function persistImage(env: Env, imageBuffer: ArrayBuffer, body: ImageEditBody) {
  const key = generateImageKey(body.char_id, body.room_id);
  await env.IMAGES_BUCKET.put(key, imageBuffer, {
    httpMetadata: { contentType: 'image/png' },
  });

  const result = await env.DB.prepare(
    'INSERT INTO images (r2_key, char_id, room_id, prompt, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(key, body.char_id || null, body.room_id || null, body.prompt, Date.now())
    .run();

  return {
    urls: [`/api/images?key=${encodeURIComponent(key)}`],
    keys: [key],
    image_ids: [result.meta.last_row_id],
  };
}

async function fetchImageResult(source: unknown): Promise<ArrayBuffer> {
  if (typeof source !== 'string' || !source) {
    throw new Error('图生图服务未返回图片。');
  }

  if (source.startsWith('http')) {
    const response = await fetch(source);
    if (!response.ok) throw new Error('无法下载图生图结果。');
    return await response.arrayBuffer();
  }

  const normalized = source.startsWith('data:') ? source.slice(source.indexOf(',') + 1) : source;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function extractImageSource(data: any): string {
  const candidates = [
    ...(Array.isArray(data?.data) ? data.data : []),
    ...(Array.isArray(data?.images) ? data.images : []),
    ...(Array.isArray(data?.output?.images) ? data.output.images : []),
    ...(Array.isArray(data?.output?.results) ? data.output.results : []),
    ...(data?.output?.choices?.flatMap((choice: any) => choice?.message?.content || []) || []),
  ];

  for (const item of candidates) {
    const source =
      (typeof item === 'string' ? item : '') ||
      item?.b64_json ||
      item?.image ||
      item?.url ||
      item?.image_url ||
      item?.result_url;
    if (source) return source;
  }

  return data?.url || data?.output?.url || '';
}

async function handleOpenAiEdit(env: Env, body: ImageEditBody) {
  if (!body.apiBase) throw new Error('缺少图生图 API 地址。');
  if (!body.apiKey) throw new Error('缺少图生图 API Key。');

  const { bytes, mimeType } = dataUrlToBytes(body.image);
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: mimeType }), `source.${mimeType.split('/')[1] || 'png'}`);
  form.append('prompt', body.prompt);
  form.append('model', body.model);
  form.append('size', '1024x1024');
  form.append('n', '1');
  form.append('response_format', 'b64_json');

  const response = await fetch(`${normalizeBase(body.apiBase)}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.apiKey}` },
    body: form,
  });
  const data: any = await response.json().catch(async () => ({ error: await response.text() }));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'OpenAI 兼容图生图请求失败。');
  }

  const source = extractImageSource(data);
  return await persistImage(env, await fetchImageResult(source), body);
}

async function handleDashScopeEdit(env: Env, body: ImageEditBody) {
  if (!body.apiKey) throw new Error('缺少阿里云百练 API Key。');
  const base = normalizeBase(body.apiBase) || 'https://dashscope.aliyuncs.com';
  const origin = new URL(base).origin;

  const response = await fetch(`${origin}${DASH_SCOPE_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${body.apiKey}`,
    },
    body: JSON.stringify({
      model: body.model,
      input: {
        messages: [
          {
            role: 'user',
            content: [{ image: body.image }, { text: body.prompt }],
          },
        ],
      },
      parameters: {
        n: 1,
        watermark: false,
        prompt_extend: true,
        strength: body.strength ?? 0.65,
      },
    }),
  });

  const data: any = await response.json().catch(async () => ({ error: await response.text() }));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || '百练图生图请求失败。');
  }

  const source = extractImageSource(data);
  return await persistImage(env, await fetchImageResult(source), body);
}

async function handleModelScopeEdit(env: Env, body: ImageEditBody) {
  if (!body.apiKey) throw new Error('缺少 ModelScope API Key。');
  const apiBase = normalizeBase(body.apiBase || 'https://api-inference.modelscope.cn/v1');

  const response = await fetch(`${apiBase}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${body.apiKey}`,
      'X-ModelScope-Async-Mode': 'false',
    },
    body: JSON.stringify({
      model: body.model,
      prompt: body.prompt,
      image: body.image,
      image_url: body.image,
      strength: body.strength ?? 0.65,
      size: '1024x1024',
      n: 1,
      response_format: 'b64_json',
    }),
  });

  const data: any = await response.json().catch(async () => ({ error: await response.text() }));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'ModelScope 图生图请求失败。');
  }

  const source = extractImageSource(data);
  return await persistImage(env, await fetchImageResult(source), body);
}

function buildComfyWorkflow(prompt: string, imageName: string, strength: number) {
  return {
    '9': {
      inputs: { filename_prefix: 'simplerp-img2img', images: ['65', 0] },
      class_type: 'SaveImage',
    },
    '62': {
      inputs: { clip_name: 'qwen_3_4b.safetensors', type: 'lumina2', device: 'default' },
      class_type: 'CLIPLoader',
    },
    '63': { inputs: { vae_name: 'ae.safetensors' }, class_type: 'VAELoader' },
    '64': { inputs: { conditioning: ['70', 0] }, class_type: 'ConditioningZeroOut' },
    '65': { inputs: { samples: ['69', 0], vae: ['63', 0] }, class_type: 'VAEDecode' },
    '66': {
      inputs: { unet_name: 'z_image_turbo_bf16.safetensors', weight_dtype: 'default' },
      class_type: 'UNETLoader',
    },
    '68': { inputs: { shift: 3, model: ['66', 0] }, class_type: 'ModelSamplingAuraFlow' },
    '69': {
      inputs: {
        seed: Math.floor(Math.random() * 1_000_000_000_000),
        steps: 8,
        cfg: 1,
        sampler_name: 'res_multistep',
        scheduler: 'simple',
        denoise: Math.min(Math.max(strength, 0.1), 1),
        model: ['68', 0],
        positive: ['70', 0],
        negative: ['64', 0],
        latent_image: ['72', 0],
      },
      class_type: 'KSampler',
    },
    '70': { inputs: { text: prompt, clip: ['62', 0] }, class_type: 'CLIPTextEncode' },
    '71': { inputs: { image: imageName, upload: 'image' }, class_type: 'LoadImage' },
    '72': { inputs: { pixels: ['71', 0], vae: ['63', 0] }, class_type: 'VAEEncode' },
  };
}

async function handleComfyEdit(env: Env, body: ImageEditBody) {
  const comfyUrl = normalizeBase(body.apiKey);
  if (!comfyUrl.startsWith('http')) {
    throw new Error('请在设置中填写完整的 ComfyUI 穿透地址。');
  }

  const { bytes, mimeType } = dataUrlToBytes(body.image);
  const uploadForm = new FormData();
  const imageName = `simplerp-source-${Date.now()}.${mimeType.split('/')[1] || 'png'}`;
  uploadForm.append('image', new Blob([bytes], { type: mimeType }), imageName);
  uploadForm.append('overwrite', 'true');

  const uploadResponse = await fetch(`${comfyUrl}/upload/image`, {
    method: 'POST',
    body: uploadForm,
  });
  if (!uploadResponse.ok) throw new Error(`ComfyUI 上传原图失败：${uploadResponse.status}`);

  const workflow = buildComfyWorkflow(body.prompt, imageName, body.strength ?? 0.65);
  const promptResponse = await fetch(`${comfyUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!promptResponse.ok) throw new Error(`ComfyUI 拒绝图生图请求：${promptResponse.status}`);

  const { prompt_id: promptId } = (await promptResponse.json()) as any;
  if (!promptId) throw new Error('ComfyUI 未返回任务 ID。');

  let output: any = null;
  for (let index = 0; index < 125; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const historyResponse = await fetch(`${comfyUrl}/history/${promptId}`);
    if (!historyResponse.ok) continue;
    const history: any = await historyResponse.json();
    if (history[promptId]) {
      output = history[promptId]?.outputs?.['9']?.images?.[0];
      break;
    }
  }

  if (!output) throw new Error('ComfyUI 图生图超时或没有输出图片。');

  const viewUrl = `${comfyUrl}/view?filename=${encodeURIComponent(output.filename)}&subfolder=${encodeURIComponent(
    output.subfolder || '',
  )}&type=${encodeURIComponent(output.type || 'output')}`;
  const imageResponse = await fetch(viewUrl);
  if (!imageResponse.ok) throw new Error('无法下载 ComfyUI 图生图结果。');

  return await persistImage(env, await imageResponse.arrayBuffer(), body);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as ImageEditBody;
    if (!body.prompt?.trim()) return Response.json({ error: '缺少修改提示词。' }, { status: 400 });
    if (!body.image?.startsWith('data:image/')) return Response.json({ error: '缺少有效原图。' }, { status: 400 });
    if (!body.model) return Response.json({ error: '缺少图生图模型。' }, { status: 400 });

    const normalizedBody = {
      ...body,
      prompt: body.prompt.trim(),
      strength: Math.min(Math.max(Number(body.strength) || 0.65, 0.1), 1),
    };

    const result =
      normalizedBody.backend === 'huggingface'
        ? await handleComfyEdit(context.env, normalizedBody)
        : normalizedBody.backend === 'modelscope'
          ? await handleModelScopeEdit(context.env, normalizedBody)
          : isDashScopeModel(normalizedBody.apiBase, normalizedBody.model)
            ? await handleDashScopeEdit(context.env, normalizedBody)
            : await handleOpenAiEdit(context.env, normalizedBody);

    return Response.json(result);
  } catch (error: any) {
    return Response.json({ error: error?.message || '图生图失败。' }, { status: 500 });
  }
};
