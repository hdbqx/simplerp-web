type ImageBackend = 'huggingface' | 'openai' | 'modelscope';
type ImageAction = 'txt2img' | 'img2img';

interface ImageProxyBody {
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

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
}

const PROMPT_NODE_ID = "70";
const SAMPLER_NODE_ID = "69";

const getComfyUIWorkflow = (promptText: string) => {
  const workflow: any = {
    "9": {
      "inputs": { "filename_prefix": "z-image-turbo", "images": ["65", 0] },
      "class_type": "SaveImage"
    },
    "62": {
      "inputs": { "clip_name": "qwen_3_4b.safetensors", "type": "lumina2", "device": "default" },
      "class_type": "CLIPLoader"
    },
    "63": {
      "inputs": { "vae_name": "ae.safetensors" },
      "class_type": "VAELoader"
    },
    "64": {
      "inputs": { "conditioning": ["70", 0] },
      "class_type": "ConditioningZeroOut"
    },
    "65": {
      "inputs": { "samples": ["69", 0], "vae": ["63", 0] },
      "class_type": "VAEDecode"
    },
    "66": {
      "inputs": { "unet_name": "z_image_turbo_bf16.safetensors", "weight_dtype": "default" },
      "class_type": "UNETLoader"
    },
    "67": {
      "inputs": { "width": 1024, "height": 1024, "batch_size": 1 },
      "class_type": "EmptySD3LatentImage"
    },
    "68": {
      "inputs": { "shift": 3, "model": ["66", 0] },
      "class_type": "ModelSamplingAuraFlow"
    },
    "69": {
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000000000),
        "steps": 8,
        "cfg": 1,
        "sampler_name": "res_multistep",
        "scheduler": "simple",
        "denoise": 1,
        "model": ["68", 0],
        "positive": ["70", 0],
        "negative": ["64", 0],
        "latent_image": ["67", 0]
      },
      "class_type": "KSampler"
    },
    "70": {
      "inputs": { "text": promptText, "clip": ["62", 0] },
      "class_type": "CLIPTextEncode"
    }
  };

  return workflow;
};

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function generateImageKey(charId?: number, roomId?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const prefix = roomId ? `rooms/${roomId}` : (charId ? `chars/${charId}` : 'misc');
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

async function saveImageRecord(db: D1Database, r2Key: string, charId?: number, roomId?: number, prompt?: string): Promise<number> {
  const { meta } = await db.prepare(
    "INSERT INTO images (r2_key, char_id, room_id, prompt, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(r2Key, charId || null, roomId || null, prompt || null, Date.now()).run();
  return meta.last_row_id;
}

async function handleModelScope(
  context: any,
  body: ImageProxyBody,
  prompt: string,
  charId?: number,
  roomId?: number
): Promise<Response> {
  const apiBase = normalizeBase(body.apiBase || 'https://api-inference.modelscope.cn/v1');
  const model = body.model || 'Tongyi-MAI/Z-Image-Turbo';
  const apiKey = body.apiKey;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '请配置魔搭社区 API Key' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const payload = {
    model,
    prompt,
    size: body.payload?.size || '1024x1024',
    n: body.payload?.n || 1,
    response_format: 'b64_json',
    ...body.payload
  };

  try {
    const res = await fetch(`${apiBase}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-ModelScope-Async-Mode': 'true'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(errText, { status: res.status });
    }

    const data: any = await res.json();
    
    if (data.task_id || data.task_status) {
      const taskId = data.task_id;
      const taskStatusUrl = `${apiBase}/tasks/${taskId}`;
      
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        const statusRes = await fetch(taskStatusUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-ModelScope-Async-Mode': 'true',
            'X-ModelScope-Task-Type': 'image_generation' // 【修改点1】添加必要的任务类型头
          }
        });
        
        if (!statusRes.ok) continue;
        
        const statusData: any = await statusRes.json();
        
        // 【修改点2】官方完成状态为 SUCCEED
        if (statusData.task_status === 'SUCCEED' || statusData.task_status === 'SUCCEEDED' || statusData.status === 'succeeded') {
          // 【修改点3】正确读取官方的 output_images 字段
          const images = statusData.output_images || statusData.output?.images || statusData.data || [];
          if (images && images.length > 0) {
            return await processImageResults(context, images, charId, roomId, prompt);
          }
        }
        
        if (statusData.task_status === 'FAILED' || statusData.status === 'failed') {
          return new Response(JSON.stringify({ 
            error: statusData.message || '生成失败' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      return new Response(JSON.stringify({ error: '生成超时' }), { 
        status: 504,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (data.data || data.images) {
      const images = data.data || data.images || [];
      return await processImageResults(context, images, charId, roomId, prompt);
    }
    
    return new Response(JSON.stringify({ error: '未知响应格式' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (e: any) {
    return new Response(JSON.stringify({ error: `魔搭社区生成失败: ${e.message}` }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function processImageResults(
  context: any,
  images: any[],
  charId?: number,
  roomId?: number,
  prompt?: string
): Promise<Response> {
  const urls: string[] = [];
  const keys: string[] = [];
  const imageIds: number[] = [];
  
  for (const item of images) {
    const b64 = item.b64_json || item.image || (typeof item === 'string' ? item : null);
    
    if (b64) {
      let imgBuf: ArrayBuffer;
      
      if (b64.startsWith('http')) {
        const imgRes = await fetch(b64);
        if (!imgRes.ok) continue;
        imgBuf = await imgRes.arrayBuffer();
      } else {
        const binaryString = atob(b64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        imgBuf = bytes.buffer;
      }
      
      const imageKey = generateImageKey(charId, roomId);
      await uploadToR2(context.env.IMAGES_BUCKET, imgBuf, imageKey);
      const imageId = await saveImageRecord(context.env.DB, imageKey, charId, roomId, prompt);
      
      const imageUrl = `/api/images?key=${encodeURIComponent(imageKey)}`;
      urls.push(imageUrl);
      keys.push(imageKey);
      imageIds.push(imageId);
    }
  }
  
  return Response.json({ 
    images: [], 
    urls,
    keys,
    image_ids: imageIds
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const key = url.searchParams.get('key');
  const charId = url.searchParams.get('char_id');
  const roomId = url.searchParams.get('room_id');
  
  if (key) {
    try {
      const object = await context.env.IMAGES_BUCKET.get(key);
      if (!object) {
        return new Response('Image not found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000');
      headers.set('ETag', object.httpEtag);

      return new Response(object.body, { headers });
    } catch (e: any) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  }
  
  if (charId || roomId) {
    const query = roomId 
      ? "SELECT * FROM images WHERE room_id = ? ORDER BY created_at DESC"
      : "SELECT * FROM images WHERE char_id = ? ORDER BY created_at DESC";
    const bindId = roomId || charId;
    
    const { results } = await context.env.DB.prepare(query).bind(bindId).all();
    return Response.json(results);
  }
  
  const { results } = await context.env.DB.prepare("SELECT * FROM images ORDER BY created_at DESC LIMIT 100").all();
  return Response.json(results);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const key = url.searchParams.get('key');
  const imageId = url.searchParams.get('id');
  const charId = url.searchParams.get('char_id');
  const roomId = url.searchParams.get('room_id');
  
  try {
    if (imageId) {
      const { results } = await context.env.DB.prepare("SELECT r2_key FROM images WHERE id = ?").bind(imageId).all();
      if (results.length > 0) {
        const r2Key = (results[0] as any).r2_key;
        await context.env.IMAGES_BUCKET.delete(r2Key);
        await context.env.DB.prepare("DELETE FROM images WHERE id = ?").bind(imageId).run();
      }
      return new Response('Deleted');
    }
    
    if (key) {
      await context.env.IMAGES_BUCKET.delete(key);
      await context.env.DB.prepare("DELETE FROM images WHERE r2_key = ?").bind(key).run();
      return new Response('Deleted');
    }
    
    if (charId) {
      const { results } = await context.env.DB.prepare("SELECT r2_key FROM images WHERE char_id = ?").bind(charId).all();
      for (const row of results as any[]) {
        await context.env.IMAGES_BUCKET.delete(row.r2_key);
      }
      await context.env.DB.prepare("DELETE FROM images WHERE char_id = ?").bind(charId).run();
      return new Response('Deleted all images for character');
    }
    
    if (roomId) {
      const { results } = await context.env.DB.prepare("SELECT r2_key FROM images WHERE room_id = ?").bind(roomId).all();
      for (const row of results as any[]) {
        await context.env.IMAGES_BUCKET.delete(row.r2_key);
      }
      await context.env.DB.prepare("DELETE FROM images WHERE room_id = ?").bind(roomId).run();
      return new Response('Deleted all images for room');
    }
    
    return new Response('Missing parameters', { status: 400 });
  } catch (e: any) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as ImageProxyBody;
    const backend: ImageBackend = body.backend || 'openai';
    
    const rawPrompt = body.payload?.prompt || body.prompt || '';
    const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
    if (!prompt) return new Response('Missing prompt', { status: 400 });

    const charId = body.char_id;
    const roomId = body.room_id;

    if (backend === 'modelscope') {
      return await handleModelScope(context, body, prompt, charId, roomId);
    }

    if (backend === 'huggingface') {
      const comfyUrl = normalizeBase(body.apiKey || '');
      if (!comfyUrl || !comfyUrl.startsWith('http')) {
        return new Response('请在系统设置的 HF Access Token 框填入完整的 ComfyUI 穿透 URL', { status: 400 });
      }

      const workflow = getComfyUIWorkflow(prompt);

      try {
        const promptRes = await fetch(`${comfyUrl}/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: workflow })
        });

        if (!promptRes.ok) throw new Error(`ComfyUI 拒绝请求: ${promptRes.status}`);

        const { prompt_id } = await promptRes.json() as any;
        if (!prompt_id) throw new Error("未获取到任务 ID");

        let historyData: any = null;
        for (let i = 0; i < 125; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const histRes = await fetch(`${comfyUrl}/history/${prompt_id}`);
          if (histRes.ok) {
            const histJson: any = await histRes.json();
            if (histJson[prompt_id]) {
              historyData = histJson[prompt_id];
              break;
            }
          }
        }

        if (!historyData) throw new Error("生成超时（显卡可能正在忙）");

        const outputs = historyData.outputs["9"];
        if (!outputs || !outputs.images || outputs.images.length === 0) {
          throw new Error("工作流跑完了，但节点 9 没有保存图像");
        }

        const { filename, subfolder, type } = outputs.images[0];

        const viewUrl = `${comfyUrl}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
        const imgRes = await fetch(viewUrl);
        if (!imgRes.ok) throw new Error("无法从 ComfyUI 下载生成的图片");

        const imgBuf = await imgRes.arrayBuffer();
        
        const imageKey = generateImageKey(charId, roomId);
        await uploadToR2(context.env.IMAGES_BUCKET, imgBuf, imageKey);
        const imageId = await saveImageRecord(context.env.DB, imageKey, charId, roomId, prompt);
        
        const imageUrl = `/api/images?key=${encodeURIComponent(imageKey)}`;
        
        return Response.json({ 
          images: [], 
          urls: [imageUrl],
          keys: [imageKey],
          image_ids: [imageId]
        });

      } catch (err: any) {
         return new Response(JSON.stringify({ error: `ComfyUI 生成失败: ${err.message}` }), { status: 500 });
      }
    }

    if (!body.apiBase) return new Response('Missing apiBase', { status: 400 });
    const res = await fetch(`${normalizeBase(body.apiBase)}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${body.apiKey}` },
      body: JSON.stringify({ ...body.payload, model: body.model, prompt, response_format: 'b64_json' })
    });
    
    if (!res.ok) return new Response(await res.text(), { status: res.status });
    const data: any = await res.json();
    
    return await processImageResults(context, data.data || [], charId, roomId, prompt);

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};