import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import type { Variable, VariableStage, VariableThoughtConfig } from '../lib/db';
import { api } from '../lib/db';

interface Props {
  charId?: number;
  roomId?: number;
}

export function VariableManager({ charId, roomId }: Props) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [stages, setStages] = useState<Map<number, VariableStage[]>>(new Map());
  const [thoughtConfig, setThoughtConfig] = useState<VariableThoughtConfig | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [showThoughtConfig, setShowThoughtConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [charId, roomId]);

  const loadData = async () => {
    try {
      const vars = await api.variables.list(charId, roomId);
      setVariables(vars);
      for (const v of vars) {
        if (v.id) {
          const st = await api.variableStages.list(v.id);
          setStages(prev => new Map(prev).set(v.id!, st));
        }
      }
      const config = await api.variableThoughtConfig.get(charId, roomId);
      setThoughtConfig(config);
    } catch (e) {
      console.error('Failed to load variables', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariable = async () => {
    const newVar: Partial<Variable> = {
      name: '新变量',
      key: 'new_var',
      type: 'number',
      value: 0,
      is_persistent: true,
      is_visible: true
    };
    if (charId) newVar.char_id = charId;
    if (roomId) newVar.room_id = roomId;
    const result = await api.variables.add(newVar as Variable);
    await loadData();
  };

  const handleUpdateVariable = async (id: number, updates: Partial<Variable>) => {
    await api.variables.update(id, updates);
    await loadData();
  };

  const handleDeleteVariable = async (id: number) => {
    if (confirm('确定要删除这个变量吗？')) {
      await api.variables.delete(id);
      await loadData();
    }
  };

  const handleTriggerThought = async () => {
    alert('思考功能需要对话历史，会在对话时自动触发');
  };

  if (loading) return <div className="p-4">加载中...</div>;

  return (
    <div className="flex flex-col h-full bg-base-200">
      <div className="p-4 border-b border-base-content/10 flex justify-between items-center">
        <h2 className="font-bold text-lg">变量管理</h2>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setShowThoughtConfig(true)}
          >
            <Settings size={16} className="mr-1" /> 思考配置
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleAddVariable}>
            <Plus size={16} className="mr-1" /> 新增变量
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {variables.length === 0 ? (
          <div className="text-center opacity-60 py-8">
            还没有变量，点击上方按钮创建一个
          </div>
        ) : (
          variables.map(v => (
            <VariableCard
              key={v.id}
              variable={v}
              stages={stages.get(v.id!) || []}
              onEdit={setEditingVariable}
              onUpdate={handleUpdateVariable}
              onDelete={handleDeleteVariable}
            />
          ))
        )}
      </div>

      {showEditor && editingVariable && (
        <VariableEditor
          variable={editingVariable}
          stages={stages.get(editingVariable.id!) || []}
          onClose={() => { setShowEditor(false); setEditingVariable(null); }}
          onSave={async (updates) => {
            if (editingVariable.id) await handleUpdateVariable(editingVariable.id, updates);
            setShowEditor(false);
            setEditingVariable(null);
          }}
        />
      )}

      {showThoughtConfig && (
        <ThoughtConfigModal
          charId={charId}
          roomId={roomId}
          config={thoughtConfig}
          onClose={() => setShowThoughtConfig(false)}
          onSave={async (config) => {
            await api.variableThoughtConfig.save(config);
            await loadData();
            setShowThoughtConfig(false);
          }}
        />
      )}
    </div>
  );
}

function VariableCard({
  variable,
  stages,
  onEdit,
  onUpdate,
  onDelete
}: {
  variable: Variable;
  stages: VariableStage[];
  onEdit: (v: Variable) => void;
  onUpdate: (id: number, updates: Partial<Variable>) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tempValue, setTempValue] = useState(variable.value);
  const [isEditingValue, setIsEditingValue] = useState(false);

  const getPercentage = () => {
    if (variable.min_value !== undefined && variable.max_value !== undefined) {
      const range = variable.max_value - variable.min_value;
      if (range > 0) {
        return Math.min(100, Math.max(0, ((variable.value - variable.min_value) / range) * 100));
      }
    }
    return undefined;
  };

  const activeStage = stages.find(s => {
    try {
      const func = new Function('v', `return ${s.condition};`);
      return func(variable.value);
    } catch {
      return false;
    }
  });

  const percentage = getPercentage();

  const handleSaveValue = async () => {
    if (variable.id) {
      await onUpdate(variable.id, { value: tempValue });
      setIsEditingValue(false);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-content/10">
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold">{variable.name}</h3>
            <p className="text-sm opacity-60 font-mono">{variable.key}</p>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(variable)}>
              <Edit size={16} />
            </button>
            <button className="btn btn-ghost btn-sm text-error" onClick={() => variable.id && onDelete(variable.id)}>
              <Trash2 size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <div className="mt-3">
          {variable.type === 'number' || variable.type === 'range' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isEditingValue ? (
                  <>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-24"
                      value={tempValue}
                      onChange={(e) => setTempValue(parseFloat(e.target.value))}
                      step={variable.step || 1}
                      min={variable.min_value}
                      max={variable.max_value}
                    />
                    <button className="btn btn-sm btn-primary" onClick={handleSaveValue}>保存</button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg">{variable.value}</span>
                    <button className="btn btn-ghost btn-xs" onClick={() => setIsEditingValue(true)}>
                      <Edit size={12} />
                    </button>
                  </div>
                )}
              </div>
              {percentage !== undefined && (
                <progress className="progress progress-primary w-full" value={percentage} max="100" />
              )}
              <div className="text-xs opacity-60 flex gap-2">
                {variable.min_value !== undefined && <span>min: {variable.min_value}</span>}
                {variable.max_value !== undefined && <span>max: {variable.max_value}</span>}
              </div>
            </div>
          ) : variable.type === 'boolean' ? (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={Boolean(variable.value)}
                onChange={(e) => variable.id && onUpdate(variable.id, { value: e.target.checked })}
              />
              <span>{variable.value ? '是' : '否'}</span>
            </div>
          ) : (
            <div>
              {isEditingValue ? (
                <>
                  <textarea
                    className="textarea textarea-bordered w-full text-sm"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                  />
                  <button className="btn btn-sm btn-primary mt-2" onClick={handleSaveValue}>保存</button>
                </>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="font-mono">{variable.value}</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => setIsEditingValue(true)}>
                    <Edit size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {activeStage && (
          <div className="mt-3 p-2 bg-primary/10 rounded-lg border border-primary/20">
            <span className="text-xs font-bold text-primary">当前阶段：{activeStage.name}</span>
          </div>
        )}

        {expanded && (
          <div className="mt-4 pt-4 border-t border-base-content/10">
            {variable.description && (
              <p className="text-sm opacity-70 mb-3">{variable.description}</p>
            )}
            {stages.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold">阶段配置</h4>
                {stages.map(s => (
                  <div key={s.id} className="text-sm p-2 bg-base-200 rounded">
                    <div className="font-bold">{s.name}</div>
                    <div className="font-mono text-xs opacity-70">{s.condition}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VariableEditor({
  variable,
  stages,
  onClose,
  onSave
}: {
  variable: Variable;
  stages: VariableStage[];
  onClose: () => void;
  onSave: (updates: Partial<Variable>) => void;
}) {
  const [form, setForm] = useState(variable);

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">编辑变量</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label font-bold text-sm">名称</label>
              <input
                className="input input-bordered"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label font-bold text-sm">键</label>
              <input
                className="input input-bordered font-mono"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
              />
            </div>
          </div>
          <div className="form-control">
            <label className="label font-bold text-sm">类型</label>
            <select
              className="select select-bordered"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            >
              <option value="number">数字</option>
              <option value="range">范围</option>
              <option value="string">字符串</option>
              <option value="boolean">布尔</option>
            </select>
          </div>
          {(form.type === 'number' || form.type === 'range') && (
            <div className="grid grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label font-bold text-sm">最小值</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.min_value ?? ''}
                  onChange={(e) => setForm({ ...form, min_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div className="form-control">
                <label className="label font-bold text-sm">最大值</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.max_value ?? ''}
                  onChange={(e) => setForm({ ...form, max_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div className="form-control">
                <label className="label font-bold text-sm">步长</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.step ?? ''}
                  onChange={(e) => setForm({ ...form, step: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
            </div>
          )}
          <div className="form-control">
            <label className="label font-bold text-sm">描述</label>
            <textarea
              className="textarea textarea-bordered"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.is_persistent}
                onChange={(e) => setForm({ ...form, is_persistent: e.target.checked })}
              />
              <span className="text-sm">持久化</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.is_visible}
                onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
              />
              <span className="text-sm">可见</span>
            </label>
          </div>
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>保存</button>
        </div>
      </div>
    </div>
  );
}

function ThoughtConfigModal({
  charId,
  roomId,
  config,
  onClose,
  onSave
}: {
  charId?: number;
  roomId?: number;
  config: VariableThoughtConfig | null;
  onClose: () => void;
  onSave: (config: VariableThoughtConfig) => void;
}) {
  const [form, setForm] = useState(config || {
    char_id: charId,
    room_id: roomId,
    is_auto_update: false
  });

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">思考配置</h3>
        <div className="space-y-4">
          <div className="form-control">
            <label className="label font-bold text-sm">自动更新</label>
            <label className="label cursor-pointer">
              <span className="text-sm">启用自动变量更新</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={form.is_auto_update}
                onChange={(e) => setForm({ ...form, is_auto_update: e.target.checked })}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label font-bold text-sm">更新间隔（N条消息后）</label>
            <input
              type="number"
              className="input input-bordered"
              value={form.update_interval ?? ''}
              onChange={(e) => setForm({ ...form, update_interval: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
          <div className="form-control">
            <label className="label font-bold text-sm">思考提示词</label>
            <textarea
              className="textarea textarea-bordered h-48 font-mono text-sm"
              value={form.thought_prompt ?? ''}
              onChange={(e) => setForm({ ...form, thought_prompt: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>保存</button>
        </div>
      </div>
    </div>
  );
}
