type ImageBackend = 'sdwebui' | 'openai';
type ImageAction = 'txt2img' | 'img2img';

interface ImageProxyBody {
  // Backward-compatible: when `sd_url` is provided, defaults to sdwebui.
  backend?: ImageBackend;
  action?: ImageAction;
  multipart?: boolean;

  // sdwebui backend
  sd_url?: string;

  // openai-compatible backend
  apiBase?: string;
  apiKey?: string;
  model?: string;
  path?: string; // optional override, e.g. "/v1/images/generations"

  // Shared / passthrough payload:
  // - sdwebui: sent to /sdapi/v1/txt2img
  // - openai: merged into /images/generations request
  payload?: Record<string, unknown>;
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function dataUrlToBlob(input: string): Blob {
  const raw = (input || '').trim();
  const m = raw.match(/^data:([^;]+);base64,(.*)$/);
  if (m) {
    const mime = m[1] || 'application/octet-stream';
    const b64 = m[2] || '';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  // If it's plain base64 without header, default to png.
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

async function callOpenAICompatibleImages(apiBase: string, apiKey: string | undefined, model: string, payload: Record<string, unknown>) {
  const url = `${normalizeBase(apiBase)}/images/generations`;
  const trimmedKey = (apiKey || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

  const rawPrompt = payload?.prompt;
  const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
  if (!prompt) {
    throw new Error('Missing prompt');
  }

  const width = typeof (payload as any)?.width === 'number' ? (payload as any).width : undefined;
  const height = typeof (payload as any)?.height === 'number' ? (payload as any).height : undefined;
  const sizeFromWH = width && height ? `${width}x${height}` : undefined;

  // Be flexible for various OpenAI-compatible providers: forward payload as-is,
  // but ensure `model/prompt/response_format/size` have sensible defaults.
  const requestPayload: Record<string, unknown> = {
    ...(payload || {}),
    model,
    prompt,
    response_format: (payload as any)?.response_format || 'b64_json',
  };

  if (!('size' in requestPayload) && sizeFromWH) {
    requestPayload.size = sizeFromWH;
  }
  if (!('size' in requestPayload)) {
    // Many providers accept 1024x1024; avoids "min pixels" and "must be one of ..." issues in common cases.
    requestPayload.size = '1024x1024';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestPayload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Image generation failed (${res.status})`);
  }

  const data: any = await res.json();
  const items = Array.isArray(data?.data) ? data.data : [];
  const images = items.map((it: any) => it?.b64_json).filter((v: any) => typeof v === 'string' && v.trim().length > 0);
  const urls = items.map((it: any) => it?.url).filter((v: any) => typeof v === 'string' && v.trim().length > 0);

  return { images, urls, raw: data };
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json()) as ImageProxyBody;
    const backend: ImageBackend =
      body.backend || (body?.sd_url ? 'sdwebui' : 'openai');
    const action: ImageAction = body.action === 'img2img' ? 'img2img' : 'txt2img';

    if (backend === 'sdwebui') {
      if (!body?.sd_url) return new Response('Missing sd_url', { status: 400 });

      const endpoint = action === 'img2img' ? '/sdapi/v1/img2img' : '/sdapi/v1/txt2img';
      const res = await fetch(`${normalizeBase(body.sd_url)}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload || {}),
      });

      if (!res.ok) {
        const text = await res.text();
        return new Response(text || 'Image generation failed', { status: res.status });
      }

      const data: any = await res.json();
      return Response.json({ ...data, urls: [] });
    }

    if (!body?.apiBase) return new Response('Missing apiBase', { status: 400 });
    if (!body?.model) return new Response('Missing model', { status: 400 });

    // Allow overriding path for incompatible providers (e.g. "/v1/images/generations").
    const base = normalizeBase(body.apiBase);
    const defaultPath = action === 'img2img' ? '/images/edits' : '/images/generations';
    const path = body.path || defaultPath;
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

    const openaiPayload = body.payload || {};
    const rawPrompt = (openaiPayload as any)?.prompt;
    const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
    if (!prompt) return new Response('Missing prompt', { status: 400 });

    const requestPayload: Record<string, unknown> = {
      ...(openaiPayload || {}),
      model: body.model,
      prompt,
      response_format: (openaiPayload as any)?.response_format || 'b64_json',
    };
    if (!('size' in requestPayload)) requestPayload.size = '1024x1024';

    const trimmedKey = (body.apiKey || '').trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

    const useMultipart = body.multipart === true && action === 'img2img';

    let res: Response;
    if (useMultipart) {
      const form = new FormData();
      for (const [k, v] of Object.entries(requestPayload)) {
        if (v === undefined || v === null) continue;
        if (k === 'image' || k === 'mask') continue;
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          form.append(k, String(v));
        } else {
          form.append(k, JSON.stringify(v));
        }
      }

      const image = (requestPayload as any).image;
      if (typeof image === 'string' && image.trim()) {
        const blob = dataUrlToBlob(image);
        form.append('image', blob, 'image.png');
      }

      const mask = (requestPayload as any).mask;
      if (typeof mask === 'string' && mask.trim()) {
        const blob = dataUrlToBlob(mask);
        form.append('mask', blob, 'mask.png');
      }

      const mpHeaders: Record<string, string> = {};
      if (trimmedKey) mpHeaders.Authorization = `Bearer ${trimmedKey}`;
      res = await fetch(url, { method: 'POST', headers: mpHeaders, body: form });
    } else {
      res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(requestPayload) });
    }
    if (!res.ok) {
      const text = await res.text();
      return new Response(text || 'Image generation failed', { status: res.status });
    }
    const data: any = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];
    const images = items.map((it: any) => it?.b64_json).filter((v: any) => typeof v === 'string' && v.trim().length > 0);
    const urls = items.map((it: any) => it?.url).filter((v: any) => typeof v === 'string' && v.trim().length > 0);
    const result = { images, urls, raw: data };
    return Response.json(result);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Image proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
