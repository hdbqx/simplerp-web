import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/db';
import type { Variable, VariableStage, VariableType } from '../../lib/db';

interface VariableManagerProps {
  charId?: number;
  roomId?: number;
  onVariablesChange?: (variables: Variable[]) => void;
}

const typeOptions: { value: VariableType; label: string }[] = [
  { value: 'number', label: '数值' },
  { value: 'string', label: '文本' },
  { value: 'boolean', label: '布尔' },
  { value: 'range', label: '范围' },
  { value: 'dict', label: '字典' },
  { value: 'list', label: '列表' },
];

const typeBadgeColor: Record<VariableType, string> = {
  number: 'badge-primary',
  string: 'badge-secondary',
  boolean: 'badge-accent',
  range: 'badge-info',
  dict: 'badge-warning',
  list: 'badge-success',
};

const defaultValueForType = (type: VariableType): any => {
  switch (type) {
    case 'number':
    case 'range':
      return 0;
    case 'boolean':
      return false;
    case 'string':
      return '';
    case 'dict':
      return {};
    case 'list':
      return [];
  }
};

const DICT_PLACEHOLDER = '{"name":"主角","skills":["常识修改","时停三秒"],"party":[{"name":"角色1","favor":1}]}';

function valuesEqual(a: any, b: any) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function formatDraftValue(variable: Variable) {
  switch (variable.type) {
    case 'dict':
      return typeof variable.value === 'object'
        ? JSON.stringify(variable.value ?? {}, null, 2)
        : String(variable.value ?? '{}');
    case 'list':
      if (Array.isArray(variable.value)) {
        const hasStructuredItem = variable.value.some(
          (item) => item !== null && typeof item === 'object',
        );
        return hasStructuredItem
          ? JSON.stringify(variable.value, null, 2)
          : variable.value.map((item) => String(item ?? '')).join('\n');
      }
      return String(variable.value ?? '');
    case 'number':
    case 'range':
      return String(variable.value ?? 0);
    case 'boolean':
      return Boolean(variable.value);
    default:
      return String(variable.value ?? '');
  }
}

function InlineValueEditor({
  variable,
  onCommit,
}: {
  variable: Variable;
  onCommit: (value: any) => Promise<void>;
}) {
  const [draft, setDraft] = useState<any>(() => formatDraftValue(variable));
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatDraftValue(variable));
      setHasError(false);
    }
  }, [variable, isFocused]);

  const commit = async (nextValue: any) => {
    if (valuesEqual(nextValue, variable.value)) return;
    await onCommit(nextValue);
  };

  if (variable.type === 'boolean') {
    return (
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={Boolean(variable.value)}
        onChange={async (e) => {
          await commit(e.target.checked);
        }}
      />
    );
  }

  if (variable.type === 'range') {
    return (
      <div className="flex flex-1 items-center gap-2">
        <input
          type="range"
          min={variable.min_value ?? 0}
          max={variable.max_value ?? 100}
          step={variable.step ?? 1}
          value={Number(draft) || 0}
          onFocus={() => setIsFocused(true)}
          onBlur={async (e) => {
            setIsFocused(false);
            const next = Number(e.target.value) || 0;
            setDraft(String(next));
            await commit(next);
          }}
          onChange={(e) => setDraft(e.target.value)}
          onMouseUp={async (e) => {
            const next = Number((e.target as HTMLInputElement).value) || 0;
            await commit(next);
          }}
          onTouchEnd={async (e) => {
            const next = Number((e.target as HTMLInputElement).value) || 0;
            await commit(next);
          }}
          className="range range-primary range-xs flex-1"
        />
        <span className="w-10 text-right font-mono text-sm">{String(draft)}</span>
      </div>
    );
  }

  if (variable.type === 'dict') {
    return (
      <textarea
        value={draft}
        rows={5}
        placeholder={DICT_PLACEHOLDER}
        className={`textarea textarea-bordered textarea-sm w-full font-mono text-xs ${hasError ? 'textarea-error' : ''}`}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => {
          setDraft(e.target.value);
          setHasError(false);
        }}
        onBlur={async (e) => {
          setIsFocused(false);
          try {
            const parsed = JSON.parse(e.target.value);
            setHasError(false);
            await commit(parsed);
          } catch {
            setHasError(true);
          }
        }}
      />
    );
  }

  if (variable.type === 'list') {
    const isStructuredList = Array.isArray(variable.value)
      ? variable.value.some((item) => item !== null && typeof item === 'object')
      : typeof variable.value === 'string' && draft.trim().startsWith('[');

    return (
      <textarea
        value={draft}
        rows={isStructuredList ? 6 : 3}
        placeholder={isStructuredList ? '请输入合法 JSON 数组' : '每行一个值'}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => {
          setDraft(e.target.value);
          setHasError(false);
        }}
        onBlur={async (e) => {
          setIsFocused(false);
          const raw = e.target.value.trim();
          if (!raw) {
            await commit([]);
            return;
          }

          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setHasError(false);
              await commit(parsed);
              return;
            }
          } catch {
            if (isStructuredList || raw.startsWith('[')) {
              setHasError(true);
              return;
            }
          }

          setHasError(false);
          const next = raw.split('\n').map((s) => s.trim()).filter(Boolean);
          await commit(next);
        }}
        aria-invalid={hasError}
        className={`textarea textarea-bordered textarea-sm w-full font-mono text-xs ${hasError ? 'textarea-error' : ''}`}
      />
    );
  }

  if (variable.type === 'number') {
    return (
      <input
        type="number"
        value={draft}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={async (e) => {
          setIsFocused(false);
          const next = Number(e.target.value) || 0;
          setDraft(String(next));
          await commit(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="input input-bordered input-sm w-32"
      />
    );
  }

  return (
    <input
      type="text"
      value={draft}
      onFocus={() => setIsFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={async (e) => {
        setIsFocused(false);
        await commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="input input-bordered input-sm flex-1"
    />
  );
}

export function VariableManager({ charId, roomId, onVariablesChange }: VariableManagerProps) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Variable>>({});
  const [stagesVarId, setStagesVarId] = useState<number | null>(null);
  const [stages, setStages] = useState<VariableStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [stageForm, setStageForm] = useState<Partial<VariableStage>>({
    name: '',
    condition: '',
    priority: 0,
    stage_prompt: '',
    effects: '',
    is_active: true,
  });

  const onChangeRef = useRef(onVariablesChange);
  useEffect(() => {
    onChangeRef.current = onVariablesChange;
  }, [onVariablesChange]);

  const publishVariables = useCallback((next: Variable[]) => {
    setVariables(next);
    onChangeRef.current?.(next);
  }, []);

  const fetchVariables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.variables.list(charId, roomId);
      publishVariables(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [charId, roomId, publishVariables]);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  const patchVariableLocal = useCallback((id: number, updates: Partial<Variable>) => {
    publishVariables(variables.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  }, [publishVariables, variables]);

  const handleCreate = async () => {
    await api.variables.add({
      char_id: charId,
      room_id: roomId,
      name: '新变量',
      key: `var_${Date.now()}`,
      type: 'number',
      value: 0,
      default_value: 0,
      is_persistent: true,
      is_visible: true,
    } as Variable);
    await fetchVariables();
  };

  const handleUpdate = async (id: number, updates: Partial<Variable>) => {
    const previous = variables.find((v) => v.id === id);
    if (!previous) return;

    patchVariableLocal(id, updates);
    try {
      await api.variables.update(id, updates);
    } catch (e) {
      console.error(e);
      await fetchVariables();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这个变量吗？')) return;
    await api.variables.delete(id);
    await fetchVariables();
  };

  const handleReset = async (id: number) => {
    const res = await api.variables.reset(id);
    if (!res.ok) return;
    const data = await res.json();
    patchVariableLocal(id, { value: data.value });
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
    if (!editingId) return;
    await handleUpdate(editingId, editForm);
    cancelEdit();
  };

  const openStages = async (varId: number) => {
    setStagesVarId(varId);
    setEditingStageId(null);
    setStageForm({ name: '', condition: '', priority: 0, stage_prompt: '', effects: '', is_active: true });
    setStagesLoading(true);
    try {
      setStages(await api.variableStages.list(varId));
    } catch (e) {
      console.error(e);
    } finally {
      setStagesLoading(false);
    }
  };

  const saveStage = async () => {
    if (!stagesVarId) return;
    if (editingStageId) {
      await api.variableStages.update(editingStageId, stageForm);
    } else {
      await api.variableStages.add({ ...(stageForm as VariableStage), variable_id: stagesVarId });
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

  const startEditStage = (stage: VariableStage) => {
    setEditingStageId(stage.id ?? null);
    setStageForm({ ...stage });
  };

  const stagesVar = variables.find((v) => v.id === stagesVarId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold opacity-70">变量列表</h3>
        <button onClick={handleCreate} className="btn btn-primary btn-sm">+ 添加变量</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : variables.length === 0 ? (
        <div className="py-8 text-center text-sm opacity-50">暂无变量，点击右上角添加</div>
      ) : (
        <div className="space-y-2">
          {variables.map((variable) => (
            <div key={variable.id} className="card border border-base-300 bg-base-200 shadow-sm">
              <div className="card-body p-3">
                {editingId === variable.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        placeholder="名称"
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="input input-bordered input-sm"
                      />
                      <input
                        type="text"
                        value={editForm.key || ''}
                        placeholder="键名"
                        onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                        className="input input-bordered input-sm font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editForm.type || 'number'}
                        onChange={(e) => {
                          const type = e.target.value as VariableType;
                          setEditForm({ ...editForm, type, value: defaultValueForType(type) });
                        }}
                        className="select select-bordered select-sm"
                      >
                        {typeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            checked={editForm.is_persistent ?? true}
                            onChange={(e) => setEditForm({ ...editForm, is_persistent: e.target.checked })}
                          />
                          持久化
                        </label>
                        <label className="flex cursor-pointer items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
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
                          placeholder="最小值"
                          onChange={(e) => setEditForm({ ...editForm, min_value: e.target.value ? Number(e.target.value) : undefined })}
                          className="input input-bordered input-sm"
                        />
                        <input
                          type="number"
                          value={editForm.max_value ?? ''}
                          placeholder="最大值"
                          onChange={(e) => setEditForm({ ...editForm, max_value: e.target.value ? Number(e.target.value) : undefined })}
                          className="input input-bordered input-sm"
                        />
                        <input
                          type="number"
                          value={editForm.step ?? ''}
                          placeholder="步长"
                          onChange={(e) => setEditForm({ ...editForm, step: e.target.value ? Number(e.target.value) : undefined })}
                          className="input input-bordered input-sm"
                        />
                      </div>
                    )}
                    <textarea
                      value={editForm.description || ''}
                      placeholder="描述（可选）"
                      rows={2}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="textarea textarea-bordered textarea-sm w-full"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="btn btn-success btn-sm">保存</button>
                      <button onClick={cancelEdit} className="btn btn-ghost btn-sm">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{variable.name}</span>
                        <span className={`badge badge-sm ${typeBadgeColor[variable.type] || 'badge-ghost'}`}>
                          {typeOptions.find((t) => t.value === variable.type)?.label || variable.type}
                        </span>
                        <span className="font-mono text-xs opacity-50">{variable.key}</span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => openStages(variable.id!)} className="btn btn-ghost btn-xs">阶段</button>
                        <button onClick={() => startEdit(variable)} className="btn btn-ghost btn-xs">编辑</button>
                        <button onClick={() => handleReset(variable.id!)} className="btn btn-ghost btn-xs text-warning">重置</button>
                        <button onClick={() => handleDelete(variable.id!)} className="btn btn-ghost btn-xs text-error">删除</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <InlineValueEditor
                        variable={variable}
                        onCommit={async (value) => {
                          await handleUpdate(variable.id!, { value });
                        }}
                      />
                    </div>
                    {variable.description && <div className="text-xs opacity-60">{variable.description}</div>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {stagesVarId !== null && (
        <div className="modal modal-open">
          <div className="modal-box flex max-h-[80vh] max-w-2xl flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">阶段管理 - {stagesVar?.name}</h3>
              <button className="btn btn-circle btn-ghost btn-sm" onClick={() => setStagesVarId(null)}>
                <X size={16} />
              </button>
            </div>

            {stagesLoading ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner" />
              </div>
            ) : (
              <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
                {stages.length === 0 && <div className="py-4 text-center text-sm opacity-50">暂无阶段</div>}
                {stages.map((stage) => (
                  <div key={stage.id} className="card border border-base-300 bg-base-200">
                    <div className="card-body space-y-1 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{stage.name}</span>
                          <span className="badge badge-outline badge-xs">优先级 {stage.priority}</span>
                          <span className={`badge badge-xs ${stage.is_active ? 'badge-success' : 'badge-ghost'}`}>
                            {stage.is_active ? '启用' : '禁用'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEditStage(stage)} className="btn btn-ghost btn-xs">编辑</button>
                          <button onClick={() => deleteStage(stage.id!)} className="btn btn-ghost btn-xs text-error">删除</button>
                        </div>
                      </div>
                      <div className="font-mono text-xs opacity-70">条件: {stage.condition}</div>
                      {stage.stage_prompt && <div className="truncate text-xs opacity-60">提示: {stage.stage_prompt}</div>}
                      {stage.effects && <div className="font-mono text-xs opacity-60">效果: {stage.effects}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 border-t pt-4">
              <div className="text-xs font-bold opacity-60">{editingStageId ? '编辑阶段' : '新增阶段'}</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={stageForm.name || ''}
                  placeholder="阶段名称"
                  onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                  className="input input-bordered input-sm"
                />
                <input
                  type="number"
                  value={stageForm.priority ?? 0}
                  placeholder="优先级"
                  onChange={(e) => setStageForm({ ...stageForm, priority: Number(e.target.value) })}
                  className="input input-bordered input-sm"
                />
              </div>
              <input
                type="text"
                value={stageForm.condition || ''}
                placeholder="触发条件，如: v > 50"
                onChange={(e) => setStageForm({ ...stageForm, condition: e.target.value })}
                className="input input-bordered input-sm w-full font-mono"
              />
              <textarea
                value={stageForm.stage_prompt || ''}
                placeholder="阶段提示词（注入 System Prompt）"
                rows={2}
                onChange={(e) => setStageForm({ ...stageForm, stage_prompt: e.target.value })}
                className="textarea textarea-bordered textarea-sm w-full"
              />
              <input
                type="text"
                value={stageForm.effects || ''}
                placeholder='效果 JSON，如: {"add": -5} 或 {"set": 100}'
                onChange={(e) => setStageForm({ ...stageForm, effects: e.target.value })}
                className="input input-bordered input-sm w-full font-mono"
              />
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="toggle toggle-success toggle-sm"
                    checked={stageForm.is_active ?? true}
                    onChange={(e) => setStageForm({ ...stageForm, is_active: e.target.checked })}
                  />
                  启用
                </label>
                <div className="flex gap-2">
                  {editingStageId && (
                    <button
                      onClick={() => {
                        setEditingStageId(null);
                        setStageForm({ name: '', condition: '', priority: 0, stage_prompt: '', effects: '', is_active: true });
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      取消
                    </button>
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
