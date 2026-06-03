import { Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Variable, VariableType } from '../../lib/db';

export type VariableThoughtReviewItem = {
  variableId: number;
  key: string;
  name: string;
  type: VariableType;
  previousValue: any;
  currentValue: any;
  nextValue: any;
  reason: string;
  source: 'auto' | 'manual';
};

type VariableThoughtReviewModalProps = {
  show: boolean;
  variables: Variable[];
  updates: VariableThoughtReviewItem[];
  onClose: () => void;
  onApply: (updates: Array<{ id: number; value: any }>) => Promise<void>;
};

type DraftItem = VariableThoughtReviewItem & {
  editorValue: any;
};

function formatJson(value: any) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

function toEditorValue(type: VariableType, value: any) {
  if (type === 'boolean') return Boolean(value);
  if (type === 'number' || type === 'range') return String(value ?? 0);
  if (type === 'dict' || type === 'list') return formatJson(value ?? (type === 'dict' ? {} : []));
  return String(value ?? '');
}

function parseEditorValue(type: VariableType, value: any) {
  if (type === 'boolean') return Boolean(value);
  if (type === 'number' || type === 'range') return Number(value) || 0;
  if (type === 'dict' || type === 'list') {
    const raw = String(value ?? '').trim();
    if (!raw) return type === 'dict' ? {} : [];
    return JSON.parse(raw);
  }
  return String(value ?? '');
}

function formatPreviewValue(type: VariableType, value: any) {
  if (type === 'boolean') return value ? '是' : '否';
  if (type === 'number' || type === 'range') return String(value ?? 0);
  if (type === 'dict' || type === 'list') return formatJson(value);
  return String(value ?? '');
}

function typeLabel(type: VariableType) {
  switch (type) {
    case 'number':
      return '数值';
    case 'string':
      return '文本';
    case 'boolean':
      return '布尔';
    case 'range':
      return '范围';
    case 'dict':
      return '字典';
    case 'list':
      return '列表';
    default:
      return type;
  }
}

function ValueEditor({
  item,
  onChange,
}: {
  item: DraftItem;
  onChange: (next: any) => void;
}) {
  if (item.type === 'boolean') {
    return (
      <select
        className="select select-bordered select-sm w-full"
        value={item.editorValue ? 'true' : 'false'}
        onChange={(event) => onChange(event.target.value === 'true')}
      >
        <option value="true">是</option>
        <option value="false">否</option>
      </select>
    );
  }

  if (item.type === 'number' || item.type === 'range') {
    return (
      <input
        type="number"
        className="input input-bordered input-sm w-full"
        value={item.editorValue}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (item.type === 'dict' || item.type === 'list') {
    return (
      <textarea
        rows={7}
        className="textarea textarea-bordered w-full font-mono text-xs leading-6"
        value={item.editorValue}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <textarea
      rows={3}
      className="textarea textarea-bordered w-full text-sm leading-6"
      value={item.editorValue}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ValuePreview({
  label,
  type,
  value,
}: {
  label: string;
  type: VariableType;
  value: any;
}) {
  const preview = formatPreviewValue(type, value);
  const isStructured = type === 'dict' || type === 'list';
  const isNumeric = type === 'number' || type === 'range';
  const isBoolean = type === 'boolean';

  return (
    <div className="rounded-2xl border border-base-300/80 bg-base-100/80 p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-base-content/45">{label}</div>
      {isStructured ? (
        <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950/90 p-3 font-mono text-[11px] leading-5 text-emerald-100">
          {preview}
        </pre>
      ) : (
        <div
          className={[
            'rounded-xl px-3 py-2 text-sm leading-6',
            isNumeric && 'bg-cyan-500/12 font-mono font-semibold text-cyan-700',
            isBoolean && 'bg-amber-500/12 font-semibold text-amber-700',
            !isNumeric && !isBoolean && 'bg-violet-500/10 text-base-content/80',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {preview || '空'}
        </div>
      )}
    </div>
  );
}

export function VariableThoughtReviewModal({
  show,
  variables,
  updates,
  onClose,
  onApply,
}: VariableThoughtReviewModalProps) {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    setDrafts(
      updates.map((item) => ({
        ...item,
        editorValue: toEditorValue(item.type, item.nextValue),
      })),
    );
    setErrors({});
  }, [show, updates]);

  const variableOptions = useMemo(
    () =>
      variables
        .filter((item): item is Variable & { id: number } => typeof item.id === 'number')
        .map((item) => ({
          id: item.id,
          key: item.key,
          name: item.name,
          type: item.type,
          value: item.value,
        })),
    [variables],
  );

  if (!show) return null;

  const updateDraft = (index: number, patch: Partial<DraftItem>) => {
    setDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const addManualRow = () => {
    const fallback = variableOptions.find((option) => !drafts.some((item) => item.variableId === option.id)) || variableOptions[0];
    if (!fallback) return;
    setDrafts((current) => [
      ...current,
      {
        variableId: fallback.id,
        key: fallback.key,
        name: fallback.name,
        type: fallback.type,
        previousValue: fallback.value,
        currentValue: fallback.value,
        nextValue: fallback.value,
        reason: '',
        source: 'manual',
        editorValue: toEditorValue(fallback.type, fallback.value),
      },
    ]);
  };

  const handleApply = async () => {
    const nextErrors: Record<number, string> = {};
    const payload: Array<{ id: number; value: any }> = [];

    drafts.forEach((item, index) => {
      try {
        const parsedValue = parseEditorValue(item.type, item.editorValue);
        payload.push({ id: item.variableId, value: parsedValue });
      } catch (error: any) {
        nextErrors[index] = error?.message || '值格式不合法';
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onApply(payload);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal modal-open text-base-content">
      <div className="modal-box flex max-h-[92vh] max-w-5xl flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-base-300 bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-emerald-500/10 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-lg font-black">
              <Sparkles size={18} className="text-primary" />
              变量推演结果复核
            </div>
            <div className="mt-1 text-xs text-base-content/60">
              自动推演已完成。你可以逐项确认、修正，或补充遗漏的变量变化。
            </div>
          </div>
          <button className="btn btn-circle btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-base-200/35 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
            <div>
              <div className="text-sm font-bold">本次已捕捉到 {updates.length} 项变量变化</div>
              <div className="mt-1 text-xs text-base-content/60">保存后会以你当前填写的结果覆盖对应变量。</div>
            </div>
            <button className="btn btn-primary btn-sm gap-2" onClick={addManualRow}>
              <Plus size={14} />
              补充一项变量变化
            </button>
          </div>

          {drafts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 px-6 py-12 text-center text-sm text-base-content/55">
              这次推演没有产生可复核的变量更新。
            </div>
          ) : (
            drafts.map((item, index) => (
              <div key={`${item.variableId}-${index}`} className="rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
                <div className="border-b border-base-300/70 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black">{item.name}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                          {typeLabel(item.type)}
                        </span>
                        <span className="font-mono text-xs text-base-content/45">{item.key}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                            item.source === 'auto'
                              ? 'bg-emerald-500/12 text-emerald-700'
                              : 'bg-orange-500/12 text-orange-700'
                          }`}
                        >
                          {item.source === 'auto' ? '自动推演' : '手动补充'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs leading-6 text-base-content/60">
                        原因：{item.reason || '未填写'}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => setDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,260px)_1fr]">
                    <div className="form-control">
                      <label className="label text-xs font-bold">变量</label>
                      <select
                        className="select select-bordered"
                        value={item.variableId}
                        onChange={(event) => {
                          const nextVariable = variableOptions.find((option) => option.id === Number(event.target.value));
                          if (!nextVariable) return;
                          updateDraft(index, {
                            variableId: nextVariable.id,
                            key: nextVariable.key,
                            name: nextVariable.name,
                            type: nextVariable.type,
                            previousValue: nextVariable.value,
                            currentValue: nextVariable.value,
                            nextValue: nextVariable.value,
                            editorValue: toEditorValue(nextVariable.type, nextVariable.value),
                          });
                        }}
                      >
                        {variableOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} ({option.key})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label text-xs font-bold">修正原因</label>
                      <input
                        className="input input-bordered"
                        value={item.reason}
                        placeholder="例如：战斗结束后理智值已经下降，且对话中明确提到"
                        onChange={(event) => updateDraft(index, { reason: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <ValuePreview label="更新前" type={item.type} value={item.previousValue} />
                    <ValuePreview label="当前已写入值" type={item.type} value={item.currentValue} />
                  </div>

                  <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/5 to-cyan-500/5 p-4">
                    <div className="mb-3 text-sm font-black text-primary">最终保存值</div>
                    <ValueEditor item={item} onChange={(next) => updateDraft(index, { editorValue: next })} />
                    {errors[index] && <div className="mt-2 text-xs font-semibold text-error">{errors[index]}</div>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-base-300 bg-base-100 px-6 py-4">
          <div className="flex flex-wrap justify-end gap-3">
            <button className="btn btn-ghost" onClick={onClose}>
              关闭
            </button>
            <button className="btn btn-primary gap-2" disabled={isSaving || drafts.length === 0} onClick={handleApply}>
              <Save size={15} />
              {isSaving ? '保存中...' : '保存修正结果'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
