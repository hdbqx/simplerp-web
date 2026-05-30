-- ========================================================
-- SimpleRP Cloud - 全栈全套核心数据库 D1 Schema (最新优化版)
-- ========================================================

-- 1. 角色主表
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    first_message TEXT,
    summary TEXT,
    hidden_message_count INTEGER DEFAULT 0,
    context_cutoff_message_id INTEGER,
    created_at INTEGER
);

-- 2. 房间主表 (用于群聊沙箱)
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

-- 3. 房间成员映射表 (多对多)
CREATE TABLE IF NOT EXISTS room_members (
    room_id INTEGER,
    char_id INTEGER,
    PRIMARY KEY (room_id, char_id)
);

-- 4. 单聊消息历史表
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT,
    image TEXT,         -- 存储生成的R2图像Key或URL
    timestamp INTEGER,
    snapshot_id INTEGER,
    branch_id TEXT      -- 用于多分支平行宇宙隔离
);
CREATE INDEX IF NOT EXISTS idx_messages_char_id ON messages(char_id);

-- 5. 房间群聊消息历史表
CREATE TABLE IF NOT EXISTS room_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER,
    char_id INTEGER,    -- 若为AI发言，记录发言者角色ID
    sender_type TEXT,   -- 'user', 'agent', 'system'
    role TEXT NOT NULL,
    content TEXT,
    image TEXT,
    meta_json TEXT,     -- 存储额外的推演中间件元数据
    timestamp INTEGER,
    snapshot_id INTEGER,
    branch_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id);

-- 6. LLM 模型与 API 密钥预设表
CREATE TABLE IF NOT EXISTS presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_base TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_mode TEXT DEFAULT 'chat_completions'
);

-- 7. 系统全局配置表 (单行持久化)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    config TEXT -- 存储序列化后的 JSON 字符串，包含所有前后台联动策略开关
);

-- 8. 实时动态对话变量表 (好感度/状态机核心)
CREATE TABLE IF NOT EXISTS variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL, -- 'number', 'string', 'boolean', 'range', 'dict', 'list'
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
CREATE INDEX IF NOT EXISTS idx_variables_char ON variables(char_id);
CREATE INDEX IF NOT EXISTS idx_variables_room ON variables(room_id);

-- 9. 变量阶段心理防线表 (Stage Prompt 动态注入)
CREATE TABLE IF NOT EXISTS variable_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variable_id INTEGER,
    name TEXT NOT NULL,
    condition TEXT NOT NULL, -- 条件表达式，例如: v > 50
    priority INTEGER DEFAULT 0,
    stage_prompt TEXT,       -- 满足条件时注入 System 的提示词
    effects TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER
);

-- 10. AI 后台推演思考思考器配置表
CREATE TABLE IF NOT EXISTS variable_thought_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    preset_id INTEGER,
    model TEXT,
    thought_prompt TEXT,
    update_condition TEXT,
    update_interval INTEGER DEFAULT 1,
    is_auto_update INTEGER DEFAULT 1,
    created_at INTEGER
);

-- 11. 世界书增强版 V2 (SillyTavern 级条件深度扫描引擎)
CREATE TABLE IF NOT EXISTS lorebook_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    trigger_mode TEXT DEFAULT 'keyword', -- 'constant', 'keyword', 'regex'
    keywords TEXT,
    regex_pattern TEXT,
    match_logic TEXT DEFAULT 'any',       -- 'any', 'all', 'not', 'expression'
    match_expression TEXT,
    content TEXT NOT NULL,
    trigger_condition TEXT,
    priority INTEGER DEFAULT 100,
    group_name TEXT,
    category TEXT,
    position TEXT DEFAULT 'before_system',
    insertion_depth INTEGER DEFAULT 0,
    parent_id INTEGER,                    -- 用于支持父子层级扫描
    probability REAL DEFAULT 1.0,         -- 触发概率控制 (0.0 ~ 1.0)
    use_once INTEGER DEFAULT 0,
    cooldown_messages INTEGER DEFAULT 0,  -- 触发后冷却轮数
    last_triggered_at INTEGER,
    trigger_count INTEGER DEFAULT 0,
    scan_depth INTEGER DEFAULT 10,
    is_active INTEGER DEFAULT 1,
    is_constant INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

-- 12. 世界书分组表
CREATE TABLE IF NOT EXISTS lorebook_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER
);

-- 13. 【优化版】剧情控制快照主表
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_order INTEGER DEFAULT 0,
    snapshot_type TEXT DEFAULT 'auto', -- 'auto', 'manual', 'checkpoint', 'milestone'
    user_message TEXT,
    ai_response TEXT,
    message_count INTEGER DEFAULT 0,
    max_message_id INTEGER,            -- 【本次新增】轻量级消息截断边界指针
    thumbnail TEXT,
    is_active INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_snapshots_max_msg_id ON snapshots(max_message_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_char ON snapshots(char_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_room ON snapshots(room_id);

-- 14. 快照关联变量冷冻数据表
CREATE TABLE IF NOT EXISTS snapshot_variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    variable_id INTEGER,
    key TEXT NOT NULL,
    value TEXT,
    type TEXT,
    FOREIGN KEY(snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_snap_vars_sid ON snapshot_variables(snapshot_id);

-- 15. 快照历史消息文本表 (用于兼容旧版全量快照，新版增量机制下基本为空)
CREATE TABLE IF NOT EXISTS snapshot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    original_message_id INTEGER,
    char_id INTEGER,
    room_id INTEGER,
    role TEXT NOT NULL,
    content TEXT,
    image TEXT,
    timestamp INTEGER,
    order_index INTEGER,
    FOREIGN KEY(snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

-- 16. AI 生图工作台存储桶索引表
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    r2_key TEXT NOT NULL, -- Cloudflare R2 存储桶对应的唯一Key
    message_id INTEGER,
    room_message_id INTEGER,
    char_id INTEGER,
    room_id INTEGER,
    prompt TEXT,
    created_at INTEGER
);

-- 17. 文本消息历史微调编辑记录表
CREATE TABLE IF NOT EXISTS message_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    char_id INTEGER,
    room_id INTEGER,
    old_content TEXT,
    new_content TEXT,
    edited_at INTEGER
);
