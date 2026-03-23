import { useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';
import { LLMClient } from '../lib/llm';
import type { ApiMode, ApiPreset, Settings } from '../lib/db';

type StudioMode = 'txt2img' | 'img2img';

type Props = {
  settings?: Settings;
  presets: ApiPreset[];
  activePresetId?: number;
  activeModel: string;
  manualModels: string[];
  getPresetMode: (preset?: ApiPreset) => ApiMode;
  fetchPresetModels: (presetId?: number, force?: boolean) => Promise<void>;
  presetModelsMap: Record<number, string[]>;
  presetModelsLoading: Record<number, boolean>;
};

const parseExtraJson = (raw: string): Record<string, unknown> => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return {};
  const obj = JSON.parse(trimmed);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  return obj as Record<string, unknown>;
};

const dataUrlToBase64 = (dataUrl: string): string => {
  const idx = dataUrl.indexOf(',');
  if (idx >= 0) return dataUrl.slice(idx + 1);
  return dataUrl;
};

const parseSize = (size: string): { w: number; h: number } | null => {
  const m = (size || '').trim().match(/^(\d+)x(\d+)$/);
  if (!m) return null;
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
};

const resizeDataUrl = async (dataUrl: string, maxW: number, maxH: number, mime: string): Promise<string> => {
  const img = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image load failed'));
  });
  img.src = dataUrl;
  await loaded;

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return dataUrl;

  const scale = Math.min(maxW / iw, maxH / ih, 1);
  const tw = Math.max(1, Math.round(iw * scale));
  const th = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, tw, th);

  return canvas.toDataURL(mime);
};

const normalizeSdWebUiUiUrl = (input?: string): string => {
  const raw = (input || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  const idx = raw.indexOf('/sdapi/');
  if (idx >= 0) return raw.slice(0, idx);
  return raw;
};

export function ImageStudio({
  settings,
  presets,
  activePresetId,
  activeModel,
  manualModels,
  getPresetMode,
  fetchPresetModels,
  presetModelsMap,
  presetModelsLoading,
}: Props) {
  const [mode, setMode] = useState<StudioMode>('txt2img');
  const [prompt, setPrompt] = useState('');
  const [negative, setNegative] = useState("(worst quality:2), (low quality:2), (normal quality:2), lowres, watermark");
  const [useConversion, setUseConversion] = useState(true);

  const [imagePresetId, setImagePresetId] = useState<string>(''); // empty => follow settings/top
  const [imageModelId, setImageModelId] = useState<string>(''); // empty => follow settings/top

  const [openAiSize, setOpenAiSize] = useState<string>('1024x1024');
  const [openAiN, setOpenAiN] = useState<number>(1);
  const [openAiQuality, setOpenAiQuality] = useState<string>('');
  const [openAiStyle, setOpenAiStyle] = useState<string>('');
  const [openAiResponseFormat, setOpenAiResponseFormat] = useState<string>('b64_json');
  const [openAiPath, setOpenAiPath] = useState<string>(''); // optional override
  const [openAiMultipart, setOpenAiMultipart] = useState<boolean>(true);
  const [openAiImageField, setOpenAiImageField] = useState<string>('image');
  const [openAiMaskField, setOpenAiMaskField] = useState<string>('mask');
  const [autoResizeUpload, setAutoResizeUpload] = useState<boolean>(true);

  const [extraJson, setExtraJson] = useState<string>('');

  const [sdWidth, setSdWidth] = useState<number>(512);
  const [sdHeight, setSdHeight] = useState<number>(768);
  const [sdSteps, setSdSteps] = useState<number>(20);
  const [sdCfg, setSdCfg] = useState<number>(7);
  const [sdSampler, setSdSampler] = useState<string>('Euler a');
  const [sdDenoise, setSdDenoise] = useState<number>(0.6);
  const [initImage, setInitImage] = useState<string>(''); // dataURL

  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // --- 图片预览（缩放/拖拽） ---
  const [viewerSrc, setViewerSrc] = useState<string>('');
  const [viewerZoom, setViewerZoom] = useState<number>(1);
  const [viewerOffset, setViewerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewerDragging, setViewerDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);

  const resolvePresetById = (id?: number) => presets.find(p => p.id === id);
  const currentPreset = presets.find(p => p.id === activePresetId);

  const backend = (settings?.image_backend || 'sdwebui') as 'sdwebui' | 'openai';
  const sdWebUiUrl = useMemo(() => normalizeSdWebUiUiUrl(settings?.sd_url), [settings?.sd_url]);

  const resolvedImagePreset =
    (imagePresetId ? resolvePresetById(parseInt(imagePresetId, 10)) : undefined) ||
    resolvePresetById(settings?.image_preset_id) ||
    currentPreset;

  const resolvedImageModel =
    (imageModelId || '').trim() ||
    (settings?.image_model_id || '').trim() ||
    (activeModel || '').trim();

  const resolvedPresetModels = resolvedImagePreset?.id ? (presetModelsMap[resolvedImagePreset.id] || []) : [];

  const resolveSdPromptPresetAndModel = () => {
    const preset = resolvePresetById(settings?.sd_prompt_preset_id) || currentPreset;
    const model = (settings?.sd_prompt_model_id || '').trim() || (activeModel || '').trim();
    return { preset, model };
  };

  const commonSizes = ['1024x1024', '1024x1792', '1792x1024', '1280x720', '720x1280'];

  const openViewer = (src: string) => {
    setViewerSrc(src);
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
    // daisyUI modal uses checkbox via class; we use dialog pattern here with conditional render
  };

  const closeViewer = () => {
    setViewerSrc('');
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
    setViewerDragging(false);
    dragStart.current = null;
  };

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const onViewerWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    const next = clamp(viewerZoom + direction * 0.15, 0.2, 6);
    setViewerZoom(next);
  };

  const onViewerPointerDown = (e: React.PointerEvent) => {
    if (!viewerSrc) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setViewerDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: viewerOffset.x, oy: viewerOffset.y };
  };

  const onViewerPointerMove = (e: React.PointerEvent) => {
    if (!viewerDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setViewerOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };

  const onViewerPointerUp = () => {
    setViewerDragging(false);
    dragStart.current = null;
  };

  const run = async () => {
    if (!settings) return;
    setError('');

    if (backend === 'sdwebui' && !settings.sd_url) {
      setError('请在系统设置中配置 SD URL');
      return;
    }
    if (!activePresetId || !activeModel) {
      setError('请先在顶部选择 API 预设与模型');
      return;
    }
    if (backend === 'openai' && (!resolvedImagePreset || !resolvedImageModel)) {
      setError('请配置生图预设/模型（或在顶部选择）');
      return;
    }

    const rawPrompt = (prompt || '').trim();
    if (!rawPrompt) {
      setError('请输入提示词');
      return;
    }
    if (mode === 'img2img' && !initImage) {
      setError('请先上传一张初始图片');
      return;
    }

    let promptToUse = rawPrompt;
    if (useConversion) {
      const { preset: sdPreset, model: sdModel } = resolveSdPromptPresetAndModel();
      if (!sdPreset || !sdModel) {
        setError('请配置 SD 转换模型（或在顶部选择）');
        return;
      }
      setLoading(true);
      try {
        const llm = new LLMClient(sdPreset.api_base, sdPreset.api_key, getPresetMode(sdPreset));
        const tags = await llm.generateImageTags(rawPrompt, sdModel);
        promptToUse = `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${tags}`;
      } catch (e: any) {
        setError(e?.message || String(e));
        setLoading(false);
        return;
      }
    }

    let extra: Record<string, unknown> = {};
    try {
      extra = parseExtraJson(extraJson);
    } catch (e: any) {
      setError(`高级参数 JSON 无效：${e.message || e}`);
      return;
    }

    setLoading(true);
    try {
      if (backend === 'sdwebui') {
        const payload: any =
          mode === 'txt2img'
            ? {
                prompt: promptToUse,
                negative_prompt: negative,
                steps: sdSteps,
                cfg_scale: sdCfg,
                sampler_name: sdSampler,
                width: sdWidth,
                height: sdHeight,
                restore_faces: false,
                enable_hr: false,
                ...extra,
              }
            : {
                prompt: promptToUse,
                negative_prompt: negative,
                steps: sdSteps,
                cfg_scale: sdCfg,
                sampler_name: sdSampler,
                width: sdWidth,
                height: sdHeight,
                denoising_strength: sdDenoise,
                init_images: [dataUrlToBase64(initImage)],
                ...extra,
              };

        const res = await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: mode,
            sd_url: settings.sd_url,
            payload,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: any = await res.json();
        const imgs = Array.isArray(data?.images) ? data.images : [];
        const out = imgs.map((b64: string) => `data:image/png;base64,${b64}`);
        setResults(out);
        return;
      }

      const payload: any = {
        prompt: promptToUse,
        size: openAiSize || '1024x1024',
        n: openAiN || 1,
        response_format: openAiResponseFormat || 'b64_json',
        ...extra,
      };
      if (openAiQuality) payload.quality = openAiQuality;
      if (openAiStyle) payload.style = openAiStyle;
      if (mode === 'img2img') {
        payload.image = initImage;
      }

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backend: 'openai',
          action: mode,
          multipart: mode === 'img2img' ? openAiMultipart : undefined,
          imageField: mode === 'img2img' && openAiMultipart ? openAiImageField : undefined,
          maskField: mode === 'img2img' && openAiMultipart ? openAiMaskField : undefined,
          apiBase: resolvedImagePreset!.api_base,
          apiKey: resolvedImagePreset!.api_key,
          model: resolvedImageModel,
          path: openAiPath || undefined,
          payload,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: any = await res.json();
      const out: string[] = [];
      if (Array.isArray(data?.images) && data.images[0]) {
        out.push(...data.images.map((b64: string) => `data:image/png;base64,${b64}`));
      }
      if (Array.isArray(data?.urls) && data.urls[0]) {
        out.push(...data.urls);
      }
      if (out.length === 0) throw new Error('后端未返回图片');
      setResults(out);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-black text-primary flex items-center gap-2"><ImageIcon size={18}/> 生图工作台</div>
            <div className="badge badge-outline">{backend === 'sdwebui' ? 'SD WebUI' : 'OpenAI 兼容'}</div>
            {backend === 'sdwebui' && sdWebUiUrl && (
              <button className="btn btn-xs btn-outline" onClick={() => window.open(sdWebUiUrl, '_blank', 'noopener,noreferrer')}>打开 WebUI</button>
            )}
          </div>
          <div className="join">
            <button className={`btn btn-sm join-item ${mode === 'txt2img' ? 'btn-primary' : ''}`} onClick={() => setMode('txt2img')}>文生图</button>
            <button className={`btn btn-sm join-item ${mode === 'img2img' ? 'btn-primary' : ''}`} onClick={() => setMode('img2img')}>图生图</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card bg-base-200 border border-base-300 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">输入</div>
              <textarea className="textarea textarea-bordered w-full h-32" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="输入提示词（自然语言或 tags 都可）" />

              <label className="flex items-center gap-2 text-xs font-bold">
                <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={useConversion} onChange={(e)=>setUseConversion(e.target.checked)} />
                使用 SD 转换模型（描述 → tags）
              </label>

              {mode === 'img2img' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input file-input-bordered w-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const raw = String(reader.result || '');
                        if (!autoResizeUpload) {
                          setInitImage(raw);
                          return;
                        }

                        try {
                          if (backend === 'openai') {
                            const sz = parseSize(openAiSize) || { w: 1024, h: 1024 };
                            const resized = await resizeDataUrl(raw, sz.w, sz.h, 'image/png');
                            setInitImage(resized);
                            return;
                          }
                          const resized = await resizeDataUrl(raw, sdWidth || 1024, sdHeight || 1024, 'image/png');
                          setInitImage(resized);
                        } catch {
                          setInitImage(raw);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={autoResizeUpload} onChange={(e)=>setAutoResizeUpload(e.target.checked)} />
                    上传后缩放到目标尺寸（减少超时/断连）
                  </label>
                  {initImage && (
                    <div className="rounded-xl overflow-hidden border border-base-300 bg-base-100/60">
                      <img src={initImage} className="max-h-48 w-full object-contain" />
                    </div>
                  )}
                </div>
              )}

              {backend === 'sdwebui' && (
                <>
                  <textarea className="textarea textarea-bordered w-full h-20" value={negative} onChange={e => setNegative(e.target.value)} placeholder="Negative prompt（可选）" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label text-xs font-bold">宽</label>
                      <input className="input input-bordered input-sm" type="number" value={sdWidth} onChange={e => setSdWidth(parseInt(e.target.value || '0', 10) || 0)} />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">高</label>
                      <input className="input input-bordered input-sm" type="number" value={sdHeight} onChange={e => setSdHeight(parseInt(e.target.value || '0', 10) || 0)} />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">Steps</label>
                      <input className="input input-bordered input-sm" type="number" value={sdSteps} onChange={e => setSdSteps(parseInt(e.target.value || '0', 10) || 0)} />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">CFG</label>
                      <input className="input input-bordered input-sm" type="number" step="0.5" value={sdCfg} onChange={e => setSdCfg(parseFloat(e.target.value || '0') || 0)} />
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold">Sampler</label>
                    <input className="input input-bordered input-sm" value={sdSampler} onChange={e => setSdSampler(e.target.value)} />
                  </div>
                  {mode === 'img2img' && (
                    <div className="form-control">
                      <label className="label text-xs font-bold">Denoise</label>
                      <input className="range range-primary" type="range" min="0" max="1" step="0.05" value={sdDenoise} onChange={e => setSdDenoise(parseFloat(e.target.value || '0'))} />
                      <div className="text-[10px] opacity-70 mt-1">{sdDenoise.toFixed(2)}</div>
                    </div>
                  )}
                </>
              )}

              {backend === 'openai' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label text-xs font-bold">Size</label>
                      <select className="select select-bordered select-sm" value={openAiSize} onChange={e => setOpenAiSize(e.target.value)}>
                        {commonSizes.map(s => <option key={`sz-${s}`} value={s}>{s}</option>)}
                      </select>
                      <div className="text-[10px] opacity-70 mt-1">不同供应商限制不同，可用“高级 JSON / path 覆盖”适配。</div>
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">n</label>
                      <input className="input input-bordered input-sm" type="number" min="1" max="8" value={openAiN} onChange={e => setOpenAiN(parseInt(e.target.value || '1', 10) || 1)} />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">quality（可选）</label>
                      <input className="input input-bordered input-sm" value={openAiQuality} onChange={e => setOpenAiQuality(e.target.value)} placeholder="如：standard / hd" />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">style（可选）</label>
                      <input className="input input-bordered input-sm" value={openAiStyle} onChange={e => setOpenAiStyle(e.target.value)} placeholder="如：vivid / natural" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label text-xs font-bold">response_format</label>
                      <select className="select select-bordered select-sm" value={openAiResponseFormat} onChange={e => setOpenAiResponseFormat(e.target.value)}>
                        <option value="b64_json">b64_json</option>
                        <option value="url">url</option>
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">path 覆盖（可选）</label>
                      <input className="input input-bordered input-sm" value={openAiPath} onChange={e => setOpenAiPath(e.target.value)} placeholder="如：/v1/images/generations" />
                    </div>
                  </div>
                  {mode === 'img2img' && (
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={openAiMultipart} onChange={(e)=>setOpenAiMultipart(e.target.checked)} />
                      使用 multipart（常见 OpenAI `/images/edits`）
                    </label>
                  )}
                  {mode === 'img2img' && openAiMultipart && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="form-control">
                        <label className="label text-xs font-bold">image 字段名</label>
                        <input className="input input-bordered input-sm" value={openAiImageField} onChange={e => setOpenAiImageField(e.target.value)} placeholder="默认 image" />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">mask 字段名（可选）</label>
                        <input className="input input-bordered input-sm" value={openAiMaskField} onChange={e => setOpenAiMaskField(e.target.value)} placeholder="默认 mask" />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="form-control">
                <label className="label text-xs font-bold">高级参数 JSON（可选，合并到请求 payload）</label>
                <textarea className="textarea textarea-bordered w-full h-24 font-mono text-xs" value={extraJson} onChange={e => setExtraJson(e.target.value)} placeholder='例如：{"seed":123,"user":"demo"}' />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="form-control">
                  <label className="label text-xs font-bold">生图预设（可选）</label>
                  <select
                    className="select select-bordered select-sm"
                    value={imagePresetId}
                    onChange={(e) => {
                      setImagePresetId(e.target.value);
                      setImageModelId('');
                      const v = e.target.value;
                      if (v) fetchPresetModels(parseInt(v, 10));
                    }}
                  >
                    <option value="">跟随系统绑定/顶栏</option>
                    {presets.map(p => <option key={`studio-p-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label text-xs font-bold">生图模型（可选）</label>
                  <div className="join">
                    <select className="select select-bordered select-sm join-item w-full" value={imageModelId} onChange={(e) => setImageModelId(e.target.value)}>
                      <option value="">跟随系统绑定/顶栏</option>
                      {resolvedPresetModels.map(m => <option key={`studio-m-${m}`} value={m}>{m}</option>)}
                      {resolvedPresetModels.length === 0 && manualModels.map(m => <option key={`studio-man-${m}`} value={m}>{m}</option>)}
                    </select>
                    <button
                      className={`btn btn-sm join-item btn-ghost ${resolvedImagePreset?.id && presetModelsLoading[resolvedImagePreset.id] ? 'loading' : ''}`}
                      title="刷新模型列表"
                      onClick={() => resolvedImagePreset?.id && fetchPresetModels(resolvedImagePreset.id, true)}
                      disabled={!resolvedImagePreset?.id}
                    >
                      <RefreshCw size={14}/>
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert alert-error py-2 text-xs">
                  <span className="break-words">{error}</span>
                </div>
              )}

              <button className={`btn btn-primary ${loading ? 'loading' : ''}`} onClick={run} disabled={loading}>
                {mode === 'txt2img' ? '生成图片' : '开始图生图'}
              </button>
            </div>
          </div>

          <div className="card bg-base-200 border border-base-300 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">结果</div>
              {results.length === 0 ? (
                <div className="text-xs opacity-70">暂无结果，点击左侧按钮开始生成。</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((src, i) => (
                    <button
                      key={`r-${i}`}
                      className="rounded-xl overflow-hidden border border-base-300 bg-base-100/60 hover:border-primary transition-colors text-left"
                      onClick={() => openViewer(src)}
                      title="点击放大查看"
                    >
                      <img src={src} className="w-full h-64 md:h-80 object-contain bg-base-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewerSrc && (
        <div className="modal modal-open">
          <div className="modal-box max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden">
            <div className="p-3 border-b border-base-300 bg-base-200 flex items-center justify-between">
              <div className="text-xs font-black">预览（滚轮缩放 / 拖拽移动）</div>
              <div className="flex items-center gap-2">
                <button className="btn btn-xs" onClick={() => { setViewerZoom(1); setViewerOffset({ x: 0, y: 0 }); }}>重置</button>
                <button className="btn btn-xs btn-ghost" onClick={closeViewer}>关闭</button>
              </div>
            </div>
            <div
              ref={viewerContainerRef}
              className="w-full h-full bg-base-100 flex items-center justify-center select-none touch-none"
              onWheel={onViewerWheel}
              onPointerDown={onViewerPointerDown}
              onPointerMove={onViewerPointerMove}
              onPointerUp={onViewerPointerUp}
              onPointerCancel={onViewerPointerUp}
              onPointerLeave={onViewerPointerUp}
            >
              <img
                src={viewerSrc}
                className="max-w-none max-h-none"
                style={{
                  transform: `translate(${viewerOffset.x}px, ${viewerOffset.y}px) scale(${viewerZoom})`,
                  transformOrigin: 'center',
                  cursor: viewerDragging ? 'grabbing' : 'grab',
                }}
                draggable={false}
              />
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeViewer}></div>
        </div>
      )}
    </div>
  );
}
