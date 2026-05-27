import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { SnapshotManager } from '../snapshots/SnapshotManager';
import { VariableManager } from '../variables/VariableManager';
import { VariableOverview } from '../variables/VariableOverview';
import { api, type LorebookV2Entry, type Variable } from '../../lib/db';
import { useAppStore } from '../../lib/store';
import { useChatStore } from '../../lib/chat-store';

type CharEditTab = 'basic' | 'variables' | 'snapshots';

type CharEditModalProps = {
  show: boolean;
  onClose: () => void;
  charEditTab: CharEditTab;
  setCharEditTab: Dispatch<SetStateAction<CharEditTab>>;
  charVariables: Variable[];
  setCharVariables: Dispatch<SetStateAction<Variable[]>>;
  setGlobalVariables: Dispatch<SetStateAction<Variable[]>>;
  loadCharData: () => Promise<void>;
  loadCharArchive: () => Promise<void>;
  exportCharacter: () => Promise<void>;
  handleImportFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  importFileRef: RefObject<HTMLInputElement | null>;
  setCharLorebookEntries: Dispatch<SetStateAction<LorebookV2Entry[]>>;
};

export function CharEditModal({
  show,
  onClose,
  charEditTab,
  setCharEditTab,
  charVariables,
  setCharVariables,
  setGlobalVariables,
  loadCharData,
  loadCharArchive,
  exportCharacter,
  handleImportFile,
  importFileRef,
  setCharLorebookEntries,
}: CharEditModalProps) {
  const { selectedCharId, characters, setCharacters, loadData } = useAppStore(
    useShallow((state) => ({
      selectedCharId: state.selectedCharId,
      characters: state.characters,
      setCharacters: state.setCharacters,
      loadData: state.loadData,
    })),
  );
  const messages = useChatStore((state) => state.messages);
  const setMessages = useChatStore((state) => state.setMessages);

  if (!show || !selectedCharId) return null;

  const currentCharacter = characters.find((character) => character.id === selectedCharId);
  if (!currentCharacter) return null;

  return (
    <div className="modal modal-open text-base-content">
      <div className="modal-box flex h-[85vh] max-w-4xl flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b bg-base-200 p-6 font-bold">
          <div className="flex items-center gap-2">
            <span>角色档案</span>
            <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
              <X />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="tabs tabs-boxed">
            <button
              className={`tab ${charEditTab === 'basic' ? 'tab-active' : ''}`}
              onClick={() => setCharEditTab('basic')}
            >
              基础设定
            </button>
            <button
              className={`tab ${charEditTab === 'variables' ? 'tab-active' : ''}`}
              onClick={() => setCharEditTab('variables')}
            >
              变量管理
            </button>
            <button
              className={`tab ${charEditTab === 'snapshots' ? 'tab-active' : ''}`}
              onClick={() => setCharEditTab('snapshots')}
            >
              历史快照
            </button>
          </div>

          <div className="p-6">
            {charEditTab === 'basic' && (
              <div className="space-y-6">
                <div className="form-control">
                  <label className="label text-xs font-bold">角色姓名</label>
                  <input
                    className="input input-bordered"
                    value={currentCharacter.name}
                    onChange={(event) =>
                      setCharacters(
                        characters.map((character) =>
                          character.id === selectedCharId ? { ...character, name: event.target.value } : character,
                        ),
                      )
                    }
                  />
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold">人设/世界观描述</label>
                  <textarea
                    className="textarea textarea-bordered h-48 font-mono text-sm"
                    value={currentCharacter.description}
                    onChange={(event) =>
                      setCharacters(
                        characters.map((character) =>
                          character.id === selectedCharId
                            ? { ...character, description: event.target.value }
                            : character,
                        ),
                      )
                    }
                  />
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold text-primary">个人长期记忆 (Summary)</label>
                  <textarea
                    className="textarea textarea-bordered h-32 font-mono text-xs"
                    value={currentCharacter.summary}
                    onChange={(event) =>
                      setCharacters(
                        characters.map((character) =>
                          character.id === selectedCharId ? { ...character, summary: event.target.value } : character,
                        ),
                      )
                    }
                  />
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold text-accent">开场白 / First Message</label>
                  <textarea
                    className="textarea textarea-bordered h-24 font-mono text-sm"
                    value={currentCharacter.first_message || ''}
                    onChange={(event) =>
                      setCharacters(
                        characters.map((character) =>
                          character.id === selectedCharId
                            ? { ...character, first_message: event.target.value }
                            : character,
                        ),
                      )
                    }
                    placeholder="当对话没有历史记录时，会作为第一条消息注入。"
                  />
                </div>

                <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 shadow-sm">
                  <VariableOverview variables={charVariables} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button className="btn btn-outline" onClick={exportCharacter}>
                    导出角色档案
                  </button>
                  <button
                    className="btn btn-outline btn-primary"
                    onClick={async () => {
                      await loadCharArchive();
                      if (!selectedCharId) return;
                      const lore = await api.lorebookV2.list(selectedCharId, undefined);
                      setCharLorebookEntries(lore as LorebookV2Entry[]);
                    }}
                  >
                    刷新导入数据
                  </button>
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold">导入角色档案 JSON</label>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept="application/json,.json"
                    className="file-input file-input-bordered file-input-sm w-full"
                    onChange={handleImportFile}
                  />
                  <p className="mt-2 text-[11px] opacity-60">
                    选择一个 JSON 文件即可导入，变量与世界书会被一并覆盖。
                  </p>
                  <button className="btn btn-primary mt-3" onClick={() => importFileRef.current?.click()}>
                    选择并导入档案
                  </button>
                </div>
              </div>
            )}

            {charEditTab === 'variables' && (
              <VariableManager
                charId={selectedCharId}
                onVariablesChange={(variables) => {
                  setCharVariables(variables);
                  setGlobalVariables(variables);
                }}
              />
            )}

            {charEditTab === 'snapshots' && (
              <SnapshotManager
                charId={selectedCharId}
                latestMessages={messages}
                onSnapshotRestore={async () => {
                  await loadCharData();
                  setMessages([]);
                  const nextMessages = await api.messages.list(selectedCharId);
                  setMessages(nextMessages);
                }}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end border-t bg-base-200 p-4">
          <button
            className="btn btn-primary"
            onClick={async () => {
              await api.characters.update(selectedCharId, currentCharacter);
              onClose();
              await loadData();
            }}
          >
            确认保存
          </button>
        </div>
      </div>
    </div>
  );
}
