type ImageBackend = 'sdwebui' | 'openai';

interface ImageProxyBody {
  // Backward-compatible: when `sd_url` is provided, defaults to sdwebui.
  backend?: ImageBackend;

  // sdwebui backend
  sd_url?: string;

  // openai-compatible backend
  apiBase?: string;
  apiKey?: string;
  model?: string;

  // Shared / passthrough payload:
  // - sdwebui: sent to /sdapi/v1/txt2img
  // - openai: merged into /images/generations request
  payload?: Record<string, unknown>;
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
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

  const width = typeof payload?.width === 'number' ? payload.width : undefined;
  const height = typeof payload?.height === 'number' ? payload.height : undefined;
  const sizeFromWH = width && height ? `${width}x${height}` : undefined;

  // Keep the request OpenAI-compatible by only forwarding known fields.
  const requestPayload: Record<string, unknown> = {
    model,
    prompt,
    response_format: payload?.response_format || 'b64_json',
  };

  const passthroughKeys = ['n', 'size', 'quality', 'style', 'user', 'seed'];
  for (const k of passthroughKeys) {
    if (k in payload) requestPayload[k] = (payload as any)[k];
  }

  if (!('size' in requestPayload) && sizeFromWH) {
    requestPayload.size = sizeFromWH;
  }

  // Some OpenAI-compatible image models enforce a minimum pixel count (e.g. >= 921600).
  // If the request size is too small and the client passed `width/height`, upscale to a safe preset size.
  if (typeof requestPayload.size === 'string') {
    const m = requestPayload.size.match(/^(\d+)x(\d+)$/);
    if (m) {
      const w = parseInt(m[1], 10);
      const h = parseInt(m[2], 10);
      const pixels = w * h;
      if (Number.isFinite(pixels) && pixels > 0 && pixels < 921600) {
        const portrait = h > w;
        requestPayload.size = portrait ? '1024x1536' : '1536x1024';
      }
    }
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

  return { images, urls };
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json()) as ImageProxyBody;
    const backend: ImageBackend =
      body.backend || (body?.sd_url ? 'sdwebui' : 'openai');

    if (backend === 'sdwebui') {
      if (!body?.sd_url) return new Response('Missing sd_url', { status: 400 });

      const res = await fetch(`${normalizeBase(body.sd_url)}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload || {}),
      });

      if (!res.ok) {
        const text = await res.text();
        return new Response(text || 'Image generation failed', { status: res.status });
      }

      const data = await res.json();
      return Response.json(data);
    }

    if (!body?.apiBase) return new Response('Missing apiBase', { status: 400 });
    if (!body?.model) return new Response('Missing model', { status: 400 });

    const result = await callOpenAICompatibleImages(body.apiBase, body.apiKey, body.model, body.payload || {});
    return Response.json(result);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Image proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
