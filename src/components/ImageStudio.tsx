import { useRef, useState, type ChangeEvent } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { api, type ApiMode, type ApiPreset, type Settings } from '../lib/db';

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

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const SINGLE_IMAGE_HINT = '请只输出一张完整画面，不要拼图、不要四宫格、不要分屏、不要候选图集合。';

const parseExtraJson = (raw: string): Record<string, unknown> => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return {};
  const obj = JSON.parse(trimmed);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  return obj as Record<string, unknown>;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取图片失败。'));
    reader.readAsDataURL(file);
  });
}

export function ImageStudio({
  settings,
  presets,
  activePresetId,
  activeModel,
}: Props) {
  const [mode, setMode] = useState<StudioMode>('txt2img');
  const [prompt, setPrompt] = useState('');
  const [openAiSize, setOpenAiSize] = useState('1024x1024');
  const [extraJson, setExtraJson] = useState('');
  const [sourceImage, setSourceImage] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [strength, setStrength] = useState(0.65);

  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobHint, setJobHint] = useState('');

  const [viewerSrc, setViewerSrc] = useState('');
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerOffset, setViewerOffset] = useState({ x: 0, y: 0 });
  const [viewerDragging, setViewerDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const backend = (settings?.image_backend || 'huggingface') as 'huggingface' | 'openai' | 'modelscope';
  const currentPreset = presets.find((preset) => preset.id === activePresetId);
  const resolvedImagePreset = presets.find((preset) => preset.id === settings?.image_preset_id) || currentPreset;
  const resolvedImageModel = (settings?.image_model_id || '').trim() || activeModel.trim();
  const isBailian =
    backend === 'openai' &&
    ((resolvedImageModel || '').toLowerCase().startsWith('qwen-image') ||
      (resolvedImagePreset?.api_base || '').toLowerCase().includes('dashscope') ||
      (resolvedImagePreset?.api_base || '').toLowerCase().includes('aliyuncs.com'));

  const commonSizes = ['1024x1024', '1024x1792', '1792x1024', '1280x720', '720x1280'];

  const handleSourceChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件。');
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      setError('原图不能超过 10 MB。');
      return;
    }
    try {
      setSourceImage(await readFileAsDataUrl(file));
      setSourceName(file.name);
      setError('');
    } catch (nextError: any) {
      setError(nextError?.message || '读取图片失败。');
    }
  };

  const openViewer = (src: string) => {
    setViewerSrc(src);
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
  };

  const closeViewer = () => {
    setViewerSrc('');
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
    setViewerDragging(false);
    dragStart.current = null;
  };

  const onViewerWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const next = Math.max(0.2, Math.min(6, viewerZoom + (event.deltaY > 0 ? -0.15 : 0.15)));
    setViewerZoom(next);
  };

  const onViewerPointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setViewerDragging(true);
    dragStart.current = { x: event.clientX, y: event.clientY, ox: viewerOffset.x, oy: viewerOffset.y };
  };

  const onViewerPointerMove = (event: React.PointerEvent) => {
    if (!viewerDragging || !dragStart.current) return;
    setViewerOffset({
      x: dragStart.current.ox + event.clientX - dragStart.current.x,
      y: dragStart.current.oy + event.clientY - dragStart.current.y,
    });
  };

  const onViewerPointerUp = () => {
    setViewerDragging(false);
    dragStart.current = null;
  };

  const getImageConfig = () => {
    if (!settings) throw new Error('设置尚未加载。');

    if (backend === 'huggingface') {
      if (!settings.hf_keys) throw new Error('请在系统设置中配置 ComfyUI 穿透地址。');
      return { apiKey: settings.hf_keys, model: 'comfyui-local' };
    }

    if (backend === 'modelscope') {
      if (!settings.modelscope_api_key) throw new Error('请在系统设置中配置 ModelScope API Key。');
      return {
        apiKey: settings.modelscope_api_key,
        model: settings.modelscope_model || 'Tongyi-MAI/Z-Image-Turbo',
      };
    }

    if (!resolvedImagePreset) throw new Error('请配置生图预设。');
    return {
      apiBase: resolvedImagePreset.api_base,
      apiKey: resolvedImagePreset.api_key,
      model:
        mode === 'img2img' && isBailian
          ? resolvedImageModel.startsWith('qwen-image-edit')
            ? resolvedImageModel
            : 'qwen-image-edit-plus'
          : resolvedImageModel,
    };
  };

  const collectResultUrls = (value: any): string[] => {
    const out: string[] = [];
    if (Array.isArray(value?.images)) {
      out.push(...value.images.filter(Boolean).map((item: string) => item.startsWith('data:') ? item : `data:image/png;base64,${item}`));
    }
    if (Array.isArray(value?.urls)) out.push(...value.urls.filter(Boolean));
    return [...new Set(out)];
  };

  const run = async () => {
    if (!settings) return;
    setError('');

    const rawPrompt = prompt.trim();
    if (!rawPrompt) {
      setError(mode === 'img2img' ? '请输入图片编辑指令。' : '请输入提示词。');
      return;
    }
    if (mode === 'img2img' && !sourceImage) {
      setError('请先上传原图。');
      return;
    }

    let extra: Record<string, unknown> = {};
    try {
      extra = parseExtraJson(extraJson);
    } catch (nextError: any) {
      setError(`高级参数 JSON 无效：${nextError.message || nextError}`);
      return;
    }

    setLoading(true);
    setJobHint('');
    setResults([]);

    try {
      const config = getImageConfig();
      const finalPrompt = `${rawPrompt}\n${SINGLE_IMAGE_HINT}`;

      if (mode === 'img2img') {
        const response = await fetch('/api/image-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            backend,
            ...config,
            prompt: finalPrompt,
            image: sourceImage,
            strength,
            storage_scope: 'studio',
            extra,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || '图生图失败。');
        const out = collectResultUrls(data);
        if (!out.length) throw new Error('图生图完成，但没有返回图片。');
        setResults(out);
        return;
      }

      const payload: Record<string, unknown> = {
        prompt: finalPrompt,
        size: openAiSize || '1024x1024',
        n: 1,
        response_format: 'b64_json',
        ...extra,
      };
      payload.n = 1;

      const response = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backend,
          ...config,
          defer: false,
          storage_scope: 'studio',
          payload,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || '生图失败。');
      const out = collectResultUrls(data?.result || data);
      if (!out.length) throw new Error('生图完成，但没有返回图片。');
      setResults(out);
    } catch (nextError: any) {
      setError(nextError?.message || String(nextError));
    } finally {
      setLoading(false);
    }
  };

  const badgeLabel = backend === 'huggingface' ? 'ComfyUI' : backend === 'modelscope' ? 'ModelScope' : isBailian ? '阿里云百练' : 'OpenAI 兼容接口';

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-lg font-black text-primary"><ImageIcon size={18} /> 生图工作台</div>
            <div className="badge badge-info badge-outline">{badgeLabel}</div>
          </div>
          <div className="text-xs opacity-60">工作台图片统一保存在 R2 的 studio/ 文件夹。</div>
        </div>

        <div className="tabs tabs-boxed">
          <button className={`tab flex-1 ${mode === 'txt2img' ? 'tab-active' : ''}`} onClick={() => setMode('txt2img')}>文生图</button>
          <button className={`tab flex-1 ${mode === 'img2img' ? 'tab-active' : ''}`} onClick={() => setMode('img2img')}>图生图</button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card border border-base-300 bg-base-200 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">输入参数</div>

              {mode === 'img2img' && (
                !sourceImage ? (
                  <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-base-300 bg-base-100/40 p-6 text-center">
                    <Upload className="mb-3 text-primary" />
                    <span className="font-bold">上传原图</span>
                    <span className="text-xs opacity-60">PNG / JPEG / WebP，最大 10 MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSourceChange} />
                  </label>
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-base-300 bg-base-100">
                    <img src={sourceImage} className="max-h-64 w-full object-contain" />
                    <button className="btn btn-circle btn-sm absolute right-2 top-2" onClick={() => { setSourceImage(''); setSourceName(''); }}>
                      <X size={15} />
                    </button>
                    <div className="truncate border-t border-base-300 p-2 text-xs opacity-60">{sourceName}</div>
                  </div>
                )
              )}

              <textarea
                className="textarea textarea-bordered h-32 w-full"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={mode === 'img2img' ? '输入编辑指令，例如：保持人物和服装，将背景改为雨夜霓虹街道' : '输入画面描述，例如：霓虹雨夜中的赛博朋克城市，全景电影镜头'}
              />

              {mode === 'txt2img' && (backend === 'openai' || backend === 'modelscope') && (
                <div className="form-control">
                  <label className="label text-xs font-bold">生成尺寸</label>
                  <select className="select select-bordered select-sm" value={openAiSize} onChange={(event) => setOpenAiSize(event.target.value)}>
                    {commonSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>
              )}

              {mode === 'img2img' && !isBailian && (
                <div className="form-control">
                  <label className="label text-xs font-bold">重绘强度：{strength.toFixed(2)}</label>
                  <input type="range" min="0.1" max="1" step="0.05" value={strength} className="range range-primary range-sm" onChange={(event) => setStrength(Number(event.target.value))} />
                </div>
              )}

              {mode === 'img2img' && isBailian && (
                <div className="alert py-2 text-xs">百练将使用 qwen-image-edit-plus，并直接理解图片和编辑指令。</div>
              )}

              <div className="form-control">
                <label className="label text-xs font-bold">高级参数（JSON）</label>
                <textarea className="textarea textarea-bordered h-24 w-full font-mono text-xs" value={extraJson} onChange={(event) => setExtraJson(event.target.value)} placeholder='如：{"watermark": false}' />
                <label className="label py-1 text-[10px] opacity-60">系统会强制 n=1，避免一次返回多张候选图。</label>
              </div>

              {error && <div className="alert alert-error py-2 text-xs"><span className="break-words">{error}</span></div>}
              {!!jobHint && !error && <div className="alert alert-info py-2 text-xs">{jobHint}</div>}

              <button className="btn btn-primary" onClick={run} disabled={loading}>
                {loading && <span className="loading loading-spinner loading-sm" />}
                {mode === 'img2img' ? '开始图片编辑' : '开始生成'}
              </button>
            </div>
          </div>

          <div className="card border border-base-300 bg-base-200 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">结果</div>
              {results.length === 0 ? (
                <div className="text-xs opacity-70">暂无结果。</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {results.map((src, index) => (
                    <button key={`${src}-${index}`} className="overflow-hidden rounded-xl border border-base-300 bg-base-100/60 text-left transition-colors hover:border-primary" onClick={() => openViewer(src)}>
                      <img src={src} className="h-64 w-full bg-base-100 object-contain md:h-80" />
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
          <div className="modal-box h-[90vh] w-[95vw] max-w-[95vw] overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-base-300 bg-base-200 p-3">
              <div className="text-xs font-black">预览（滚轮缩放 / 拖拽移动）</div>
              <div className="flex gap-2">
                <button className="btn btn-xs" onClick={() => { setViewerZoom(1); setViewerOffset({ x: 0, y: 0 }); }}>重置</button>
                <button className="btn btn-ghost btn-xs" onClick={closeViewer}>关闭</button>
              </div>
            </div>
            <div className="flex h-full w-full touch-none select-none items-center justify-center bg-base-100" onWheel={onViewerWheel} onPointerDown={onViewerPointerDown} onPointerMove={onViewerPointerMove} onPointerUp={onViewerPointerUp} onPointerCancel={onViewerPointerUp}>
              <img src={viewerSrc} className="max-h-none max-w-none" style={{ transform: `translate(${viewerOffset.x}px, ${viewerOffset.y}px) scale(${viewerZoom})`, transformOrigin: 'center', cursor: viewerDragging ? 'grabbing' : 'grab' }} draggable={false} />
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeViewer}></div>
        </div>
      )}
    </div>
  );
}
