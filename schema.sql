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

-- 皇帝模拟器（预填模板数据；不依赖前端按钮）
-- Characters
INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '皇帝',
       '你是帝国的最高统治者。你要在大局、权术、人心与制度之间做决断。你不轻易暴露全部意图，会用试探、封赏、责罚来驱动官僚体系。',
       '众卿平身。今日何事？',
       '',
       strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '皇帝');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '中书令',
       '你掌中书省机务，负责拟制诏令、汇总政务、承接圣意并协调六部。你说话谨慎、条理清晰，擅长把混乱诉求变成可执行的政令。',
       '臣在。请陛下示下要点，臣即拟旨。',
       '',
       strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '中书令');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '吏部尚书','你主管选官、考课、任免。你既讲制度，也懂人情与派系平衡。','臣吏部在此。','',strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '吏部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '户部尚书','你主管财政、田赋、仓储。你对数字敏感，常以“银子与粮”衡量政策可行性。','臣户部在此。','',strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '户部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '礼部尚书','你主管礼制、科举、邦交礼仪。你最在意“名分与秩序”。','臣礼部在此。','',strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '礼部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '兵部尚书','你主管军政、调兵、边防。你重视情报、兵员、粮草与将领忠诚。','臣兵部在此。','',strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '兵部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '刑部尚书','你主管刑名、律令、审狱。你强调证据与法度，也懂得用法驭人。','臣刑部在此。','',strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '刑部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '工部尚书','你主管工程、水利、营造与工匠。你关注工期、材料与事故风险。','臣工部在此。','',strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '工部尚书');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '皇后','你代表后宫秩序与宗庙名分。你温和端方，但对权力与家族利益敏感。','臣妾在。','',strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '皇后');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '贵妃','你深谙人心与情绪，擅长影响陛下判断与宫廷风向。你有自己的算盘。','妾身参见陛下。','',strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '贵妃');

INSERT INTO characters (name, description, first_message, summary, created_at)
SELECT '外邦使臣','你代表外邦利益，善用礼仪、威胁与交易争取筹码。你会试探帝国底线。','使臣奉命来朝。','',strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE name = '外邦使臣');

-- Rooms (ensure log exists, plus template rooms)
INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at)
SELECT '世界日志','log','system','全局事件日志','', '', strftime('%s','now')*1000, strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE mode = 'log');

INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at)
SELECT '御前议政','sandbox','emperor_sim','皇帝御前议政厅：裁决、拍板、定方向。','', '{}', strftime('%s','now')*1000, strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name='御前议政' AND category='emperor_sim');

INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at)
SELECT '中书省','agents','emperor_sim','中书省：承旨、拟诏、分派政务。','', '{}', strftime('%s','now')*1000, strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name='中书省' AND category='emperor_sim');

INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at)
SELECT '六部','agents','emperor_sim','六部：吏、户、礼、兵、刑、工分别落实政令。','', '{}', strftime('%s','now')*1000, strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name='六部' AND category='emperor_sim');

INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at)
SELECT '后宫','agents','emperor_sim','后宫：人情、名分、家族与风向。','', '{}', strftime('%s','now')*1000, strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name='后宫' AND category='emperor_sim');

INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at)
SELECT '外邦','agents','emperor_sim','外邦：朝贡、议和、贸易与边境摩擦。','', '{}', strftime('%s','now')*1000, strftime('%s','now')*1000
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name='外邦' AND category='emperor_sim');

-- Default rules (only if empty)
UPDATE rooms
SET rules = '你是“皇帝模拟器”的主房间。\n- 回合制：玩家发言后，由 Director 选择 1~2 位角色发言。\n- 跨部门流转：请先用 query_world(kind=\"rooms\") 找到目标房间 id，然后 send_dispatch。\n- 状态修改默认走公文(HITL)：update_state 会生成待审批公文。'
WHERE name='御前议政' AND category='emperor_sim' AND (rules IS NULL OR rules='');

UPDATE rooms
SET rules = '你是中书省：承旨、拟诏、分派。\n- 收到御前意图后：拟定可执行条目。\n- 用 query_world(kind=\"rooms\") 找到“六部/外邦/后宫”的 room_id，然后 send_dispatch。'
WHERE name='中书省' AND category='emperor_sim' AND (rules IS NULL OR rules='');

UPDATE rooms
SET rules = '你是六部：把诏令落地为执行方案、风险与资源需求。\n- 用 commit_memory 记录关键条款。\n- 用 query_world(kind=\"rooms\") 找到“御前议政/中书省”的 room_id，然后 send_dispatch 回报。'
WHERE name='六部' AND category='emperor_sim' AND (rules IS NULL OR rules='');

UPDATE rooms
SET rules = '你是后宫：名分、人情、家族、舆论与内廷资源。\n- 用 query_world(kind=\"rooms\") 找到“御前议政/中书省”的 room_id，然后 send_dispatch。'
WHERE name='后宫' AND category='emperor_sim' AND (rules IS NULL OR rules='');

UPDATE rooms
SET rules = '你是外邦：朝贡、议和、贸易与边境摩擦。\n- 用 query_world(kind=\"rooms\") 找到“御前议政/中书省”的 room_id，然后 send_dispatch。'
WHERE name='外邦' AND category='emperor_sim' AND (rules IS NULL OR rules='');

-- Members (guarded)
-- 御前议政
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='皇帝' LIMIT 1),
       'agent', 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='皇帝' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='中书令' LIMIT 1),
       'agent', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='中书令' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='吏部尚书' LIMIT 1),
       'agent', 2, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='吏部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='户部尚书' LIMIT 1),
       'agent', 3, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='户部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='礼部尚书' LIMIT 1),
       'agent', 4, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='礼部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='兵部尚书' LIMIT 1),
       'agent', 5, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='兵部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='刑部尚书' LIMIT 1),
       'agent', 6, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='刑部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='工部尚书' LIMIT 1),
       'agent', 7, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='工部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='皇后' LIMIT 1),
       'agent', 8, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='皇后' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='贵妃' LIMIT 1),
       'agent', 9, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='贵妃' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='外邦使臣' LIMIT 1),
       'agent', 10, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='御前议政' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='外邦使臣' LIMIT 1)
);

-- 中书省
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='中书省' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='中书令' LIMIT 1),
       'agent', 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='中书省' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='中书令' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='中书省' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='皇帝' LIMIT 1),
       'agent', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='中书省' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='皇帝' LIMIT 1)
);

-- 六部
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='吏部尚书' LIMIT 1),
       'agent', 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='吏部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='户部尚书' LIMIT 1),
       'agent', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='户部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='礼部尚书' LIMIT 1),
       'agent', 2, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='礼部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='兵部尚书' LIMIT 1),
       'agent', 3, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='兵部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='刑部尚书' LIMIT 1),
       'agent', 4, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='刑部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='工部尚书' LIMIT 1),
       'agent', 5, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='工部尚书' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='中书令' LIMIT 1),
       'agent', 6, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='六部' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='中书令' LIMIT 1)
);

-- 后宫
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='后宫' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='皇后' LIMIT 1),
       'agent', 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='后宫' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='皇后' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='后宫' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='贵妃' LIMIT 1),
       'agent', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='后宫' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='贵妃' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='后宫' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='皇帝' LIMIT 1),
       'agent', 2, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='后宫' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='皇帝' LIMIT 1)
);

-- 外邦
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='外邦' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='外邦使臣' LIMIT 1),
       'agent', 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='外邦' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='外邦使臣' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='外邦' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='皇帝' LIMIT 1),
       'agent', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='外邦' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='皇帝' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='外邦' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='中书令' LIMIT 1),
       'agent', 2, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='外邦' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='中书令' LIMIT 1)
);
INSERT INTO room_members (room_id, char_id, role, order_index, is_active)
SELECT (SELECT id FROM rooms WHERE name='外邦' AND category='emperor_sim' LIMIT 1),
       (SELECT id FROM characters WHERE name='礼部尚书' LIMIT 1),
       'agent', 3, 1
WHERE NOT EXISTS (
  SELECT 1 FROM room_members
  WHERE room_id = (SELECT id FROM rooms WHERE name='外邦' AND category='emperor_sim' LIMIT 1)
    AND char_id = (SELECT id FROM characters WHERE name='礼部尚书' LIMIT 1)
);
