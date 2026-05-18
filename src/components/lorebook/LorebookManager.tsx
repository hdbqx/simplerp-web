import React, { useState, useEffect, useCallback } from 'react';
import type { LorebookV2Entry, TriggerMode, MatchLogic, LorebookPosition } from '../../lib/db';

interface LorebookManagerProps {
  charId?: number;
  roomId?: number;
}

const triggerModeOptions: { value: TriggerMode; label: string; description: string }[] = [
  { value: 'keyword', label: '关键词触发', description: '当文本中包含指定关键词时触发' },
  { value: 'regex', label: '正则表达式', description: '使用正则表达式匹配文本' },
  { value: 'constant', label: '常驻激活', description: '始终激活，无需触发条件' },
];

const matchLogicOptions: { value: MatchLogic; label: string; description: string }[] = [
  { value: 'any', label: '任意匹配', description: '任一关键词匹配即触发' },
  { value: 'all', label: '全部匹配', description: '所有关键词都匹配才触发' },
  { value: 'not', label: '非匹配', description: '所有关键词都不匹配时触发' },
  { value: 'expression', label: '表达式', description: '使用自定义表达式组合关键词' },
];

const positionOptions: { value: LorebookPosition; label: string }[] = [
  { value: 'before_system', label: '系统提示前' },
  { value: 'after_system', label: '系统提示后' },
  { value: 'before_user', label: '用户消息前' },
  { value: 'after_user', label: '用户消息后' },
  { value: 'before_ai', label: 'AI回复前' },
  { value: 'after_ai', label: 'AI回复后' },
  { value: 'last', label: '最后' },
];

export function LorebookManager({ charId, roomId }: LorebookManagerProps) {
  const [entries, setEntries] = useState<LorebookV2Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<LorebookV2Entry>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      const res = await fetch(`/api/lorebook-v2?${params}`);
      const data = await res.json();
      setEntries(data);
    } catch (e) {
      console.error('Failed to fetch lorebook entries:', e);
    } finally {
      setLoading(false);
    }
  }, [charId, roomId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/lorebook-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          char_id: charId,
          room_id: roomId,
          name: '新条目',
          content: '',
          trigger_mode: 'keyword',
          match_logic: 'any',
          position: 'before_system',
          priority: 0,
          probability: 1.0,
          use_once: false,
          cooldown_messages: 0,
          trigger_count: -1,
          scan_depth: 2,
          is_active: true,
          is_constant: false,
        }),
      });
      if (res.ok) {
        fetchEntries();
      }
    } catch (e) {
      console.error('Failed to create lorebook entry:', e);
    }
  };

  const handleUpdate = async (id: number, updates: Partial<LorebookV2Entry>) => {
    try {
      const res = await fetch('/api/lorebook-v2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        fetchEntries();
      }
    } catch (e) {
      console.error('Failed to update lorebook entry:', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此条目？')) return;
    try {
      const res = await fetch(`/api/lorebook-v2?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchEntries();
      }
    } catch (e) {
      console.error('Failed to delete lorebook entry:', e);
    }
  };

  const handleBulkUpdate = async (updates: Array<{ id: number; [key: string]: any }>) => {
    try {
      const res = await fetch('/api/lorebook-v2?action=bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        fetchEntries();
      }
    } catch (e) {
      console.error('Failed to bulk update lorebook entries:', e);
    }
  };

  const startEdit = (entry: LorebookV2Entry) => {
    setEditingId(entry.id ?? null);
    setEditForm({ ...entry });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (editingId) {
      await handleUpdate(editingId, editForm);
      cancelEdit();
    }
  };

  const toggleActive = async (entry: LorebookV2Entry) => {
    await handleUpdate(entry.id!, { is_active: !entry.is_active });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">世界书</h3>
        <button
          onClick={handleCreate}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          添加条目
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">加载中...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-4 text-gray-500">暂无条目</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className={`border rounded p-3 ${!entry.is_active ? 'opacity-60' : ''}`}>
              {editingId === entry.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="名称"
                      className="px-2 py-1 border rounded"
                    />
                    <select
                      value={editForm.trigger_mode || 'keyword'}
                      onChange={(e) => setEditForm({ ...editForm, trigger_mode: e.target.value as TriggerMode })}
                      className="px-2 py-1 border rounded"
                    >
                      {triggerModeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(editForm.trigger_mode === 'keyword' || !editForm.trigger_mode) && (
                    <div className="space-y-2">
                      <textarea
                        value={editForm.keywords || ''}
                        onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                        placeholder="关键词（逗号或换行分隔）"
                        className="w-full px-2 py-1 border rounded"
                        rows={2}
                      />
                      <select
                        value={editForm.match_logic || 'any'}
                        onChange={(e) => setEditForm({ ...editForm, match_logic: e.target.value as MatchLogic })}
                        className="w-full px-2 py-1 border rounded"
                      >
                        {matchLogicOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {editForm.match_logic === 'expression' && (
                        <input
                          type="text"
                          value={editForm.match_expression || ''}
                          onChange={(e) => setEditForm({ ...editForm, match_expression: e.target.value })}
                          placeholder="表达式 (如: k0 AND (k1 OR k2))"
                          className="w-full px-2 py-1 border rounded"
                        />
                      )}
                    </div>
                  )}

                  {editForm.trigger_mode === 'regex' && (
                    <input
                      type="text"
                      value={editForm.regex_pattern || ''}
                      onChange={(e) => setEditForm({ ...editForm, regex_pattern: e.target.value })}
                      placeholder="正则表达式"
                      className="w-full px-2 py-1 border rounded font-mono"
                    />
                  )}

                  <textarea
                    value={editForm.content || ''}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    placeholder="内容"
                    className="w-full px-2 py-1 border rounded"
                    rows={4}
                  />

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={editForm.position || 'before_system'}
                          onChange={(e) => setEditForm({ ...editForm, position: e.target.value as LorebookPosition })}
                          className="px-2 py-1 border rounded"
                        >
                          {positionOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={editForm.priority ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })}
                          placeholder="优先级"
                          className="px-2 py-1 border rounded"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">触发概率</label>
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={editForm.probability ?? 1}
                            onChange={(e) => setEditForm({ ...editForm, probability: Number(e.target.value) })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">扫描深度</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={editForm.scan_depth ?? 2}
                            onChange={(e) => setEditForm({ ...editForm, scan_depth: Number(e.target.value) })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">冷却消息数</label>
                          <input
                            type="number"
                            min="0"
                            value={editForm.cooldown_messages ?? 0}
                            onChange={(e) => setEditForm({ ...editForm, cooldown_messages: Number(e.target.value) })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={editForm.use_once ?? false}
                            onChange={(e) => setEditForm({ ...editForm, use_once: e.target.checked })}
                          />
                          仅触发一次
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={editForm.is_constant ?? false}
                            onChange={(e) => setEditForm({ ...editForm, is_constant: e.target.checked })}
                          />
                          常驻
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editForm.group_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, group_name: e.target.value })}
                        placeholder="分组名称"
                        className="w-full px-2 py-1 border rounded"
                      />
                      <input
                        type="text"
                        value={editForm.trigger_condition || ''}
                        onChange={(e) => setEditForm({ ...editForm, trigger_condition: e.target.value })}
                        placeholder="触发条件表达式 (如: variables.health > 50)"
                        className="w-full px-2 py-1 border rounded font-mono text-sm"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={entry.is_active}
                          onChange={() => toggleActive(entry)}
                          className="w-4 h-4"
                        />
                        <span className="font-medium">{entry.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                          {triggerModeOptions.find(t => t.value === entry.trigger_mode)?.label || '关键词'}
                        </span>
                        {entry.is_constant && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                            常驻
                          </span>
                        )}
                        {entry.use_once && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                            一次性
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        优先级: {entry.priority} | 位置: {positionOptions.find(p => p.value === entry.position)?.label}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(entry)}
                        className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id!)}
                        className="px-2 py-1 text-sm bg-red-100 rounded hover:bg-red-200"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  
                  {entry.trigger_mode === 'keyword' && entry.keywords && (
                    <div className="text-sm text-gray-600">
                      关键词: {entry.keywords.split(/[,，\n]/).map(k => k.trim()).filter(k => k).join(', ')}
                      <span className="ml-2 text-xs text-gray-400">
                        ({matchLogicOptions.find(m => m.value === entry.match_logic)?.label})
                      </span>
                    </div>
                  )}
                  
                  {entry.trigger_mode === 'regex' && entry.regex_pattern && (
                    <div className="text-sm text-gray-600 font-mono">
                      正则: {entry.regex_pattern}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-700 line-clamp-2">{entry.content}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
