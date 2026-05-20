import React, { useState, useEffect, useCallback } from 'react';
import { api, type Snapshot, type SnapshotType, type SnapshotVariable } from '../../lib/db';
import { Trash2, Edit3, RotateCcw, Eye, Save, X, Layers, Clock } from 'lucide-react';

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
  const [editingSnapshot, setEditingSnapshot] = useState<Snapshot | null>(null);
  
  // 详情模态框分栏专用状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<{ snapshot: Snapshot; messages: any[]; variables: SnapshotVariable[] } | null>(null);
  const [variableEdits, setVariableEdits] = useState<Record<number, any>>({});
  const [isSavingVars, setIsSavingVars] = useState(false);

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
      setShowDetailModal(true);
    } catch (e) {
      alert("拉取快照历史数据失败");
    }
  };

  const handleSaveVariableChanges = async () => {
    if (!detailData) return;
    setIsSavingVars(true);
    try {
      const formattedVariables = Object.entries(variableEdits).map(([id, val]) => ({
        id: Number(id),
        value: val
      }));
      
      await api.snapshots.update(detailData.snapshot.id!, {
        snapshot_variables: formattedVariables
      });
      
      alert("该快照内部节点的冷冻变量已成功微调修改！");
    } catch (e) {
      alert("保存变量失败");
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
          className="input input-bordered input-xs w-28 font-mono text-primary font-bold"
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
        className="input input-bordered input-xs w-full text-xs font-medium"
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
                <button className="btn btn-square btn-ghost btn-xs text-info" title="进入查看详情与修改变量" onClick={() => handleOpenDetail(snap)}><Eye size={14}/></button>
                <button className="btn btn-square btn-ghost btn-xs text-warning" title="时光倒流恢复" onClick={() => handleRestore(snap)}><RotateCcw size={14}/></button>
                <button className="btn btn-square btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(snap.id!)}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 重构的全尺寸大快照详情多维分栏控制中心 */}
      {showDetailModal && detailData && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-5xl w-[90vw] h-[85vh] flex flex-col p-0 overflow-hidden border border-base-content/20 shadow-2xl">
            <div className="p-4 bg-base-300 border-b border-base-300 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-black text-sm text-primary flex items-center gap-1.5"><Layers size={16}/> 审视历史切片: {detailData.snapshot.name}</h3>
                <p className="text-[10px] opacity-50">快照发生于时间：{new Date(detailData.snapshot.created_at || 0).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-xs btn-warning px-2 flex items-center gap-1" onClick={() => handleRestore(detailData.snapshot)}><RotateCcw size={12}/> 确认时光倒流恢复至此处</button>
                <button className="btn btn-xs btn-circle btn-ghost" onClick={() => { setShowDetailModal(false); setDetailData(null); }}><X size={14}/></button>
              </div>
            </div>

            {/* 核心左右多维分栏主框架 */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-base-100">
              
              {/* 左分栏：完整的轻量对话回放流 */}
              <div className="w-full md:w-3/5 p-4 overflow-y-auto border-r border-base-300 flex flex-col space-y-4 custom-scrollbar bg-base-200/20">
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-40 sticky top-0 bg-base-100/10 backdrop-blur pb-1">当时时间线对话记录回放</div>
                {detailData.messages.length === 0 ? (
                  <div className="text-xs text-center py-12 opacity-40">此快照节点历史消息为空</div>
                ) : (
                  detailData.messages.map((m, idx) => {
                    const isUser = m.role === 'user' || m.sender_type === 'user';
                    return (
                      <div key={idx} className={`chat ${isUser ? 'chat-end' : 'chat-start'} opacity-85`}>
                        <div className="chat-header text-[9px] opacity-40 mb-0.5">{isUser ? '玩家' : '角色'}</div>
                        <div className={`chat-bubble text-xs py-1.5 px-2.5 max-w-[85%] rounded-xl shadow-sm border ${isUser ? 'chat-bubble-primary border-primary' : 'bg-base-200 text-base-content border-base-300'}`}>
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 右分栏：变量快照快捷修改控制台 */}
              <div className="w-full md:w-2/5 p-4 overflow-y-auto flex flex-col bg-base-100 custom-scrollbar">
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-40 pb-2 border-b border-base-300 mb-3">快照内置冻结变量快捷微调</div>
                {detailData.variables.length === 0 ? (
                  <div className="text-xs text-center py-12 opacity-40">此节点未捕捉到任何状态变量</div>
                ) : (
                  <div className="flex-1 space-y-3">
                    {detailData.variables.map((v) => (
                      <div key={v.id} className="p-2 border border-base-200 rounded-lg bg-base-200/30 space-y-1.5">
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
                
                {/* 右边栏底部独立保存面板 */}
                {detailData.variables.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-base-300 sticky bottom-0 bg-base-100">
                    <button 
                      className={`btn btn-primary btn-xs btn-block py-2 h-auto flex items-center justify-center gap-1 ${isSavingVars ? 'loading' : ''}`}
                      disabled={isSavingVars}
                      onClick={handleSaveVariableChanges}
                    >
                      <Save size={12}/> 保存快照变量微调修改
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}