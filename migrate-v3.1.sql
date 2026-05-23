-- ============================================
-- SimpleRP Web - Migration Script v3.1
-- 安全迁移：先删除旧表，再创建新表
-- ============================================

-- 删除旧版本表（确保全新创建）
DROP TABLE IF EXISTS lorebook;
DROP TABLE IF EXISTS auto_snapshot_rules;
DROP TABLE IF EXISTS lorebook_v2;
DROP TABLE IF EXISTS variables;
DROP TABLE IF EXISTS variable_stages;
DROP TABLE IF EXISTS variable_thought_config;
DROP TABLE IF EXISTS snapshots;
DROP TABLE IF EXISTS snapshot_messages;
DROP TABLE IF EXISTS snapshot_variables;
DROP TABLE IF EXISTS message_edits;
DROP TABLE IF EXISTS lorebook_groups;

-- 删除旧索引
DROP INDEX IF EXISTS idx_variables_char_id;
DROP INDEX IF EXISTS idx_variables_room_id;
DROP INDEX IF EXISTS idx_variables_key;
DROP INDEX IF EXISTS idx_variable_stages_variable_id;
DROP INDEX IF EXISTS idx_lorebook_v2_char_id;
DROP INDEX IF EXISTS idx_lorebook_v2_room_id;
DROP INDEX IF EXISTS idx_lorebook_v2_group;
DROP INDEX IF EXISTS idx_lorebook_v2_is_constant;
DROP INDEX IF EXISTS idx_snapshots_char_id;
DROP INDEX IF EXISTS idx_snapshots_room_id;
DROP INDEX IF EXISTS idx_snapshots_order;
DROP INDEX IF EXISTS idx_snapshots_room_order;
DROP INDEX IF EXISTS idx_snapshot_messages_snapshot_id;
DROP INDEX IF EXISTS idx_snapshot_variables_snapshot_id;
DROP INDEX IF EXISTS idx_lorebook_groups_char_id;

-- ============================================
-- 基础表结构（保持不变）
-- ============================================

CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    first_message TEXT,
    summary TEXT,
    created_at INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    role TEXT NOT NULL,
    content TEXT,
    image TEXT,
    timestamp INTEGER,
    snapshot_id INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config TEXT
);

CREATE TABLE IF NOT EXISTS api_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_base TEXT,
    api_key TEXT,
    api_mode TEXT DEFAULT 'chat_completions'
);

CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    char_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS room_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    char_id INTEGER,
    sender_type TEXT,
    role TEXT,
    content TEXT,
    image TEXT,
    meta_json TEXT,
    timestamp INTEGER,
    snapshot_id INTEGER
);

CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    r2_key TEXT NOT NULL UNIQUE,
    message_id INTEGER,
    room_message_id INTEGER,
    char_id INTEGER,
    room_id INTEGER,
    prompt TEXT,
    created_at INTEGER
);

-- ============================================
-- v3.1 新增表结构
-- ============================================

-- 9. 对话变量定义表
CREATE TABLE variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'number',
    value TEXT,
    default_value TEXT,
    min_value REAL,
    max_value REAL,
    step REAL,
    is_persistent INTEGER DEFAULT 1,
    is_visible INTEGER DEFAULT 1,
    description TEXT,
    tags TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

-- 10. 变量阶段性表现配置表
CREATE TABLE variable_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variable_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    condition TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    stage_prompt TEXT,
    effects TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER
);

-- 11. 变量思考API配置表
CREATE TABLE variable_thought_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    preset_id INTEGER,
    model TEXT,
    thought_prompt TEXT,
    update_condition TEXT,
    update_interval INTEGER DEFAULT 5,
    is_auto_update INTEGER DEFAULT 0,
    created_at INTEGER
);

-- 12. 世界书表（SillyTavern风格增强版）
CREATE TABLE lorebook_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    trigger_mode TEXT DEFAULT 'keyword',
    keywords TEXT,
    regex_pattern TEXT,
    match_logic TEXT DEFAULT 'any',
    match_expression TEXT,
    content TEXT NOT NULL,
    trigger_condition TEXT,
    priority INTEGER DEFAULT 0,
    group_name TEXT,
    category TEXT,
    position TEXT DEFAULT 'before_system',
    insertion_depth INTEGER,
    parent_id INTEGER,
    probability REAL DEFAULT 1.0,
    use_once INTEGER DEFAULT 0,
    cooldown_messages INTEGER DEFAULT 0,
    last_triggered_at INTEGER,
    trigger_count INTEGER DEFAULT -1,
    scan_depth INTEGER DEFAULT 2,
    is_active INTEGER DEFAULT 1,
    is_constant INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

-- 13. 快照表
CREATE TABLE snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_order INTEGER DEFAULT 0,
    snapshot_type TEXT DEFAULT 'auto',
    user_message TEXT,
    ai_response TEXT,
    message_count INTEGER DEFAULT 0,
    thumbnail TEXT,
    is_active INTEGER DEFAULT 0,
    created_at INTEGER
);

-- 14. 快照消息数据
CREATE TABLE snapshot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    original_message_id INTEGER,
    char_id INTEGER,
    room_id INTEGER,
    role TEXT NOT NULL,
    content TEXT,
    image TEXT,
    timestamp INTEGER,
    order_index INTEGER
);

-- 15. 快照变量数据
CREATE TABLE snapshot_variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    variable_id INTEGER,
    key TEXT NOT NULL,
    value TEXT,
    type TEXT
);

-- 16. 消息编辑历史表
CREATE TABLE message_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    char_id INTEGER,
    room_id INTEGER,
    old_content TEXT,
    new_content TEXT,
    edited_at INTEGER
);

-- 17. 世界书分组表
CREATE TABLE lorebook_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER
);

-- ============================================
-- 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_char_id ON messages(char_id);
CREATE INDEX IF NOT EXISTS idx_messages_snapshot_id ON messages(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_variables_char_id ON variables(char_id);
CREATE INDEX IF NOT EXISTS idx_variables_room_id ON variables(room_id);
CREATE INDEX IF NOT EXISTS idx_variables_key ON variables(key);
CREATE INDEX IF NOT EXISTS idx_variable_stages_variable_id ON variable_stages(variable_id);
CREATE INDEX IF NOT EXISTS idx_lorebook_v2_char_id ON lorebook_v2(char_id);
CREATE INDEX IF NOT EXISTS idx_lorebook_v2_room_id ON lorebook_v2(room_id);
CREATE INDEX IF NOT EXISTS idx_lorebook_v2_group ON lorebook_v2(group_name);
CREATE INDEX IF NOT EXISTS idx_lorebook_v2_is_constant ON lorebook_v2(is_constant);
CREATE INDEX IF NOT EXISTS idx_snapshots_char_id ON snapshots(char_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_room_id ON snapshots(room_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_order ON snapshots(char_id, snapshot_order);
CREATE INDEX IF NOT EXISTS idx_snapshots_room_order ON snapshots(room_id, snapshot_order);
CREATE INDEX IF NOT EXISTS idx_snapshot_messages_snapshot_id ON snapshot_messages(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_variables_snapshot_id ON snapshot_variables(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_lorebook_groups_char_id ON lorebook_groups(char_id);
