// functions/api/images.ts

type ImageBackend = 'huggingface' | 'openai';
type ImageAction = 'txt2img' | 'img2img';

interface ImageProxyBody {
  backend: ImageBackend;
  action?: ImageAction;
  model: string;
  apiKey?: string; 
  apiBase?: string;
  path?: string;
  multipart?: boolean;
  imageField?: string;
  maskField?: string;
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
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json()) as ImageProxyBody;
    const backend: ImageBackend = body.backend || 'openai';
    const action: ImageAction = body.action === 'img2img' ? 'img2img' : 'txt2img';
    const model = (body.model || '').trim();

    if (!model) return new Response('Missing model', { status: 400 });

    const rawPrompt = (body.payload as any)?.prompt;
    const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
    if (!prompt) return new Response('Missing prompt', { status: 400 });

    // ==========================================
    // Hugging Face 接口处理（升级新版 router 路由 + Key 轮询）
    // ==========================================
    if (backend === 'huggingface') {
      const keys = (body.apiKey || '').split(',').map(k => k.trim()).filter(Boolean);
      if (keys.length === 0) return new Response('Missing Hugging Face Keys', { status: 400 });

      // 【核心修复】使用 HF 最新的 Inference Providers 统一路由节点
      // 传统 api-inference 节点不包含第三方代理模型，会导致 Cannot POST 报错
      const url = `https://router.huggingface.co/hf-inference/models/${model}`;
      const hfPayload = { inputs: prompt, parameters: body.payload };

      let lastError = '';
      
      // 遍历轮询 Key
      for (const key of keys) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Accept': 'image/jpeg, image/png, image/*, application/json'
          },
          body: JSON.stringify(hfPayload)
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          // 兼容部分 Provider 返回 JSON URL 的情况
          if (contentType.includes('application/json')) {
            const data: any = await res.json();
            if (data.url) return Response.json({ images: [], urls: [data.url] });
            if (data.image) return Response.json({ images: [data.image], urls: [] });
            return new Response(JSON.stringify({ error: `HF 返回了无法解析的 JSON: ${JSON.stringify(data)}` }), { status: 500 });
          } else {
            // 标准返回：二进制图片流
            const buffer = await res.arrayBuffer();
            const base64 = arrayBufferToBase64(buffer);
            return Response.json({ images: [base64], urls: [] });
          }
        } else {
          lastError = await res.text();
          // 如果是被限流 (429) 或加载中 (503)，继续尝试下个 Key
          if (res.status === 429 || res.status === 503) {
            continue;
          }
          // 其他报错直接抛出
          break;
        }
      }
      return new Response(JSON.stringify({ error: `Hugging Face Generation failed: ${lastError}` }), { status: 500 });
    }

    // ==========================================
    // OpenAI 兼容接口处理
    // ==========================================
    if (!body.apiBase) return new Response('Missing apiBase for OpenAI', { status: 400 });
    
    const base = normalizeBase(body.apiBase);
    const defaultPath = action === 'img2img' ? '/images/edits' : '/images/generations';
    const path = body.path || defaultPath;
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

    const requestPayload: Record<string, unknown> = {
      ...(body.payload || {}),
      model,
      prompt,
      response_format: (body.payload as any)?.response_format || 'b64_json',
    };
    if (!('size' in requestPayload)) requestPayload.size = '1024x1024';

    const trimmedKey = (body.apiKey || '').trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

    const useMultipart = body.multipart === true && action === 'img2img';
    const imageField = (body.imageField || 'image').trim() || 'image';
    const maskField = (body.maskField || 'mask').trim() || 'mask';

    let res: Response;
    try {
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
          form.append(imageField, dataUrlToBlob(image), 'image.png');
        }
        const mpHeaders: Record<string, string> = {};
        if (trimmedKey) mpHeaders.Authorization = `Bearer ${trimmedKey}`;
        res = await fetch(url, { method: 'POST', headers: mpHeaders, body: form });
      } else {
        res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(requestPayload) });
      }
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || 'Network connection lost.' }), { status: 500 });
    }

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: text || 'Image generation failed' }), { status: res.status });
    }

    const data: any = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];
    const images = items.map((it: any) => it?.b64_json).filter((v: any) => typeof v === 'string' && v.trim().length > 0);
    const urls = items.map((it: any) => it?.url).filter((v: any) => typeof v === 'string' && v.trim().length > 0);
    return Response.json({ images, urls, raw: data });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Image proxy error' }), { status: 500 });
  }
};