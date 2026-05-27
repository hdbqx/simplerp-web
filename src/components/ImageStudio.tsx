import { useState, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { ApiMode, ApiPreset, Settings } from '../lib/db';

type StudioMode = 'txt2img';

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

export function ImageStudio({
  settings,
  presets,
  activePresetId,
  activeModel,
  manualModels,
  fetchPresetModels,
  presetModelsMap,
  presetModelsLoading,
}: Props) {
  const [prompt, setPrompt] = useState('');
  
  const [openAiSize, setOpenAiSize] = useState<string>('1024x1024');
  
  const [extraJson, setExtraJson] = useState<string>('');

  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [viewerSrc, setViewerSrc] = useState<string>('');
  const [viewerZoom, setViewerZoom] = useState<number>(1);
  const [viewerOffset, setViewerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewerDragging, setViewerDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);

  const backend = (settings?.image_backend || 'huggingface') as 'huggingface' | 'openai' | 'modelscope';

  const resolvePresetById = (id?: number) => presets.find(p => p.id === id);
  const currentPreset = presets.find(p => p.id === activePresetId);

  const resolvedImagePreset =
    resolvePresetById(settings?.image_preset_id) || currentPreset;

  const resolvedImageModel =
    (settings?.image_model_id || '').trim() || (activeModel || '').trim();

  const commonSizes = ['1024x1024', '1024x1792', '1792x1024', '1280x720', '720x1280'];

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

    const rawPrompt = (prompt || '').trim();
    if (!rawPrompt) {
      setError('请输入提示词');
      return;
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
      let reqBody: any;
      
      if (backend === 'huggingface') {
        if (!settings.hf_keys) throw new Error('请在系统设置中配置 Hugging Face 接口密钥');
        const modelId = settings.hf_model_id || 'black-forest-labs/FLUX.1-schnell';
        
        reqBody = {
          backend: 'huggingface',
          model: modelId,
          apiKey: settings.hf_keys,
          payload: { prompt: rawPrompt, ...extra }
        };
      } else if (backend === 'modelscope') {
        if (!settings.modelscope_api_key) throw new Error('请在系统设置中配置魔搭社区接口密钥');
        const modelId = settings.modelscope_model || 'Tongyi-MAI/Z-Image-Turbo';
        
        reqBody = {
          backend: 'modelscope',
          model: modelId,
          apiKey: settings.modelscope_api_key,
          payload: { prompt: rawPrompt, size: openAiSize || '1024x1024', n: 1, ...extra }
        };
      } else {
        if (!resolvedImagePreset || !resolvedImageModel) throw new Error('请配置生图预设/模型（或在顶部选择）');
        reqBody = {
          backend: 'openai',
          apiBase: resolvedImagePreset.api_base,
          apiKey: resolvedImagePreset.api_key,
          model: resolvedImageModel,
          payload: { prompt: rawPrompt, size: openAiSize || '1024x1024', n: 1, response_format: 'b64_json', ...extra }
        };
      }

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      
      if (!res.ok) {
        const errObj = await res.json().catch(()=>({error: "生图失败"}));
        throw new Error(errObj.error || "请求失败");
      }
      
      const data: any = await res.json();
      const out: string[] = [];
      if (Array.isArray(data?.images) && data.images[0]) {
        out.push(...data.images.map((b64: string) => `data:image/png;base64,${b64}`));
      }
      if (Array.isArray(data?.urls) && data.urls[0]) {
        out.push(...data.urls);
      }
      if (out.length === 0) throw new Error('后端未返回任何图片');
      setResults(out);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const getBackendBadge = () => {
    switch (backend) {
      case 'huggingface':
        return { label: 'Hugging Face', class: 'badge-accent' };
      case 'modelscope':
        return { label: 'ModelScope', class: 'badge-orange' };
      default:
        return { label: 'OpenAI 兼容接口', class: 'badge-info' };
    }
  };

  const badgeInfo = getBackendBadge();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-black text-primary flex items-center gap-2"><ImageIcon size={18}/> 生图工作台</div>
            <div className={`badge badge-outline ${badgeInfo.class}`}>
              {badgeInfo.label}
            </div>
          </div>
          <div className="text-xs opacity-60">使用自然语言描述你想要生成的画面。</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card bg-base-200 border border-base-300 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">输入参数</div>
              
              <div className="form-control">
                <textarea
                  className="textarea textarea-bordered h-32 w-full"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="输入画面描述，例如：霓虹雨夜中的赛博朋克城市，全景电影镜头"
                />
              </div>

              {(backend === 'openai' || backend === 'modelscope') && (
                <div className="form-control">
                  <label className="label text-xs font-bold">生成尺寸</label>
                  <select className="select select-bordered select-sm" value={openAiSize} onChange={e => setOpenAiSize(e.target.value)}>
                    {commonSizes.map(s => <option key={`sz-${s}`} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="form-control">
                <label className="label text-xs font-bold">高级参数（JSON）</label>
                <textarea className="textarea textarea-bordered w-full h-24 font-mono text-xs" value={extraJson} onChange={e => setExtraJson(e.target.value)} placeholder='如：{"guidance_scale": 7.5, "num_inference_steps": 25}' />
                <label className="label text-[10px] opacity-60 py-1">这部分参数将被合并发送到 API。</label>
              </div>

              {error && (
                <div className="alert alert-error py-2 text-xs">
                  <span className="break-words">{error}</span>
                </div>
              )}

              <button className={`btn btn-primary ${loading ? 'loading' : ''}`} onClick={run} disabled={loading}>
                开始生成
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
