import React, { useState, useEffect, useCallback } from 'react';
import type { Snapshot, SnapshotType } from '../../lib/db';

interface SnapshotManagerProps {
  charId?: number;
  roomId?: number;
  onSnapshotRestore?: (snapshot: Snapshot) => void;
}

const snapshotTypeOptions: { value: SnapshotType; label: string }[] = [
  { value: 'auto', label: '自动' },
  { value: 'manual', label: '手动' },
  { value: 'milestone', label: '里程碑' },
];

export function SnapshotManager({ charId, roomId, onSnapshotRestore }: SnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<Snapshot | null>(null);
  const [showDetail, setShowDetail] = useState(false);

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

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          char_id: charId,
          room_id: roomId,
          name: `快照 ${new Date().toLocaleString()}`,
          snapshot_type: 'manual',
        }),
      });
      if (res.ok) {
        fetchSnapshots();
      }
    } catch (e) {
      console.error('Failed to create snapshot:', e);
    }
  };

  const handleRestore = async (snapshot: Snapshot) => {
    if (!confirm(`确定恢复到快照 "${snapshot.name}"？这将删除此快照之后的所有快照。`)) return;
    
    try {
      const res = await fetch('/api/snapshots-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: snapshot.id }),
      });
      if (res.ok) {
        onSnapshotRestore?.(snapshot);
        fetchSnapshots();
      }
    } catch (e) {
      console.error('Failed to restore snapshot:', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此快照？')) return;
    try {
      const res = await fetch(`/api/snapshots?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSnapshots();
        if (selectedSnapshot?.id === id) {
          setSelectedSnapshot(null);
        }
      }
    } catch (e) {
      console.error('Failed to delete snapshot:', e);
    }
  };

  const handleUpdate = async (snapshot: Snapshot) => {
    try {
      const res = await fetch('/api/snapshots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
      if (res.ok) {
        fetchSnapshots();
        setEditingSnapshot(null);
      }
    } catch (e) {
      console.error('Failed to update snapshot:', e);
    }
  };

  const handleEdit = (snapshot: Snapshot) => {
    setEditingSnapshot({ ...snapshot });
  };

  const handleViewDetail = async (snapshot: Snapshot) => {
    try {
      const res = await fetch(`/api/snapshots?id=${snapshot.id}`);
      const data = await res.json();
      setSelectedSnapshot(data);
      setShowDetail(true);
    } catch (e) {
      console.error('Failed to fetch snapshot detail:', e);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const getTypeLabel = (type?: SnapshotType) => {
    return snapshotTypeOptions.find(t => t.value === type)?.label || type || '未知';
  };

  const getTypeColor = (type?: SnapshotType) => {
    switch (type) {
      case 'auto':
        return 'bg-blue-100 text-blue-800';
      case 'manual':
        return 'bg-green-100 text-green-800';
      case 'milestone':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">快照管理</h3>
        <button
          onClick={handleCreate}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          创建快照
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">加载中...</div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-4 text-gray-500">暂无快照</div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snapshot, index) => (
            <div
              key={snapshot.id}
              className={`border rounded p-3 ${selectedSnapshot?.id === snapshot.id ? 'border-blue-500 bg-blue-50' : ''}`}
            >
              {editingSnapshot?.id === snapshot.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingSnapshot.name}
                    onChange={(e) => setEditingSnapshot({ ...editingSnapshot, name: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                  <textarea
                    value={editingSnapshot.description || ''}
                    onChange={(e) => setEditingSnapshot({ ...editingSnapshot, description: e.target.value })}
                    placeholder="描述"
                    className="w-full px-2 py-1 border rounded"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editingSnapshot.snapshot_type || 'manual'}
                      onChange={(e) => setEditingSnapshot({ ...editingSnapshot, snapshot_type: e.target.value as SnapshotType })}
                      className="px-2 py-1 border rounded"
                    >
                      {snapshotTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editingSnapshot.user_message || ''}
                      onChange={(e) => setEditingSnapshot({ ...editingSnapshot, user_message: e.target.value })}
                      placeholder="用户消息"
                      className="px-2 py-1 border rounded"
                    />
                  </div>
                  <textarea
                    value={editingSnapshot.ai_response || ''}
                    onChange={(e) => setEditingSnapshot({ ...editingSnapshot, ai_response: e.target.value })}
                    placeholder="AI回复"
                    className="w-full px-2 py-1 border rounded"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(editingSnapshot)}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingSnapshot(null)}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{snapshot.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(snapshot.snapshot_type)}`}>
                          {getTypeLabel(snapshot.snapshot_type)}
                        </span>
                        <span className="text-xs text-gray-500">#{snapshot.snapshot_order || index + 1}</span>
                      </div>
                      <div className="text-sm text-gray-500">{formatDate(snapshot.created_at)}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleViewDetail(snapshot)}
                        className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                      >
                        详情
                      </button>
                      <button
                        onClick={() => handleEdit(snapshot)}
                        className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleRestore(snapshot)}
                        className="px-2 py-1 text-sm bg-yellow-100 rounded hover:bg-yellow-200"
                      >
                        回滚
                      </button>
                      <button
                        onClick={() => handleDelete(snapshot.id!)}
                        className="px-2 py-1 text-sm bg-red-100 rounded hover:bg-red-200"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  {snapshot.description && (
                    <div className="text-sm text-gray-600">{snapshot.description}</div>
                  )}
                  {(snapshot.user_message || snapshot.ai_response) && (
                    <div className="text-sm text-gray-500 space-y-1">
                      {snapshot.user_message && (
                        <div className="truncate">
                          <span className="font-medium">用户:</span> {snapshot.user_message}
                        </div>
                      )}
                      {snapshot.ai_response && (
                        <div className="truncate">
                          <span className="font-medium">AI:</span> {snapshot.ai_response.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    消息数: {snapshot.message_count || 0}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showDetail && selectedSnapshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">快照详情</h4>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="font-medium">名称</div>
                <div>{selectedSnapshot.name}</div>
              </div>
              {selectedSnapshot.description && (
                <div>
                  <div className="font-medium">描述</div>
                  <div>{selectedSnapshot.description}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium">类型</div>
                  <div>{getTypeLabel(selectedSnapshot.snapshot_type)}</div>
                </div>
                <div>
                  <div className="font-medium">创建时间</div>
                  <div>{formatDate(selectedSnapshot.created_at)}</div>
                </div>
              </div>
              {selectedSnapshot.user_message && (
                <div>
                  <div className="font-medium">用户消息</div>
                  <div className="bg-gray-100 p-2 rounded">{selectedSnapshot.user_message}</div>
                </div>
              )}
              {selectedSnapshot.ai_response && (
                <div>
                  <div className="font-medium">AI回复</div>
                  <div className="bg-gray-100 p-2 rounded whitespace-pre-wrap">{selectedSnapshot.ai_response}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
