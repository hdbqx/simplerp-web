import React, { useState, useEffect, useCallback } from 'react';
import { api, type Snapshot, type SnapshotType, type SnapshotVariable } from '../../lib/db';
import { Trash2, RotateCcw, Eye, Save, X, Layers, Clock, Pencil, Check, Sliders, ArrowLeft } from 'lucide-react';

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
  
  // 详情模态框控制状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<{ snapshot: Snapshot; messages: any[]; variables: SnapshotVariable[] } | null>(null);
  const [variableEdits, setVariableEdits] = useState<Record<number, any>>({});
  const [isSavingVars, setIsSavingVars] = useState(false);
  
  // 变量看板悬浮抽屉控制
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Message 局部修改缓存
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
      setEditingMessageIdx(null);
      setSidebarOpen(false); 
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
      
      await api.snapshots.update(detailData.snapshot.id!, {
        snapshot_variables: formattedVariables,
        ...({ messages: detailData.messages } as any) 
      });

      await api.snapshots.edit(detailData.snapshot.id!, {
        messages: detailData.messages
      }).catch(() => {});

      alert("✨ 历史文本与冷冻变量已成功写回云端沙箱！");
      setSidebarOpen(false);
    } catch (e) {
      alert("保存修改失败");
    } finally {
      setIsSavingVars(false);
    }
  };

  const handleRestore = async (snap: Snapshot) => {
    if (!confirm(`确定要回滚恢复到快照 [${snap.name}]？\n这将斩断此历史节点之后的“未来时间线和所有后续快照”。`)) return;
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
          className="toggle toggle-accent toggle-sm"
          checked={!!currentValue}
          onChange={e => setVariableEdits({ ...variableEdits, [v.id!]: e.target.checked })}
        />
      );
    }
    if (v.type === 'number' || v.type === 'range') {
      return (
        <input 
          type="number" 
          className="input input-bordered input-sm w-full font-mono font-bold text-accent bg-base-300 text-center border-base-content/10"
          value={currentValue ?? 0}
          onChange={e => setVariableEdits({ ...variableEdits, [v.id!]: Number(e.target.value) })}
        />
      );
    }
    if (v.type === 'dict' || v.type === 'list') {
      const textVal = typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue ?? '');
      return (
        <textarea 
          className="textarea textarea-bordered textarea-xs font-mono w-full h-20 bg-base-300 leading-normal border-base-content/10"
          value={textVal}
          onChange={e => {
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
        className="input input-bordered input-sm w-full bg-base-300 text-xs border-base-content/10"
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
                <button className="btn btn-square btn-ghost btn-xs text-info" title="进入查看详情" onClick={() => handleOpenDetail(snap)}><Eye size={14}/></button>
                <button className="btn btn-square btn-ghost btn-xs text-warning" title="时光倒流恢复" onClick={() => handleRestore(snap)}><RotateCcw size={14}/></button>
                <button className="btn btn-square btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(snap.id!)}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 终极重构版快照大主控舱 */}
      {showDetailModal && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          {/* 【彻底修复宽度与高度阻断限制】彻底抛弃 daisyui 默认 padding 影响，强制控制物理视窗 */}
          <div className="w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-primary/20 shadow-2xl bg-base-900 rounded-2xl relative">
            
            {/* 顶栏控制中枢 */}
            <div className="p-4 bg-base-300 border-b border-base-200/60 flex items-center justify-between shadow-sm shrink-0 z-20">
              <div className="space-y-0.5 min-w-0 flex-1">
                <h3 className="font-black text-sm md:text-base text-primary flex items-center gap-1.5 truncate">
                  <Layers size={16} className="text-accent animate-pulse" /> 
                  快照历史视界: <span className="text-base-content font-medium text-xs md:text-sm">{detailData.snapshot.name}</span>
                </h3>
                <p className="text-[10px] opacity-40 font-mono">时间戳: {new Date(detailData.snapshot.created_at || 0).toLocaleString()}</p>
              </div>
              
              {/* 操作按钮集 */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`btn btn-xs md:btn-sm gap-1 px-2.5 ${sidebarOpen ? 'btn-accent' : 'btn-outline border-base-content/20'} rounded-xl transition-all shadow`}
                >
                  <Sliders size={13} />
                  <span className="hidden sm:inline">变量面板</span>
                </button>

                <button className="btn btn-xs md:btn-sm btn-warning px-2 rounded-xl font-bold flex items-center gap-0.5" onClick={() => handleRestore(detailData.snapshot)}>
                  <RotateCcw size={12}/> 恢复
                </button>
                
                <button 
                  className="btn btn-xs md:btn-sm btn-circle btn-neutral hover:btn-error"
                  onClick={() => { setShowDetailModal(false); setDetailData(null); }}
                >
                  <X size={14}/>
                </button>
              </div>
            </div>

            {/* 核心展示区 */}
            <div className="flex-1 overflow-hidden relative bg-base-950/20">
              
              {/* 历史对话气泡流容器 — 【彻底修复 PC 端横向撑满变形产生滚动条的痛点】 */}
              <div className="w-full h-full p-3 md:p-5 overflow-y-auto flex flex-col space-y-4 custom-scrollbar pb-24">
                {detailData.messages.length === 0 ? (
                  <div className="text-xs text-center py-16 opacity-40">此快照节点暂无任何对话线索</div>
                ) : (
                  detailData.messages.map((m, idx) => {
                    const isUser = m.role === 'user' || m.sender_type === 'user';
                    const isEditingThis = editingMessageIdx === idx;
                    
                    return (
                      <div key={idx} className={`chat ${isUser ? 'chat-end' : 'chat-start'} group/msg relative w-full max-w-3xl mx-auto opacity-95 px-1`}>
                        <div className="chat-header text-[10px] opacity-40 mb-1 flex items-center gap-2">
                          <span>{isUser ? '玩家' : '角色'}</span>
                          {!isEditingThis && (
                            <button 
                              onClick={() => startEditMessage(idx, m.content)}
                              className="opacity-0 group-hover/msg:opacity-100 text-info hover:text-primary transition-opacity p-0.5 rounded"
                              title="篡改发言"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                        </div>

                        {isEditingThis ? (
                          <div className="chat-bubble p-2 bg-base-300 border border-info/40 shadow-inner w-full rounded-xl flex flex-col gap-1.5 my-1">
                            <textarea
                              className="textarea textarea-bordered textarea-sm font-sans text-xs bg-base-100 w-full leading-relaxed h-24 focus:textarea-info"
                              value={editingMessageText}
                              onChange={e => setEditingMessageText(e.target.value)}
                            />
                            <div className="flex justify-end gap-1">
                              <button className="btn btn-ghost btn-xs text-[10px]" onClick={() => setEditingMessageIdx(null)}>取消</button>
                              <button className="btn btn-info btn-xs text-[10px] px-2" onClick={() => saveEditedMessage(idx)}>确认修改</button>
                            </div>
                          </div>
                        ) : (
                          /* 【核心优化】使用 max-w-full 与 break-words 强制截断，阻断任何横向拉开 */
                          <div className={`chat-bubble text-xs md:text-sm py-2 px-3.5 rounded-2xl shadow-sm border leading-relaxed break-words font-medium tracking-wide max-w-full ${isUser ? 'chat-bubble-primary border-primary/30 text-primary-content' : 'bg-base-200 text-base-content border-base-300'}`}>
                            {m.content}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 右侧侧滑变量抽屉控制台 — 移动端自适应 100% 宽度，PC端 340px 宽度 */}
              <div className={`absolute top-0 right-0 h-full w-full sm:w-[340px] bg-base-200/95 backdrop-blur-md border-l border-base-300/60 shadow-2xl transform transition-transform duration-300 ease-out z-30 flex flex-col ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-3.5 border-b border-base-300 flex items-center justify-between bg-base-300/60 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-black text-secondary-content">
                    <Sliders size={14} className="text-accent" /> 变量微调库
                  </div>
                  <button className="btn btn-xs btn-circle btn-ghost" onClick={() => setSidebarOpen(false)}><X size={14}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar pb-24">
                  {detailData.variables.length === 0 ? (
                    <div className="text-xs text-center py-16 opacity-30">此节点未绑定任何剧本变量</div>
                  ) : (
                    detailData.variables.map((v) => (
                      <div key={v.id} className="p-2.5 border border-base-content/5 rounded-xl bg-base-900/40 space-y-1 hover:border-accent/10 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-base-content/90 tracking-wide truncate max-w-[150px]">{v.name || v.key}</span>
                          <span className="text-[8px] opacity-40 font-mono uppercase bg-base-300 px-1 rounded shrink-0">{v.type}</span>
                        </div>
                        <div className="w-full flex items-center">
                          {renderInlineVariableEditor(v)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* 【强力底层控制卡 —— 彻底治愈遮挡缺陷】 */}
            {/* 弃用外部相对滚动，使用固定绝对底部底框，强制置于 modal-box 的最底部最前层 */}
            <div className="absolute bottom-0 left-0 w-full p-3 bg-base-300 border-t border-base-200 flex items-center justify-between gap-3 shrink-0 z-40 shadow-[0_-4px_15px_rgba(0,0,0,0.4)]">
              <button 
                type="button" 
                className="btn btn-sm btn-neutral border border-base-content/10 px-4 text-xs rounded-xl flex items-center gap-1"
                onClick={() => { setShowDetailModal(false); setDetailData(null); }}
              >
                <ArrowLeft size={13}/> 返回列表
              </button>

              <div className="flex items-center gap-1.5">
                {!sidebarOpen && detailData.variables.length > 0 && (
                  <button onClick={() => setSidebarOpen(true)} className="btn btn-xs btn-outline btn-accent px-2.5 h-8 rounded-xl text-[11px] font-bold">
                    ⚙️ 调整变量
                  </button>
                )}
                
                <button 
                  type="button"
                  className={`btn btn-primary btn-sm px-5 rounded-xl font-bold flex items-center gap-1 shadow-lg ${isSavingVars ? 'loading' : ''}`}
                  disabled={isSavingVars}
                  onClick={handleSaveAllChanges}
                >
                  <Save size={13}/> 保存全部篡改
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}