import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const typeBadgeColor: Record<string, string> = {
  number: 'badge-primary',
  string: 'badge-secondary',
  boolean: 'badge-accent',
  range: 'badge-info',
  dict: 'badge-warning',
  list: 'badge-success',
};

export function VariableManager({ charId, roomId, onVariablesChange }: VariableManagerProps) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Variable>>({});

  // Store callback in ref to avoid it becoming a useCallback/useEffect dependency
  const onVariablesChangeRef = useRef(onVariablesChange);
  useEffect(() => { onVariablesChangeRef.current = onVariablesChange; });

  const fetchVariables = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      const res = await fetch(`/api/variables?${params}`);
      const data = await res.json();
      setVariables(data);
      onVariablesChangeRef.current?.(data);
    } catch (e) {
      console.error('Failed to fetch variables:', e);
    } finally {
      setLoading(false);
    }
  }, [charId, roomId]);

  useEffect(() => { fetchVariables(); }, [fetchVariables]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ char_id: charId, room_id: roomId, name: '新变量', key: `var_${Date.now()}`, type: 'number', value: 0, is_persistent: true, is_visible: true }),
      });
      if (res.ok) fetchVariables();
    } catch (e) { console.error('Failed to create variable:', e); }
  };

  const handleUpdate = async (id: number, updates: Partial<Variable>) => {
    try {
      const res = await fetch('/api/variables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) fetchVariables();
    } catch (e) { console.error('Failed to update variable:', e); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此变量？')) return;
    try {
      const res = await fetch(`/api/variables?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchVariables();
    } catch (e) { console.error('Failed to delete variable:', e); }
  };

  const handleReset = async (id: number) => {
    try {
      const res = await fetch('/api/variables?action=reset&id=' + id, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setVariables(prev => prev.map(v => v.id === id ? { ...v, value: data.value } : v));
      }
    } catch (e) { console.error('Failed to reset variable:', e); }
  };

  const startEdit = (variable: Variable) => { setEditingId(variable.id ?? null); setEditForm({ ...variable }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  const saveEdit = async () => { if (editingId) { await handleUpdate(editingId, editForm); cancelEdit(); } };

  const renderValueInput = (variable: Variable, onChange: (value: any) => void) => {
    const value = variable.value;
    switch (variable.type) {
      case 'boolean':
        return (
          <input type="checkbox" className="toggle toggle-primary toggle-sm"
            checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        );
      case 'range':
        return (
          <div className="flex items-center gap-2 flex-1">
            <input type="range" min={variable.min_value ?? 0} max={variable.max_value ?? 100}
              step={variable.step ?? 1} value={Number(value) || 0}
              onChange={(e) => onChange(Number(e.target.value))}
              className="range range-primary range-xs flex-1" />
            <span className="text-sm font-mono w-10 text-right">{String(value)}</span>
          </div>
        );
      case 'dict':
        return (
          <textarea value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '{}')}
            onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch {} }}
            className="textarea textarea-bordered textarea-sm w-full font-mono text-xs" rows={3} />
        );
      case 'list':
        return (
          <textarea value={Array.isArray(value) ? value.join('\n') : String(value ?? '')}
            onChange={(e) => onChange(e.target.value.split('\n').filter((s: string) => s.trim()))}
            className="textarea textarea-bordered textarea-sm w-full font-mono text-xs" rows={3} placeholder="每行一个值" />
        );
      case 'number':
        return (
          <input type="number" value={Number(value) || 0} onChange={(e) => onChange(Number(e.target.value))}
            className="input input-bordered input-sm w-32" />
        );
      default:
        return (
          <input type="text" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}
            className="input input-bordered input-sm flex-1" />
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-sm opacity-70">变量列表</h3>
        <button onClick={handleCreate} className="btn btn-primary btn-sm">+ 添加变量</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md" /></div>
      ) : variables.length === 0 ? (
        <div className="text-center py-8 opacity-50 text-sm">暂无变量，点击右上角添加</div>
      ) : (
        <div className="space-y-2">
          {variables.map((variable) => (
            <div key={variable.id} className="card bg-base-200 shadow-sm border border-base-300">
              <div className="card-body p-3">
                {editingId === variable.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={editForm.name || ''} placeholder="名称"
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="input input-bordered input-sm" />
                      <input type="text" value={editForm.key || ''} placeholder="键名"
                        onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                        className="input input-bordered input-sm font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editForm.type || 'number'}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as VariableType })}
                        className="select select-bordered select-sm">
                        {typeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input type="checkbox" className="checkbox checkbox-xs"
                            checked={editForm.is_persistent ?? true}
                            onChange={(e) => setEditForm({ ...editForm, is_persistent: e.target.checked })} />
                          持久化
                        </label>
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input type="checkbox" className="checkbox checkbox-xs"
                            checked={editForm.is_visible ?? true}
                            onChange={(e) => setEditForm({ ...editForm, is_visible: e.target.checked })} />
                          可见
                        </label>
                      </div>
                    </div>
                    {(editForm.type === 'number' || editForm.type === 'range') && (
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" value={editForm.min_value ?? ''} placeholder="最小值"
                          onChange={(e) => setEditForm({ ...editForm, min_value: e.target.value ? Number(e.target.value) : undefined })}
                          className="input input-bordered input-sm" />
                        <input type="number" value={editForm.max_value ?? ''} placeholder="最大值"
                          onChange={(e) => setEditForm({ ...editForm, max_value: e.target.value ? Number(e.target.value) : undefined })}
                          className="input input-bordered input-sm" />
                        <input type="number" value={editForm.step ?? ''} placeholder="步长"
                          onChange={(e) => setEditForm({ ...editForm, step: e.target.value ? Number(e.target.value) : undefined })}
                          className="input input-bordered input-sm" />
                      </div>
                    )}
                    <textarea value={editForm.description || ''} placeholder="描述（可选）" rows={2}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="textarea textarea-bordered textarea-sm w-full" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="btn btn-success btn-sm">保存</button>
                      <button onClick={cancelEdit} className="btn btn-ghost btn-sm">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{variable.name}</span>
                        <span className={`badge badge-sm ${typeBadgeColor[variable.type] || 'badge-ghost'}`}>
                          {typeOptions.find(t => t.value === variable.type)?.label || variable.type}
                        </span>
                        <span className="font-mono text-xs opacity-50">{variable.key}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(variable)} className="btn btn-ghost btn-xs">编辑</button>
                        <button onClick={() => handleReset(variable.id!)} className="btn btn-ghost btn-xs text-warning">重置</button>
                        <button onClick={() => handleDelete(variable.id!)} className="btn btn-ghost btn-xs text-error">删除</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderValueInput(variable, (val) => handleUpdate(variable.id!, { value: val }))}
                    </div>
                    {variable.description && <div className="text-xs opacity-60">{variable.description}</div>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
