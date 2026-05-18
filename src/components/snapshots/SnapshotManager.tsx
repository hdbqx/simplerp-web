import { useState, useEffect } from 'react';
import { Plus, History, RotateCcw, GitBranch, Calendar, Clock } from 'lucide-react';
import type { Snapshot, SnapshotMessage, SnapshotVariable, BranchInfo, AutoSnapshotRule } from '../lib/db';
import { api } from '../lib/db';

interface Props {
  charId?: number;
  roomId?: number;
  onRestore?: () => void;
}

export function SnapshotManager({ charId, roomId, onRestore }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [rules, setRules] = useState<AutoSnapshotRule[]>([]);
  const [showViewer, setShowViewer] = useState(false);
  const [viewingSnapshot, setViewingSnapshot] = useState<{ snapshot: Snapshot; messages: SnapshotMessage[]; variables: SnapshotVariable[] } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [charId, roomId]);

  const loadData = async () => {
    try {
      const [s, b, r] = await Promise.all([
        api.snapshots.list(charId, roomId),
        api.branches.list(charId, roomId),
        api.autoSnapshotRules.list(charId, roomId)
      ]);
      setSnapshots(s);
      setBranches(b);
      setRules(r);
    } catch (e) {
      console.error('Failed to load snapshots', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async (name: string, description?: string) => {
    await api.snapshots.create({ char_id: charId, room_id: roomId, name, description });
    await loadData();
  };

  const handleRestore = async (snapshot: Snapshot) => {
    if (confirm(`确定要恢复到快照 "${snapshot.name}" 吗？当前进度将会丢失。`)) {
      if (snapshot.id) await api.snapshots.restore(snapshot.id);
      await loadData();
      onRestore?.();
    }
  };

  const handleView = async (snapshot: Snapshot) => {
    if (snapshot.id) {
      const data = await api.snapshots.get(snapshot.id);
      setViewingSnapshot(data);
      setShowViewer(true);
    }
  };

  const handleDelete = async (snapshot: Snapshot) => {
    if (confirm(`确定要删除快照 "${snapshot.name}" 吗？`)) {
      if (snapshot.id) await api.snapshots.delete(snapshot.id);
      await loadData();
    }
  };

  if (loading) return <div className="p-4">加载中...</div>;

  return (
    <div className="flex flex-col h-full bg-base-200">
      <div className="p-4 border-b border-base-content/10">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">快照管理</h2>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus size={16} className="mr-1" /> 创建快照
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <History size={16} /> 快照
          </h3>
          <div className="space-y-2">
            {snapshots.length === 0 ? (
              <div className="text-center opacity-60 py-4">还没有快照</div>
            ) : (
              snapshots.map(s => (
                <div key={s.id} className="card bg-base-100 border border-base-content/10">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{s.name}</h4>
                        <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
                          <Calendar size={12} />
                          {new Date(s.created_at!).toLocaleString()}
                          <span className="badge badge-sm">{s.snapshot_type}</span>
                          {s.message_count && <span className="badge badge-sm">{s.message_count} 条消息</span>}
                        </div>
                        {s.description && <p className="text-sm opacity-70 mt-1">{s.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleView(s)}>查看</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRestore(s)}><RotateCcw size={14} /></button>
                        <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDelete(s)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <GitBranch size={16} /> 分支
          </h3>
          <div className="space-y-2">
            {branches.map(b => (
              <div key={b.id} className="card bg-base-100 border border-base-content/10">
                <div className="card-body p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">{b.name}</h4>
                    <div className="text-xs opacity-60">
                      {new Date(b.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm">切换</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showViewer && viewingSnapshot && (
        <SnapshotViewer
          snapshot={viewingSnapshot.snapshot}
          messages={viewingSnapshot.messages}
          variables={viewingSnapshot.variables}
          onClose={() => { setShowViewer(false); setViewingSnapshot(null); }}
          onRestore={() => handleRestore(viewingSnapshot.snapshot)}
        />
      )}

      {showCreateDialog && (
        <CreateSnapshotDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={async (name, desc) => {
            await handleCreateSnapshot(name, desc);
            setShowCreateDialog(false);
          }}
        />
      )}
    </div>
  );
}

function SnapshotViewer({
  snapshot,
  messages,
  variables,
  onClose,
  onRestore
}: {
  snapshot: Snapshot;
  messages: SnapshotMessage[];
  variables: SnapshotVariable[];
  onClose: () => void;
  onRestore: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'messages' | 'variables'>('messages');

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center border-b border-base-content/10 pb-4 mb-4">
          <h3 className="font-bold text-lg">{snapshot.name}</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tabs tabs-boxed mb-4">
          <button className={`tab ${activeTab === 'messages' ? 'tab-active' : ''}`} onClick={() => setActiveTab('messages')}>
            消息 ({messages.length})
          </button>
          <button className={`tab ${activeTab === 'variables' ? 'tab-active' : ''}`} onClick={() => setActiveTab('variables')}>
            变量 ({variables.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'messages' ? (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                  <div className="chat-bubble text-sm">{m.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {variables.map((v, i) => (
                <div key={i} className="card bg-base-200 p-3">
                  <div className="flex justify-between">
                    <span className="font-bold">{v.key}</span>
                    <span className="font-mono">{JSON.stringify(v.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-action pt-4 border-t border-base-content/10 mt-4">
          <button className="btn" onClick={onClose}>关闭</button>
          <button className="btn btn-primary" onClick={onRestore}>恢复此快照</button>
        </div>
      </div>
    </div>
  );
}

function CreateSnapshotDialog({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const defaultName = `快照 ${new Date().toLocaleString()}`;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">创建快照</h3>
        <div className="space-y-4">
          <div className="form-control">
            <label className="label font-bold text-sm">名称</label>
            <input
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
            />
          </div>
          <div className="form-control">
            <label className="label font-bold text-sm">描述</label>
            <textarea
              className="textarea textarea-bordered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选"
            />
          </div>
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onCreate(name || defaultName, description)}>创建</button>
        </div>
      </div>
    </div>
  );
}

function Trash2({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6"></polyline>
      <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  );
}

function X({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
