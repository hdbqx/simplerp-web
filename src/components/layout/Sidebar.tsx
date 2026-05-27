import { Copy, Image as ImageIcon, Plus, Settings as SettingsIcon, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { api } from '../../lib/db';
import { useAppStore } from '../../lib/store';

type SidebarProps = {
  setMobileMenuOpen: (open: boolean) => void;
  setDesktopSidebarOpen: (open: boolean) => void;
  setShowSettings: (open: boolean) => void;
};

export function Sidebar({ setMobileMenuOpen, setDesktopSidebarOpen, setShowSettings }: SidebarProps) {
  const {
    viewMode,
    characters,
    rooms,
    selectedCharId,
    selectedRoomId,
    setViewMode,
    setSelectedCharId,
    setSelectedRoomId,
    loadData,
  } = useAppStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      characters: state.characters,
      rooms: state.rooms,
      selectedCharId: state.selectedCharId,
      selectedRoomId: state.selectedRoomId,
      setViewMode: state.setViewMode,
      setSelectedCharId: state.setSelectedCharId,
      setSelectedRoomId: state.setSelectedRoomId,
      loadData: state.loadData,
    })),
  );

  return (
    <div className="safe-pb safe-pt flex h-full w-[84vw] max-w-80 flex-col overflow-hidden border-r border-base-content/10 bg-base-200 p-4 shadow-xl md:w-80">
      <div className="mb-6 flex items-center justify-between pl-1">
        <div>
          <h2 className="text-xl font-black tracking-tight text-primary">SimpleRP Cloud</h2>
          <div className="text-[11px] uppercase tracking-[0.22em] text-base-content/45">Roleplay Console</div>
        </div>
        <button
          className="btn btn-ghost btn-sm rounded-2xl"
          onClick={() => {
            setMobileMenuOpen(false);
            setDesktopSidebarOpen(false);
          }}
        >
          <X />
        </button>
      </div>

      <div className="tabs tabs-boxed mb-6 rounded-2xl bg-base-100 p-1 shadow-inner">
        <button
          className={`tab flex-1 rounded-xl transition-all ${viewMode === 'char' ? 'tab-active font-bold' : ''}`}
          onClick={() => setViewMode('char')}
        >
          角色
        </button>
        <button
          className={`tab flex-1 rounded-xl transition-all ${viewMode === 'group' ? 'tab-active font-bold' : ''}`}
          onClick={() => setViewMode('group')}
        >
          群聊
        </button>
        <button
          className={`tab flex-1 rounded-xl transition-all ${viewMode === 'image' ? 'tab-active font-bold' : ''}`}
          onClick={() => setViewMode('image')}
        >
          生图
        </button>
      </div>

      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1 text-base-content">
        {viewMode === 'char'
          ? characters.map((character) => (
              <div
                key={character.id}
                onClick={() => {
                  setSelectedCharId(character.id);
                  setMobileMenuOpen(false);
                }}
                className={`group flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all ${
                  selectedCharId === character.id
                    ? 'border-primary/40 bg-primary text-primary-content shadow-lg shadow-primary/20'
                    : 'border-base-300 bg-base-100 hover:-translate-y-0.5 hover:bg-base-300'
                }`}
              >
                <span className="max-w-[140px] truncate font-bold">{character.name}</span>
                <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    className="rounded-lg p-1.5 hover:bg-black/10 hover:text-info"
                    title="复制"
                    onClick={async (event) => {
                      event.stopPropagation();
                      const newName = prompt('新角色名？', `${character.name}（副本）`);
                      if (!newName || !character.id) return;
                      await api.characters.duplicate(character.id, newName);
                      await loadData();
                    }}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="rounded-lg p-1.5 hover:bg-black/10 hover:text-error"
                    title="删除"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!character.id) return;
                      if (!confirm(`删除角色 ${character.name}？`)) return;
                      api.characters.delete(character.id).then(() => loadData());
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          : viewMode === 'group'
            ? rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`group flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all ${
                    selectedRoomId === room.id
                      ? 'border-secondary/40 bg-secondary text-secondary-content shadow-lg shadow-secondary/20'
                      : 'border-base-300 bg-base-100 hover:-translate-y-0.5 hover:bg-base-300'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-bold">{room.name}</span>
                  </div>
                  <button
                    className="rounded-lg p-1.5 opacity-100 transition-opacity hover:bg-black/10 hover:text-error md:opacity-0 md:group-hover:opacity-100"
                    title="删除"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!room.id) return;
                      if (!confirm(`删除房间 ${room.name}？`)) return;
                      api.rooms.delete(room.id).then(() => loadData());
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            : (
                <div className="rounded-2xl border border-base-300 bg-base-100 p-4 text-xs leading-relaxed shadow-sm">
                  <div className="mb-2 flex items-center gap-2 font-black">
                    <ImageIcon size={16} />
                    生图工作台
                  </div>
                  <div>
                    可以基于最近对话生成图片，也可以在系统设置里切换不同生图后端。
                  </div>
                </div>
              )}

        {(viewMode === 'char' || viewMode === 'group') && (
          <button
            className="btn btn-outline btn-sm btn-block mt-4 rounded-2xl border-dashed bg-base-100"
            onClick={async () => {
              const name = prompt('名称？');
              if (!name) return;
              if (viewMode === 'char') {
                await api.characters.add({ name, description: '', first_message: '你好', summary: '' });
              } else {
                await api.rooms.add({ name, description: '' });
              }
              await loadData();
            }}
          >
            <Plus size={16} /> 新建
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-base-content/10 pt-4">
        <button
          className="btn btn-ghost btn-sm btn-block justify-start rounded-2xl"
          onClick={() => {
            setShowSettings(true);
            setMobileMenuOpen(false);
          }}
        >
          <SettingsIcon size={16} /> 系统设置
        </button>
      </div>
    </div>
  );
}
