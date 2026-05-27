import { Copy, Image as ImageIcon, Plus, Settings as SettingsIcon, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { api } from '../../lib/db';
import { useAppStore } from '../../lib/store';

type SidebarProps = {
  setMobileMenuOpen: (open: boolean) => void;
  setShowSettings: (open: boolean) => void;
};

export function Sidebar({ setMobileMenuOpen, setShowSettings }: SidebarProps) {
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
  } = useAppStore(useShallow((state) => ({
    viewMode: state.viewMode,
    characters: state.characters,
    rooms: state.rooms,
    selectedCharId: state.selectedCharId,
    selectedRoomId: state.selectedRoomId,
    setViewMode: state.setViewMode,
    setSelectedCharId: state.setSelectedCharId,
    setSelectedRoomId: state.setSelectedRoomId,
    loadData: state.loadData,
  })));

  return (
    <div className="flex h-full w-80 flex-col overflow-hidden border-r border-base-content/10 bg-base-200 p-4 shadow-xl">
      <div className="mb-6 flex items-center justify-between pl-2">
        <h2 className="text-xl font-black tracking-tight text-primary">SimpleRP Cloud</h2>
        <button className="btn btn-ghost btn-xs md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <X />
        </button>
      </div>

      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab flex-1 transition-all ${viewMode === 'char' ? 'tab-active font-bold' : ''}`}
          onClick={() => setViewMode('char')}
        >
          单人
        </button>
        <button
          className={`tab flex-1 transition-all ${viewMode === 'group' ? 'tab-active font-bold' : ''}`}
          onClick={() => setViewMode('group')}
        >
          剧场
        </button>
        <button
          className={`tab flex-1 transition-all ${viewMode === 'image' ? 'tab-active font-bold' : ''}`}
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
                className={`group flex cursor-pointer items-center justify-between rounded-xl p-3 ${
                  selectedCharId === character.id
                    ? 'bg-primary text-primary-content shadow-lg'
                    : 'hover:bg-base-300'
                }`}
              >
                <span className="max-w-[140px] truncate font-bold">{character.name}</span>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="p-1 hover:text-info"
                    title="创建副本"
                    onClick={async (event) => {
                      event.stopPropagation();
                      const newName = prompt('新角色名称:', `${character.name} (Copy)`);
                      if (!newName || !character.id) return;
                      await api.characters.duplicate(character.id, newName);
                      await loadData();
                    }}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="p-1 hover:text-error"
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
                  className={`group flex cursor-pointer items-center justify-between rounded-xl p-3 ${
                    selectedRoomId === room.id
                      ? 'bg-secondary text-secondary-content shadow-lg'
                      : 'hover:bg-base-300'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-bold">{room.name}</span>
                  </div>
                  <Trash2
                    size={14}
                    className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-error"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!room.id) return;
                      if (!confirm(`删除房间 ${room.name}？`)) return;
                      api.rooms.delete(room.id).then(() => loadData());
                    }}
                  />
                </div>
              ))
            : (
                <div className="rounded-xl border border-base-300 bg-base-100/40 p-3 text-xs leading-relaxed">
                  <div className="mb-2 flex items-center gap-2 font-black">
                    <ImageIcon size={16} />
                    生图工作台
                  </div>
                  <div>支持本地 ComfyUI 异步穿透生图，以及 OpenAI 兼容端点生图。</div>
                </div>
              )}

        {(viewMode === 'char' || viewMode === 'group') && (
          <button
            className="btn btn-outline btn-sm btn-block mt-4 border-dashed"
            onClick={async () => {
              const name = prompt('名称?');
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
          className="btn btn-ghost btn-sm btn-block justify-start"
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
