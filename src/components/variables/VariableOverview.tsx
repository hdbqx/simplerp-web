import { ChevronRight, Eye, Layers3 } from 'lucide-react';
import type { Variable } from '../../lib/db';

interface VariableOverviewProps {
  variables: Variable[];
}

const MAX_DEPTH = 6;
const META_KEYS = new Set(['name', 'description', 'level', 'max_level']);

function isPlainObject(value: any): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function getValueType(value: any): string {
  if (Array.isArray(value)) return '数组';
  if (isPlainObject(value)) return '对象';
  if (value === null || value === undefined) return '空';
  if (typeof value === 'number') return '数字';
  if (typeof value === 'boolean') return '布尔';
  return '文本';
}

function formatPrimitive(value: any): string {
  if (value === null || value === undefined) return '空';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NaN';
  return String(value);
}

function splitTags(tags?: string) {
  if (!tags) return [];
  return tags.split(/[,，\n]/).map(t => t.trim()).filter(Boolean);
}

function ValueTree({ label, value, depth = 0 }: { label: string; value: any; depth?: number }) {
  if (depth > MAX_DEPTH) {
    return <div className="text-xs opacity-50 italic">已达到最大嵌套深度</div>;
  }

  if (Array.isArray(value)) {
    return (
      <details open={depth < 2} className="group rounded-2xl border border-base-300 bg-base-100/80 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <ChevronRight className="h-4 w-4 shrink-0 opacity-70 transition-transform group-open:rotate-90" />
            <span className="truncate text-sm font-medium">{label}</span>
          </div>
          <span className="badge badge-ghost badge-sm">{value.length} 项</span>
        </summary>
        <div className="space-y-2 px-3 pb-3">
          {value.length === 0 ? (
            <div className="text-xs opacity-50">空数组</div>
          ) : (
            value.map((item, idx) => (
              <div key={`${label}-${idx}`} className="rounded-2xl border border-base-300 bg-base-200/30 p-3">
                <ValueNode label={`#${idx + 1}`} value={item} depth={depth + 1} />
              </div>
            ))
          )}
        </div>
      </details>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    const displayName = typeof value.name === 'string' ? value.name : label;
    const description = typeof value.description === 'string' ? value.description : '';
    const level = typeof value.level === 'number' ? value.level : undefined;
    const maxLevel = typeof value.max_level === 'number' && value.max_level > 0 ? value.max_level : undefined;
    const progress = level !== undefined && maxLevel ? Math.max(0, Math.min(level / maxLevel, 1)) : undefined;
    const restEntries = entries.filter(([key]) => !META_KEYS.has(key));

    return (
      <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100/90 shadow-sm">
        <div className="border-b border-base-300/70 bg-gradient-to-r from-primary/10 via-base-100 to-secondary/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] opacity-60">
                <Layers3 className="h-3.5 w-3.5" />
                {label}
              </div>
              <div className="truncate text-base font-semibold">{displayName}</div>
              {description && <div className="mt-1 text-xs leading-relaxed opacity-70">{description}</div>}
            </div>
            <div className="shrink-0 text-right">
              <div className="badge badge-outline badge-sm">{entries.length} 字段</div>
              {level !== undefined && maxLevel !== undefined && (
                <div className="mt-2 text-xs font-mono opacity-70">
                  Lv.{level}/{maxLevel}
                </div>
              )}
            </div>
          </div>
          {progress !== undefined && (
            <progress className="progress progress-primary mt-3 h-2" value={progress * 100} max="100" />
          )}
        </div>

        <div className="space-y-2 p-3">
          {restEntries.length === 0 ? (
            <div className="text-xs opacity-50">无额外字段</div>
          ) : (
            restEntries.map(([key, val]) => <ValueNode key={`${label}-${key}`} label={key} value={val} depth={depth + 1} />)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-200/30 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs opacity-60">{label}</div>
        <div className="break-all font-mono text-sm">{formatPrimitive(value)}</div>
      </div>
      <span className="badge badge-ghost badge-sm">{getValueType(value)}</span>
    </div>
  );
}

function ValueNode({ label, value, depth = 0 }: { label: string; value: any; depth?: number }) {
  if (Array.isArray(value) || isPlainObject(value)) {
    return <ValueTree label={label} value={value} depth={depth} />;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-200/30 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs opacity-60">{label}</div>
        <div className="break-all font-mono text-sm">{formatPrimitive(value)}</div>
      </div>
      <span className="badge badge-ghost badge-sm">{getValueType(value)}</span>
    </div>
  );
}

export function VariableOverview({ variables }: VariableOverviewProps) {
  const visibleVariables = variables.filter(v => v.is_visible !== false);
  const hiddenCount = variables.length - visibleVariables.length;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-base-300 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4" />
              只读变量概览
            </div>
            <p className="mt-1 text-xs opacity-60">仅展示标记为可见的变量，支持多层嵌套对象与数组展开。</p>
          </div>
          <div className="text-right text-xs opacity-70">
            <div>{visibleVariables.length} 可见</div>
            <div>{hiddenCount} 隐藏</div>
          </div>
        </div>
      </div>

      {visibleVariables.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-base-300 bg-base-100/70 p-8 text-center text-sm opacity-50">
          暂无可展示的变量
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleVariables.map(variable => {
            const tags = splitTags(variable.tags);
            const isNumberLike = variable.type === 'number' || variable.type === 'range';
            const numericValue = isNumberLike ? Number(variable.value) : NaN;
            const minValue = typeof variable.min_value === 'number' ? variable.min_value : undefined;
            const maxValue = typeof variable.max_value === 'number' ? variable.max_value : undefined;
            const progress = isNumberLike && minValue !== undefined && maxValue !== undefined && maxValue > minValue
              ? Math.max(0, Math.min((numericValue - minValue) / (maxValue - minValue), 1))
              : undefined;

            return (
              <div key={variable.id ?? variable.key} className="overflow-hidden rounded-3xl border border-base-300 bg-base-100/90 shadow-lg">
                <div className="border-b border-base-300/70 bg-base-200/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold">{variable.name}</span>
                        <span className="badge badge-neutral badge-sm font-mono">{variable.key}</span>
                        <span className="badge badge-primary badge-sm">{variable.type}</span>
                        {variable.is_persistent && <span className="badge badge-outline badge-sm">持久</span>}
                      </div>
                      {variable.description && <div className="mt-2 text-xs leading-relaxed opacity-70">{variable.description}</div>}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-black tracking-tight">
                        {isNumberLike ? formatPrimitive(variable.value) : getValueType(variable.value)}
                      </div>
                      {variable.is_visible !== false && <div className="text-[11px] opacity-50">可见</div>}
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map(tag => <span key={tag} className="badge badge-ghost badge-sm">{tag}</span>)}
                    </div>
                  )}

                  {progress !== undefined && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px] opacity-60">
                        <span>范围</span>
                        <span className="font-mono">{minValue} - {maxValue}</span>
                      </div>
                      <progress className="progress progress-primary h-2" value={progress * 100} max="100" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  {isNumberLike ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-base-300 bg-base-200/30 p-3">
                        <div className="text-xs opacity-60">当前值</div>
                        <div className="mt-1 text-3xl font-black tracking-tight">{formatPrimitive(variable.value)}</div>
                      </div>
                      <div className="rounded-2xl border border-base-300 bg-base-200/30 p-3">
                        <div className="text-xs opacity-60">默认值</div>
                        <div className="mt-1 break-all font-mono text-sm">{formatPrimitive(variable.default_value)}</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ValueNode label="当前值" value={variable.value} />
                      {variable.default_value !== undefined && variable.default_value !== null && (
                        <ValueNode label="默认值" value={variable.default_value} />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
