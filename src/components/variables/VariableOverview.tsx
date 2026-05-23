import { ChevronDown, Eye, Layers3, Sparkles } from 'lucide-react';
import type { Variable } from '../../lib/db';

interface VariableOverviewProps {
  variables: Variable[];
}

const MAX_DEPTH = 6;
const META_KEYS = new Set(['name', 'description', 'level', 'max_level']);

function isPlainObject(value: any): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function splitTags(tags?: string) {
  if (!tags) return [];
  return tags.split(/[,，\n]/).map(t => t.trim()).filter(Boolean);
}

function formatValue(value: any) {
  if (value === null || value === undefined) return '空';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NaN';
  if (Array.isArray(value)) return `数组(${value.length})`;
  if (isPlainObject(value)) return '对象';
  return String(value);
}

function typeLabel(value: any) {
  if (Array.isArray(value)) return '数组';
  if (isPlainObject(value)) return '对象';
  if (value === null || value === undefined) return '空';
  if (typeof value === 'number') return '数值';
  if (typeof value === 'boolean') return '布尔';
  return '文本';
}

function MetaChip({ label }: { label: string }) {
  return <span className="rounded-full border border-base-300 bg-base-100/80 px-2.5 py-1 text-[11px] font-medium text-base-content/70">{label}</span>;
}

function ValueBadge({ value }: { value: any }) {
  return <span className="rounded-full bg-base-200 px-2.5 py-1 text-[11px] font-medium text-base-content/70">{typeLabel(value)}</span>;
}

function ObjectCard({ title, value, depth = 0 }: { title: string; value: any; depth?: number }) {
  if (depth > MAX_DEPTH) return <div className="px-3 py-2 text-xs text-base-content/45">已达到最大嵌套深度</div>;

  if (Array.isArray(value)) {
    return (
      <details className="group rounded-2xl border border-base-300 bg-base-100/80 shadow-sm" open={depth < 1}>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60 transition-transform group-open:rotate-180" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="text-[11px] text-base-content/45">数组 · {value.length} 项</div>
          </div>
          <ValueBadge value={value} />
        </summary>
        <div className="space-y-2 border-t border-base-300/70 px-4 py-3">
          {value.length === 0 ? (
            <div className="rounded-xl border border-dashed border-base-300 bg-base-200/20 px-3 py-4 text-xs text-base-content/45">空数组</div>
          ) : (
            value.map((item, idx) => (
              <div key={`${title}-${idx}`} className="rounded-xl border border-base-300 bg-base-100/70 p-3">
                <ValueRow label={`#${idx + 1}`} value={item} depth={depth + 1} />
              </div>
            ))
          )}
        </div>
      </details>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    const displayName = typeof value.name === 'string' ? value.name : title;
    const description = typeof value.description === 'string' ? value.description : '';
    const level = typeof value.level === 'number' ? value.level : undefined;
    const maxLevel = typeof value.max_level === 'number' && value.max_level > 0 ? value.max_level : undefined;
    const progress = level !== undefined && maxLevel ? Math.max(0, Math.min(level / maxLevel, 1)) : undefined;
    const extras = entries.filter(([key]) => !META_KEYS.has(key));

    return (
      <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100/90 shadow-sm">
        <div className="border-b border-base-300/70 bg-gradient-to-r from-base-100 via-base-100 to-base-200/50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[11px] tracking-[0.18em] text-base-content/45 uppercase">
                <Layers3 className="h-3.5 w-3.5" />
                {title}
              </div>
              <div className="text-lg font-bold leading-tight">{displayName}</div>
              {description && <div className="mt-2 text-xs leading-relaxed text-base-content/60">{description}</div>}
            </div>
            <div className="shrink-0 text-right">
              <div className="inline-flex rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-[11px] text-base-content/60">{entries.length} 字段</div>
              {level !== undefined && maxLevel !== undefined && <div className="mt-2 text-[11px] font-mono text-base-content/50">Lv.{level}/{maxLevel}</div>}
            </div>
          </div>
          {progress !== undefined && (
            <div className="mt-4">
              <progress className="progress progress-primary h-1.5 w-full" value={progress * 100} max="100" />
            </div>
          )}
        </div>

        <div className="space-y-2 p-4">
          {extras.length === 0 ? (
            <div className="rounded-xl border border-dashed border-base-300 bg-base-200/20 px-3 py-4 text-xs text-base-content/45">无其他字段</div>
          ) : (
            extras.map(([key, val]) => <ValueRow key={`${title}-${key}`} label={key} value={val} depth={depth + 1} />)
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-100/80 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[11px] text-base-content/45">{title}</div>
        <div className="break-all font-mono text-sm">{formatValue(value)}</div>
      </div>
      <ValueBadge value={value} />
    </div>
  );
}

function ValueRow({ label, value, depth = 0 }: { label: string; value: any; depth?: number }) {
  if (Array.isArray(value) || isPlainObject(value)) {
    return <ObjectCard title={label} value={value} depth={depth} />;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-100/80 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[11px] text-base-content/45">{label}</div>
        <div className="break-all font-mono text-sm">{formatValue(value)}</div>
      </div>
      <ValueBadge value={value} />
    </div>
  );
}

export function VariableOverview({ variables }: VariableOverviewProps) {
  const visibleVariables = variables.filter(v => v.is_visible !== false);
  const hiddenCount = variables.length - visibleVariables.length;

  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-base-300 bg-base-100/90 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4" />
              变量只读预览
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-base-content/60">
              显示当前角色可见变量的结构、数值和层级，支持对象与数组的层层展开。
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 text-right text-xs text-base-content/60">
            <MetaChip label={`${visibleVariables.length} 可见`} />
            <MetaChip label={`${hiddenCount} 隐藏`} />
          </div>
        </div>
      </div>

      {visibleVariables.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-base-100/70 p-10 text-center text-sm text-base-content/45">
          暂无可展示变量
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleVariables.map(variable => {
            const tags = splitTags(variable.tags);
            const isNumeric = variable.type === 'number' || variable.type === 'range';
            const min = typeof variable.min_value === 'number' ? variable.min_value : undefined;
            const max = typeof variable.max_value === 'number' ? variable.max_value : undefined;
            const progress = isNumeric && min !== undefined && max !== undefined && max > min
              ? Math.max(0, Math.min((Number(variable.value) - min) / (max - min), 1))
              : undefined;

            return (
              <section key={variable.id ?? variable.key} className="overflow-hidden rounded-[1.75rem] border border-base-300 bg-base-100/95 shadow-sm">
                <div className="border-b border-base-300/70 bg-gradient-to-r from-base-100 via-base-100 to-base-200/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{variable.name}</span>
                        <MetaChip label={variable.key} />
                        <MetaChip label={variable.type} />
                        {variable.is_persistent && <MetaChip label="持久" />}
                      </div>
                      {variable.description && <div className="mt-2 text-xs leading-relaxed text-base-content/60">{variable.description}</div>}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-semibold leading-none">{isNumeric ? formatValue(variable.value) : typeLabel(variable.value)}</div>
                      <div className="mt-1 text-[11px] text-base-content/45">只读</div>
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map(tag => <MetaChip key={tag} label={tag} />)}
                    </div>
                  )}

                  {progress !== undefined && (
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-[11px] text-base-content/45">
                        <span>进度</span>
                        <span className="font-mono">{min} - {max}</span>
                      </div>
                      <progress className="progress progress-primary h-1.5" value={progress * 100} max="100" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-base-300 bg-base-100/80 p-4">
                      <div className="text-[11px] tracking-[0.18em] text-base-content/45 uppercase">当前值</div>
                      <div className="mt-2 break-words text-base font-semibold leading-snug">{formatValue(variable.value)}</div>
                    </div>
                    <div className="rounded-2xl border border-base-300 bg-base-100/80 p-4">
                      <div className="text-[11px] tracking-[0.18em] text-base-content/45 uppercase">默认值</div>
                      <div className="mt-2 break-words text-base font-semibold leading-snug">{formatValue(variable.default_value)}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-base-300 bg-base-100/80 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4" />
                        结构预览
                      </div>
                      <div className="text-[11px] text-base-content/45">支持深层嵌套</div>
                    </div>
                    <ObjectCard title="value" value={variable.value} />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
