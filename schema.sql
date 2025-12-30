-- 基础表
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    first_message TEXT,
    summary TEXT,
    created_at INTEGER,
    model_id TEXT,             -- 独立模型
    api_base_override TEXT,    -- 独立API
    api_key_override TEXT      -- 独立KEY
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    group_id INTEGER,          -- 剧场关联
    role TEXT,
    content TEXT,
    image TEXT,
    timestamp INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config TEXT
);

CREATE TABLE IF NOT EXISTS lorebook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    keywords TEXT,
    content TEXT,
    is_active INTEGER DEFAULT 1
);

-- 剧场表
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER
);

-- 成员表
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    char_id INTEGER
);

-- 插入默认设置
INSERT INTO settings (id, config) SELECT 1, '{}' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);