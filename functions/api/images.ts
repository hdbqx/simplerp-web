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

    const rawPrompt = (body.payload as any)?.prompt;
    const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
    if (!prompt) return new Response('Missing prompt', { status: 400 });

    // ==========================================
    // Hugging Face 接口：Z-Image-Turbo 独占处理 (Gradio API)
    // ==========================================
    if (backend === 'huggingface') {
      const keys = (body.apiKey || '').split(',').map(k => k.trim()).filter(Boolean);
      if (keys.length === 0) return new Response('Missing Hugging Face Keys', { status: 400 });

      // 写死 Z-Image 的 Space 空间地址
      const spaceBase = "https://mrfakename-z-image-turbo.hf.space";
      const postUrl = `${spaceBase}/gradio_api/call/generate_image`;
      
      // 生成随机 session_hash
      const sessionHash = Math.random().toString(36).substring(2, 12);
      
      // 【核心修复】：补齐 Gradio API 要求的完整参数矩阵
      // 对应 UI: Prompt, Seed, Randomize Seed, Width, Height, Num Steps
      const hfPayload = { 
        data: [
          prompt, 
          0,       // Seed
          true,    // Randomize seed
          1024,    // Width
          1024,    // Height
          8        // Num inference steps
        ],
        session_hash: sessionHash
      }; 

      let lastError = '';
      
      // 遍历轮询 Key，防止单个 Key 被限流
      for (const key of keys) {
        try {
          // 步骤 1：发送 POST 请求获取 event_id
          const initRes = await fetch(postUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(hfPayload)
          });

          if (!initRes.ok) {
            lastError = `POST failed: ${initRes.status} ${await initRes.text()}`;
            if (initRes.status === 429 || initRes.status === 503) continue; // 限流/拥挤，尝试下一个 Key
            break; 
          }

          const initData: any = await initRes.json();
          const eventId = initData.event_id;
          if (!eventId) {
            lastError = "未收到 event_id，API 结构可能已变。";
            continue;
          }

          // 步骤 2：请求 GET 长连接，监听 event stream
          const streamUrl = `${spaceBase}/gradio_api/call/generate_image/${eventId}`;
          const streamRes = await fetch(streamUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Accept': 'text/event-stream'
            }
          });

          if (!streamRes.ok) {
             lastError = `Stream failed: ${streamRes.status}`;
             continue;
          }

          const reader = streamRes.body?.getReader();
          if (!reader) throw new Error("无法读取流");
          const decoder = new TextDecoder();
          
          let buffer = '';
          let finalImageUrl = '';

          // 步骤 3：解析 SSE 数据流，寻找 complete 事件
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // 最后一个可能不完整，放回 buffer

            for (const event of events) {
              if (event.includes('event: complete')) {
                // 找到完成事件，提取 data 行
                const dataLine = event.split('\n').find(l => l.startsWith('data: '));
                if (dataLine) {
                  const dataStr = dataLine.substring(6).trim();
                  const dataObj = JSON.parse(dataStr);
                  if (dataObj && dataObj[0]) {
                    // Gradio v4 的图片路径通常在 path 字段中
                    finalImageUrl = dataObj[0].url || `/gradio_api/file=${dataObj[0].path}`;
                  }
                }
              } else if (event.includes('event: error')) {
                // 【核心修复】：精准捕获 Python 代码报错信息
                const dataLine = event.split('\n').find(l => l.startsWith('data: '));
                if (dataLine) {
                  lastError = `Gradio 后端报错: ${dataLine.substring(6).trim()}`;
                } else {
                  lastError = "Gradio 服务器生成内部错误";
                }
              }
            }
            if (finalImageUrl || lastError) break; 
          }

          // 步骤 4：如果成功拿到了图片 URL，下载并转为 Base64 发给前端
          if (finalImageUrl) {
            // 补全相对路径
            if (!finalImageUrl.startsWith('http')) {
              finalImageUrl = `${spaceBase}${finalImageUrl.startsWith('/') ? '' : '/'}${finalImageUrl}`;
            }

            const imgRes = await fetch(finalImageUrl, {
              headers: { 'Authorization': `Bearer ${key}` }
            });

            if (imgRes.ok) {
              const imgBuf = await imgRes.arrayBuffer();
              const base64Str = arrayBufferToBase64(imgBuf);
              return Response.json({ images: [base64Str], urls: [] });
            } else {
              lastError = `提取最终图片失败: ${imgRes.status}`;
            }
          }

        } catch (err: any) {
          lastError = err.message;
        }
      }

      return new Response(JSON.stringify({ error: `Z-Image 生成失败，最新报错: ${lastError}` }), { status: 500 });
    }

    // ==========================================
    // OpenAI 兼容接口处理 (备用生图逻辑保持不变)
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