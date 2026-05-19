import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Variable, VariableType, VariableStage } from '../../lib/db';
import { api } from '../../lib/db';

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
  number: 'badge-primary', string: 'badge-secondary', boolean: 'badge-accent',
  range: 'badge-info', dict: 'badge-warning', list: 'badge-success',
};

const defaultValueForType = (type: VariableType): any => {
  switch (type) {
    case 'number': case 'range': return 0;
    case 'boolean': return false;
    case 'string': return '';
    case 'dict': return {};
    case 'list': return [];
  }
};

const DICT_PLACEHOLDER = '{"name": "主角", "技能": ["技能1", "技能2"], "后宫": [{"name": "nv1", "堕落值": 1}]}';

export function VariableManager({ charId, roomId, onVariablesChange }: VariableManagerProps) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Variable>>({});
  // raw text buffer for dict/list while user is typing (may be invalid JSON)
  const [rawTextState, setRawTextState] = useState<Record<number, string>>({});

  // Stages modal
  const [stagesVarId, setStagesVarId] = useState<number | null>(null);
  const [stages, setStages] = useState<VariableStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [stageForm, setStageForm] = useState<Partial<VariableStage>>({
    name: '', condition: '', priority: 0, stage_prompt: '', effects: '', is_active: true,
  });

  const onChangeRef = useRef(onVariablesChange);
  useEffect(() => { onChangeRef.current = onVariablesChange; });

  const fetchVariables = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      const data = await fetch(`/api/variables?${params}`).then(r => r.json());
      setVariables(data);
      onChangeRef.current?.(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [charId, roomId]);

  useEffect(() => { fetchVariables(); }, [fetchVariables]);

  // ── variable CRUD ──────────────────────────────────────────────────────────

  const handleCreate = async () => {
    await fetch('/api/variables', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ char_id: charId, room_id: roomId, name: '新变量', key: `var_${Date.now()}`, type: 'number', value: 0, is_persistent: true, is_visible: true }),
    });
    fetchVariables();
  };

  const handleUpdate = async (id: number, updates: Partial<Variable>) => {
    await fetch('/api/variables', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    fetchVariables();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此变量？')) return;
    await fetch(`/api/variables?id=${id}`, { method: 'DELETE' });
    fetchVariables();
  };

  const handleReset = async (id: number) => {
    const res = await fetch('/api/variables?action=reset&id=' + id, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setVariables(prev => prev.map(v => v.id === id ? { ...v, value: data.value } : v));
    }
  };

  const startEdit = (v: Variable) => { setEditingId(v.id ?? null); setEditForm({ ...v }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  const saveEdit = async () => { if (editingId) { await handleUpdate(editingId, editForm); cancelEdit(); } };

  // ── stages CRUD ────────────────────────────────────────────────────────────

  const openStages = async (varId: number) => {
    setStagesVarId(varId);
    setEditingStageId(null);
    setStageForm({ name: '', condition: '', priority: 0, stage_prompt: '', effects: '', is_active: true });
    setStagesLoading(true);
    try { setStages(await api.variableStages.list(varId)); }
    catch (e) { console.error(e); }
    finally { setStagesLoading(false); }
  };

  const saveStage = async () => {
    if (!stagesVarId) return;
    if (editingStageId) {
      await api.variableStages.update(editingStageId, stageForm);
    } else {
      await api.variableStages.add({ ...stageForm as VariableStage, variable_id: stagesVarId });
    }
    setEditingStageId(null);
    setStageForm({ name: '', condition: '', priority: 0, stage_prompt: '', effects: '', is_active: true });
    setStages(await api.variableStages.list(stagesVarId));
  };

  const deleteStage = async (id: number) => {
    if (!stagesVarId) return;
    await api.variableStages.delete(id);
    setStages(await api.variableStages.list(stagesVarId));
  };

  const startEditStage = (s: VariableStage) => { setEditingStageId(s.id ?? null); setStageForm({ ...s }); };

  // ── value input renderer ───────────────────────────────────────────────────

  const renderValueInput = (variable: Variable, onChange: (v: any) => void) => {
    const { value, id: vid } = variable;
    const id = vid!;

    switch (variable.type) {
      case 'boolean':
        return <input type="checkbox" className="toggle toggle-primary toggle-sm"
          checked={Boolean(value)} onChange={e => onChange(e.target.checked)} />;

      case 'range':
        return (
          <div className="flex items-center gap-2 flex-1">
            <input type="range" min={variable.min_value ?? 0} max={variable.max_value ?? 100}
              step={variable.step ?? 1} value={Number(value) || 0}
              onChange={e => onChange(Number(e.target.value))}
              className="range range-primary range-xs flex-1" />
            <span className="text-sm font-mono w-10 text-right">{String(value)}</span>
          </div>
        );

      case 'dict': {
        const raw = rawTextState[id] ?? (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '{}'));
        return (
          <textarea value={raw} rows={5} placeholder={DICT_PLACEHOLDER}
            className="textarea textarea-bordered textarea-sm w-full font-mono text-xs"
            onChange={e => {
              const text = e.target.value;
              setRawTextState(prev => ({ ...prev, [id]: text }));
              try { onChange(JSON.parse(text)); } catch {}
            }}
            onBlur={e => {
              try {
                onChange(JSON.parse(e.target.value));
                setRawTextState(prev => { const n = { ...prev }; delete n[id]; return n; });
              } catch {}
            }} />
        );
      }

      case 'list': {
        const raw = rawTextState[id] ?? (Array.isArray(value) ? value.join('\n') : String(value ?? ''));
        return (
          <textarea value={raw} rows={3} placeholder="每行一个值"
            className="textarea textarea-bordered textarea-sm w-full font-mono text-xs"
            onChange={e => {
              const text = e.target.value;
              setRawTextState(prev => ({ ...prev, [id]: text }));
              onChange(text.split('\n').filter((s: string) => s.trim()));
            }}
            onBlur={() => setRawTextState(prev => { const n = { ...prev }; delete n[id]; return n; })} />
        );
      }

      case 'number':
        return <input type="number" value={Number(value) || 0} onChange={e => onChange(Number(e.target.value))}
          className="input input-bordered input-sm w-32" />;

      default:
        return <input type="text" value={String(value ?? '')} onChange={e => onChange(e.target.value)}
          className="input input-bordered input-sm flex-1" />;
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  const stagesVar = variables.find(v => v.id === stagesVarId);

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
          {variables.map(variable => (
            <div key={variable.id} className="card bg-base-200 shadow-sm border border-base-300">
              <div className="card-body p-3">
                {editingId === variable.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={editForm.name || ''} placeholder="名称"
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="input input-bordered input-sm" />
                      <input type="text" value={editForm.key || ''} placeholder="键名"
                        onChange={e => setEditForm({ ...editForm, key: e.target.value })}
                        className="input input-bordered input-sm font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editForm.type || 'number'}
                        onChange={e => {
                          const t = e.target.value as VariableType;
                          setEditForm({ ...editForm, type: t, value: defaultValueForType(t) });
                        }}
                        className="select select-bordered select-sm">
                        {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input type="checkbox" className="checkbox checkbox-xs"
                            checked={editForm.is_persistent ?? true}
                            onChange={e => setEditForm({ ...editForm, is_persistent: e.target.checked })} />
                          持久化
                        </label>
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input type="checkbox" className="checkbox checkbox-xs"
                            checked={editForm.is_visible ?? true}
                            onChange={e => setEditForm({ ...editForm, is_visible: e.target.checked })} />
                          可见
                        </label>
                      </div>
                    </div>
                    {(editForm.type === 'number' || editForm.type === 'range') && (
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" value={editForm.min_value ?? ''} placeholder="最小值"
                          onChange={e => setEditForm({ ...editForm, min_value: e.target.value ? Number(e.target.value) : undefined })}
                          className="input input-bordered input-sm" />
                        <input type="number" value={editForm.max_value ?? ''} placeholder="最大值"
                          onChange={e => setEditForm({ ...editForm, max_value: e.target.value ? Number(e.target.value) : undefined })}
                          className="input input-bordered input-sm" />
                        <input type="number" value={editForm.step ?? ''} placeholder="步长"
                          onChange={e => setEditForm({ ...editForm, step: e.target.value ? Number(e.target.value) : undefined })}
                          className="input input-bordered input-sm" />
                      </div>
                    )}
                    <textarea value={editForm.description || ''} placeholder="描述（可选）" rows={2}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
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
                        <button onClick={() => openStages(variable.id!)} className="btn btn-ghost btn-xs">阶段</button>
                        <button onClick={() => startEdit(variable)} className="btn btn-ghost btn-xs">编辑</button>
                        <button onClick={() => handleReset(variable.id!)} className="btn btn-ghost btn-xs text-warning">重置</button>
                        <button onClick={() => handleDelete(variable.id!)} className="btn btn-ghost btn-xs text-error">删除</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderValueInput(variable, val => handleUpdate(variable.id!, { value: val }))}
                    </div>
                    {variable.description && <div className="text-xs opacity-60">{variable.description}</div>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stages modal */}
      {stagesVarId !== null && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">阶段管理 — {stagesVar?.name}</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setStagesVarId(null)}>✕</button>
            </div>

            {stagesLoading ? (
              <div className="flex justify-center py-4"><span className="loading loading-spinner" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {stages.length === 0 && <div className="text-center py-4 opacity-50 text-sm">暂无阶段</div>}
                {stages.map(s => (
                  <div key={s.id} className="card bg-base-200 border border-base-300">
                    <div className="card-body p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{s.name}</span>
                          <span className="badge badge-xs badge-outline">优先级 {s.priority}</span>
                          <span className={`badge badge-xs ${s.is_active ? 'badge-success' : 'badge-ghost'}`}>
                            {s.is_active ? '启用' : '禁用'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEditStage(s)} className="btn btn-ghost btn-xs">编辑</button>
                          <button onClick={() => deleteStage(s.id!)} className="btn btn-ghost btn-xs text-error">删除</button>
                        </div>
                      </div>
                      <div className="text-xs font-mono opacity-70">条件: {s.condition}</div>
                      {s.stage_prompt && <div className="text-xs opacity-60 truncate">提示: {s.stage_prompt}</div>}
                      {s.effects && <div className="text-xs font-mono opacity-60">效果: {s.effects}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stage form */}
            <div className="border-t pt-4 space-y-2">
              <div className="text-xs font-bold opacity-60">{editingStageId ? '编辑阶段' : '新增阶段'}</div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={stageForm.name || ''} placeholder="阶段名称"
                  onChange={e => setStageForm({ ...stageForm, name: e.target.value })}
                  className="input input-bordered input-sm" />
                <input type="number" value={stageForm.priority ?? 0} placeholder="优先级"
                  onChange={e => setStageForm({ ...stageForm, priority: Number(e.target.value) })}
                  className="input input-bordered input-sm" />
              </div>
              <input type="text" value={stageForm.condition || ''} placeholder="触发条件，如: v > 50"
                onChange={e => setStageForm({ ...stageForm, condition: e.target.value })}
                className="input input-bordered input-sm w-full font-mono" />
              <textarea value={stageForm.stage_prompt || ''} placeholder="阶段提示词（注入 System Prompt）" rows={2}
                onChange={e => setStageForm({ ...stageForm, stage_prompt: e.target.value })}
                className="textarea textarea-bordered textarea-sm w-full" />
              <input type="text" value={stageForm.effects || ''} placeholder='效果 JSON，如: {"add": -5} 或 {"set": 100}'
                onChange={e => setStageForm({ ...stageForm, effects: e.target.value })}
                className="input input-bordered input-sm w-full font-mono" />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" className="toggle toggle-success toggle-sm"
                    checked={stageForm.is_active ?? true}
                    onChange={e => setStageForm({ ...stageForm, is_active: e.target.checked })} />
                  启用
                </label>
                <div className="flex gap-2">
                  {editingStageId && (
                    <button onClick={() => { setEditingStageId(null); setStageForm({ name: '', condition: '', priority: 0, stage_prompt: '', effects: '', is_active: true }); }}
                      className="btn btn-ghost btn-sm">取消</button>
                  )}
                  <button onClick={saveStage} className="btn btn-primary btn-sm">
                    {editingStageId ? '保存修改' : '添加阶段'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
