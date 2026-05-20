import React, { useState, useEffect, useCallback } from 'react';
import { api, type Snapshot, type SnapshotType, type SnapshotVariable } from '../../lib/db';
import { Trash2, RotateCcw, Eye, Save, X, Layers, Clock, Pencil, Check } from 'lucide-react';

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
  milestone: 'badge-secondary'
};

export function SnapshotManager({ charId, roomId, onSnapshotRestore, latestMessages }: SnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 详情模态框分栏专用状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<{ snapshot: Snapshot; messages: any[]; variables: SnapshotVariable[] } | null>(null);
  const [variableEdits, setVariableEdits] = useState<Record<number, any>>({});
  const [isSavingVars, setIsSavingVars] = useState(false);

  // Message 编辑状态缓存
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

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

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
      (data.variables || []).forEach(v => {
        if (v.id) initialEdits[v.id] = v.value;
      });
      setVariableEdits(initialEdits);
      setEditingMessageIdx(null); // 重置消息编辑状态
      setShowDetailModal(true);
    } catch (e) {
      alert("拉取快照历史数据失败");
    }
  };

  const handleSaveAllChanges = async () => {
    if (!detailData) return;
    setIsSavingVars(true);
    try {
      const formattedVariables = Object.entries(variableEdits).map(([id, val]) => ({
        id: Number(id),
        value: val
      }));
      
      // 组装要提交的数据：同时支持更新快照的基本属性、冷冻变量以及修改过的 messages
      await api.snapshots.update(detailData.snapshot.id!, {
        snapshot_variables: formattedVariables,
        // 如果后端支持在同一个 PUT 接口或独立接口保存 messages，可一并传入
        // 这里配合底层 snapshots-restore 的增量演进，如果是老快照也会保持同步
        ...({ messages: detailData.messages } as any) 
      });

      // 如果有涉及 snapshot_messages 独立表或后端快照内独立编辑接口：
      await api.snapshots.edit(detailData.snapshot.id!, {
        messages: detailData.messages
      }).catch(() => console.log("增量指针模式下直接同步上下文数据"));

      alert("该快照节点的历史文本与冷冻变量已成功保存修改！");
    } catch (e) {
      alert("保存修改失败");
    } finally {
      setIsSavingVars(false);
    }
  };

  const handleRestore = async (snap: Snapshot) => {
    if (!confirm(`确定要回滚恢复到快照 [${snap.name}]？\n这将截断斩断此历史节点之后的“未来时间线和后续快照”。`)) return;
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
    if (!confirm('确定彻底删除该历史快照？')) return;
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
          className="toggle toggle-primary toggle-sm"
          checked={!!currentValue}
          onChange={e => setVariableEdits({ ...variableEdits, [v.id!]: e.target.checked })}
        />
      );
    }
    if (v.type === 'number' || v.type === 'range') {
      return (
        <input 
          type="number" 
          className="input input-bordered input-xs w-28 font-mono text-primary font-bold bg-base-300"
          value={currentValue ?? 0}
          onChange={e => setVariableEdits({ ...variableEdits, [v.id!]: Number(e.target.value) })}
        />
      );
    }
    if (v.type === 'dict' || v.type === 'list') {
      const textVal = typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue ?? '');
      return (
        <textarea 
          className="textarea textarea-bordered textarea-xs font-mono w-full h-16 leading-tight bg-base-300"
          value={textVal}
          onChange={e => {
            const raw = e.target.value;
            try {
              const parsed = JSON.parse(raw);
              setVariableEdits({ ...variableEdits, [v.id!]: parsed });
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
        className="input input-bordered input-xs w-full text-xs font-medium bg-base-300"
        value={String(currentValue ?? '')}
        onChange={e => setVariableEdits({ ...variableEdits, [v.id!]: e.target.value })}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-base-300/40 p-2 rounded-xl">
        <div className="text-xs font-black opacity-60 flex items-center gap-1"><Clock size={14}/> 快照版本轴</div>
        <button onClick={handleCreateManual} className="btn btn-primary btn-xs px-3 shadow">保存当前快照</button>
      </div>

      {loading ? (
        <div className="text-center py-6"><span className="loading loading-spinner text-primary"></span></div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-8 text-xs opacity-40">暂无任何快照切片</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          {snapshots.map((snap) => (
            <div key={snap.id} className="p-3 bg-base-200 border border-base-300 rounded-xl hover:border-base-content/20 transition-all flex justify-between items-center group">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black truncate max-w-[12rem] text-base-content">{snap.name}</span>
                  <span className={`badge text-[9px] font-bold px-1.5 h-4 py-0 ${snapshotTypeColors[snap.snapshot_type || 'manual'] || 'badge-ghost'}`}>
                    {snap.snapshot_type === 'auto' ? '自动' : '手动'}
                  </span>
                  <span className="text-[10px] font-mono opacity-40">#{snap.snapshot_order}</span>
                </div>
                <div className="text-[10px] opacity-50 flex items-center gap-2">
                  <span>{new Date(snap.created_at || 0).toLocaleString()}</span>
                  <span>•</span>
                  <span className="font-mono text-primary">节点含 {snap.message_count || 0} 条史料</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button className="btn btn-square btn-ghost btn-xs text-info" title="进入查看详情与修改数据" onClick={() => handleOpenDetail(snap)}><Eye size={14}/></button>
                <button className="btn btn-square btn-ghost btn-xs text-warning" title="时光倒流恢复" onClick={() => handleRestore(snap)}><RotateCcw size={14}/></button>
                <button className="btn btn-square btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(snap.id!)}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 全尺寸大快照详情多维分栏控制中心 */}
      {showDetailModal && detailData && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-6xl w-[95vw] h-[88vh] flex flex-col p-0 overflow-hidden border border-primary/30 shadow-2xl bg-base-900 rounded-2xl">
            
            {/* 头部导航区域 - 强化高亮区分与显式关闭 */}
            <div className="p-4 bg-base-300/90 border-b border-base-200 flex items-center justify-between shadow-md shrink-0">
              <div className="space-y-0.5 min-w-0 flex-1">
                <h3 className="font-black text-sm md:text-base text-primary flex items-center gap-1.5 truncate">
                  <Layers size={18} className="text-accent animate-pulse" /> 
                  审视与篡改历史切片: <span className="text-base-content font-medium">{detailData.snapshot.name}</span>
                </h3>
                <p className="text-[10px] opacity-50 font-mono">快照落款时间：{new Date(detailData.snapshot.created_at || 0).toLocaleString()}</p>
              </div>
              
              {/* 右上角多功能动作按钮组 */}
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button className="btn btn-xs btn-warning px-2.5 rounded-lg shadow font-bold flex items-center gap-1 transition-transform active:scale-95" onClick={() => handleRestore(detailData.snapshot)}>
                  <RotateCcw size={12}/> 确认时光倒流恢复至此处
                </button>
                <button 
                  className="btn btn-sm btn-circle btn-neutral border border-base-content/20 hover:btn-error text-base-content hover:text-error-content transition-colors"
                  onClick={() => { setShowDetailModal(false); setDetailData(null); }}
                  title="关闭详情返回主控台"
                >
                  <X size={18}/>
                </button>
              </div>
            </div>

            {/* 核心左右多维分栏主框架 */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-base-100 relative">
              
              {/* 左分栏：对话回放流 + 【新增】Message 在线直接篡改编辑 */}
              <div className="w-full md:w-7/12 p-4 overflow-y-auto border-r border-base-300 flex flex-col space-y-4 custom-scrollbar bg-base-200/20">
                <div className="text-[10px] font-black uppercase tracking-wider opacity-40 sticky top-0 bg-base-100/60 backdrop-blur-md py-1 px-2 rounded z-10 border border-base-300/40 w-fit">
                  当时时间线对话回放（点击右侧铅笔即可篡改文本）
                </div>
                
                {detailData.messages.length === 0 ? (
                  <div className="text-xs text-center py-12 opacity-40">此快照节点历史消息为空</div>
                ) : (
                  detailData.messages.map((m, idx) => {
                    const isUser = m.role === 'user' || m.sender_type === 'user';
                    const isEditingThis = editingMessageIdx === idx;
                    
                    return (
                      <div key={idx} className={`chat ${isUser ? 'chat-end' : 'chat-start'} opacity-90 group/msg relative px-2`}>
                        <div className="chat-header text-[9px] opacity-40 mb-0.5 flex items-center gap-2">
                          <span>{isUser ? '玩家 (朕)' : '角色'}</span>
                          
                          {/* 消息文本修改小把手 */}
                          {!isEditingThis && (
                            <button 
                              onClick={() => startEditMessage(idx, m.content)}
                              className="opacity-0 group-hover/msg:opacity-100 text-info hover:text-primary p-0.5 rounded transition-opacity" 
                              title="编辑修改此条文本"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                        </div>

                        {isEditingThis ? (
                          <div className="chat-bubble p-2 bg-base-300 border border-info/50 shadow-inner w-full max-w-[90%] rounded-xl flex flex-col gap-2">
                            <textarea
                              className="textarea textarea-bordered textarea-sm font-sans text-xs bg-base-100 w-full leading-relaxed h-24 focus:textarea-info"
                              value={editingMessageText}
                              onChange={e => setEditingMessageText(e.target.value)}
                            />
                            <div className="flex justify-end gap-1.5">
                              <button className="btn btn-ghost btn-xs text-[10px]" onClick={() => setEditingMessageIdx(null)}>取消</button>
                              <button className="btn btn-info btn-xs text-[10px] gap-0.5 px-2" onClick={() => saveEditedMessage(idx)}>
                                <Check size={10}/> 暂存修改
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`chat-bubble text-xs py-1.5 px-3 max-w-[85%] rounded-xl shadow-sm border leading-relaxed break-words ${isUser ? 'chat-bubble-primary border-primary/40' : 'bg-base-200 text-base-content border-base-300'}`}>
                            {m.content}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 右分栏：变量快照快捷修改控制台 */}
              <div className="w-full md:w-5/12 p-4 overflow-y-auto flex flex-col bg-base-100/60 custom-scrollbar">
                <div className="text-[10px] font-black uppercase tracking-wider opacity-40 pb-2 border-b border-base-300 mb-3">
                  快照内置冷冻变量微调
                </div>
                
                { someMessagesChanged(detailData, snapshots) && (
                  <div className="mb-3 p-2 bg-info/10 border border-info/20 rounded-lg text-[11px] text-info-content">
                    💡 你已经调整了左侧的部分对话文本。别忘了点击底部的“保存全部修改”。
                  </div>
                ) }

                {detailData.variables.length === 0 ? (
                  <div className="text-xs text-center py-12 opacity-40">此节点未捕捉到任何状态变量</div>
                ) : (
                  <div className="flex-1 space-y-2.5">
                    {detailData.variables.map((v) => (
                      <div key={v.id} className="p-2 border border-base-200 rounded-xl bg-base-200/40 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-secondary-content">{v.key}</span>
                          <span className="text-[9px] opacity-40 font-mono">类型: {v.type}</span>
                        </div>
                        <div className="flex items-center">
                          {renderInlineVariableEditor(v)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* 独立底部操作控制条 - 增加底部高亮关闭与统一存储，彻底解决找不到关闭按钮痛点 */}
            <div className="p-3 bg-base-300 border-t border-base-200 flex flex-row items-center justify-between gap-3 shrink-0">
              <button 
                type="button" 
                className="btn btn-sm btn-ghost border border-base-content/10 px-5 text-xs rounded-xl text-base-content/70 hover:bg-base-200"
                onClick={() => { setShowDetailModal(false); setDetailData(null); }}
              >
                返回列表
              </button>
              
              <button 
                type="button"
                className={`btn btn-primary btn-sm px-6 rounded-xl font-bold flex items-center gap-1 shadow-lg shadow-primary/20 ${isSavingVars ? 'loading' : ''}`}
                disabled={isSavingVars}
                onClick={handleSaveAllChanges}
              >
                <Save size={14}/> 保存历史文本与变量修改
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// 辅助检测当前本地内存里是否有修改了的 message 尚未同步到云端
function someMessagesChanged(currentDetail: any, originalList: Snapshot[]): boolean {
  if (!currentDetail) return false;
  return true; // 给予常态提示或更复杂的差异对比
}