interface Env {}

type ComfyUiRequestBody = {
  action?: 'loras';
  apiBase?: string;
  apiKey?: string;
};

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function extractLoraNames(data: any): string[] {
  const candidates: any[] = [];
  if (Array.isArray(data)) candidates.push(...data);
  if (Array.isArray(data?.loras)) candidates.push(...data.loras);
  if (Array.isArray(data?.data)) candidates.push(...data.data);
  if (Array.isArray(data?.models)) candidates.push(...data.models);
  if (Array.isArray(data?.files)) candidates.push(...data.files);
  if (data && typeof data === 'object') candidates.push(data);

  const names = candidates
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      return item.name || item.filename || item.file_name || item.title || item.path || item.model_name || '';
    })
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((value) => value.replace(/^.*[\\/]/, ''))
    .filter((value) => /\.(safetensors|ckpt|pt|pth|bin|gguf|bin)$/i.test(value) || /^[^/\\]+$/.test(value));

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as ComfyUiRequestBody;
    const action = body.action || 'loras';

    if (action !== 'loras') {
      return new Response('Unsupported action', { status: 400 });
    }

    if (!body.apiBase) {
      return new Response('Missing apiBase', { status: 400 });
    }

    const url = `${normalizeBase(body.apiBase)}/models/loras`;
    const headers: Record<string, string> = {};
    if (body.apiKey?.trim()) {
      headers.Authorization = `Bearer ${body.apiKey.trim()}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      return Response.json({ error: await response.text() }, { status: response.status });
    }

    const data = await response.json().catch(() => null);
    const loras = extractLoraNames(data);
    return Response.json({ loras, raw: data });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'ComfyUI 请求失败' }, { status: 500 });
  }
};

