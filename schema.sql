-- ============================================
-- SimpleRP Web - Database Schema Update v3.2
-- ============================================

-- 在原 snapshots 表结构中增加 max_message_id 字段（部署新库时生效）
CREATE TABLE IF NOT EXISTS snapshots (
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
    max_message_id INTEGER, -- 【新增】精准记录当前时间线的最大消息ID指针
    thumbnail TEXT,
    is_active INTEGER DEFAULT 0,
    created_at INTEGER
);

-- 创建索引以加速关联查询
CREATE INDEX IF NOT EXISTS idx_snapshots_max_msg_id ON snapshots(max_message_id);