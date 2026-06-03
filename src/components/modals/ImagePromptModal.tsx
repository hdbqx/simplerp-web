import { Sparkles } from 'lucide-react';
import type { Settings } from '../../lib/db';

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
  if (!show) return null;

  return (
    <div className="modal modal-open text-base-content">
      <div className="modal-box">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
          <Sparkles /> 图片生成
        </h3>
        <textarea
          className="textarea textarea-bordered h-32 w-full text-base"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="描述你想生成的画面细节，支持自然语言输入..."
        />
        <div className="mt-3 flex items-center gap-4 text-xs">
          <label className="flex cursor-pointer items-center gap-2 font-bold">
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-sm"
              checked={useSdPromptConversion}
              onChange={(event) => onUseSdPromptConversionChange(event.target.checked)}
            />
            启用提示词转换
          </label>
          <span className="opacity-70">
            后端：
            <b>
              {settings?.image_backend === 'openai'
                ? 'OpenAI / 百练'
                : settings?.image_backend === 'modelscope'
                  ? 'ModelScope'
                  : 'ComfyUI'}
            </b>
          </span>
        </div>
        <div className="modal-action flex gap-2">
          <button className="btn btn-primary flex-1 shadow-lg" onClick={onConfirm}>
            开始生成
          </button>
          <button className="btn flex-1" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
