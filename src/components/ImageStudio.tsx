import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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

const BUILD_MARK = 'studio-stable-v1';
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const SINGLE_IMAGE_HINT =
  '请只输出一张完整画面，不要拼图、不要四宫格、不要分屏、不要候选图集合。';

const COMMON_SIZES = [
  '1024x1024',
  '1024x1792',
  '1792x1024',
  '1280x720',
  '720x1280',
];

function parseExtraJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('高级参数必须是 JSON 对象。');
  }

  return parsed as Record<string, unknown>;
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleString('zh-CN');
  } catch {
    return '';
  }
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

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [strength, setStrength] = useState(0.65);

  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [statusText, setStatusText] = useState('就绪');
  const [errorText, setErrorText] = useState('');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState('');

  const mountedRef = useRef(true);
  const previewRef = useRef('');

  const backend = (settings?.image_backend || 'huggingface') as
    | 'huggingface'
    | 'openai'
    | 'modelscope';

  const imagePreset = useMemo(() => {
    const configured = presets.find(
      (item) => item.id === settings?.image_preset_id,
    );
    const active = presets.find((item) => item.id === activePresetId);
    return configured || active;
  }, [presets, settings?.image_preset_id, activePresetId]);

  const imageModel = useMemo(
    () => (settings?.image_model_id || activeModel || '').trim(),
    [settings?.image_model_id, activeModel],
  );

  const backendLabel =
    backend === 'huggingface'
      ? 'ComfyUI'
      : backend === 'modelscope'
        ? 'ModelScope'
        : 'OpenAI / 百练';

  const galleryImageUrl = (item: GalleryImage) =>
    `/api/images?key=${encodeURIComponent(item.r2_key)}`;

  const revokePreview = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = '';
    }
  };

  const clearSourceImage = () => {
    revokePreview();
    setSourceFile(null);
    setSourcePreview('');
    setSourceName('');
  };

  const loadGallery = async () => {
    if (!mountedRef.current) return;

    setGalleryLoading(true);
    setErrorText('');

    try {
      const response = await fetch('/api/images?scope=studio', {
        cache: 'no-store',
      });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data?.error || '工作台画廊加载失败。');
      }

      if (mountedRef.current) {
        const items = Array.isArray(data) ? (data as GalleryImage[]) : [];
        setGallery(items);
      }
    } catch (error: any) {
      if (mountedRef.current) {
        setErrorText(error?.message || '工作台画廊加载失败。');
      }
    } finally {
      if (mountedRef.current) {
        setGalleryLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void loadGallery();

    return () => {
      mountedRef.current = false;
      revokePreview();
    };
  }, []);

  const handleSourceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorText('请选择图片文件。');
      return;
    }

    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      setErrorText('原图不能超过 10 MB。');
      return;
    }

    revokePreview();

    const nextPreview = URL.createObjectURL(file);
    previewRef.current = nextPreview;

    setSourceFile(file);
    setSourcePreview(nextPreview);
    setSourceName(file.name);
    setErrorText('');
  };

  const getRequestConfig = () => {
    if (!settings) {
      throw new Error('系统设置尚未加载。');
    }

    if (!imageModel) {
      throw new Error('请先在系统设置中配置图片模型。');
    }

    if (backend === 'huggingface') {
      if (!settings.hf_keys) {
        throw new Error('请先配置 ComfyUI 穿透地址。');
      }

      return {
        model: imageModel,
        apiKey: settings.hf_keys,
      };
    }

    if (backend === 'modelscope') {
      if (!settings.modelscope_api_key) {
        throw new Error('请先配置 ModelScope API Key。');
      }

      return {
        model: imageModel,
        apiKey: settings.modelscope_api_key,
      };
    }

    if (!imagePreset) {
      throw new Error('请先配置生图预设。');
    }

    return {
      model: imageModel,
      apiBase: imagePreset.api_base,
      apiKey: imagePreset.api_key,
    };
  };

  const submitTxt2Img = async (
    config: ReturnType<typeof getRequestConfig>,
    finalPrompt: string,
    extra: Record<string, unknown>,
  ) => {
    const response = await fetch('/api/images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || '文生图失败。');
    }
  };

  const submitImg2Img = async (
    config: ReturnType<typeof getRequestConfig>,
    finalPrompt: string,
    extra: Record<string, unknown>,
  ) => {
    if (!sourceFile) {
      throw new Error('请先上传原图。');
    }

    const form = new FormData();
    form.append('image', sourceFile, sourceFile.name);
    form.append('backend', backend);
    form.append('model', String(config.model || ''));
    form.append('prompt', finalPrompt);
    form.append('strength', String(strength));
    form.append('storage_scope', 'studio');
    form.append('extra', JSON.stringify(extra));

    if ('apiBase' in config && config.apiBase) {
      form.append('apiBase', String(config.apiBase));
    }

    if ('apiKey' in config && config.apiKey) {
      form.append('apiKey', String(config.apiKey));
    }

    const response = await fetch('/api/image-edit', {
      method: 'POST',
      body: form,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || '图片编辑失败。');
    }
  };

  const runGeneration = async () => {
    if (generationLoading) return;

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setErrorText(
        mode === 'img2img' ? '请输入图片编辑指令。' : '请输入画面描述。',
      );
      return;
    }

    if (mode === 'img2img' && !sourceFile) {
      setErrorText('请先上传原图。');
      return;
    }

    let extra: Record<string, unknown>;

    try {
      extra = parseExtraJson(extraJson);
    } catch (error: any) {
      setErrorText(error?.message || '高级参数 JSON 无效。');
      return;
    }

    setGenerationLoading(true);
    setErrorText('');
    setStatusText('准备请求');

    try {
      const config = getRequestConfig();
      const finalPrompt = `${trimmedPrompt}\n${SINGLE_IMAGE_HINT}`;

      setStatusText(
        mode === 'img2img' ? '正在上传并编辑图片' : '正在生成图片',
      );

      if (mode === 'img2img') {
        await submitImg2Img(config, finalPrompt, extra);
      } else {
        await submitTxt2Img(config, finalPrompt, extra);
      }

      setStatusText('正在刷新画廊');

      clearSourceImage();
      setPrompt('');

      await loadGallery();

      setStatusText('完成');
    } catch (error: any) {
      console.error('ImageStudio generation failed:', error);
      setErrorText(error?.message || '生成失败。');
      setStatusText('失败');
    } finally {
      if (mountedRef.current) {
        setGenerationLoading(false);
      }
    }
  };

  const deleteGalleryImage = async (item: GalleryImage) => {
    if (
      !window.confirm(
        '确定删除这张工作台图片吗？此操作会同时删除 R2 文件和数据库记录。',
      )
    ) {
      return;
    }

    setErrorText('');

    try {
      const response = await fetch(
        `/api/images?id=${encodeURIComponent(String(item.id))}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setGallery((current) =>
        current.filter((image) => image.r2_key !== item.r2_key),
      );

      if (viewerSrc === galleryImageUrl(item)) {
        setViewerOpen(false);
        setViewerSrc('');
      }
    } catch (error: any) {
      setErrorText(error?.message || '删除图片失败。');
    }
  };

  const openViewer = (item: GalleryImage) => {
    setViewerSrc(galleryImageUrl(item));
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerSrc('');
  };

  const txt2ImgVisible = mode === 'txt2img';
  const img2ImgVisible = mode === 'img2img';

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-lg font-black text-primary">
              <ImageIcon size={18} />
              生图工作台
            </div>

            <span className="badge badge-success badge-outline">
              {BUILD_MARK}
            </span>

            <span className="badge badge-info badge-outline">
              {backendLabel}
            </span>
          </div>

          <div className="text-xs opacity-60">
            工作台图片保存至 R2：studio/
          </div>
        </header>

        <nav className="tabs tabs-boxed">
          <button
            type="button"
            className={`tab flex-1 ${txt2ImgVisible ? 'tab-active' : ''}`}
            onClick={() => setMode('txt2img')}
            disabled={generationLoading}
          >
            文生图
          </button>

          <button
            type="button"
            className={`tab flex-1 ${img2ImgVisible ? 'tab-active' : ''}`}
            onClick={() => setMode('img2img')}
            disabled={generationLoading}
          >
            图生图
          </button>
        </nav>

        <main className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
          <section className="card border border-base-300 bg-base-200 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">输入参数</div>

              <div
                className={img2ImgVisible ? 'block space-y-3' : 'hidden'}
                aria-hidden={!img2ImgVisible}
              >
                <label
                  className={
                    sourcePreview
                      ? 'hidden'
                      : 'flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-base-300'
                  }
                >
                  <Upload className="mb-2 text-primary" />
                  <span className="font-bold">上传原图</span>
                  <span className="text-xs opacity-60">
                    PNG / JPEG / WebP，最大 10 MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSourceChange}
                    disabled={generationLoading}
                  />
                </label>

                <div
                  className={
                    sourcePreview
                      ? 'relative overflow-hidden rounded-xl border border-base-300 bg-base-100'
                      : 'hidden'
                  }
                >
                  <img
                    src={sourcePreview || undefined}
                    alt="原图预览"
                    className="max-h-64 w-full object-contain"
                  />

                  <button
                    type="button"
                    className="btn btn-circle btn-sm absolute right-2 top-2"
                    onClick={clearSourceImage}
                    disabled={generationLoading}
                    aria-label="移除原图"
                  >
                    <X size={15} />
                  </button>

                  <div className="truncate border-t border-base-300 p-2 text-xs opacity-70">
                    {sourceName || '未选择图片'}
                  </div>
                </div>
              </div>

              <textarea
                className="textarea textarea-bordered h-32 w-full"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  img2ImgVisible
                    ? '输入编辑指令，例如：保持人物姿势，将长裤改成短裙'
                    : '输入画面描述，例如：霓虹雨夜中的赛博朋克城市'
                }
                disabled={generationLoading}
              />

              <div
                className={txt2ImgVisible ? 'form-control' : 'hidden'}
                aria-hidden={!txt2ImgVisible}
              >
                <label className="label py-1 text-xs font-bold">
                  生成尺寸
                </label>

                <select
                  className="select select-bordered select-sm"
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                  disabled={generationLoading}
                >
                  {COMMON_SIZES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className={
                  img2ImgVisible && backend !== 'openai'
                    ? 'form-control'
                    : 'hidden'
                }
                aria-hidden={!(img2ImgVisible && backend !== 'openai')}
              >
                <label className="label py-1 text-xs font-bold">
                  重绘强度：{strength.toFixed(2)}
                </label>

                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={strength}
                  className="range range-primary range-sm"
                  onChange={(event) => setStrength(Number(event.target.value))}
                  disabled={generationLoading}
                />
              </div>

              <textarea
                className="textarea textarea-bordered h-24 w-full font-mono text-xs"
                value={extraJson}
                onChange={(event) => setExtraJson(event.target.value)}
                placeholder='高级参数 JSON，例如 {"watermark": false}'
                disabled={generationLoading}
              />

              <div className="rounded-lg border border-base-300 bg-base-100/50 p-2 text-xs">
                当前状态：<b>{statusText}</b>
              </div>

              <div
                className={
                  errorText
                    ? 'alert alert-error py-2 text-xs'
                    : 'hidden'
                }
                role="alert"
              >
                <span className="break-words">{errorText}</span>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={generationLoading}
                onClick={() => void runGeneration()}
              >
                <span
                  className={
                    generationLoading
                      ? 'loading loading-spinner loading-sm'
                      : 'hidden'
                  }
                />

                <span>
                  {generationLoading
                    ? '处理中...'
                    : img2ImgVisible
                      ? '开始图片编辑'
                      : '开始生成'}
                </span>
              </button>
            </div>
          </section>

          <section className="card border border-base-300 bg-base-200 shadow-sm">
            <div className="card-body">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-black">工作台画廊</div>
                  <div className="text-[11px] opacity-60">
                    共 {gallery.length} 张
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void loadGallery()}
                  disabled={galleryLoading || generationLoading}
                >
                  <RefreshCw
                    size={15}
                    className={galleryLoading ? 'animate-spin' : ''}
                  />
                  刷新
                </button>
              </div>

              <div
                className={
                  galleryLoading && gallery.length === 0
                    ? 'flex justify-center py-12'
                    : 'hidden'
                }
              >
                <span className="loading loading-spinner" />
              </div>

              <div
                className={
                  !galleryLoading && gallery.length === 0
                    ? 'rounded-xl border border-dashed border-base-300 py-12 text-center text-xs opacity-60'
                    : 'hidden'
                }
              >
                暂无工作台图片
              </div>

              <div
                className={
                  gallery.length > 0
                    ? 'grid grid-cols-2 gap-3 md:grid-cols-3'
                    : 'hidden'
                }
              >
                {gallery.map((item) => {
                  const src = galleryImageUrl(item);

                  return (
                    <article
                      key={item.r2_key}
                      className="relative overflow-hidden rounded-xl border border-base-300 bg-base-100"
                    >
                      <button
                        type="button"
                        className="block w-full"
                        onClick={() => openViewer(item)}
                      >
                        <img
                          src={src}
                          alt={item.prompt || '工作台图片'}
                          loading="lazy"
                          className="aspect-square w-full object-cover"
                        />
                      </button>

                      <button
                        type="button"
                        className="btn btn-error btn-circle btn-xs absolute right-2 top-2"
                        onClick={() => void deleteGalleryImage(item)}
                        aria-label="删除图片"
                      >
                        <Trash2 size={13} />
                      </button>

                      <div className="space-y-1 p-2">
                        <div className="truncate text-[10px] opacity-70">
                          {item.prompt || '无提示词'}
                        </div>
                        <div className="text-[9px] opacity-45">
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
      </div>

      <div
        className={viewerOpen ? 'modal modal-open' : 'modal'}
        aria-hidden={!viewerOpen}
      >
        <div className="modal-box max-w-5xl">
          <img
            src={viewerSrc || undefined}
            alt="画廊图片预览"
            className="max-h-[75vh] w-full object-contain"
          />

          <div className="modal-action">
            <button type="button" className="btn" onClick={closeViewer}>
              关闭
            </button>
          </div>
        </div>

        <button
          type="button"
          className="modal-backdrop"
          onClick={closeViewer}
          aria-label="关闭预览"
        />
      </div>
    </div>
  );
}
