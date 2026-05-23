import {
  ChevronDown,
  Eye,
  Gem,
  Layers3,
  Shield,
  Sparkles,
  Swords,
} from 'lucide-react';
import type { ReactNode } from 'react';
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
  if (Array.isArray(value)) return `数组 ${value.length}`;
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

function getTypeTheme(type: string) {
  if (type === 'dict') {
    return {
      shell: 'from-cyan-500/20 via-sky-500/10 to-blue-500/20',
      border: 'border-cyan-400/35',
      badge: 'bg-cyan-500/15 text-cyan-200 border-cyan-300/30',
      glow: 'shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_40px_rgba(14,116,144,0.18)]',
    };
  }
  if (type === 'list') {
    return {
      shell: 'from-fuchsia-500/18 via-pink-500/10 to-rose-500/18',
      border: 'border-fuchsia-400/30',
      badge: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-300/30',
      glow: 'shadow-[0_0_0_1px_rgba(217,70,239,0.08),0_18px_40px_rgba(131,24,67,0.18)]',
    };
  }
  if (type === 'range') {
    return {
      shell: 'from-amber-500/22 via-orange-400/10 to-yellow-400/18',
      border: 'border-amber-300/35',
      badge: 'bg-amber-400/15 text-amber-100 border-amber-200/30',
      glow: 'shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_18px_40px_rgba(146,64,14,0.2)]',
    };
  }
  if (type === 'number') {
    return {
      shell: 'from-emerald-500/18 via-lime-400/10 to-green-500/16',
      border: 'border-emerald-300/30',
      badge: 'bg-emerald-500/15 text-emerald-100 border-emerald-200/30',
      glow: 'shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_18px_40px_rgba(20,83,45,0.2)]',
    };
  }
  return {
    shell: 'from-violet-500/18 via-indigo-500/10 to-sky-500/16',
    border: 'border-violet-300/30',
    badge: 'bg-violet-500/15 text-violet-100 border-violet-200/30',
    glow: 'shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_18px_40px_rgba(49,46,129,0.18)]',
  };
}

function StatusChip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'cyan' | 'amber' | 'pink' | 'emerald';
}) {
  const toneClass =
    tone === 'cyan'
      ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100'
      : tone === 'amber'
        ? 'border-amber-300/35 bg-amber-500/12 text-amber-100'
        : tone === 'pink'
          ? 'border-fuchsia-300/35 bg-fuchsia-500/12 text-fuchsia-100'
          : tone === 'emerald'
            ? 'border-emerald-300/35 bg-emerald-500/12 text-emerald-100'
            : 'border-base-300/70 bg-base-100/80 text-base-content/70';

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase ${toneClass}`}>
      {label}
    </span>
  );
}

function ValueBadge({ value }: { value: any }) {
  return (
    <span className="rounded-full border border-base-300/70 bg-base-100/75 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-base-content/65 uppercase">
      {typeLabel(value)}
    </span>
  );
}

function ValueSurface({ value, mode }: { value: any; mode: 'current' | 'default' | 'inline' }) {
  const isNumber = typeof value === 'number';
  const isBoolean = typeof value === 'boolean';
  const isText = typeof value === 'string';
  const isArray = Array.isArray(value);
  const isObject = isPlainObject(value);

  const title = mode === 'default' ? '默认值' : mode === 'current' ? '当前值' : '值';
  const base = 'rounded-2xl border px-4 py-3';

  if (isNumber) {
    return (
      <div className={`${base} border-emerald-300/25 bg-gradient-to-br from-emerald-500/18 via-base-100/85 to-teal-500/12`}>
        <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">{title}</div>
        <div className="mt-1 text-2xl font-black tracking-tight text-emerald-50">{formatValue(value)}</div>
      </div>
    );
  }

  if (isBoolean) {
    return (
      <div className={`${base} border-amber-300/25 bg-gradient-to-br from-amber-500/18 via-base-100/85 to-orange-500/12`}>
        <div className="text-[11px] uppercase tracking-[0.18em] text-amber-100/75">{title}</div>
        <div className="mt-1 text-2xl font-black text-amber-50">{value ? 'TRUE' : 'FALSE'}</div>
      </div>
    );
  }

  if (isText) {
    return (
      <div className={`${base} border-fuchsia-300/25 bg-gradient-to-br from-fuchsia-500/18 via-base-100/85 to-pink-500/12`}>
        <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/75">{title}</div>
        <div className="mt-2 break-words text-sm font-medium leading-relaxed text-fuchsia-50">{formatValue(value)}</div>
      </div>
    );
  }

  if (isArray || isObject) {
    return (
      <div className={`${base} border-sky-300/25 bg-gradient-to-br from-sky-500/18 via-base-100/85 to-cyan-500/12`}>
        <div className="text-[11px] uppercase tracking-[0.18em] text-sky-100/75">{title}</div>
        <div className="mt-1 text-xl font-black text-sky-50">{formatValue(value)}</div>
      </div>
    );
  }

  return (
    <div className={`${base} border-base-300/40 bg-base-100/75`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-base-content/45">{title}</div>
      <div className="mt-1 break-all font-mono text-sm text-base-content/90">{formatValue(value)}</div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'cyan' | 'amber' | 'pink' | 'emerald';
}) {
  const toneClass =
    tone === 'cyan'
      ? 'from-cyan-500/18 to-sky-500/12 border-cyan-300/35'
      : tone === 'amber'
        ? 'from-amber-500/18 to-orange-500/12 border-amber-300/35'
        : tone === 'pink'
          ? 'from-fuchsia-500/18 to-rose-500/12 border-fuchsia-300/35'
          : 'from-emerald-500/18 to-lime-500/12 border-emerald-300/35';

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-base-content/55">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-bold">{value}</div>
    </div>
  );
}

function ObjectCard({ title, value, depth = 0 }: { title: string; value: any; depth?: number }) {
  if (depth > MAX_DEPTH) {
    return <div className="rounded-2xl border border-dashed border-base-300/70 bg-base-100/40 px-4 py-3 text-xs text-base-content/45">已达到最大嵌套深度</div>;
  }

  if (Array.isArray(value)) {
    return (
      <details className="group overflow-hidden rounded-2xl border border-fuchsia-300/25 bg-gradient-to-br from-fuchsia-500/10 via-base-100/95 to-rose-500/10 shadow-sm" open={depth < 1}>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-200">
            <ChevronDown className="h-4 w-4 opacity-80 transition-transform group-open:rotate-180" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="text-[11px] text-base-content/50">数组容器 · {value.length} 项</div>
          </div>
          <ValueBadge value={value} />
        </summary>
        <div className="space-y-2 border-t border-fuchsia-300/20 px-4 py-3">
          {value.length === 0 ? (
            <div className="rounded-xl border border-dashed border-fuchsia-300/25 bg-base-100/50 px-3 py-4 text-xs text-base-content/45">空数组</div>
          ) : (
            value.map((item, idx) => (
              <div key={`${title}-${idx}`} className="rounded-xl border border-base-300/60 bg-base-100/75 p-3 backdrop-blur-sm">
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
      <section className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/10 via-base-100/95 to-sky-500/10 shadow-sm">
        <div className="border-b border-cyan-300/20 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-base-content/50">
                <Layers3 className="h-3.5 w-3.5 text-cyan-300" />
                {title}
              </div>
              <div className="text-lg font-bold leading-tight">{displayName}</div>
            </div>
            <div className="shrink-0 text-right">
              <StatusChip label={`${entries.length} 字段`} tone="cyan" />
              {level !== undefined && maxLevel !== undefined && (
                <div className="mt-2 text-[11px] font-mono text-cyan-100/80">Lv.{level}/{maxLevel}</div>
              )}
            </div>
          </div>

          {progress !== undefined && (
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[11px] text-base-content/50">
                <span>成长进度</span>
                <span className="font-mono">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-cyan-950/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 shadow-[0_0_18px_rgba(56,189,248,0.45)]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 p-4">
          {description && (
            <details className="group rounded-2xl border border-cyan-300/20 bg-white/5 px-4 py-3">
              <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">
                说明 / Prompt Hint
              </summary>
              <div className="mt-3 text-xs leading-relaxed text-slate-100/78">{description}</div>
            </details>
          )}
          {extras.length === 0 ? (
            <div className="rounded-xl border border-dashed border-cyan-300/25 bg-base-100/50 px-3 py-4 text-xs text-base-content/45">无其他字段</div>
          ) : (
            extras.map(([key, val]) => <ValueRow key={`${title}-${key}`} label={key} value={val} depth={depth + 1} />)
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-base-300/70 bg-base-100/75 px-3 py-2.5 backdrop-blur-sm">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.16em] text-base-content/45">{title}</div>
        <div className="break-all font-mono text-sm text-base-content/90">{formatValue(value)}</div>
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
    <div className="rounded-xl border border-base-300/70 bg-base-100/75 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-base-content/45">{label}</div>
        </div>
        <ValueBadge value={value} />
      </div>
      <div className="mt-2">
        <ValueSurface value={value} mode="inline" />
      </div>
    </div>
  );
}

export function VariableOverview({ variables }: VariableOverviewProps) {
  const visibleVariables = variables.filter(v => v.is_visible !== false);
  const hiddenCount = variables.length - visibleVariables.length;
  const persistentCount = visibleVariables.filter(v => v.is_persistent).length;
  const structuredCount = visibleVariables.filter(v => v.type === 'dict' || v.type === 'list').length;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92)_48%,rgba(10,18,36,0.96))] p-5 text-slate-50 shadow-[0_24px_60px_rgba(15,23,42,0.32)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.08),transparent)] opacity-60" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100/80">
                <Eye className="h-4 w-4" />
                Character Status
              </div>
              <div className="mt-3 text-2xl font-black tracking-[0.04em] text-white">变量状态面板</div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-200/80">
                以游戏状态栏的方式展示当前角色可见变量。数值、结构、层级与成长进度都会在这里直接显现。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusChip label={`${visibleVariables.length} 可见`} tone="cyan" />
              <StatusChip label={`${hiddenCount} 隐藏`} tone="amber" />
              <StatusChip label={`${persistentCount} 持久`} tone="emerald" />
              <StatusChip label={`${structuredCount} 复杂结构`} tone="pink" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MiniStat icon={<Gem className="h-3.5 w-3.5" />} label="Visible" value={String(visibleVariables.length)} tone="cyan" />
            <MiniStat icon={<Shield className="h-3.5 w-3.5" />} label="Persistent" value={String(persistentCount)} tone="emerald" />
            <MiniStat icon={<Layers3 className="h-3.5 w-3.5" />} label="Structured" value={String(structuredCount)} tone="pink" />
            <MiniStat icon={<Swords className="h-3.5 w-3.5" />} label="Hidden" value={String(hiddenCount)} tone="amber" />
          </div>
        </div>
      </section>

      {visibleVariables.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-10 text-center text-sm text-base-content/45">
          暂无可展示变量
        </div>
      ) : (
        <div className="grid gap-5">
          {visibleVariables.map(variable => {
            const tags = splitTags(variable.tags);
            const isNumeric = variable.type === 'number' || variable.type === 'range';
            const min = typeof variable.min_value === 'number' ? variable.min_value : undefined;
            const max = typeof variable.max_value === 'number' ? variable.max_value : undefined;
            const progress = isNumeric && min !== undefined && max !== undefined && max > min
              ? Math.max(0, Math.min((Number(variable.value) - min) / (max - min), 1))
              : undefined;
            const theme = getTypeTheme(variable.type);

            return (
              <section
                key={variable.id ?? variable.key}
                className={`overflow-hidden rounded-[1.85rem] border bg-gradient-to-br ${theme.shell} ${theme.border} ${theme.glow}`}
              >
                <div className="border-b border-white/10 px-5 py-4 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black tracking-[0.03em] text-white/95">{variable.name}</span>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.badge}`}>
                          {variable.type}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 font-mono text-[10px] text-white/75">
                          {variable.key}
                        </span>
                        {variable.is_persistent && <StatusChip label="持久" tone="emerald" />}
                      </div>
                      {variable.description && <div className="mt-2 text-xs leading-relaxed text-slate-200/78">{variable.description}</div>}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-3xl font-black tracking-tight text-white">
                        {isNumeric ? formatValue(variable.value) : typeLabel(variable.value)}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">Read Only</div>
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <span key={tag} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {progress !== undefined && (
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-[11px] text-white/55">
                        <span>状态进度</span>
                        <span className="font-mono">{min} - {max}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-950/45">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-300 via-fuchsia-300 to-cyan-300 shadow-[0_0_20px_rgba(96,165,250,0.45)]"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid gap-3">
                    <ValueSurface value={variable.value} mode="current" />
                    <ValueSurface value={variable.default_value} mode="default" />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 backdrop-blur-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                        <Sparkles className="h-4 w-4 text-amber-200" />
                        结构预览
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">Deep Nesting Ready</div>
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
