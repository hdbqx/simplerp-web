import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock, Eye, Layers, Pencil, RotateCcw, Save, Sliders, Trash2, X } from 'lucide-react';
import { api, type Snapshot, type SnapshotVariable } from '../../lib/db';

interface SnapshotManagerProps {
  charId?: number;
  roomId?: number;
  onSnapshotRestore?: (snapshot: Snapshot) => void;
  latestMessages?: any[];
}

const snapshotTypeColors: Record<string, string> = {
  auto: 'badge-info',
  manual: 'badge-success',
  checkpoint: 'badge-warning',
  milestone: 'badge-secondary',
};

const snapshotTypeLabels: Record<string, string> = {
  auto: '自动',
  manual: '手动',
  checkpoint: '检查点',
  milestone: '里程碑',
};

export function SnapshotManager({ charId, roomId, onSnapshotRestore, latestMessages }: SnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<{ snapshot: Snapshot; messages: any[]; variables: SnapshotVariable[] } | null>(null);
  const [variableEdits, setVariableEdits] = useState<Record<number, any>>({});
  const [isSavingVars, setIsSavingVars] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>('');

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      const res = await fetch(`/api/snapshots?${params}`);
      const data = await res.json();
      setSnapshots(data.sort((a: Snapshot, b: Snapshot) => (b.snapshot_order || 0) - (a.snapshot_order || 0)));
    } catch (e) {
      console.error('Failed to fetch snapshots:', e);
    } finally {
      setLoading(false);
    }
  }, [charId, roomId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleCreateManual = async () => {
    try {
      const msgs = latestMessages || [];
      const aiMsg = msgs[msgs.length - 1];
      const userMsg = msgs[msgs.length - 2];
      await api.snapshots.create({
        char_id: charId,
        room_id: roomId,
        name: `手动快照 ${new Date().toLocaleString()}`,
        snapshot_type: 'manual',
        user_message: userMsg?.content || undefined,
        ai_response: aiMsg?.content || undefined,
      });
      fetchSnapshots();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenDetail = async (snap: Snapshot) => {
    try {
      const data = await api.snapshots.get(snap.id!);
      setDetailData(data);
      const initialEdits: Record<number, any> = {};
      (data.variables || []).forEach((v) => {
        if (v.id) initialEdits[v.id] = v.value;
      });
      setVariableEdits(initialEdits);
      setEditingMessageIdx(null);
      setSidebarOpen(false);
      setShowDetailModal(true);
    } catch (e) {
      alert('拉取快照历史数据失败');
    }
  };

  const handleSaveAllChanges = async () => {
    if (!detailData) return;
    setIsSavingVars(true);
    try {
      const formattedVariables = Object.entries(variableEdits).map(([id, val]) => ({
        id: Number(id),
        value: val,
      }));

      await api.snapshots.update(detailData.snapshot.id!, {
        snapshot_variables: formattedVariables,
        ...({ messages: detailData.messages } as any),
      });

      await api.snapshots.edit(detailData.snapshot.id!, {
        messages: detailData.messages,
      }).catch(() => {});

      alert('历史文本与冻结变量已成功写回云端沙盒。');
      setSidebarOpen(false);
    } catch (e) {
      alert('保存修改失败');
    } finally {
      setIsSavingVars(false);
    }
  };

  const handleRestore = async (snap: Snapshot) => {
    if (!confirm(`确定要回滚恢复到快照 [${snap.name}]？\n这将截断此历史节点之后的“未来时间线”和所有后续快照。`)) return;
    try {
      await api.snapshots.restore(snap.id!);
      onSnapshotRestore?.(snap);
      setShowDetailModal(false);
      fetchSnapshots();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定彻底删除该历史快照吗？')) return;
    await api.snapshots.delete(id);
    fetchSnapshots();
  };

  const startEditMessage = (idx: number, currentContent: string) => {
    setEditingMessageIdx(idx);
    setEditingMessageText(currentContent);
  };

  const saveEditedMessage = (idx: number) => {
    if (!detailData) return;
    const updatedMessages = [...detailData.messages];
    updatedMessages[idx] = { ...updatedMessages[idx], content: editingMessageText };
    setDetailData({ ...detailData, messages: updatedMessages });
    setEditingMessageIdx(null);
  };

  const renderInlineVariableEditor = (v: SnapshotVariable) => {
    const currentValue = variableEdits[v.id!];

    if (v.type === 'boolean') {
      return (
        <input
          type="checkbox"
          className="toggle toggle-accent toggle-sm"
          checked={!!currentValue}
          onChange={(e) => setVariableEdits({ ...variableEdits, [v.id!]: e.target.checked })}
        />
      );
    }
    if (v.type === 'number' || v.type === 'range') {
      return (
        <input
          type="number"
          className="input input-bordered input-sm w-full border-base-content/10 bg-base-300 text-center font-mono font-bold text-accent"
          value={currentValue ?? 0}
          onChange={(e) => setVariableEdits({ ...variableEdits, [v.id!]: Number(e.target.value) })}
        />
      );
    }
    if (v.type === 'dict' || v.type === 'list') {
      const textVal = typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue ?? '');
      return (
        <textarea
          className="textarea textarea-bordered textarea-xs h-20 w-full border-base-content/10 bg-base-300 font-mono leading-normal"
          value={textVal}
          onChange={(e) => {
            const raw = e.target.value;
            try {
              setVariableEdits({ ...variableEdits, [v.id!]: JSON.parse(raw) });
            } catch {
              setVariableEdits({ ...variableEdits, [v.id!]: raw });
            }
          }}
        />
      );
    }
    return (
      <input
        type="text"
        className="input input-bordered input-sm w-full border-base-content/10 bg-base-300 text-xs"
        value={String(currentValue ?? '')}
        onChange={(e) => setVariableEdits({ ...variableEdits, [v.id!]: e.target.value })}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-base-300/40 p-2">
        <div className="flex items-center gap-1 text-xs font-black opacity-60">
          <Clock size={14} /> 快照版本轴
        </div>
        <button onClick={handleCreateManual} className="btn btn-primary btn-xs px-3 shadow">
          保存当前快照
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center">
          <span className="loading loading-spinner text-primary"></span>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="py-8 text-center text-xs opacity-40">暂无任何快照切片</div>
      ) : (
        <div className="custom-scrollbar grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto pr-1">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="group flex items-center justify-between rounded-xl border border-base-300 bg-base-200 p-3 transition-all hover:border-base-content/20"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="max-w-[12rem] truncate text-xs font-black text-base-content">{snap.name}</span>
                  <span className={`badge h-4 px-1.5 py-0 text-[9px] font-bold ${snapshotTypeColors[snap.snapshot_type || 'manual'] || 'badge-ghost'}`}>
                    {snapshotTypeLabels[snap.snapshot_type || 'manual'] || '手动'}
                  </span>
                  <span className="font-mono text-[10px] opacity-40">#{snap.snapshot_order}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] opacity-50">
                  <span>{new Date(snap.created_at || 0).toLocaleString()}</span>
                  <span>/</span>
                  <span className="font-mono text-primary">节点含 {snap.message_count || 0} 条历史</span>
                </div>
              </div>

              <div className="ml-2 flex shrink-0 items-center gap-1">
                <button className="btn btn-square btn-ghost btn-xs text-info" title="查看详情" onClick={() => handleOpenDetail(snap)}>
                  <Eye size={14} />
                </button>
                <button className="btn btn-square btn-ghost btn-xs text-warning" title="回滚恢复" onClick={() => handleRestore(snap)}>
                  <RotateCcw size={14} />
                </button>
                <button
                  className="btn btn-square btn-ghost btn-xs text-error opacity-0 transition-opacity group-hover:opacity-100"
                  title="删除快照"
                  onClick={() => handleDelete(snap.id!)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDetailModal && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 md:p-4">
          <div className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-primary/20 bg-base-100 shadow-2xl">
            <div className="z-20 flex shrink-0 items-center justify-between border-b border-base-200/60 bg-base-300 p-4 shadow-sm">
              <div className="min-w-0 flex-1 space-y-0.5">
                <h3 className="flex items-center gap-1.5 truncate text-sm font-black text-primary md:text-base">
                  <Layers size={16} className="text-accent" />
                  快照历史视图:
                  <span className="text-xs font-medium text-base-content md:text-sm">{detailData.snapshot.name}</span>
                </h3>
                <p className="font-mono text-[10px] opacity-40">
                  时间戳 {new Date(detailData.snapshot.created_at || 0).toLocaleString()}
                </p>
              </div>

              <div className="ml-2 flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`btn btn-xs gap-1 rounded-xl px-2.5 shadow transition-all md:btn-sm ${
                    sidebarOpen ? 'btn-accent' : 'btn-outline border-base-content/20'
                  }`}
                >
                  <Sliders size={13} />
                  <span className="hidden sm:inline">变量面板</span>
                </button>

                <button
                  className="btn btn-warning btn-xs rounded-xl px-2 font-bold md:btn-sm"
                  onClick={() => handleRestore(detailData.snapshot)}
                >
                  <RotateCcw size={12} /> 恢复
                </button>

                <button
                  className="btn btn-circle btn-neutral btn-xs hover:btn-error md:btn-sm"
                  onClick={() => {
                    setShowDetailModal(false);
                    setDetailData(null);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden bg-base-200/20">
              <div className="custom-scrollbar flex h-full w-full flex-col space-y-4 overflow-y-auto p-3 pb-24 md:p-5">
                {detailData.messages.length === 0 ? (
                  <div className="py-16 text-center text-xs opacity-40">此快照节点暂无任何对话线索</div>
                ) : (
                  detailData.messages.map((m, idx) => {
                    const isUser = m.role === 'user' || m.sender_type === 'user';
                    const isEditingThis = editingMessageIdx === idx;

                    return (
                      <div
                        key={idx}
                        className={`chat group/msg relative mx-auto w-full max-w-3xl px-1 opacity-95 ${
                          isUser ? 'chat-end' : 'chat-start'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[10px] opacity-40">
                          <span>{isUser ? '玩家' : '角色'}</span>
                          {!isEditingThis && (
                            <button
                              onClick={() => startEditMessage(idx, m.content)}
                              className="rounded p-0.5 text-info opacity-0 transition-opacity hover:text-primary group-hover/msg:opacity-100"
                              title="修改发言"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                        </div>

                        {isEditingThis ? (
                          <div className="my-1 flex w-full flex-col gap-1.5 rounded-xl border border-info/40 bg-base-300 p-2 shadow-inner chat-bubble">
                            <textarea
                              className="textarea textarea-bordered textarea-sm h-24 w-full bg-base-100 font-sans text-xs leading-relaxed focus:textarea-info"
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                            />
                            <div className="flex justify-end gap-1">
                              <button className="btn btn-ghost btn-xs text-[10px]" onClick={() => setEditingMessageIdx(null)}>
                                取消
                              </button>
                              <button className="btn btn-info btn-xs px-2 text-[10px]" onClick={() => saveEditedMessage(idx)}>
                                确认修改
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`chat-bubble max-w-full break-words rounded-2xl border px-3.5 py-2 text-xs font-medium leading-relaxed tracking-wide shadow-sm md:text-sm ${
                              isUser
                                ? 'chat-bubble-primary border-primary/30 text-primary-content'
                                : 'border-base-300 bg-base-200 text-base-content'
                            }`}
                          >
                            {m.content}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div
                className={`absolute right-0 top-0 z-30 flex h-full w-full transform flex-col border-l border-base-300/60 bg-base-200 shadow-2xl transition-transform duration-300 ease-out sm:w-[340px] ${
                  sidebarOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-base-300 bg-base-300/80 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-secondary-content">
                    <Sliders size={14} className="text-accent" /> 变量微调面板
                  </div>
                  <button className="btn btn-circle btn-ghost btn-xs" onClick={() => setSidebarOpen(false)}>
                    <X size={14} />
                  </button>
                </div>

                <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3.5 pb-24">
                  {detailData.variables.length === 0 ? (
                    <div className="py-16 text-center text-xs opacity-30">此节点未绑定任何剧本变量</div>
                  ) : (
                    detailData.variables.map((v) => (
                      <div
                        key={v.id}
                        className="space-y-1 rounded-xl border border-base-content/5 bg-base-100/70 p-2.5 transition-colors hover:border-accent/10"
                      >
                        <div className="flex items-center justify-between">
                          <span className="max-w-[150px] truncate font-mono text-xs font-black tracking-wide text-base-content/90">
                            {v.key}
                          </span>
                          <span className="shrink-0 rounded bg-base-300 px-1 text-[8px] font-mono uppercase opacity-40">{v.type}</span>
                        </div>
                        <div className="flex w-full items-center">{renderInlineVariableEditor(v)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 z-40 flex w-full shrink-0 items-center justify-between gap-3 border-t border-base-200 bg-base-300 p-3 shadow-[0_-4px_15px_rgba(0,0,0,0.25)]">
              <button
                type="button"
                className="btn btn-neutral btn-sm rounded-xl border border-base-content/10 px-4 text-xs"
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailData(null);
                }}
              >
                <ArrowLeft size={13} /> 返回列表
              </button>

              <div className="flex items-center gap-1.5">
                {!sidebarOpen && detailData.variables.length > 0 && (
                  <button onClick={() => setSidebarOpen(true)} className="btn btn-outline btn-accent btn-xs h-8 rounded-xl px-2.5 text-[11px] font-bold">
                    调整变量
                  </button>
                )}

                <button
                  type="button"
                  className={`btn btn-primary btn-sm rounded-xl px-5 font-bold shadow-lg ${isSavingVars ? 'loading' : ''}`}
                  disabled={isSavingVars}
                  onClick={handleSaveAllChanges}
                >
                  <Save size={13} /> 保存全部修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
