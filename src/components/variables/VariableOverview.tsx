import { ChevronDown, Eye, Layers3, Sparkles } from 'lucide-react';
import type { Variable } from '../../lib/db';

interface VariableOverviewProps {
  variables: Variable[];
}

const MAX_DEPTH = 6;
const META_KEYS = new Set(['name', 'description', 'level', 'max_level']);

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

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
  if (typeof value === 'number') return '数字';
  if (typeof value === 'boolean') return '布尔';
  return '文本';
}

function ObjectCard({ title, value, depth = 0 }: { title: string; value: any; depth?: number }) {
  if (depth > MAX_DEPTH) {
    return <div className="text-xs opacity-50">已达最大嵌套深度</div>;
  }

  if (Array.isArray(value)) {
    return (
      <details className="group rounded-3xl border border-base-300 bg-base-100/85 shadow-sm" open={depth < 2}>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70 transition-transform group-open:rotate-180" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="text-[11px] opacity-50">数组 · {value.length} 项</div>
          </div>
        </summary>
        <div className="space-y-2 px-4 pb-4">
          {value.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/20 p-4 text-xs opacity-50">空数组</div>
          ) : (
            value.map((item, idx) => (
              <div key={`${title}-${idx}`} className="rounded-2xl border border-base-300 bg-base-200/20 p-3">
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
      <section className="overflow-hidden rounded-3xl border border-base-300 bg-base-100/90 shadow-lg">
        <div className="border-b border-base-300/70 bg-gradient-to-r from-primary/10 via-base-100 to-secondary/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] opacity-60">
                <Layers3 className="h-3.5 w-3.5" />
                {title}
              </div>
              <div className="text-xl font-black leading-tight">{displayName}</div>
              {description && <div className="mt-2 text-xs leading-relaxed opacity-75">{description}</div>}
            </div>

            <div className="shrink-0 text-right">
              <div className="badge badge-outline badge-sm">{entries.length} 字段</div>
              {level !== undefined && maxLevel !== undefined && (
                <div className="mt-2 text-[11px] font-mono opacity-70">Lv.{level}/{maxLevel}</div>
              )}
            </div>
          </div>

          {progress !== undefined && (
            <div className="mt-4">
              <progress className="progress progress-primary h-2 w-full" value={progress * 100} max="100" />
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          {extras.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/20 p-4 text-xs opacity-50">无其他字段</div>
          ) : (
            extras.map(([key, val]) => <ValueRow key={`${title}-${key}`} label={key} value={val} depth={depth + 1} />)
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-200/20 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs opacity-60">{title}</div>
        <div className="break-all font-mono text-sm">{formatValue(value)}</div>
      </div>
      <span className="badge badge-ghost badge-sm">{typeLabel(value)}</span>
    </div>
  );
}

function ValueRow({ label, value, depth = 0 }: { label: string; value: any; depth?: number }) {
  if (Array.isArray(value) || isPlainObject(value)) {
    return <ObjectCard title={label} value={value} depth={depth} />;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-200/20 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-xs opacity-60">{label}</div>
        <div className="break-all font-mono text-sm">{formatValue(value)}</div>
      </div>
      <span className="badge badge-ghost badge-sm">{typeLabel(value)}</span>
    </div>
  );
}

export function VariableOverview({ variables }: VariableOverviewProps) {
  const visibleVariables = variables.filter(v => v.is_visible !== false);
  const hiddenCount = variables.length - visibleVariables.length;

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-base-300 bg-gradient-to-br from-primary/15 via-base-100 to-secondary/15 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Eye className="h-4 w-4" />
              只读变量概览
            </div>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed opacity-65">
              这里展示的是当前角色可见变量的“状态板”，会自动识别对象、数组与层层嵌套结构，便于快速检查设定是否合理。
            </p>
          </div>
          <div className="grid shrink-0 gap-2 text-right text-xs opacity-70">
            <div className="rounded-2xl bg-base-100/60 px-3 py-2 shadow-sm">{visibleVariables.length} 可见</div>
            <div className="rounded-2xl bg-base-100/60 px-3 py-2 shadow-sm">{hiddenCount} 隐藏</div>
          </div>
        </div>
      </div>

      {visibleVariables.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-base-300 bg-base-100/70 p-10 text-center text-sm opacity-50">
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
              <section key={variable.id ?? variable.key} className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100/90 shadow-xl">
                <div className="border-b border-base-300/70 bg-gradient-to-r from-base-200/80 via-base-100 to-base-200/50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black">{variable.name}</span>
                        <span className="badge badge-neutral badge-sm font-mono">{variable.key}</span>
                        <span className={cn('badge badge-sm', variable.type === 'dict' ? 'badge-primary' : variable.type === 'list' ? 'badge-secondary' : variable.type === 'range' ? 'badge-accent' : 'badge-ghost')}>
                          {variable.type}
                        </span>
                        {variable.is_persistent && <span className="badge badge-outline badge-sm">持久</span>}
                      </div>
                      {variable.description && <div className="mt-2 text-xs leading-relaxed opacity-70">{variable.description}</div>}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-3xl font-black tracking-tight">
                        {isNumeric ? formatValue(variable.value) : typeLabel(variable.value)}
                      </div>
                      <div className="mt-1 text-[11px] opacity-50">只读展示</div>
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map(tag => <span key={tag} className="badge badge-ghost badge-sm">{tag}</span>)}
                    </div>
                  )}

                  {progress !== undefined && (
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-[11px] opacity-60">
                        <span>进度</span>
                        <span className="font-mono">{min} - {max}</span>
                      </div>
                      <progress className="progress progress-primary h-2" value={progress * 100} max="100" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-base-300 bg-base-200/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">当前值</div>
                      <div className="mt-2 break-words text-lg font-bold leading-snug">{formatValue(variable.value)}</div>
                    </div>
                    <div className="rounded-2xl border border-base-300 bg-base-200/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">默认值</div>
                      <div className="mt-2 break-words text-lg font-bold leading-snug">{formatValue(variable.default_value)}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-base-300 bg-base-200/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Sparkles className="h-4 w-4" />
                        结构预览
                      </div>
                      <div className="text-[11px] opacity-50">支持深层嵌套</div>
                    </div>
                    <div className="space-y-3">
                      <ObjectCard title="value" value={variable.value} />
                    </div>
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
