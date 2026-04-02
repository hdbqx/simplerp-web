-- 1. 角色表（增加独立驱动字段）
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    first_message TEXT,
    summary TEXT,
    created_at INTEGER,
    model_id TEXT,
    api_base_override TEXT,
    api_key_override TEXT,
    api_preset_id INTEGER
);

-- 2. 消息表（增加剧场关联）
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    group_id INTEGER,
    role TEXT,
    content TEXT,
    image TEXT,
    timestamp INTEGER
);

-- 3. 全局设置
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config TEXT
);

-- 4. 世界书
CREATE TABLE IF NOT EXISTS lorebook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    keywords TEXT,
    content TEXT,
    is_active INTEGER DEFAULT 1
);

-- 5. 剧场/群聊表
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER
);

-- 6. 剧场成员关联表
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    char_id INTEGER
);

-- 7. API预设表
CREATE TABLE IF NOT EXISTS api_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_base TEXT,
    api_key TEXT,
    api_mode TEXT DEFAULT 'chat_completions'
);

-- 8. Rooms（新：沙箱/Agent房间）
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mode TEXT DEFAULT 'agents', -- chat | agents | sandbox | log
    category TEXT,
    description TEXT,
    rules TEXT,
    state_json TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

-- 9. Room members（新：房间成员与轮转顺序）
CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    char_id INTEGER NOT NULL,
    role TEXT DEFAULT 'agent', -- agent | npc | narrator
    order_index INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

-- 10. Room agent config（新：每房间每角色的模型/预设覆盖）
CREATE TABLE IF NOT EXISTS room_agent_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    char_id INTEGER NOT NULL,
    api_preset_id INTEGER,
    model_id TEXT,
    temperature REAL,
    max_output_tokens INTEGER,
    tool_policy_json TEXT
);

-- 10b. Room director config（新：导演模型配置）
CREATE TABLE IF NOT EXISTS room_director_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    api_preset_id INTEGER,
    model_id TEXT,
    temperature REAL,
    max_output_tokens INTEGER
);

-- 11. Room turns（新：回合与发言者记录）
CREATE TABLE IF NOT EXISTS room_turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    turn_index INTEGER NOT NULL,
    speaker_char_id INTEGER,
    director_plan_json TEXT,
    created_at INTEGER
);

-- 12. Room messages（新：房间消息流，隔离于旧 messages/group）
CREATE TABLE IF NOT EXISTS room_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    char_id INTEGER,
    sender_type TEXT, -- user | agent | director | tool
    role TEXT,        -- user | assistant | system（前端渲染复用）
    content TEXT,
    image TEXT,
    meta_json TEXT,
    timestamp INTEGER
);

-- 13. Room summaries（新：房间长时记忆）
CREATE TABLE IF NOT EXISTS room_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    summary TEXT,
    source TEXT DEFAULT 'system',
    updated_at INTEGER
);

-- 13b. Room state snapshots（新：沙箱状态快照）
CREATE TABLE IF NOT EXISTS room_state_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    turn_id INTEGER,
    state_json TEXT,
    created_at INTEGER
);

-- 14. Global world state（新：全局世界状态）
CREATE TABLE IF NOT EXISTS world_state (
    id INTEGER PRIMARY KEY,
    state_json TEXT,
    updated_at INTEGER
);

-- 14b. World state snapshots（新：全局状态快照，可回滚）
CREATE TABLE IF NOT EXISTS world_state_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_json TEXT,
    created_at INTEGER
);

-- 15. Dispatches（新：公文流转，HITL）
CREATE TABLE IF NOT EXISTS dispatches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_room_id INTEGER,
    to_room_id INTEGER,
    abstract TEXT,
    payload_json TEXT,
    status TEXT DEFAULT 'pending', -- pending | approved | rejected | rewrite_requested
    created_at INTEGER,
    resolved_at INTEGER,
    resolved_by TEXT
);

-- 初始化默认数据
INSERT INTO settings (id, config) SELECT 1, '{}' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);
INSERT INTO world_state (id, state_json, updated_at) SELECT 1, '{}', strftime('%s','now')*1000 WHERE NOT EXISTS (SELECT 1 FROM world_state WHERE id = 1);
