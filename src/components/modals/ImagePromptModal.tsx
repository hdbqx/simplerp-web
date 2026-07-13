import { ImagePlus, Sparkles, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { api, type Message, type RoomMessage, type Settings } from '../../lib/db';
import { useChatStore } from '../../lib/chat-store';
import { useAppStore } from '../../lib/store';

type ImagePromptModalProps = {
  show: boolean;
  prompt: string;
  useSdPromptConversion: boolean;
  settings?: Settings;
  onPromptChange: (value: string) => void;
  onUseSdPromptConversionChange: (checked: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
};

type GenerationMode = 'txt2img' | 'img2img';

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

export function ImagePromptModal({
  show,
  prompt,
  useSdPromptConversion,
  settings,
  onPromptChange,
  onUseSdPromptConversionChange,
  onConfirm,
  onClose,
}: ImagePromptModalProps) {
  const [mode, setMode] = useState<GenerationMode>('txt2img');
  const [sourceImage, setSourceImage] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [strength, setStrength] = useState(0.65);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  const backendLabel = useMemo(
    () =>
      settings?.image_backend === 'openai'
        ? '阿里云百练 / OpenAI 兼容'
        : settings?.image_backend === 'modelscope'
          ? 'ModelScope'
          : 'ComfyUI',
    [settings?.image_backend],
  );

  const isBailianBackend = useMemo(() => {
    if (settings?.image_backend !== 'openai') return false;
    const state = useAppStore.getState();
    const preset =
      state.presets.find((item) => item.id === settings.image_preset_id) ||
      state.presets.find((item) => item.id === state.activePresetId);
    const model = (settings.image_model_id || state.activeModel || '').toLowerCase();
    const apiBase = (preset?.api_base || '').toLowerCase();
    return model.startsWith('qwen-image-edit') || apiBase.includes('dashscope') || apiBase.includes('aliyuncs.com');
  }, [settings]);

  useEffect(() => {
    if (!show) {
      setEditError('');
      setResultUrl('');
      setIsEditing(false);
    }
  }, [show]);

  if (!show) return null;

  const clearSource = () => {
    setSourceImage('');
    setSourceName('');
    setResultUrl('');
    setEditError('');
  };

  const handleSourceChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEditError('请选择图片文件。');
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      setEditError('原图不能超过 10 MB。');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setSourceImage(dataUrl);
      setSourceName(file.name);
      setResultUrl('');
      setEditError('');
    } catch (error: any) {
      setEditError(error?.message || '读取图片失败。');
    }
  };

  const saveResultToConversation = async (imageUrl: string) => {
    const state = useAppStore.getState();
    const timestamp = Date.now();

    if (state.viewMode === 'char' && state.selectedCharId) {
      const message: Message = {
        role: 'assistant',
        content: '',
        image: imageUrl,
        timestamp,
        char_id: state.selectedCharId,
      };
      const saved = await api.messages.add(message);
      useChatStore.getState().setMessages((current) => [...current, { ...message, id: saved.id }]);
      return;
    }

    if (state.viewMode === 'group' && state.selectedRoomId) {
      const message: RoomMessage = {
        room_id: state.selectedRoomId,
        role: 'assistant',
        sender_type: 'agent',
        content: '',
        image: imageUrl,
        timestamp,
      };
      await api.roomMessages.add(message);
      window.dispatchEvent(
        new CustomEvent('simplerp:conversation-image-added', {
          detail: { viewMode: 'group', roomId: state.selectedRoomId },
        }),
      );
    }
  };

  const handleImg2Img = async () => {
    if (!sourceImage) {
      setEditError('请先上传原图。');
      return;
    }
    if (!prompt.trim()) {
      setEditError('请输入希望如何修改图片。');
      return;
    }

    const state = useAppStore.getState();
    const currentSettings = settings || state.settings;
    if (!currentSettings) {
      setEditError('设置尚未加载。');
      return;
    }

    const imageBackend = currentSettings.image_backend || 'huggingface';
    const imagePreset =
      state.presets.find((preset) => preset.id === currentSettings.image_preset_id) ||
      state.presets.find((preset) => preset.id === state.activePresetId);
    const imageModel = currentSettings.image_model_id || state.activeModel;

    const request: Record<string, unknown> = {
      backend: imageBackend,
      prompt: `${prompt.trim()}\n${SINGLE_IMAGE_HINT}`,
      image: sourceImage,
      strength,
      char_id: state.viewMode === 'char' ? state.selectedCharId : undefined,
      room_id: state.viewMode === 'group' ? state.selectedRoomId : undefined,
      storage_scope: 'chat',
    };

    if (imageBackend === 'huggingface') {
      if (!currentSettings.hf_keys) {
        setEditError('请先在设置中填写 ComfyUI 穿透地址。');
        return;
      }
      request.apiKey = currentSettings.hf_keys;
      request.model = 'comfyui-local';
    } else if (imageBackend === 'modelscope') {
      if (!currentSettings.modelscope_api_key) {
        setEditError('请先在设置中填写 ModelScope 接口密钥。');
        return;
      }
      request.apiKey = currentSettings.modelscope_api_key;
      request.model = currentSettings.modelscope_model || 'Tongyi-MAI/Z-Image-Turbo';
    } else {
      if (!imagePreset) {
        setEditError('请先配置生图预设。');
        return;
      }
      request.apiBase = imagePreset.api_base;
      request.apiKey = imagePreset.api_key;
      request.model = imageModel || 'qwen-image-edit-plus';
    }

    setIsEditing(true);
    setEditError('');
    setResultUrl('');

    try {
      const response = await fetch('/api/image-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || '图生图后端没有正确返回结果。');
      }

      const nextUrl = Array.isArray(data?.urls) ? data.urls[0] : '';
      if (!nextUrl) throw new Error('生成完成，但未返回图片。');

      await saveResultToConversation(nextUrl);
      setResultUrl(nextUrl);
    } catch (error: any) {
      setEditError(error?.message || '图生图失败。');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="modal modal-open text-base-content">
      <div className="modal-box max-w-3xl">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
          <Sparkles /> 图片生成
        </h3>

        <div className="tabs tabs-boxed mb-4">
          <button type="button" className={`tab flex-1 ${mode === 'txt2img' ? 'tab-active' : ''}`} onClick={() => setMode('txt2img')}>
            文生图
          </button>
          <button type="button" className={`tab flex-1 ${mode === 'img2img' ? 'tab-active' : ''}`} onClick={() => setMode('img2img')}>
            图生图
          </button>
        </div>

        {mode === 'img2img' && (
          <div className="mb-4 space-y-3">
            {!sourceImage ? (
              <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-base-300 bg-base-200/40 p-6 text-center transition hover:border-primary/60">
                <Upload className="mb-3 h-8 w-8 text-primary" />
                <span className="font-bold">上传原图</span>
                <span className="mt-1 text-xs opacity-60">支持 PNG、JPEG、WebP，最大 10 MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleSourceChange} />
              </label>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-base-300 bg-base-200">
                <img src={sourceImage} alt="图生图原图预览" className="max-h-72 w-full object-contain" />
                <button type="button" className="btn btn-circle btn-sm absolute right-3 top-3" onClick={clearSource} aria-label="移除原图">
                  <X className="h-4 w-4" />
                </button>
                <div className="truncate border-t border-base-300 px-3 py-2 text-xs opacity-70">{sourceName}</div>
              </div>
            )}

            {!isBailianBackend && (
              <label className="form-control">
                <div className="label">
                  <span className="label-text font-bold">重绘强度</span>
                  <span className="label-text-alt">{strength.toFixed(2)}</span>
                </div>
                <input type="range" min="0.1" max="1" step="0.05" value={strength} className="range range-primary range-sm" onChange={(event) => setStrength(Number(event.target.value))} />
              </label>
            )}

            {isBailianBackend && (
              <div className="alert py-2 text-xs">
                百练图像编辑直接理解原图与编辑指令，不使用传统重绘强度参数。
              </div>
            )}
          </div>
        )}

        <textarea
          className="textarea textarea-bordered h-32 w-full text-base"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={mode === 'img2img' ? '描述希望如何修改原图，例如：保持人物姿势，将背景改为雨夜霓虹街道...' : '描述你想生成的画面细节，支持自然语言输入...'}
        />

        {mode === 'txt2img' && (
          <div className="mt-3 flex items-center gap-4 text-xs">
            <label className="flex cursor-pointer items-center gap-2 font-bold">
              <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={useSdPromptConversion} onChange={(event) => onUseSdPromptConversionChange(event.target.checked)} />
              启用提示词转换
            </label>
            <span className="opacity-70">后端：<b>{backendLabel}</b></span>
          </div>
        )}

        {mode === 'img2img' && <div className="mt-3 text-xs opacity-70">生成结果会保存并立即添加到当前对话记录。</div>}
        {editError && <div className="alert alert-error mt-4 py-2 text-sm">{editError}</div>}

        {resultUrl && (
          <div className="mt-4 rounded-2xl border border-success/30 bg-success/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-success">
              <ImagePlus className="h-4 w-4" /> 图生图完成，已加入对话
            </div>
            <img src={resultUrl} alt="图生图结果" className="max-h-80 w-full rounded-xl object-contain" />
          </div>
        )}

        <div className="modal-action flex gap-2">
          <button className="btn btn-primary flex-1 shadow-lg" onClick={mode === 'img2img' ? handleImg2Img : onConfirm} disabled={isEditing}>
            {isEditing ? <><span className="loading loading-spinner loading-sm" /> 正在重绘</> : mode === 'img2img' ? '开始图生图' : '开始生成'}
          </button>
          <button className="btn flex-1" onClick={onClose} disabled={isEditing}>取消</button>
        </div>
      </div>
    </div>
  );
}
