import { Book, BookOpen, Eraser, Menu, Pencil, RefreshCw, Users } from 'lucide-react';
import type { ApiPreset, Character, Room } from '../../lib/db';
import type { ViewMode } from '../../lib/store';

type AppHeaderProps = {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  desktopSidebarOpen: boolean;
  setDesktopSidebarOpen: (open: boolean) => void;
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
  desktopSidebarOpen,
  setDesktopSidebarOpen,
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

  return (
    <div className="safe-pt z-20 shrink-0 border-b border-base-300 bg-base-100">
      <div className="navbar min-h-[3rem] px-2 md:px-4">
        <div className="flex-none md:hidden">
          <button className="btn btn-square btn-sm btn-ghost" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu size={20} />
          </button>
        </div>
        <div className="hidden flex-none md:block">
          <button
            className="btn btn-square btn-sm btn-ghost"
            onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
            title={desktopSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <Menu size={20} />
          </button>
        </div>
        <div className="flex-1 truncate px-2 text-base font-bold md:text-lg">{title}</div>
      </div>

      <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto px-3 pb-2">
        <select
          className="select select-bordered select-xs shrink-0 md:select-sm"
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
            className="select select-bordered select-xs join-item max-w-[8rem] md:max-w-[10rem] md:select-sm"
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
            className={`btn btn-xs join-item btn-ghost md:btn-sm ${isFetchingModels ? 'loading' : ''}`}
            title="Refresh models"
            onClick={onRefreshModels}
            disabled={!activePresetId}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="ml-auto flex shrink-0 gap-1 border-l border-base-300 pl-2">
          {viewMode !== 'image' && (
            <button
              className="btn btn-xs btn-ghost text-error md:btn-sm"
              title="Clear conversation"
              onClick={onClearConversation}
            >
              <Eraser size={16} />
            </button>
          )}

          {(viewMode === 'char' || viewMode === 'group') && (selectedCharId || selectedRoomId) && (
            <button
              className="btn btn-xs btn-ghost text-info md:btn-sm"
              title="Summarize progress"
              onClick={onSummarizeProgress}
            >
              <BookOpen size={16} />
            </button>
          )}

          {viewMode === 'char' && selectedCharId && (
            <>
              <button className="btn btn-xs btn-ghost text-warning md:btn-sm" title="Lorebook" onClick={onOpenLorebook}>
                <Book size={16} />
              </button>
              <button className="btn btn-xs btn-primary md:btn-sm" onClick={onOpenCharEdit}>
                <Pencil size={16} />
              </button>
            </>
          )}

          {viewMode === 'group' && selectedRoomId && (
            <button className="btn btn-xs btn-secondary md:btn-sm" title="Room settings" onClick={onOpenGroupEdit}>
              <Users size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
