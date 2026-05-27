import type { Dispatch, SetStateAction } from 'react';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { type RoomMember } from '../../lib/db';
import { useAppStore } from '../../lib/store';

type GroupEditModalProps = {
  show: boolean;
  onClose: () => void;
  roomMembersDraft: RoomMember[];
  setRoomMembersDraft: Dispatch<SetStateAction<RoomMember[]>>;
  saveRoomConfigs: () => Promise<void>;
};

export function GroupEditModal({
  show,
  onClose,
  roomMembersDraft,
  setRoomMembersDraft,
  saveRoomConfigs,
}: GroupEditModalProps) {
  const { selectedRoomId, rooms, setRooms, characters } = useAppStore(
    useShallow((state) => ({
      selectedRoomId: state.selectedRoomId,
      rooms: state.rooms,
      setRooms: state.setRooms,
      characters: state.characters,
    })),
  );

  if (!show || !selectedRoomId) return null;

  const room = rooms.find((item) => item.id === selectedRoomId);
  if (!room) return null;

  return (
    <div className="modal modal-open text-base-content">
      <div className="modal-box flex h-[80vh] max-w-4xl flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b bg-base-200 p-6 font-bold">
          <h3>房间配置</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          <section className="grid grid-cols-1 gap-4">
            <div className="form-control">
              <label className="label font-bold">房间名称</label>
              <input
                className="input input-bordered"
                value={room.name || ''}
                onChange={(event) =>
                  setRooms(rooms.map((item) => (item.id === selectedRoomId ? { ...item, name: event.target.value } : item)))
                }
              />
            </div>

            <div className="form-control">
              <label className="label text-xs font-bold text-primary">场景设定</label>
              <textarea
                className="textarea textarea-bordered h-32"
                value={room.description || ''}
                onChange={(event) =>
                  setRooms(
                    rooms.map((item) =>
                      item.id === selectedRoomId ? { ...item, description: event.target.value } : item,
                    ),
                  )
                }
                placeholder="例如：这是一次庭前会议，气氛严肃..."
              />
            </div>

            <div className="form-control">
              <label className="label text-xs font-bold text-info">全局剧情记忆（Summary）</label>
              <textarea
                className="textarea textarea-bordered h-40 font-mono text-xs"
                value={room.summary || ''}
                onChange={(event) =>
                  setRooms(
                    rooms.map((item) =>
                      item.id === selectedRoomId ? { ...item, summary: event.target.value } : item,
                    ),
                  )
                }
                placeholder="点击顶部的总结按钮，可以自动把对话进展追加到这里..."
              />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-base-300 p-4">
            <div className="text-sm font-black">选择房间成员</div>
            <div className="grid max-h-80 grid-cols-2 gap-2 space-y-2 overflow-y-auto pr-1">
              {characters.map((character) => {
                const active = !!roomMembersDraft.find((member) => member.char_id === character.id);
                return (
                  <div
                    key={character.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      active ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={active}
                      onChange={(event) => {
                        if (!character.id) return;
                        if (event.target.checked) {
                          setRoomMembersDraft((current) => [...current, { char_id: character.id! }]);
                          return;
                        }
                        setRoomMembersDraft((current) => current.filter((member) => member.char_id !== character.id));
                      }}
                    />
                    <div className="truncate text-sm font-bold">{character.name}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 border-t bg-base-200 p-6">
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={saveRoomConfigs}>
            保存房间
          </button>
        </div>
      </div>
    </div>
  );
}
