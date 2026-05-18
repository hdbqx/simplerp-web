import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import type { LorebookV2Entry } from '../../lib/db';
import { api } from '../../lib/db';

interface Props {
  charId?: number;
  roomId?: number;
}

export function LorebookManager({ charId, roomId }: Props) {
  const [entries, setEntries] = useState<LorebookV2Entry[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LorebookV2Entry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [charId, roomId]);

  const loadData = async () => {
    try {
      const data = await api.lorebookV2.list(charId, roomId);
      setEntries(data);
    } catch (e) {
      console.error('Failed to load lorebook', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    const newEntry: Partial<LorebookV2Entry> = {
      name: '新条目',
      content: '',
      priority: 0,
      position: 'before_system',
      probability: 1.0,
      use_once: false,
      cooldown_messages: 0,
      is_active: true
    };
    if (charId) newEntry.char_id = charId;
    if (roomId) newEntry.room_id = roomId;
    const result = await api.lorebookV2.add(newEntry as LorebookV2Entry);
    await loadData();
  };

  const handleMigrate = async () => {
    if (confirm('要从旧世界书迁移数据吗？这会复制所有条目。')) {
      if (charId) await api.lorebookV2.migrateFromV1(charId);
      await loadData();
    }
  };

  const categories = Array.from(new Set(entries.map(e => e.category).filter(Boolean)));
  const filteredEntries = entries.filter(e => {
    const matchesSearch = !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.keywords?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="p-4">加载中...</div>;

  return (
    <div className="flex flex-col h-full bg-base-200">
      <div className="p-4 border-b border-base-content/10">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">世界书 v2</h2>
          <div className="flex gap-2">
            {charId && (
              <button className="btn btn-sm btn-outline" onClick={handleMigrate}>迁移旧数据</button>
            )}
            <button className="btn btn-sm btn-primary" onClick={handleAddEntry}>
              <Plus size={16} className="mr-1" /> 新增条目
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="form-control flex-1 min-w-48">
            <div className="input-group">
              <Search size={16} className="opacity-60" />
              <input
                type="text"
                className="input input-bordered input-sm"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {categories.length > 0 && (
            <select
              className="select select-bordered select-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">所有分类</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center opacity-60 py-8">
            {searchTerm || filterCategory ? '没有匹配的条目' : '还没有条目，点击上方按钮创建'}
          </div>
        ) : (
          filteredEntries.map(entry => (
            <LorebookEntryCard
              key={entry.id}
              entry={entry}
              onEdit={setEditingEntry}
              onUpdate={async (id, updates) => {
                await api.lorebookV2.update(id, updates);
                await loadData();
              }}
              onDelete={async (id) => {
                if (confirm('确定删除？')) {
                  await api.lorebookV2.delete(id);
                  await loadData();
                }
              }}
            />
          ))
        )}
      </div>

      {showEditor && editingEntry && (
        <LorebookEntryEditor
          entry={editingEntry}
          onClose={() => { setShowEditor(false); setEditingEntry(null); }}
          onSave={async (updates) => {
            if (editingEntry.id) await api.lorebookV2.update(editingEntry.id, updates);
            await loadData();
            setShowEditor(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}

function LorebookEntryCard({
  entry,
  onEdit,
  onUpdate,
  onDelete
}: {
  entry: LorebookV2Entry;
  onEdit: (e: LorebookV2Entry) => void;
  onUpdate: (id: number, updates: Partial<LorebookV2Entry>) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`card bg-base-100 border ${entry.is_active ? 'border-base-content/10' : 'border-error/30 opacity-60'}`}>
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{entry.name}</h3>
              {entry.category && (
                <span className="badge badge-outline badge-sm">{entry.category}</span>
              )}
              <span className="badge badge-sm opacity-60">优先级: {entry.priority}</span>
            </div>
            {entry.keywords && (
              <p className="text-sm opacity-60 font-mono mt-1">{entry.keywords}</p>
            )}
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(entry)}>
              <Edit size={16} />
            </button>
            {entry.id && (
              <button className="btn btn-ghost btn-sm text-error" onClick={() => onDelete(entry.id)}>
                <Trash2 size={16} />
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-base-content/10 space-y-3">
            <div className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {entry.content}
            </div>
            <div className="flex flex-wrap gap-2 text-xs opacity-70">
              {entry.regex_pattern && <span className="badge badge-ghost">正则匹配</span>}
              {entry.trigger_condition && <span className="badge badge-ghost">条件触发</span>}
              {entry.probability < 1 && <span className="badge badge-ghost">{(entry.probability * 100).toFixed(0)}% 概率</span>}
              {entry.use_once && <span className="badge badge-ghost">仅一次</span>}
              {entry.cooldown_messages > 0 && <span className="badge badge-ghost">冷却 {entry.cooldown_messages} 条</span>}
              <span className="badge badge-ghost">位置: {entry.position}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LorebookEntryEditor({
  entry,
  onClose,
  onSave
}: {
  entry: LorebookV2Entry;
  onClose: () => void;
  onSave: (updates: Partial<LorebookV2Entry>) => void;
}) {
  const [form, setForm] = useState(entry);

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">编辑条目</h3>
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
              <label className="label font-bold text-sm">分类</label>
              <input
                className="input input-bordered"
                value={form.category ?? ''}
                onChange={(e) => setForm({ ...form, category: e.target.value || undefined })}
                placeholder="可选"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label font-bold text-sm">关键词（逗号分隔）</label>
            <input
              className="input input-bordered font-mono"
              value={form.keywords ?? ''}
              onChange={(e) => setForm({ ...form, keywords: e.target.value || undefined })}
              placeholder="* 表示始终触发"
            />
          </div>

          <div className="form-control">
            <label className="label font-bold text-sm">正则匹配</label>
            <input
              className="input input-bordered font-mono"
              value={form.regex_pattern ?? ''}
              onChange={(e) => setForm({ ...form, regex_pattern: e.target.value || undefined })}
              placeholder="可选"
            />
          </div>

          <div className="form-control">
            <label className="label font-bold text-sm">内容</label>
            <textarea
              className="textarea textarea-bordered h-48"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label font-bold text-sm">优先级</label>
              <input
                type="number"
                className="input input-bordered"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
              />
            </div>
            <div className="form-control">
              <label className="label font-bold text-sm">触发概率</label>
              <input
                type="number"
                className="input input-bordered"
                step="0.01"
                min="0"
                max="1"
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label font-bold text-sm">注入位置</label>
              <select
                className="select select-bordered"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value as any })}
              >
                <option value="before_system">在系统提示词前</option>
                <option value="after_system">在系统提示词后</option>
                <option value="last">最后</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label font-bold text-sm">冷却（消息数）</label>
              <input
                type="number"
                className="input input-bordered"
                min="0"
                value={form.cooldown_messages}
                onChange={(e) => setForm({ ...form, cooldown_messages: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label font-bold text-sm">触发条件（JavaScript 表达式）</label>
            <textarea
              className="textarea textarea-bordered font-mono text-sm h-24"
              value={form.trigger_condition ?? ''}
              onChange={(e) => setForm({ ...form, trigger_condition: e.target.value || undefined })}
              placeholder="例如: variables.affection > 50"
            />
          </div>

          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span className="text-sm">启用</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.use_once}
                onChange={(e) => setForm({ ...form, use_once: e.target.checked })}
              />
              <span className="text-sm">仅触发一次</span>
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
