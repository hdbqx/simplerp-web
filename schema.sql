-- ============================================
-- SimpleRP Web - Optimized Database Schema v3.0
-- ============================================

-- 1. 角色表
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    first_message TEXT,
    summary TEXT,
    created_at INTEGER
);

-- 2. 消息表（角色私聊）
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    role TEXT NOT NULL,
    content TEXT,
    image TEXT,
    timestamp INTEGER,
    snapshot_id INTEGER
);

-- 3. 全局设置
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config TEXT
);

-- 4. API预设表
CREATE TABLE IF NOT EXISTS api_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_base TEXT,
    api_key TEXT,
    api_mode TEXT DEFAULT 'chat_completions'
);

-- 5. 房间表（剧场/群聊）
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

-- 6. 房间成员表
CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    char_id INTEGER NOT NULL
);

-- 7. 房间消息表
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

-- 8. 图片管理表
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
-- 新增: v3.0 表结构
-- ============================================

-- 9. 对话变量定义表
CREATE TABLE IF NOT EXISTS variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL,
    value TEXT,
    min_value REAL,
    max_value REAL,
    step REAL,
    is_persistent INTEGER DEFAULT 1,
    is_visible INTEGER DEFAULT 1,
    description TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

-- 10. 变量阶段性表现配置表
CREATE TABLE IF NOT EXISTS variable_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variable_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    condition TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    stage_prompt TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER
);

-- 11. 变量思考API配置表
CREATE TABLE IF NOT EXISTS variable_thought_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    preset_id INTEGER,
    model TEXT,
    thought_prompt TEXT,
    update_condition TEXT,
    update_interval INTEGER,
    is_auto_update INTEGER DEFAULT 0,
    created_at INTEGER
);

-- 12. 世界书表（增强版，替代旧表）
CREATE TABLE IF NOT EXISTS lorebook_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    keywords TEXT,
    regex_pattern TEXT,
    content TEXT NOT NULL,
    trigger_condition TEXT,
    priority INTEGER DEFAULT 0,
    category TEXT,
    position TEXT DEFAULT 'before_system',
    insertion_depth INTEGER,
    parent_id INTEGER,
    probability REAL DEFAULT 1.0,
    use_once INTEGER DEFAULT 0,
    cooldown_messages INTEGER DEFAULT 0,
    last_triggered_at INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER,
    updated_at INTEGER
);

-- 13. 快照表（线性存储，每次对话生成一个快照）
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_order INTEGER DEFAULT 0,
    user_message TEXT,
    ai_response TEXT,
    created_at INTEGER
);

-- 14. 快照消息数据
CREATE TABLE IF NOT EXISTS snapshot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    char_id INTEGER,
    room_id INTEGER,
    role TEXT NOT NULL,
    content TEXT,
    image TEXT,
    timestamp INTEGER,
    order_index INTEGER
);

-- 15. 快照变量数据
CREATE TABLE IF NOT EXISTS snapshot_variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    variable_id INTEGER,
    key TEXT NOT NULL,
    value TEXT,
    type TEXT
);

-- 16. 消息编辑历史表
CREATE TABLE IF NOT EXISTS message_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    char_id INTEGER,
    room_id INTEGER,
    old_content TEXT,
    new_content TEXT,
    edited_at INTEGER
);

-- ============================================
-- 删除旧表（如果存在）
-- ============================================
DROP TABLE IF EXISTS lorebook;
DROP TABLE IF EXISTS auto_snapshot_rules;

-- ============================================
-- 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_char_id ON messages(char_id);
CREATE INDEX IF NOT EXISTS idx_messages_snapshot_id ON messages(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_variables_char_id ON variables(char_id);
CREATE INDEX IF NOT EXISTS idx_variables_room_id ON variables(room_id);
CREATE INDEX IF NOT EXISTS idx_lorebook_v2_char_id ON lorebook_v2(char_id);
CREATE INDEX IF NOT EXISTS idx_lorebook_v2_room_id ON lorebook_v2(room_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_char_id ON snapshots(char_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_room_id ON snapshots(room_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_order ON snapshots(char_id, snapshot_order);
CREATE INDEX IF NOT EXISTS idx_snapshot_messages_snapshot_id ON snapshot_messages(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_variables_snapshot_id ON snapshot_variables(snapshot_id);

-- ============================================
-- 初始化默认数据
-- ============================================

INSERT INTO settings (id, config) 
SELECT 1, '{}' 
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);

-- 默认角色
INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '皇帝', '你是帝国的最高统治者。你要在大局、权术、人心与制度之间做决断。', '众卿平身。今日何事？', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '皇帝');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '中书令', '你掌中书省机务，负责拟制诏令、汇总政务、承接圣意并协调六部。', '臣在。请陛下示下要点，臣即拟旨。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '中书令');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '吏部尚书', '你主管选官、考课、任免。你既讲制度，也懂人情与派系平衡。', '臣吏部在此。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '吏部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '户部尚书', '你主管财政、田赋、仓储。你对数字敏感，常以"银子与粮"衡量政策可行性。', '臣户部在此。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '户部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '礼部尚书', '你主管礼制、科举、邦交礼仪。你最在意"名分与秩序"。', '臣礼部在此。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '礼部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '兵部尚书', '你主管军政、调兵、边防。你重视情报、兵员、粮草与将领忠诚。', '臣兵部在此。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '兵部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '刑部尚书', '你主管刑名、律令、审狱。你强调证据与法度，也懂得用法驭人。', '臣刑部在此。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '刑部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '工部尚书', '你主管工程、水利、营造与工匠。你关注工期、材料与事故风险。', '臣工部在此。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '工部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '皇后', '你代表后宫秩序与宗庙名分。你温和端方，但对权力与家族利益敏感。', '臣妾在。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '皇后');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '贵妃', '你深谙人心与情绪，擅长影响陛下判断与宫廷风向。你有自己的算盘。', '妾身参见陛下。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '贵妃');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '外邦使臣', '你代表外邦利益，善用礼仪、威胁与交易争取筹码。你会试探帝国底线。', '使臣奉命来朝。', '', strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '外邦使臣');
