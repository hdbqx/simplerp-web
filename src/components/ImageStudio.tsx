import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Image as ImageIcon, RefreshCw, Trash2, Upload, X } from 'lucide-react';
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

type GalleryImage = {
  id: number;
  r2_key: string;
  prompt?: string;
  created_at?: number;
};

const BUILD_MARK = 'gallery-v2';
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const SINGLE_IMAGE_HINT = '请只输出一张完整画面，不要拼图、不要四宫格、不要分屏、不要候选图集合。';

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
  const [size, setSize] = useState('1024x1024');
  const [extraJson, setExtraJson] = useState('');
  const [sourceImage, setSourceImage] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [strength, setStrength] = useState(0.65);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewerSrc, setViewerSrc] = useState('');
  const mountedRef = useRef(true);

  const backend = (settings?.image_backend || 'huggingface') as 'huggingface' | 'openai' | 'modelscope';
  const currentPreset = presets.find((item) => item.id === activePresetId);
  const imagePreset = presets.find((item) => item.id === settings?.image_preset_id) || currentPreset;
  const imageModel = (settings?.image_model_id || activeModel || '').trim();

  useEffect(() => {
    mountedRef.current = true;
    void loadGallery();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadGallery = async () => {
    setGalleryLoading(true);
    try {
      const response = await fetch('/api/images?scope=studio', { cache: 'no-store' });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.error || '画廊加载失败。');
      if (mountedRef.current) setGallery(Array.isArray(data) ? data : []);
    } catch (nextError: any) {
      if (mountedRef.current) setError(nextError?.message || '画廊加载失败。');
    } finally {
      if (mountedRef.current) setGalleryLoading(false);
    }
  };

  const imageUrl = (item: GalleryImage) => `/api/images?key=${encodeURIComponent(item.r2_key)}`;

  const deleteImage = async (item: GalleryImage) => {
    if (!confirm('确定删除这张工作台图片吗？此操作会同时删除 R2 文件。')) return;
    try {
      const response = await fetch(`/api/images?id=${encodeURIComponent(String(item.id))}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(await response.text());
      setGallery((current) => current.filter((image) => image.id !== item.id));
      if (viewerSrc === imageUrl(item)) setViewerSrc('');
    } catch (nextError: any) {
      setError(nextError?.message || '删除失败。');
    }
  };

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

  const getConfig = () => {
    if (!settings) throw new Error('设置尚未加载。');
    if (!imageModel) throw new Error('请先在系统设置中配置图片模型。');

    if (backend === 'huggingface') {
      if (!settings.hf_keys) throw new Error('请配置 ComfyUI 穿透地址。');
      return { model: imageModel, apiKey: settings.hf_keys };
    }
    if (backend === 'modelscope') {
      if (!settings.modelscope_api_key) throw new Error('请配置 ModelScope API Key。');
      return { model: imageModel, apiKey: settings.modelscope_api_key };
    }
    if (!imagePreset) throw new Error('请配置生图预设。');
    return {
      model: imageModel,
      apiBase: imagePreset.api_base,
      apiKey: imagePreset.api_key,
    };
  };

  const run = async () => {
    if (!prompt.trim()) {
      setError(mode === 'img2img' ? '请输入图片编辑指令。' : '请输入提示词。');
      return;
    }
    if (mode === 'img2img' && !sourceImage) {
      setError('请先上传原图。');
      return;
    }

    let extra: Record<string, unknown> = {};
    try {
      extra = extraJson.trim() ? JSON.parse(extraJson) : {};
    } catch (nextError: any) {
      setError(`高级参数 JSON 无效：${nextError.message || nextError}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const config = getConfig();
      const finalPrompt = `${prompt.trim()}\n${SINGLE_IMAGE_HINT}`;
      const endpoint = mode === 'img2img' ? '/api/image-edit' : '/api/images';

      const body =
        mode === 'img2img'
          ? {
              backend,
              ...config,
              prompt: finalPrompt,
              image: sourceImage,
              strength,
              storage_scope: 'studio',
              extra,
            }
          : {
              backend,
              ...config,
              defer: false,
              storage_scope: 'studio',
              payload: {
                ...extra,
                prompt: finalPrompt,
                size,
                n: 1,
                response_format: 'b64_json',
              },
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || '生成失败。');

      // Release the large Base64 before refreshing the gallery.
      setSourceImage('');
      setSourceName('');
      setPrompt('');
      await loadGallery();
    } catch (nextError: any) {
      setError(nextError?.message || '生成失败。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-lg font-black text-primary">
              <ImageIcon size={18} /> 生图工作台
            </div>
            <span className="badge badge-success badge-outline">{BUILD_MARK}</span>
          </div>
          <div className="text-xs opacity-60">工作台图片保存在 R2：studio/</div>
        </div>

        <div className="tabs tabs-boxed">
          <button className={`tab flex-1 ${mode === 'txt2img' ? 'tab-active' : ''}`} onClick={() => setMode('txt2img')}>文生图</button>
          <button className={`tab flex-1 ${mode === 'img2img' ? 'tab-active' : ''}`} onClick={() => setMode('img2img')}>图生图</button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="card border border-base-300 bg-base-200 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">输入参数</div>

              {mode === 'img2img' && (
                !sourceImage ? (
                  <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-base-300">
                    <Upload className="mb-2 text-primary" />
                    <span className="font-bold">上传原图</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSourceChange} />
                  </label>
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-base-300">
                    <img src={sourceImage} className="max-h-60 w-full object-contain" />
                    <button className="btn btn-circle btn-sm absolute right-2 top-2" onClick={() => { setSourceImage(''); setSourceName(''); }}>
                      <X size={15} />
                    </button>
                    <div className="truncate border-t border-base-300 p-2 text-xs">{sourceName}</div>
                  </div>
                )
              )}

              <textarea className="textarea textarea-bordered h-32" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={mode === 'img2img' ? '输入编辑指令...' : '输入画面描述...'} />

              {mode === 'txt2img' && (
                <select className="select select-bordered select-sm" value={size} onChange={(event) => setSize(event.target.value)}>
                  {['1024x1024', '1024x1792', '1792x1024', '1280x720', '720x1280'].map((item) => <option key={item}>{item}</option>)}
                </select>
              )}

              {mode === 'img2img' && backend !== 'openai' && (
                <input type="range" min="0.1" max="1" step="0.05" value={strength} className="range range-primary range-sm" onChange={(event) => setStrength(Number(event.target.value))} />
              )}

              <textarea className="textarea textarea-bordered h-24 font-mono text-xs" value={extraJson} onChange={(event) => setExtraJson(event.target.value)} placeholder='高级参数 JSON，例如 {"watermark": false}' />

              {error && <div className="alert alert-error py-2 text-xs">{error}</div>}

              <button className="btn btn-primary" disabled={loading} onClick={run}>
                {loading && <span className="loading loading-spinner loading-sm" />}
                {mode === 'img2img' ? '开始图片编辑' : '开始生成'}
              </button>
            </div>
          </div>

          <div className="card border border-base-300 bg-base-200 shadow-sm">
            <div className="card-body">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-black">工作台画廊</div>
                  <div className="text-[11px] opacity-60">共 {gallery.length} 张</div>
                </div>
                <button className="btn btn-sm" disabled={galleryLoading} onClick={() => void loadGallery()}>
                  <RefreshCw size={15} className={galleryLoading ? 'animate-spin' : ''} /> 刷新
                </button>
              </div>

              {galleryLoading && gallery.length === 0 ? (
                <div className="flex justify-center py-12"><span className="loading loading-spinner" /></div>
              ) : gallery.length === 0 ? (
                <div className="rounded-xl border border-dashed border-base-300 py-12 text-center text-xs opacity-60">
                  暂无工作台图片
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {gallery.map((item) => (
                    <div key={item.id} className="group relative overflow-hidden rounded-xl border border-base-300 bg-base-100">
                      <button className="block w-full" onClick={() => setViewerSrc(imageUrl(item))}>
                        <img src={imageUrl(item)} loading="lazy" className="aspect-square w-full object-cover" />
                      </button>
                      <button className="btn btn-error btn-circle btn-xs absolute right-2 top-2 opacity-90" onClick={() => void deleteImage(item)} title="删除">
                        <Trash2 size={13} />
                      </button>
                      <div className="truncate p-2 text-[10px] opacity-60">{item.prompt || '无提示词'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewerSrc && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <img src={viewerSrc} className="max-h-[75vh] w-full object-contain" />
            <div className="modal-action">
              <button className="btn" onClick={() => setViewerSrc('')}>关闭</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setViewerSrc('')}></div>
        </div>
      )}
    </div>
  );
}
