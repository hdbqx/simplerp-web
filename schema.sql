-- 原有表结构 (如果已存在则忽略)
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    first_message TEXT,
    summary TEXT,
    created_at INTEGER,
    model_id TEXT,             -- 新增：角色独立模型ID
    api_base_override TEXT,    -- 新增：角色独立API地址
    api_key_override TEXT      -- 新增：角色独立Key
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    group_id INTEGER,          -- 新增：群组ID关联
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

-- 新增：群组/剧场表
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,          -- 剧场大背景
    created_at INTEGER
);

-- 新增：群组成员关联表
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    char_id INTEGER
);

-- 初始化一条演示剧场数据
INSERT INTO groups (id, name, description, created_at) 
SELECT 1, '修罗场·深夜电梯', '【剧场背景】深夜，由于电梯故障，你和几位性格迥异的成员被困在狭小的电梯内。灯光忽明忽暗，空气稀薄。', 1700000000000 
WHERE NOT EXISTS (SELECT 1 FROM groups WHERE id = 1);