import { prepareComfyWorkflow } from '../../server/comfyui-workflows';
import type { ComfyWorkflowLoraSelection, ComfyWorkflowTemplate } from '../../src/lib/db';

type ImageBackend = 'huggingface' | 'openai' | 'modelscope';
type StorageScope = 'chat' | 'studio';

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
  image?: string;
  strength?: number;
  char_id?: number;
  room_id?: number;
  storage_scope?: StorageScope;
  extra?: Record<string, unknown>;
  comfy_workflow?: ComfyWorkflowTemplate | null;
  comfy_lora_selection?: Record<string, ComfyWorkflowLoraSelection>;
};

const DASH_SCOPE_PATH = '/api/v1/services/aigc/multimodal-generation/generation';

function normalizeBase(value?: string): string {
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
  return (model || '').toLowerCase().startsWith('qwen-image-edit') || isDashScopeHost(apiBase);
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error('原图格式无效，请重新上传。');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { bytes, mimeType: match[1] || 'image/png' };
}


function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function fileToDataUrl(file: File): Promise<string> {
  const mimeType = file.type || 'image/png';
  return `data:${mimeType};base64,${arrayBufferToBase64(await file.arrayBuffer())}`;
}

function parseExtraJson(value: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof value !== 'string' || !value.trim()) return {};
  const parsed = JSON.parse(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};
}

function parseJsonField<T>(value: FormDataEntryValue | null): T | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return JSON.parse(value) as T;
}

async function parseImageEditRequest(request: Request): Promise<ImageEditBody> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return await request.json() as ImageEditBody;
  }

  const form = await request.formData();
  const image = form.get('image');
  if (!(image instanceof File)) throw new Error('缺少有效原图文件。');
  if (!image.type.startsWith('image/')) throw new Error('上传文件不是有效图片。');
  if (image.size > 10 * 1024 * 1024) throw new Error('原图不能超过 10 MB。');

  return {
    backend: String(form.get('backend') || 'openai') as ImageBackend,
    model: String(form.get('model') || ''),
    apiKey: typeof form.get('apiKey') === 'string' ? String(form.get('apiKey')) : undefined,
    apiBase: typeof form.get('apiBase') === 'string' ? String(form.get('apiBase')) : undefined,
    prompt: String(form.get('prompt') || ''),
    image: await fileToDataUrl(image),
    strength: Number(form.get('strength') || 0.65),
    storage_scope: String(form.get('storage_scope') || 'studio') as StorageScope,
    extra: parseExtraJson(form.get('extra')),
    comfy_workflow: parseJsonField<ComfyWorkflowTemplate | null>(form.get('comfy_workflow')),
    comfy_lora_selection: parseJsonField<Record<string, ComfyWorkflowLoraSelection>>(form.get('comfy_lora_selection')),
  };
}

function generateImageKey(body: ImageEditBody): string {
  const prefix =
    body.storage_scope === 'studio'
      ? 'studio'
      : body.room_id
        ? `rooms/${body.room_id}`
        : body.char_id
          ? `chars/${body.char_id}`
          : 'misc';
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
}

async function persistImage(env: Env, imageBuffer: ArrayBuffer, body: ImageEditBody) {
  const key = generateImageKey(body);
  await env.IMAGES_BUCKET.put(key, imageBuffer, { httpMetadata: { contentType: 'image/png' } });
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
  if (typeof source !== 'string' || !source) throw new Error('图生图服务未返回图片。');
  if (source.startsWith('http')) {
    const response = await fetch(source);
    if (!response.ok) throw new Error('无法下载图生图结果。');
    return await response.arrayBuffer();
  }
  const normalized = source.startsWith('data:') ? source.slice(source.indexOf(',') + 1) : source;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function extractImageSource(data: any): string {
  const items = [
    ...(data?.output?.choices?.flatMap((choice: any) => choice?.message?.content || []) || []),
    ...(Array.isArray(data?.output?.images) ? data.output.images : []),
    ...(Array.isArray(data?.output?.results) ? data.output.results : []),
    ...(Array.isArray(data?.data) ? data.data : []),
    ...(Array.isArray(data?.images) ? data.images : []),
  ];
  for (const item of items) {
    const source = (typeof item === 'string' ? item : '') || item?.b64_json || item?.image || item?.url || item?.image_url || item?.result_url;
    if (source) return source;
  }
  return data?.url || data?.output?.url || '';
}

async function handleDashScopeEdit(env: Env, body: ImageEditBody) {
  if (!body.apiKey) throw new Error('缺少阿里云百练 API Key。');

  const model = body.model?.trim() || 'qwen-image-edit-plus';
  if (!model.toLowerCase().startsWith('qwen-image-edit')) {
    throw new Error(`当前模型 ${model} 不是百练图像编辑模型，请使用 qwen-image-edit-plus。`);
  }

  const configuredBase = normalizeBase(body.apiBase);
  const origin = configuredBase ? new URL(configuredBase).origin : 'https://dashscope.aliyuncs.com';
  const extra = body.extra || {};

  const response = await fetch(`${origin}${DASH_SCOPE_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${body.apiKey}`,
      'X-DashScope-SSE': 'disable',
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [{
          role: 'user',
          content: [{ image: body.image }, { text: body.prompt }],
        }],
      },
      parameters: {
        ...extra,
        n: 1,
        watermark: typeof extra.watermark === 'boolean' ? extra.watermark : false,
        prompt_extend: typeof extra.prompt_extend === 'boolean' ? extra.prompt_extend : true,
      },
    }),
  });

  const rawText = await response.text();
  let data: any;
  try { data = rawText ? JSON.parse(rawText) : null; } catch { data = rawText; }

  if (!response.ok) {
    const requestId = response.headers.get('x-request-id') || (typeof data === 'object' ? data?.request_id : '');
    const message = typeof data === 'string' ? data : data?.message || data?.error?.message || data?.error || '百练图像编辑请求失败。';
    throw new Error(requestId ? `${message}（Request ID: ${requestId}）` : message);
  }

  const source = extractImageSource(data);
  if (!source) throw new Error('百练返回成功，但没有解析到编辑后的图片。');
  return await persistImage(env, await fetchImageResult(source), body);
}

async function handleOpenAiEdit(env: Env, body: ImageEditBody) {
  if (!body.apiBase || !body.apiKey) throw new Error('缺少 OpenAI 兼容接口配置。');
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
  const data: any = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || data?.error || 'OpenAI 兼容图生图请求失败。');

  const source = extractImageSource(data);
  return await persistImage(env, await fetchImageResult(source), body);
}

async function handleModelScopeEdit(env: Env, body: ImageEditBody) {
  if (!body.apiKey) throw new Error('缺少 ModelScope API Key。');
  const response = await fetch(`${normalizeBase(body.apiBase || 'https://api-inference.modelscope.cn/v1')}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.apiKey}` },
    body: JSON.stringify({
      model: body.model,
      prompt: body.prompt,
      image: body.image,
      image_url: body.image,
      strength: body.strength ?? 0.65,
      size: '1024x1024',
      n: 1,
      response_format: 'b64_json',
      ...(body.extra || {}),
    }),
  });
  const data: any = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error || 'ModelScope 图生图请求失败。');
  return await persistImage(env, await fetchImageResult(extractImageSource(data)), body);
}

function buildComfyWorkflow(prompt: string, imageName: string, strength: number) {
  return {
    '9': { inputs: { filename_prefix: 'simplerp-img2img', images: ['65', 0] }, class_type: 'SaveImage' },
    '62': { inputs: { clip_name: 'qwen_3_4b.safetensors', type: 'lumina2', device: 'default' }, class_type: 'CLIPLoader' },
    '63': { inputs: { vae_name: 'ae.safetensors' }, class_type: 'VAELoader' },
    '64': { inputs: { conditioning: ['70', 0] }, class_type: 'ConditioningZeroOut' },
    '65': { inputs: { samples: ['69', 0], vae: ['63', 0] }, class_type: 'VAEDecode' },
    '66': { inputs: { unet_name: 'z_image_turbo_bf16.safetensors', weight_dtype: 'default' }, class_type: 'UNETLoader' },
    '68': { inputs: { shift: 3, model: ['66', 0] }, class_type: 'ModelSamplingAuraFlow' },
    '69': {
      inputs: {
        seed: Math.floor(Math.random() * 1_000_000_000_000),
        steps: 8, cfg: 1, sampler_name: 'res_multistep', scheduler: 'simple',
        denoise: Math.min(Math.max(strength, 0.1), 1),
        model: ['68', 0], positive: ['70', 0], negative: ['64', 0], latent_image: ['72', 0],
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
  if (!comfyUrl.startsWith('http')) throw new Error('请填写完整的 ComfyUI 穿透地址。');

  const { bytes, mimeType } = dataUrlToBytes(body.image);
  const imageName = `simplerp-source-${Date.now()}.${mimeType.split('/')[1] || 'png'}`;
  const uploadForm = new FormData();
  uploadForm.append('image', new Blob([bytes], { type: mimeType }), imageName);
  uploadForm.append('overwrite', 'true');

  const uploadResponse = await fetch(`${comfyUrl}/upload/image`, { method: 'POST', body: uploadForm });
  if (!uploadResponse.ok) throw new Error(`ComfyUI 上传原图失败：${uploadResponse.status}`);

  const prepared =
    prepareComfyWorkflow(body.comfy_workflow || undefined, {
      prompt: body.prompt,
      sourceImageName: imageName,
      denoise: body.strength ?? 0.65,
      loraSelection: body.comfy_lora_selection,
    }) || null;

  const promptResponse = await fetch(`${comfyUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prepared?.workflow || buildComfyWorkflow(body.prompt, imageName, body.strength ?? 0.65),
    }),
  });
  if (!promptResponse.ok) throw new Error(`ComfyUI 拒绝图生图请求：${promptResponse.status}`);

  const { prompt_id: promptId } = (await promptResponse.json()) as any;
  let output: any = null;
  const outputNodeId = prepared?.outputNodeId || '9';
  for (let index = 0; index < 125; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const historyResponse = await fetch(`${comfyUrl}/history/${promptId}`);
    if (!historyResponse.ok) continue;
    const history: any = await historyResponse.json();
    if (history[promptId]) {
      output = history[promptId]?.outputs?.[outputNodeId]?.images?.[0];
      break;
    }
  }
  if (!output) throw new Error('ComfyUI 图生图超时或没有输出图片。');

  const imageResponse = await fetch(`${comfyUrl}/view?filename=${encodeURIComponent(output.filename)}&subfolder=${encodeURIComponent(output.subfolder || '')}&type=${encodeURIComponent(output.type || 'output')}`);
  if (!imageResponse.ok) throw new Error('无法下载 ComfyUI 图生图结果。');
  return await persistImage(env, await imageResponse.arrayBuffer(), body);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await parseImageEditRequest(context.request);
    if (!body.prompt?.trim()) return Response.json({ error: '缺少修改提示词。' }, { status: 400 });
    if (!body.image?.startsWith('data:image/')) return Response.json({ error: '缺少有效原图。' }, { status: 400 });

    const normalizedBody: ImageEditBody = {
      ...body,
      model: body.model?.trim() || (body.backend === 'openai' && isDashScopeHost(body.apiBase) ? 'qwen-image-edit-plus' : ''),
      prompt: body.prompt.trim(),
      strength: Math.min(Math.max(Number(body.strength) || 0.65, 0.1), 1),
    };
    if (!normalizedBody.model) return Response.json({ error: '缺少图生图模型。' }, { status: 400 });

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
