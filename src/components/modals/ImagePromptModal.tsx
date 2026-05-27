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
          <Sparkles /> 鏋侀€熺敓鍥?
        </h3>
        <textarea
          className="textarea textarea-bordered h-32 w-full text-base"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="鎻忚堪浣犳兂鐢熸垚鐨勭敾闈㈢粏鑺傦紝鏀寔鑷劧璇█..."
        />
        <div className="mt-3 flex items-center gap-4 text-xs">
          <label className="flex cursor-pointer items-center gap-2 font-bold">
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-sm"
              checked={useSdPromptConversion}
              onChange={(event) => onUseSdPromptConversionChange(event.target.checked)}
            />
            鑷姩鎵╁啓璇嶆潯
          </label>
          <span className="opacity-70">
            鍚庣锛?
            <b>
              {settings?.image_backend === 'openai'
                ? 'OpenAI'
                : settings?.image_backend === 'modelscope'
                  ? 'ModelScope'
                  : 'ComfyUI'}
            </b>
          </span>
        </div>
        <div className="modal-action flex gap-2">
          <button className="btn btn-primary flex-1 shadow-lg" onClick={onConfirm}>
            寮€濮嬬敓鎴?
          </button>
          <button className="btn flex-1" onClick={onClose}>
            鍙栨秷
          </button>
        </div>
      </div>
    </div>
  );
}
