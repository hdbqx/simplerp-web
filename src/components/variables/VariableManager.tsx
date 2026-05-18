import React, { useState, useEffect, useCallback } from 'react';
import type { Variable, VariableType } from '../../lib/db';

interface VariableManagerProps {
  charId?: number;
  roomId?: number;
  onVariablesChange?: (variables: Variable[]) => void;
}

const typeOptions: { value: VariableType; label: string }[] = [
  { value: 'number', label: '数值' },
  { value: 'string', label: '字符串' },
  { value: 'boolean', label: '布尔值' },
  { value: 'range', label: '范围' },
  { value: 'dict', label: '字典' },
  { value: 'list', label: '列表' },
];

export function VariableManager({ charId, roomId, onVariablesChange }: VariableManagerProps) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Variable>>({});

  const fetchVariables = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      const res = await fetch(`/api/variables?${params}`);
      const data = await res.json();
      setVariables(data);
      onVariablesChange?.(data);
    } catch (e) {
      console.error('Failed to fetch variables:', e);
    } finally {
      setLoading(false);
    }
  }, [charId, roomId, onVariablesChange]);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          char_id: charId,
          room_id: roomId,
          name: '新变量',
          key: `var_${Date.now()}`,
          type: 'number',
          value: 0,
          is_persistent: true,
          is_visible: true,
        }),
      });
      if (res.ok) {
        fetchVariables();
      }
    } catch (e) {
      console.error('Failed to create variable:', e);
    }
  };

  const handleUpdate = async (id: number, updates: Partial<Variable>) => {
    try {
      const res = await fetch('/api/variables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        fetchVariables();
      }
    } catch (e) {
      console.error('Failed to update variable:', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此变量？')) return;
    try {
      const res = await fetch(`/api/variables?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVariables();
      }
    } catch (e) {
      console.error('Failed to delete variable:', e);
    }
  };

  const handleReset = async (id: number) => {
    try {
      const res = await fetch('/api/variables?action=reset&id=' + id, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setVariables(prev => prev.map(v => v.id === id ? { ...v, value: data.value } : v));
      }
    } catch (e) {
      console.error('Failed to reset variable:', e);
    }
  };

  const handleBulkUpdate = async (updates: Array<{ id: number; value: any }>) => {
    try {
      const res = await fetch('/api/variables?action=bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        fetchVariables();
      }
    } catch (e) {
      console.error('Failed to bulk update variables:', e);
    }
  };

  const startEdit = (variable: Variable) => {
    setEditingId(variable.id ?? null);
    setEditForm({ ...variable });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (editingId) {
      await handleUpdate(editingId, editForm);
      cancelEdit();
    }
  };

  const renderValueInput = (variable: Variable, onChange: (value: any) => void) => {
    const value = variable.value;

    switch (variable.type) {
      case 'boolean':
        return (
          <select
            value={value ? 'true' : 'false'}
            onChange={(e) => onChange(e.target.value === 'true')}
            className="w-full px-2 py-1 border rounded"
          >
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        );

      case 'range':
        return (
          <div className="space-y-1">
            <input
              type="range"
              min={variable.min_value ?? 0}
              max={variable.max_value ?? 100}
              step={variable.step ?? 1}
              value={Number(value) || 0}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm">{String(value)}</div>
          </div>
        );

      case 'dict':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '{}')}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {}
            }}
            className="w-full px-2 py-1 border rounded font-mono text-sm"
            rows={3}
          />
        );

      case 'list':
        return (
          <textarea
            value={Array.isArray(value) ? value.join('\n') : String(value ?? '')}
            onChange={(e) => onChange(e.target.value.split('\n').filter(s => s.trim()))}
            className="w-full px-2 py-1 border rounded font-mono text-sm"
            rows={3}
            placeholder="每行一个值"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={Number(value) || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full px-2 py-1 border rounded"
          />
        );

      default:
        return (
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 border rounded"
          />
        );
    }
  };

  const renderValueDisplay = (variable: Variable) => {
    const { value, type } = variable;

    switch (type) {
      case 'boolean':
        return value ? '是' : '否';
      case 'dict':
      case 'list':
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      default:
        return String(value ?? '');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">变量管理</h3>
        <button
          onClick={handleCreate}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          添加变量
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">加载中...</div>
      ) : variables.length === 0 ? (
        <div className="text-center py-4 text-gray-500">暂无变量</div>
      ) : (
        <div className="space-y-2">
          {variables.map((variable) => (
            <div key={variable.id} className="border rounded p-3 space-y-2">
              {editingId === variable.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="名称"
                      className="px-2 py-1 border rounded"
                    />
                    <input
                      type="text"
                      value={editForm.key || ''}
                      onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                      placeholder="键名"
                      className="px-2 py-1 border rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editForm.type || 'number'}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value as VariableType })}
                      className="px-2 py-1 border rounded"
                    >
                      {typeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={editForm.is_persistent ?? true}
                          onChange={(e) => setEditForm({ ...editForm, is_persistent: e.target.checked })}
                        />
                        持久化
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={editForm.is_visible ?? true}
                          onChange={(e) => setEditForm({ ...editForm, is_visible: e.target.checked })}
                        />
                        可见
                      </label>
                    </div>
                  </div>
                  {(editForm.type === 'number' || editForm.type === 'range') && (
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={editForm.min_value ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, min_value: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="最小值"
                        className="px-2 py-1 border rounded"
                      />
                      <input
                        type="number"
                        value={editForm.max_value ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, max_value: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="最大值"
                        className="px-2 py-1 border rounded"
                      />
                      <input
                        type="number"
                        value={editForm.step ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, step: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="步长"
                        className="px-2 py-1 border rounded"
                      />
                    </div>
                  )}
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="描述"
                    className="w-full px-2 py-1 border rounded"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{variable.name}</div>
                      <div className="text-sm text-gray-500">键名: {variable.key}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(variable)}
                        className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleReset(variable.id!)}
                        className="px-2 py-1 text-sm bg-yellow-100 rounded hover:bg-yellow-200"
                      >
                        重置
                      </button>
                      <button
                        onClick={() => handleDelete(variable.id!)}
                        className="px-2 py-1 text-sm bg-red-100 rounded hover:bg-red-200"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {typeOptions.find(t => t.value === variable.type)?.label || variable.type}:
                    </span>
                    {renderValueInput(variable, (value) => handleUpdate(variable.id!, { value }))}
                  </div>
                  {variable.description && (
                    <div className="text-sm text-gray-500">{variable.description}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
