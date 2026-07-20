import { Sparkles, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { ComfyWorkflowSelector } from '../comfyui/ComfyWorkflowSelector';
import {
  buildInitialLoraSelections,
  cloneLoraSelections,
  findComfyWorkflow,
  getDefaultComfyWorkflowId,
} from '../../lib/comfyui-workflows';
import {
  api,
  type ComfyWorkflowLoraSelection,
  type Message,
  type RoomMessage,
  type Settings,
} from '../../lib/db';
import { composeImagePrompt, getActivePromptProfile } from '../../lib/prompt-profiles';
import { useAppStore } from '../../lib/store';

type ImagePromptModalProps = {
  show: boolean;
  prompt: string;
  useSdPromptConversion: boolean;
  settings?: Settings;
  onPromptChange: (value: string) => void;
  onUseSdPromptConversionChange: (checked: boolean) => void;
  onConfirm: (options?: {
    comfyWorkflowId?: string;
    comfyLoraSelections?: Record<string, ComfyWorkflowLoraSelection>;
  }) => void;
  onClose: () => void;
};

type GenerationMode = 'txt2img' | 'img2img';

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [loraSelections, setLoraSelections] = useState<Record<string, ComfyWorkflowLoraSelection>>({});

  const backendLabel = useMemo(
    () =>
      settings?.image_backend === 'openai'
        ? '阿里云百练 / OpenAI 兼容'
        : settings?.image_backend === 'modelscope'
          ? 'ModelScope'
          : 'ComfyUI',
    [settings?.image_backend],
  );

  useEffect(() => {
    const nextWorkflowId = getDefaultComfyWorkflowId(settings, 'quick', mode);
    setSelectedWorkflowId(nextWorkflowId);
    setLoraSelections(buildInitialLoraSelections(findComfyWorkflow(settings, nextWorkflowId)));
  }, [settings, mode, show]);

  if (!show) return null;

  const resetAndClose = () => {
    setSourceImage('');
    setSourceName('');
    setError('');
    setLoading(false);
    onClose();
  };

  const persistWorkflowSelection = async (workflowId: string) => {
    const currentSettings = useAppStore.getState().settings;
    if (!currentSettings) return;
    const key =
      mode === 'img2img'
        ? 'comfyui_quick_img2img_workflow_id'
        : 'comfyui_quick_txt2img_workflow_id';
    const nextSettings = { ...currentSettings, [key]: workflowId };
    useAppStore.getState().setSettings(nextSettings);
    await api.settings.update(nextSettings);
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

  const saveConversationMessage = async (imageUrl: string) => {
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
      await api.messages.add(message);
      window.dispatchEvent(new CustomEvent('simplerp:reload-conversation', {
        detail: { viewMode: 'char', charId: state.selectedCharId },
      }));
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
      window.dispatchEvent(new CustomEvent('simplerp:reload-conversation', {
        detail: { viewMode: 'group', roomId: state.selectedRoomId },
      }));
    }
  };

  const runImg2Img = async () => {
    if (!sourceImage) {
      setError('请先上传原图。');
      return;
    }
    if (!prompt.trim()) {
      setError('请输入图片编辑指令。');
      return;
    }

    const state = useAppStore.getState();
    const currentSettings = settings || state.settings;
    if (!currentSettings) {
      setError('设置尚未加载。');
      return;
    }

    const backend = currentSettings.image_backend || 'huggingface';
    const preset =
      state.presets.find((item) => item.id === currentSettings.image_preset_id) ||
      state.presets.find((item) => item.id === state.activePresetId);
    const model = currentSettings.image_model_id || state.activeModel;
    const promptProfile = getActivePromptProfile(currentSettings);
    if (!model) {
      setError('请先在系统设置中配置图片模型。');
      return;
    }

    const body: Record<string, unknown> = {
      backend,
      model,
      prompt: composeImagePrompt(promptProfile, prompt),
      image: sourceImage,
      strength,
      char_id: state.viewMode === 'char' ? state.selectedCharId : undefined,
      room_id: state.viewMode === 'group' ? state.selectedRoomId : undefined,
      storage_scope: 'chat',
      comfy_workflow: findComfyWorkflow(currentSettings, selectedWorkflowId),
      comfy_lora_selection: cloneLoraSelections(loraSelections),
    };

    if (backend === 'huggingface') {
      body.apiKey = currentSettings.hf_keys;
    } else if (backend === 'modelscope') {
      body.apiKey = currentSettings.modelscope_api_key;
    } else {
      if (!preset) {
        setError('请先配置生图预设。');
        return;
      }
      body.apiBase = preset.api_base;
      body.apiKey = preset.api_key;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/image-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || '图生图失败。');
      const imageUrl = Array.isArray(data?.urls) ? data.urls[0] : '';
      if (!imageUrl) throw new Error('图生图完成，但没有返回图片。');

      await saveConversationMessage(imageUrl);

      // Do not push a temporary object into React state. Close and release Base64 first.
      resetAndClose();
    } catch (nextError: any) {
      setError(nextError?.message || '图生图失败。');
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open text-base-content">
      <div className="modal-box max-w-3xl">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
          <Sparkles /> 图片生成
        </h3>

        <div className="tabs tabs-boxed mb-4">
          <button className={`tab flex-1 ${mode === 'txt2img' ? 'tab-active' : ''}`} onClick={() => setMode('txt2img')}>
            文生图
          </button>
          <button className={`tab flex-1 ${mode === 'img2img' ? 'tab-active' : ''}`} onClick={() => setMode('img2img')}>
            图生图
          </button>
        </div>

        {mode === 'img2img' && (
          <div className="mb-4 space-y-3">
            {!sourceImage ? (
              <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-base-300 bg-base-200/40 p-6">
                <Upload className="mb-3 text-primary" />
                <span className="font-bold">上传原图</span>
                <span className="text-xs opacity-60">PNG / JPEG / WebP，最大 10 MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleSourceChange} />
              </label>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-base-300">
                <img src={sourceImage} className="max-h-64 w-full object-contain" />
                <button className="btn btn-circle btn-sm absolute right-2 top-2" onClick={() => { setSourceImage(''); setSourceName(''); }}>
                  <X size={15} />
                </button>
                <div className="truncate border-t border-base-300 p-2 text-xs opacity-60">{sourceName}</div>
              </div>
            )}

            {settings?.image_backend !== 'openai' && (
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-bold">重绘强度：{strength.toFixed(2)}</span>
                <input type="range" min="0.1" max="1" step="0.05" value={strength} className="range range-primary range-sm" onChange={(event) => setStrength(Number(event.target.value))} />
              </label>
            )}
          </div>
        )}

        <textarea
          className="textarea textarea-bordered h-32 w-full"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={mode === 'img2img' ? '输入编辑指令...' : '描述你想生成的画面...'}
        />

        <div className="mt-3">
          <ComfyWorkflowSelector
            settings={settings}
            mode={mode}
            workflowId={selectedWorkflowId}
            loraSelections={loraSelections}
            compact
            disabled={loading}
            onWorkflowChange={(workflowId, nextSelections) => {
              setSelectedWorkflowId(workflowId);
              setLoraSelections(nextSelections);
              void persistWorkflowSelection(workflowId);
            }}
            onLoraSelectionsChange={setLoraSelections}
          />
        </div>

        {mode === 'txt2img' && (
          <div className="mt-3 flex items-center gap-4 text-xs">
            <label className="flex cursor-pointer items-center gap-2 font-bold">
              <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={useSdPromptConversion} onChange={(event) => onUseSdPromptConversionChange(event.target.checked)} />
              启用提示词转换
            </label>
            <span className="opacity-70">后端：<b>{backendLabel}</b></span>
          </div>
        )}

        {error && <div className="alert alert-error mt-4 py-2 text-sm">{error}</div>}

        <div className="modal-action flex gap-2">
          <button
            className="btn btn-primary flex-1"
            disabled={loading}
            onClick={
              mode === 'img2img'
                ? runImg2Img
                : () =>
                    onConfirm({
                      comfyWorkflowId: selectedWorkflowId,
                      comfyLoraSelections: cloneLoraSelections(loraSelections),
                    })
            }
          >
            {loading && <span className="loading loading-spinner loading-sm" />}
            {mode === 'img2img' ? '开始图生图' : '开始生成'}
          </button>
          <button className="btn flex-1" disabled={loading} onClick={resetAndClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
