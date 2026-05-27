import { Book, BookOpen, Eraser, Menu, Pencil, RefreshCw, Users } from 'lucide-react';
import type { ApiPreset, Character, Room } from '../../lib/db';
import type { ViewMode } from '../../lib/store';

type AppHeaderProps = {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  viewMode: ViewMode;
  characters: Character[];
  rooms: Room[];
  selectedCharId?: number;
  selectedRoomId?: number;
  activePresetId?: number;
  activeModel?: string;
  presets: ApiPreset[];
  manualModels: string[];
  availableModels: string[];
  isFetchingModels: boolean;
  onPresetChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onRefreshModels: () => void;
  onClearConversation: () => void;
  onSummarizeProgress: () => void;
  onOpenLorebook: () => void;
  onOpenCharEdit: () => void;
  onOpenGroupEdit: () => void;
};

export function AppHeader({
  mobileMenuOpen,
  setMobileMenuOpen,
  viewMode,
  characters,
  rooms,
  selectedCharId,
  selectedRoomId,
  activePresetId,
  activeModel,
  presets,
  manualModels,
  availableModels,
  isFetchingModels,
  onPresetChange,
  onModelChange,
  onRefreshModels,
  onClearConversation,
  onSummarizeProgress,
  onOpenLorebook,
  onOpenCharEdit,
  onOpenGroupEdit,
}: AppHeaderProps) {
  const title =
    viewMode === 'image'
      ? 'Image Studio'
      : (viewMode === 'char'
          ? characters.find((character) => character.id === selectedCharId)?.name
          : rooms.find((room) => room.id === selectedRoomId)?.name) || 'SimpleRP';

  const subtitle =
    viewMode === 'char' ? '单人会话' : viewMode === 'group' ? '群组会话' : '绘图工作台';

  return (
    <div className="safe-pt z-20 shrink-0 border-b border-base-300/70 bg-base-100/88 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="navbar min-h-[3.5rem] px-2 md:px-4">
        <div className="flex-none md:hidden">
          <button
            className="btn btn-square btn-sm rounded-2xl border border-base-300/70 bg-base-100/70 shadow-sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="min-w-0 flex-1 px-2">
          <div className="truncate text-base font-black tracking-tight md:text-lg">{title}</div>
          <div className="hidden text-[11px] uppercase tracking-[0.18em] text-base-content/45 md:block">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3 md:flex-row md:items-center md:gap-3 md:px-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex md:shrink-0">
          <select
            className="select select-bordered select-sm min-w-0 rounded-2xl border-base-300/70 bg-base-100/75 text-xs shadow-sm md:w-52"
            value={activePresetId || ''}
            onChange={(event) => onPresetChange(event.target.value)}
          >
            <option value="" disabled>
              Select preset...
            </option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>

          <div className="join shrink-0">
            <select
              className="select select-bordered select-sm join-item min-w-0 rounded-l-2xl border-base-300/70 bg-base-100/75 text-xs shadow-sm md:w-56"
              value={activeModel || ''}
              onChange={(event) => onModelChange(event.target.value)}
              disabled={!activePresetId}
            >
              {manualModels.length === 0 && availableModels.length === 0 && <option value="">No models</option>}
              {manualModels.length > 0 && (
                <optgroup label="Manual">
                  {manualModels.map((model) => (
                    <option key={`man-${model}`} value={model}>
                      {model}
                    </option>
                  ))}
                </optgroup>
              )}
              {availableModels.length > 0 && (
                <optgroup label="Detected">
                  {availableModels.map((model) => (
                    <option key={`auto-${model}`} value={model}>
                      {model}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              className={`btn btn-sm join-item rounded-r-2xl border border-base-300/70 bg-base-100/75 ${isFetchingModels ? 'loading' : ''}`}
              title="Refresh models"
              onClick={onRefreshModels}
              disabled={!activePresetId}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:ml-auto md:justify-end">
          {viewMode !== 'image' && (
            <button
              className="btn btn-sm rounded-2xl border border-base-300/70 bg-base-100/75 text-error shadow-sm"
              title="Clear conversation"
              onClick={onClearConversation}
            >
              <Eraser size={16} />
            </button>
          )}

          {(viewMode === 'char' || viewMode === 'group') && (selectedCharId || selectedRoomId) && (
            <button
              className="btn btn-sm rounded-2xl border border-base-300/70 bg-base-100/75 text-info shadow-sm"
              title="Summarize progress"
              onClick={onSummarizeProgress}
            >
              <BookOpen size={16} />
            </button>
          )}

          {viewMode === 'char' && selectedCharId && (
            <>
              <button
                className="btn btn-sm rounded-2xl border border-base-300/70 bg-base-100/75 text-warning shadow-sm"
                title="Lorebook"
                onClick={onOpenLorebook}
              >
                <Book size={16} />
              </button>
              <button className="btn btn-sm rounded-2xl shadow-md" onClick={onOpenCharEdit}>
                <Pencil size={16} />
              </button>
            </>
          )}

          {viewMode === 'group' && selectedRoomId && (
            <button className="btn btn-sm rounded-2xl shadow-md" title="Room settings" onClick={onOpenGroupEdit}>
              <Users size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
