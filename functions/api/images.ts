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
    // Hugging Face 接口处理（兼容标准库与抓包的 Space URL）
    // ==========================================
    if (backend === 'huggingface') {
      const keys = (body.apiKey || '').split(',').map(k => k.trim()).filter(Boolean);
      if (keys.length === 0) return new Response('Missing Hugging Face Keys', { status: 400 });

      let url = `https://router.huggingface.co/hf-inference/models/${model}`;
      let hfPayload: any = { inputs: prompt, parameters: body.payload };
      let isSpaceApi = false;

      // 【核心升级】：如果用户填入的是 http 开头的抓包链接，自动切换为 Gradio API 模式
      if (model.startsWith('http') && model.includes('hf.space')) {
        url = model;
        hfPayload = { data: [prompt] }; // Gradio 接口通常要求参数放在 data 数组中
        isSpaceApi = true;
      }

      let lastError = '';
      
      // 遍历轮询 Key
      for (const key of keys) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json, image/*, */*'
          },
          body: JSON.stringify(hfPayload)
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            const data: any = await res.json();
            
            // 兼容解析 Gradio Space 的特殊返回格式
            if (isSpaceApi) {
               // 情况1：同步返回了 data 数组
               if (data.data && Array.isArray(data.data)) {
                  const item = data.data[0]; // 获取返回的第一个结果
                  if (typeof item === 'string') {
                     if (item.startsWith('http')) return Response.json({ images: [], urls: [item] });
                     if (item.startsWith('data:')) return Response.json({ images: [item.split(',')[1]], urls: [] });
                  }
                  if (item?.url) return Response.json({ images: [], urls: [item.url] });
               }
               // 情况2：返回了异步 event_id (Gradio v4 特性)
               if (data.event_id) {
                   return new Response(JSON.stringify({ error: `该 Space 使用了异步流式 API (需长链接获取)。极简版系统当前仅支持同步出图。` }), { status: 500 });
               }
            }

            // 官方标准 JSON 返回
            if (data.url) return Response.json({ images: [], urls: [data.url] });
            if (data.image) return Response.json({ images: [data.image], urls: [] });
            
            return new Response(JSON.stringify({ error: `未知的 JSON 返回格式` }), { status: 500 });
          } else {
            // 标准返回：二进制图片流
            const buffer = await res.arrayBuffer();
            const base64 = arrayBufferToBase64(buffer);
            return Response.json({ images: [base64], urls: [] });
          }
        } else {
          lastError = await res.text();
          // 被限流或服务重启，切下一个 key
          if (res.status === 429 || res.status === 503) continue;
          break;
        }
      }
      return new Response(JSON.stringify({ error: `Generation failed: ${lastError}` }), { status: 500 });
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