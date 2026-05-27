import { X } from 'lucide-react';
import { LorebookManager } from '../lorebook/LorebookManager';

type LorebookModalProps = {
  show: boolean;
  charId?: number;
  onClose: () => void;
};

export function LorebookModal({ show, charId, onClose }: LorebookModalProps) {
  if (!show || !charId) return null;

  return (
    <div className="modal modal-open text-base-content">
      <div className="modal-box flex h-[75vh] max-w-2xl flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b bg-base-200 p-4 font-bold">
          涓栫晫涔?(Worldbook)
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          <LorebookManager charId={charId} />
        </div>
      </div>
    </div>
  );
}
