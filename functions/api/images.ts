// functions/api/images.ts

type ImageBackend = 'huggingface' | 'openai';
type ImageAction = 'txt2img' | 'img2img';

interface ImageProxyBody {
  backend: ImageBackend;
  action?: ImageAction;
  model: string;
  apiKey?: string; // 这里存放 Cloudflare 内网穿透 URL
  apiBase?: string;
  payload?: Record<string, unknown>;
}

// ==========================================
// ⚙️ ComfyUI Z-Image-Turbo 专用配置
// ==========================================

const PROMPT_NODE_ID = "70"; // 对应你工作流中的 CLIPTextEncode
const SAMPLER_NODE_ID = "69"; // 对应你工作流中的 KSampler[cite: 2]

const getComfyUIWorkflow = (promptText: string) => {
  // 这里完整引用了你提供的 Z-Image 节点流[cite: 2]
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
      "inputs": { "unet_name": "z-image-turbo-fp8-e4m3fn.safetensors", "weight_dtype": "default" },
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
        "seed": Math.floor(Math.random() * 1000000000000), // 随机种子[cite: 2]
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
      "inputs": { "text": promptText, "clip": ["62", 0] }, // 注入提示词[cite: 2]
      "class_type": "CLIPTextEncode"
    }
  };

  return workflow;
};

// ==========================================

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json()) as ImageProxyBody;
    const backend: ImageBackend = body.backend || 'openai';
    
    const rawPrompt = (body.payload as any)?.prompt;
    const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
    if (!prompt) return new Response('Missing prompt', { status: 400 });

    if (backend === 'huggingface') {
      const comfyUrl = normalizeBase(body.apiKey || ''); // 从 HF Token 框读取 URL
      if (!comfyUrl || !comfyUrl.startsWith('http')) {
        return new Response('请在系统设置的 HF Access Token 框填入完整的 ComfyUI 穿透 URL', { status: 400 });
      }

      const workflow = getComfyUIWorkflow(prompt);

      try {
        // 1. 提交任务
        const promptRes = await fetch(`${comfyUrl}/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: workflow })
        });

        if (!promptRes.ok) throw new Error(`ComfyUI 拒绝请求: ${promptRes.status}`);

        const { prompt_id } = await promptRes.json() as any;
        if (!prompt_id) throw new Error("未获取到任务 ID");

        // 2. 轮询状态 (最多等 45 秒)
        let historyData: any = null;
        for (let i = 0; i < 45; i++) {
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

        // 3. 提取结果文件名 (从节点 9 提取)[cite: 2]
        const outputs = historyData.outputs["9"];
        if (!outputs || !outputs.images || outputs.images.length === 0) {
          throw new Error("工作流跑完了，但节点 9 没有保存图像");
        }

        const { filename, subfolder, type } = outputs.images[0];

        // 4. 下载图片并转 Base64
        const viewUrl = `${comfyUrl}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
        const imgRes = await fetch(viewUrl);
        if (!imgRes.ok) throw new Error("无法从 ComfyUI 下载生成的图片");

        const imgBuf = await imgRes.arrayBuffer();
        const base64Str = arrayBufferToBase64(imgBuf);
        
        return Response.json({ images: [base64Str], urls: [] });

      } catch (err: any) {
         return new Response(JSON.stringify({ error: `ComfyUI 生成失败: ${err.message}` }), { status: 500 });
      }
    }

    // OpenAI 备用逻辑
    if (!body.apiBase) return new Response('Missing apiBase', { status: 400 });
    const res = await fetch(`${normalizeBase(body.apiBase)}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${body.apiKey}` },
      body: JSON.stringify({ ...body.payload, model: body.model, prompt, response_format: 'b64_json' })
    });
    
    if (!res.ok) return new Response(await res.text(), { status: res.status });
    const data: any = await res.json();
    return Response.json({ images: data.data.map((it: any) => it.b64_json), urls: [] });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};