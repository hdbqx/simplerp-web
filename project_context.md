# Project Structure

simplerp-web/
├── .git
├── .gitignore
├── .vscode
├── README.md
├── dist
├── docs
│   └── group-chat-sandbox-agent-design.md
├── eslint.config.js
├── functions
│   ├── _middleware.ts
│   └── api
│       ├── characters.ts
│       ├── dispatches.ts
│       ├── groups.ts
│       ├── images.ts
│       ├── llm.ts
│       ├── lorebook.ts
│       ├── messages.ts
│       ├── presets.ts
│       ├── room_agent_config.ts
│       ├── room_chat.ts
│       ├── room_director_config.ts
│       ├── room_messages.ts
│       ├── room_state_snapshots.ts
│       ├── room_summaries.ts
│       ├── rooms.ts
│       ├── settings.ts
│       ├── world_state.ts
│       └── world_state_snapshots.ts
├── index.html
├── node_modules
├── package.json
├── postcss.config.js
├── public
├── schema.sql
├── src
│   ├── App.tsx
│   ├── assets
│   ├── components
│   │   └── ImageStudio.tsx
│   ├── index.css
│   ├── lib
│   │   ├── db.ts
│   │   ├── llm.ts
│   │   └── variables.ts
│   └── main.tsx
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── wrangler.toml


## File: .gitignore

```txt
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```


## File: eslint.config.js

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])

```


## File: index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>simplerp-web</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```


## File: package.json

```json
{
  "name": "simplerp-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "autoprefixer": "^10.4.22",
    "clsx": "^2.1.1",
    "daisyui": "4.12.14",
    "lucide-react": "^0.556.0",
    "openai": "^6.10.0",
    "postcss": "^8.5.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-markdown": "^10.1.0",
    "rehype-raw": "^7.0.0",
    "tailwind-merge": "^3.4.0",
    "tailwindcss": "^3.4.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "esbuild": "^0.25.12",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.46.4",
    "vite": "npm:rolldown-vite@7.2.5"
  },
  "overrides": {
    "vite": "npm:rolldown-vite@7.2.5"
  }
}

```


## File: postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```


## File: README.md

```md
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```



当前的剧场皇帝模拟存在以下问题1.那我们是不是另需要一个想导演一样的角色作为统计者，由玩家主动触发，根据新添加的记忆，文书流等进行全局统筹，写入日记，更改世界状态，然后总结变化。2.另外，官员请求，玩家批准请求进入room，这些动作，以及所有的tools调用，应该都被自动写入世界日志。3.还有，后宫一般情况绝对不应该在御前会议发言，但又该有联动。4.世界状态如民心，军队，经济，人口等等应该进行详细的预设。5.删除皇帝人设，玩家才是皇帝。以上问题优先改设定解决，必要则改动代码
```


## File: schema.sql

```sql
﻿-- 1. 角色表（增加独立驱动字段）
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

```


## File: tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    // 启用深色和赛博朋克主题，关闭系统自动跟随，强制深色
    themes: ["dark", "synthwave"],
    darkTheme: "dark", 
  },
}
```


## File: tsconfig.app.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    /* 核心修改：改为 false */
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```


## File: tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}

```


## File: tsconfig.node.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}

```


## File: vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: resolve(__dirname, './node_modules/react'),
      'react-dom': resolve(__dirname, './node_modules/react-dom'),
    },
  },
  build: {
    // 移除之前的 cssMinify: 'esbuild'，使用默认设置即可
    // 因为 DaisyUI 4.12.14 是稳定的，不会报错
    chunkSizeWarningLimit: 1000,
  }
})
```


## File: wrangler.toml

```toml
name = "simplerp-web"
pages_build_output_dir = "dist"
compatibility_date = "2024-12-09"

[[d1_databases]]
binding = "DB"
database_name = "simplerp-db"
database_id = "740b4cf9-8916-480a-9b8e-f0c0977a3b0c"
```


## File: docs\group-chat-sandbox-agent-design.md

```md
# 群组聊天改造最终设计：沙箱模式 + Agent 模式

日期：2026-04-02  
范围：在现有“剧场/群组聊天”基础上升级为可控的 **Room/Tab 沙箱系统**，支持 **Agent 模式** 与 **Sandbox 模式**（先设计、后分阶段落地）。

---

## 1. 背景与现状（Why）

当前群组（剧场）实现要点：
- **数据层**：`groups/group_members/messages`，消息以 `group_id` 聚合为单一消息流。
- **生成层**：一次生成只调用“一个角色”的 LLM；群组仅把历史消息拼成文本日志（`(Log: name) -> content`）。
- **问题**：
  1. 群组缺少结构化的“房间/场景状态”，难以长期推进剧情。
  2. 多角色没有真正的多 Agent 编排（谁先说、谁插话、如何收敛）。
  3. 缺少工具权限/预算/隔离，容易出现“穿帮”（角色读到不该读的信息）或 token 爆炸。

---

## 2. 总目标（What）

把“群组聊天”升级为可选的两种模式，并统一在 **Room**（房间）概念之下：

### 2.1 Agent 模式（Multi-Agent Room）
每个角色是独立 Agent：
- 独立 persona/记忆注入、可独立选择 `api_preset_id + model_id`。
- 由 **Director（导演/调度器）** 决定本回合谁发言/行动、是否并行、每个 Agent 目标与工具权限。

### 2.2 沙箱模式（Sandbox Room）
在 Agent 模式上叠加“世界状态工具化”：
- 房间具备结构化 **World State（世界状态 JSON）** 与 **Rules（规则）**。
- Agent/Director 只能通过“受控元语（Function Primitives）”提案更新状态，系统校验并落库。
- 支持状态快照/回滚，保证可控与可追溯。

> 设计上：**Sandbox = Agents + World State + Tool Policy + HITL**。实现可分阶段推进。

---

## 3. 非目标（本期不做）

- 真实代码执行/文件系统/外网抓取（除既有的 LLM 与生图代理）。
- 复杂的多步自动化工具链（先做“提案式工具调用”）。
- 实时 WebSocket 多人协作（先单用户体验）。
- 大规模向量记忆与检索（先用摘要/日志/Inbox）。

---

## 4. 核心概念与术语（Glossary）

- **Room（房间）**：对话与状态的最小隔离单元（对应 UI 的一个 Tab）。
- **Tab（标签页）**：前端侧边栏的可点击实体；**在 MVP 中 TabId=RoomId**（物理隔离）。
- **Global Log（全局日志）**：一个不可变的系统 Tab/Room，用于沉淀世界历史。
- **Director（导演/调度器）**：系统 Agent，负责回合编排、预算控制、状态合并与落库。
- **Agent（角色 Agent）**：角色的 LLM 实例，独立配置与权限。
- **World State（世界状态）**：结构化 JSON（全局/房间两级，见第9节）。
- **Dispatch（公文/信件）**：跨 Room 的异步通信，需玩家审批（HITL）。

---

## 5. 前端交互设计（UI/UX）

### 5.1 侧边栏路由 + 纯净聊天视图（极简架构）
避免模态框堆叠，采用“侧边栏路由 + 单一主视图”：
- **左侧导航栏**：动态渲染 Tab（Room）。包含不可变的【全局日志】以及动态生成的【场景/机构/角色组】分类。
- **右侧主视图**：永远是“当前 Tab 的消息流”。切换 Tab 即切换 Room 的上下文。
- **动态实体增删**：通过工具（例如 `create_character`）落库后，侧边栏实时刷新，不要求整页重载。

### 5.2 绝对防穿帮：物理隔离 + 三层记忆模型
彻底避免“把所有聊天塞进一个 Prompt”的方案。每次请求的上下文由三层拼接：
1. **全局世界状态（Global State）**：所有 Agent 共享（时间、国库、世界真理）。
2. **Room 专属长时记忆（Long-term Summary）**：该 Room 的摘要/关键设定（可由系统定期生成或工具写入）。
3. **Room 专属短时记录（Short-term History）**：SQL 严控 `WHERE room_id = current_room` 的最近 N 条消息。Agent 无法读取其他 Room 的对话。

### 5.3 会话区（消息流）
消息以 `sender_type` 区分：
- `user / agent / director / tool`
并支持折叠展示：
- `世界状态更新`（patch）
- `工具调用记录`（dispatch、query、write_log 等）

### 5.4 异步公文流转：人在回路（HITL）
跨 Room/跨 Agent 通信采用“公文流转 + 玩家审批 + 懒加载”：
1. Agent A 提案 `send_dispatch`（给出压缩摘要）。
2. 系统进入 `pending`，前端提示玩家“准奏/驳回/要求重写”。
3. 放行后，系统向目标 Room 静默插入一条 `tool` 消息（Inbox Injection）。
4. 只有当玩家切到目标 Room，才触发读取与反应（Lazy Trigger）。

---

## 6. 数据模型设计（D1）

说明：现有 `groups/group_members/messages` 可迁移；推荐新增 `rooms` 并逐步替代。

### 6.1 rooms（房间/Tab）
- `id`
- `name`
- `mode`：`chat | agents | sandbox | log`（log 用于全局日志）
- `category`（可选）：用于侧边栏分组（如“机构/角色组/场景”）
- `description`：场景描述
- `rules`：世界规则（Markdown）
- `state_json`：Room 世界状态（sandbox 使用）
- `created_at`
- `updated_at`

### 6.2 room_members（成员）
- `id`
- `room_id`
- `char_id`
- `role`：`agent | npc | narrator`
- `order_index`：轮转顺序
- `is_active`

### 6.3 room_agent_config（每房间的 Agent 配置）
- `id`
- `room_id`
- `char_id`
- `api_preset_id`
- `model_id`
- `temperature`
- `max_output_tokens`
- `tool_policy_json`（工具白名单/字段白名单）

### 6.4 room_turns（回合记录）
- `id`
- `room_id`
- `turn_index`
- `director_plan_json`
- `created_at`

### 6.5 messages（扩展 / 或新建 room_messages）
推荐扩展现有 messages：
- `room_id`（替代 group_id；旧数据可先保留 group_id）
- `sender_type`：`user | agent | director | tool`
- `sender_id`：char_id 或特殊 id
- `meta_json`：tool_call、state_patch、usage、dispatch_id 等

### 6.6 room_summaries（Room 长时记忆）
- `id`
- `room_id`
- `summary`（Markdown）
- `updated_at`
- `source`：`system | director | tool`

### 6.7 world_state（全局世界状态）
单例表（或用 settings.config 承载也可）：
- `id=1`
- `state_json`
- `updated_at`

### 6.8 dispatches（公文流转）
- `id`
- `from_room_id`
- `to_room_id`
- `abstract`（压缩摘要）
- `payload_json`（可选：结构化信息/附件引用）
- `status`：`pending | approved | rejected | rewrite_requested`
- `created_at`
- `resolved_at`
- `resolved_by`（user）

### 6.9 room_state_snapshots（沙箱快照）
- `id`
- `room_id`
- `turn_id`
- `state_json`
- `created_at`

---

## 7. 接口协议设计（Pages Functions）

### 7.1 房间管理
- `GET /api/rooms`
- `POST /api/rooms`
- `PUT /api/rooms`
- `DELETE /api/rooms?id=...`
- `GET /api/rooms?type=members&room_id=...`
- `PUT /api/rooms?type=members`

### 7.2 编排端点（核心）
新增服务端编排入口，统一多 Agent 调用与落库：
- `POST /api/room_chat`
  - 输入：`room_id`、`user_input`、`options`（本轮策略覆盖）
  - 输出：SSE（推荐）或 JSON：
    - `director_plan`
    - `messages[]`（按顺序产出：sender_type）
    - `state_patch`（可选）
    - `usage`（可选）

兼容：
- 单人聊天继续用 `/api/llm`。
- `rooms.mode=chat` 可沿用旧逻辑；`agents/sandbox` 走 `/api/room_chat`。

### 7.3 Dispatch（公文流转）
- `GET /api/dispatches?status=pending`
- `POST /api/dispatches`：创建提案（由工具调用触发）
- `PUT /api/dispatches`：审批/驳回/要求重写

---

## 8. Orchestrator（Director）设计

### 8.1 职责
1. 构造可控上下文（第5.2的三层记忆 + rules + budgets）。
2. 输出 Director Plan：谁发言、顺序/并行、每个 Agent 的 goal 与工具白名单。
3. 执行计划：依次/并行调用 Agent，收集输出与结构化提案（patch/dispatch/memory/log）。
4. 归并落库：写 messages/turns；若有 state_patch：校验 -> 应用 -> snapshot。

### 8.2 Director Plan（建议结构）
```json
{
  "turn_index": 12,
  "policy": { "max_agents": 2, "parallel": false },
  "speakers": [
    { "char_id": 3, "goal": "回应玩家并推动剧情", "tools": ["update_state", "commit_memory"] },
    { "char_id": 8, "goal": "补充线索/吐槽", "tools": ["write_log"] }
  ],
  "notes": "避免两人同时长篇"
}
```

### 8.3 轮转策略（可配置）
- `manual`：玩家点名/只让某个 Agent 回应
- `round_robin`：按 `order_index` 轮转
- `director`：由 Director 决定（推荐 sandbox）
- `hybrid`：默认轮转 + Director 可插入

---

## 9. Sandbox（世界状态）设计

### 9.1 双层状态
- **Global State**：全局真理（时间、宏观资源、全局事件计数）。
- **Room State**：房间专属状态（当前场景物件、人物关系、局部事实）。

### 9.2 状态更新机制：提案式 patch
Agent/Director 不直接写 JSON，而是输出 patch 提案（白名单 op）：
```json
{ "op": "add_fact", "path": "/facts", "value": "NPC 透露了暗号" }
```

服务端负责：
- 校验 op、path 范围、patch 大小
- 应用到 `state_json`
- 生成 `room_state_snapshots`（可回滚）

---

## 10. 沙箱核心元语（Function Calling Primitives）

让 AI 严格按固定语法操作系统，避免自然语言“隐性改规则”。

### 10.1 必备五大元语（MVP）
1. `update_state(patch[])`：更新 Global/Room State（仅提案，服务端校验后落库）。
2. `send_dispatch(to_room_id, abstract, payload?)`：跨 Room 通信提案（进入 HITL 流程）。
3. `query_world(query)`：查阅真相（按白名单查询 rooms/messages/state）。
4. `commit_memory(room_id, text)`：刻印 Room 长时记忆（写 room_summaries）。
5. `write_log(text)`：写入全局日志 Room。

可选：
- `roll_dice(sides, reason)`：风险动作随机性判定（只返回结构化结果）。
- `request_image(prompt, params)`：复用现有生图代理（受 tool_policy 控制）。

---

## 11. 安全与预算（Budget / Policy）

MVP 安全策略：
- 每回合最多 LLM 调用：`1 (director 可选) + K (agents)`，K 初始 ≤2
- 超时：例如 30s
- 单次输出上限（字符或 token）
- 工具白名单 + 参数白名单（tool_policy_json）
- Dispatch 必须经过玩家审批（HITL）
- Room 隔离：任何查询必须带 room_id 且服务端强制校验

---

## 12. 迁移与实施阶段（Roadmap）

### 12.1 兼容迁移
短期：
- 保留 `groups` 作为历史“旧剧场”
- 新增 `rooms`，提供从 group 导入到 room（mode=chat）

中期：
- UI 统一显示“Room/Tab”，旧 group 仅作为历史数据源
- `messages.group_id` 逐步迁移到 `room_id`

### 12.2 分阶段落地
1. **Phase A（Agent Room MVP）**
   - rooms + room_members + room_chat（先规则轮转，不用 LLM 输出 Director Plan）
   - 每回合固定 1 个 Agent 回应，可点名 override
2. **Phase B（Director 规划）**
   - 引入 Director 模型输出 plan
   - 支持每回合 2 个 Agent 发言、有限并行
3. **Phase C（Sandbox State）**
   - state_json + patch + snapshot + 回滚
   - 消息流展示状态变更折叠块
4. **Phase D（Dispatch/HITL）**
   - dispatches + 审批 UI + inbox injection + lazy trigger

---

## 13. 开放问题（需确认）

1. Sandbox 是否严格回合制（玩家一句 -> 系统一回合）？是否允许插话？
绝对严格回合制。
2. Director 是否必须使用 LLM，还是允许“规则导演”（更稳定）？
规则导演
3. Narrator（旁白）是否作为独立 Agent？
为一种特殊的 System Role，附属于 Director。
4. 默认成员数量上限、并发策略、每回合最大发言人数？
基于 Cloudflare Worker 的限制保守设置。
5. LLM 调用是否全部迁移到服务端编排（浏览器不持 key），还是继续沿用当前前端带 key 的方式？
必须 100% 迁移到服务端。

```


## File: functions\_middleware.ts

```ts
interface Env {
  AUTH_USER: string;
  AUTH_PASS: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // 1. 获取环境变量中的账号密码
  // 如果没有设置环境变量，为了防止死锁，默认不拦截（或者你可以改为默认拒绝）
  const validUser = context.env.AUTH_USER;
  const validPass = context.env.AUTH_PASS;

  if (!validUser || !validPass) {
    // 未配置密码时，直接放行 (或者你可以选择返回 500 提示配置)
    return await context.next();
  }

  // 2. 获取请求头中的 Authorization
  const authHeader = context.request.headers.get("Authorization");

  // 3. 检查是否包含 Basic 认证信息
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new Response("需要登录", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="SimpleRP Admin"' },
    });
  }

  // 4. 解码并比对
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = atob(base64Credentials); // 解码 Base64
  const [username, password] = credentials.split(":");

  if (username === validUser && password === validPass) {
    // 密码正确，放行
    return await context.next();
  } else {
    // 密码错误
    return new Response("账号或密码错误", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="SimpleRP Admin"' },
    });
  }
};
```


## File: functions\api\characters.ts

```ts
// functions/api/characters.ts

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare("SELECT * FROM characters ORDER BY id ASC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const action = url.searchParams.get('action');

  // 【新增】复制功能：Deep Copy Character & Lorebook
  if (action === 'duplicate') {
      try {
          const body: any = await context.request.json();
          const { source_id, new_name } = body;
          
          if (!source_id || !new_name) return new Response("Missing params", { status: 400 });

          // 1. 复制角色本体 (复制 名字、描述、开场白、Summary)，生成新的 created_at
          const { meta } = await context.env.DB.prepare(
              `INSERT INTO characters (name, description, first_message, summary, created_at) 
               SELECT ?, description, first_message, summary, ? 
               FROM characters WHERE id = ?`
          ).bind(new_name, Date.now(), source_id).run();

          const newCharId = meta.last_row_id;

          // 2. 复制关联的世界书
          await context.env.DB.prepare(
              `INSERT INTO lorebook (char_id, keywords, content, is_active) 
               SELECT ?, keywords, content, is_active 
               FROM lorebook WHERE char_id = ?`
          ).bind(newCharId, source_id).run();

          return Response.json({ id: newCharId, message: "Duplicated successfully" });
      } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
  }

  // 普通新建逻辑
  const body: any = await context.request.json();
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO characters (name, description, first_message, summary, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(body.name, body.description, body.first_message, body.summary, Date.now()).run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if(id) {
        await context.env.DB.prepare("DELETE FROM characters WHERE id = ?").bind(id).run();
        await context.env.DB.prepare("DELETE FROM messages WHERE char_id = ?").bind(id).run();
        await context.env.DB.prepare("DELETE FROM lorebook WHERE char_id = ?").bind(id).run();
    }
    return new Response("Deleted");
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { id, ...updates } = body;
  const keys = Object.keys(updates);
  if (keys.length === 0) return new Response("No updates", { status: 400 });
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  await context.env.DB.prepare(`UPDATE characters SET ${setClause} WHERE id = ?`).bind(...Object.values(updates), id).run();
  return new Response("Updated");
};
```


## File: functions\api\dispatches.ts

```ts
interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeJsonParse(input: string, fallback: any = null) {
  try { return JSON.parse(input); } catch { return fallback; }
}

function applyPatchOp(state: any, op: any) {
  const operation = String(op?.op || '').toLowerCase();
  const path = String(op?.path || '').trim();
  const value = op?.value;
  if (!path.startsWith('/')) throw new Error('Invalid path');

  const keys = path.split('/').slice(1).map(decodeURIComponent).filter(Boolean);
  let target = state;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (target[k] === undefined || target[k] === null || typeof target[k] !== 'object') target[k] = {};
    target = target[k];
  }
  const last = keys[keys.length - 1];
  if (!last) throw new Error('Invalid path');

  if (operation === 'replace' || operation === 'set') {
    target[last] = value;
    return;
  }
  if (operation === 'add') {
    if (Array.isArray(target[last])) (target[last] as any[]).push(value);
    else if (target[last] === undefined) target[last] = value;
    else target[last] = value;
    return;
  }
  if (operation === 'remove') {
    if (Array.isArray(target)) {
      const idx = parseInt(last, 10);
      if (Number.isFinite(idx) && idx >= 0) (target as any[]).splice(idx, 1);
      else delete (target as any)[last];
    } else {
      delete target[last];
    }
    return;
  }
  throw new Error('Unsupported op');
}

async function insertRoomMessage(db: D1Database, roomId: number, senderType: string, role: string, content: string, meta?: any) {
  const metaJson = meta ? JSON.stringify(meta) : '';
  const ts = Date.now();
  await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(roomId, null, senderType, role, content || '', '', metaJson, ts).run();
  return ts;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const status = url.searchParams.get('status') || '';
  const roomId = url.searchParams.get('room_id');

  if (roomId) {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM dispatches WHERE (from_room_id = ? OR to_room_id = ?) ORDER BY created_at DESC LIMIT 200"
    ).bind(roomId, roomId).all();
    return Response.json(results);
  }

  if (status) {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM dispatches WHERE status = ? ORDER BY created_at DESC LIMIT 200"
    ).bind(status).all();
    return Response.json(results);
  }

  const { results } = await context.env.DB.prepare("SELECT * FROM dispatches ORDER BY created_at DESC LIMIT 200").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const fromRoomId = toInt(body?.from_room_id);
    const toRoomId = toInt(body?.to_room_id);
    const abstract = String(body?.abstract || '').trim();
    const payloadJson = body?.payload_json ? String(body.payload_json) : (body?.payload ? JSON.stringify(body.payload) : '');
    if (!toRoomId) return new Response('Missing to_room_id', { status: 400 });
    if (!abstract) return new Response('Missing abstract', { status: 400 });

    const now = Date.now();
    const { meta } = await context.env.DB.prepare(
      "INSERT INTO dispatches (from_room_id, to_room_id, abstract, payload_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(fromRoomId || null, toRoomId, abstract, payloadJson, 'pending', now).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const id = toInt(body?.id);
    const action = String(body?.action || '').trim(); // approve | reject | rewrite
    const resolvedBy = String(body?.resolved_by || 'user');
    if (!id) return new Response('Missing id', { status: 400 });
    if (!action) return new Response('Missing action', { status: 400 });

    const row: any = await context.env.DB.prepare("SELECT * FROM dispatches WHERE id = ? LIMIT 1").bind(id).first();
    if (!row) return new Response('Not found', { status: 404 });

    const now = Date.now();
    let nextStatus = row.status;
    if (action === 'approve') nextStatus = 'approved';
    else if (action === 'reject') nextStatus = 'rejected';
    else if (action === 'rewrite') nextStatus = 'rewrite_requested';
    else return new Response('Invalid action', { status: 400 });

    await context.env.DB.prepare(
      "UPDATE dispatches SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?"
    ).bind(nextStatus, now, resolvedBy, id).run();

    if (nextStatus !== 'approved') return new Response('Updated');

    const toRoomId = toInt(row.to_room_id);
    if (!toRoomId) return new Response('Updated');

    const payloadText = typeof row.payload_json === 'string' ? String(row.payload_json) : '';
    const payload = payloadText ? safeJsonParse(payloadText, null) : null;

    // Tool-like dispatch payloads: execute + log
    if (payload?.tool === 'update_state') {
      const target = String(payload?.target || 'room');
      const patch = Array.isArray(payload?.patch) ? payload.patch : [];
      const meta = { dispatch_id: id, from_room_id: row.from_room_id || null, tool: 'update_state', target, patch };

      if ((target !== 'room' && target !== 'global') || patch.length === 0 || patch.length > 50) {
        await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', '【公文执行失败】无效的 update_state payload', { ...meta, payload_json: payloadText });
        return new Response('Updated');
      }

      if (target === 'global') {
        const worldRow: any = await context.env.DB.prepare("SELECT state_json FROM world_state WHERE id = 1").first();
        const before = safeJsonParse(String(worldRow?.state_json || '{}'), {});
        const next = before;
        for (const op of patch) applyPatchOp(next, op);
        const nextJson = JSON.stringify(next);
        await context.env.DB.prepare("UPDATE world_state SET state_json = ?, updated_at = ? WHERE id = 1").bind(nextJson, Date.now()).run();
        await context.env.DB.prepare("INSERT INTO world_state_snapshots (state_json, created_at) VALUES (?, ?)").bind(nextJson, Date.now()).run();
        await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', `【已执行状态更新公文】target=global op=${patch.length}`, meta);
        return new Response('Updated');
      }

      // target === 'room'
      const roomRow: any = await context.env.DB.prepare("SELECT state_json FROM rooms WHERE id = ? LIMIT 1").bind(toRoomId).first();
      const before = safeJsonParse(String(roomRow?.state_json || '{}'), {});
      const next = before;
      for (const op of patch) applyPatchOp(next, op);
      const nextJson = JSON.stringify(next);
      await context.env.DB.prepare("UPDATE rooms SET state_json = ?, updated_at = ? WHERE id = ?").bind(nextJson, Date.now(), toRoomId).run();
      await context.env.DB.prepare(
        "INSERT INTO room_state_snapshots (room_id, turn_id, state_json, created_at) VALUES (?, ?, ?, ?)"
      ).bind(toRoomId, null, nextJson, Date.now()).run();
      await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', `【已执行状态更新公文】target=room op=${patch.length}`, meta);
      return new Response('Updated');
    }

    if (payload?.tool === 'request_image') {
      const actionName = String(payload?.action || 'txt2img');
      const prompt = String(payload?.prompt || '').trim();
      const params = payload?.params && typeof payload.params === 'object' ? payload.params : {};
      await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', `【已批准图片请求】action=${actionName} prompt=${prompt}`, {
        dispatch_id: id,
        from_room_id: row.from_room_id || null,
        tool: 'request_image',
        action: actionName,
        prompt,
        params,
      });
      return new Response('Updated');
    }

    // Default: simple inbox message
    await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', `【收到公文】${String(row.abstract || '')}`, {
      dispatch_id: id,
      from_room_id: row.from_room_id || null,
      payload_json: payloadText,
    });
    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


```


## File: functions\api\groups.ts

```ts
interface Env { DB: D1Database; }
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const groupId = url.searchParams.get('group_id');
  if (type === 'members' && groupId) {
    const { results } = await context.env.DB.prepare("SELECT char_id FROM group_members WHERE group_id = ?").bind(groupId).all();
    return Response.json(results.map((r: any) => r.char_id));
  }
  const { results } = await context.env.DB.prepare("SELECT * FROM groups ORDER BY id DESC").all();
  return Response.json(results);
};
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { id, name, description, memberIds } = body;
  await context.env.DB.prepare("UPDATE groups SET name = ?, description = ? WHERE id = ?").bind(name, description, id).run();
  if (memberIds) {
    await context.env.DB.prepare("DELETE FROM group_members WHERE group_id = ?").bind(id).run();
    for (const cid of memberIds) {
      await context.env.DB.prepare("INSERT INTO group_members (group_id, char_id) VALUES (?, ?)").bind(id, cid).run();
    }
  }
  return new Response("Updated");
};
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { meta } = await context.env.DB.prepare("INSERT INTO groups (name, description, created_at) VALUES (?, ?, ?)")
    .bind(body.name, body.description || "", Date.now()).run();
  return Response.json({ id: meta.last_row_id });
};
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (id) {
    await context.env.DB.prepare("DELETE FROM groups WHERE id = ?").bind(id).run();
    await context.env.DB.prepare("DELETE FROM group_members WHERE group_id = ?").bind(id).run();
  }
  return new Response("Deleted");
};
```


## File: functions\api\images.ts

```ts
type ImageBackend = 'sdwebui' | 'openai';
type ImageAction = 'txt2img' | 'img2img';

interface ImageProxyBody {
  // Backward-compatible: when `sd_url` is provided, defaults to sdwebui.
  backend?: ImageBackend;
  action?: ImageAction;
  multipart?: boolean;
  imageField?: string;
  maskField?: string;

  // sdwebui backend
  sd_url?: string;

  // openai-compatible backend
  apiBase?: string;
  apiKey?: string;
  model?: string;
  path?: string; // optional override, e.g. "/v1/images/generations"

  // Shared / passthrough payload:
  // - sdwebui: sent to /sdapi/v1/txt2img
  // - openai: merged into /images/generations request
  payload?: Record<string, unknown>;
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function dataUrlToBlob(input: string): Blob {
  const raw = (input || '').trim();
  const m = raw.match(/^data:([^;]+);base64,(.*)$/);
  if (m) {
    const mime = m[1] || 'application/octet-stream';
    const b64 = m[2] || '';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  // If it's plain base64 without header, default to png.
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

async function callOpenAICompatibleImages(apiBase: string, apiKey: string | undefined, model: string, payload: Record<string, unknown>) {
  const url = `${normalizeBase(apiBase)}/images/generations`;
  const trimmedKey = (apiKey || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

  const rawPrompt = payload?.prompt;
  const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
  if (!prompt) {
    throw new Error('Missing prompt');
  }

  const width = typeof (payload as any)?.width === 'number' ? (payload as any).width : undefined;
  const height = typeof (payload as any)?.height === 'number' ? (payload as any).height : undefined;
  const sizeFromWH = width && height ? `${width}x${height}` : undefined;

  // Be flexible for various OpenAI-compatible providers: forward payload as-is,
  // but ensure `model/prompt/response_format/size` have sensible defaults.
  const requestPayload: Record<string, unknown> = {
    ...(payload || {}),
    model,
    prompt,
    response_format: (payload as any)?.response_format || 'b64_json',
  };

  if (!('size' in requestPayload) && sizeFromWH) {
    requestPayload.size = sizeFromWH;
  }
  if (!('size' in requestPayload)) {
    // Many providers accept 1024x1024; avoids "min pixels" and "must be one of ..." issues in common cases.
    requestPayload.size = '1024x1024';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestPayload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Image generation failed (${res.status})`);
  }

  const data: any = await res.json();
  const items = Array.isArray(data?.data) ? data.data : [];
  const images = items.map((it: any) => it?.b64_json).filter((v: any) => typeof v === 'string' && v.trim().length > 0);
  const urls = items.map((it: any) => it?.url).filter((v: any) => typeof v === 'string' && v.trim().length > 0);

  return { images, urls, raw: data };
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json()) as ImageProxyBody;
    const backend: ImageBackend =
      body.backend || (body?.sd_url ? 'sdwebui' : 'openai');
    const action: ImageAction = body.action === 'img2img' ? 'img2img' : 'txt2img';

    if (backend === 'sdwebui') {
      if (!body?.sd_url) return new Response('Missing sd_url', { status: 400 });

      const endpoint = action === 'img2img' ? '/sdapi/v1/img2img' : '/sdapi/v1/txt2img';
      const res = await fetch(`${normalizeBase(body.sd_url)}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload || {}),
      });

      if (!res.ok) {
        const text = await res.text();
        return new Response(text || 'Image generation failed', { status: res.status });
      }

      const data: any = await res.json();
      return Response.json({ ...data, urls: [] });
    }

    if (!body?.apiBase) return new Response('Missing apiBase', { status: 400 });
    if (!body?.model) return new Response('Missing model', { status: 400 });

    // Allow overriding path for incompatible providers (e.g. "/v1/images/generations").
    const base = normalizeBase(body.apiBase);
    const defaultPath = action === 'img2img' ? '/images/edits' : '/images/generations';
    const path = body.path || defaultPath;
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

    const openaiPayload = body.payload || {};
    const rawPrompt = (openaiPayload as any)?.prompt;
    const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
    if (!prompt) return new Response('Missing prompt', { status: 400 });

    const requestPayload: Record<string, unknown> = {
      ...(openaiPayload || {}),
      model: body.model,
      prompt,
      response_format: (openaiPayload as any)?.response_format || 'b64_json',
    };
    if (!('size' in requestPayload)) requestPayload.size = '1024x1024';

    const trimmedKey = (body.apiKey || '').trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

    const useMultipart = body.multipart === true && action === 'img2img';
    const imageField = (body.imageField || 'image').trim() || 'image';
    const maskField = (body.maskField || 'mask').trim() || 'mask';

    let res: Response;
    try {
      if (useMultipart) {
        const form = new FormData();
        for (const [k, v] of Object.entries(requestPayload)) {
          if (v === undefined || v === null) continue;
          if (k === 'image' || k === 'mask') continue;
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            form.append(k, String(v));
          } else {
            form.append(k, JSON.stringify(v));
          }
        }

        const image = (requestPayload as any).image;
        if (typeof image === 'string' && image.trim()) {
          const blob = dataUrlToBlob(image);
          form.append(imageField, blob, 'image.png');
        }

        const mask = (requestPayload as any).mask;
        if (typeof mask === 'string' && mask.trim()) {
          const blob = dataUrlToBlob(mask);
          form.append(maskField, blob, 'mask.png');
        }

        const mpHeaders: Record<string, string> = {};
        if (trimmedKey) mpHeaders.Authorization = `Bearer ${trimmedKey}`;
        res = await fetch(url, { method: 'POST', headers: mpHeaders, body: form });
      } else {
        res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(requestPayload) });
      }
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: err?.message || 'Network connection lost.',
          detail: { backend, action, url, multipart: useMultipart, model: body.model, imageField, maskField },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({
          error: text || 'Image generation failed',
          detail: { backend, action, url, multipart: useMultipart, model: body.model, imageField, maskField },
        }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const data: any = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];
    const images = items.map((it: any) => it?.b64_json).filter((v: any) => typeof v === 'string' && v.trim().length > 0);
    const urls = items.map((it: any) => it?.url).filter((v: any) => typeof v === 'string' && v.trim().length > 0);
    const result = { images, urls, raw: data };
    return Response.json(result);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Image proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

```


## File: functions\api\llm.ts

```ts
interface LlmRequestBody {
  action?: 'models' | 'complete' | 'chat';
  apiBase: string;
  apiKey: string;
  mode?: 'chat_completions' | 'responses';
  stream?: boolean;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  systemContent?: string;
  chatMessages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  stop?: string[];
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function extractResponsesText(res: any): string {
  if (!res) return '';
  if (typeof res.output_text === 'string' && res.output_text.trim()) return res.output_text;

  const output = Array.isArray(res.output) ? res.output : [];
  const texts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === 'string') texts.push(c.text);
      else if (typeof c?.output_text === 'string') texts.push(c.output_text);
    }
  }
  return texts.join('');
}

async function callProvider(base: string, key: string, path: string, payload?: unknown, method = 'POST') {
  const url = `${normalizeBase(base)}${path}`;
  const trimmedKey = (key || '').trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (trimmedKey) {
    headers.Authorization = `Bearer ${trimmedKey}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Provider request failed (${res.status}): ${text || res.statusText}`);
  }
  return res;
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json()) as LlmRequestBody;
    const action = body.action || 'chat';
    const mode = body.mode === 'responses' ? 'responses' : 'chat_completions';

    if (!body.apiBase) {
      return new Response('Missing apiBase', { status: 400 });
    }

    if (action === 'models') {
      const res = await callProvider(body.apiBase, body.apiKey, '/models', undefined, 'GET');
      const data: any = await res.json();
      const models = Array.isArray(data?.data)
        ? data.data.map((m: any) => m?.id).filter(Boolean).sort()
        : [];
      return Response.json({ models });
    }

    if (!body.model) {
      return new Response('Missing model', { status: 400 });
    }

    if (action === 'complete') {
      const temperature = body.temperature ?? 0.7;
      if (mode === 'responses') {
        const res = await callProvider(body.apiBase, body.apiKey, '/responses', {
          model: body.model,
          input: [
            { role: 'system', content: body.systemPrompt || '' },
            { role: 'user', content: body.userPrompt || '' },
          ],
          temperature,
        });
        const data = await res.json();
        return Response.json({ content: extractResponsesText(data) || body.userPrompt || '' });
      }

      const res = await callProvider(body.apiBase, body.apiKey, '/chat/completions', {
        model: body.model,
        messages: [
          { role: 'system', content: body.systemPrompt || '' },
          { role: 'user', content: body.userPrompt || '' },
        ],
        temperature,
      });
      const data: any = await res.json();
      return Response.json({ content: data?.choices?.[0]?.message?.content || body.userPrompt || '' });
    }

    if (action === 'chat') {
      const temperature = body.temperature ?? 0.8;
      const stream = body.stream === true;
      if (mode === 'responses') {
        const res = await callProvider(body.apiBase, body.apiKey, '/responses', {
          model: body.model,
          input: [
            { role: 'system', content: body.systemContent || '' },
            ...(body.chatMessages || []),
          ],
          temperature,
          stop: body.stop,
          stream,
        });
        if (stream) {
          return new Response(res.body, {
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          });
        }
        const data = await res.json();
        return Response.json({ content: extractResponsesText(data) || '' });
      }

      const res = await callProvider(body.apiBase, body.apiKey, '/chat/completions', {
        model: body.model,
        messages: [{ role: 'system', content: body.systemContent || '' }, ...(body.chatMessages || [])],
        temperature,
        stop: body.stop,
        stream,
      });
      if (stream) {
        return new Response(res.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }
      const data: any = await res.json();
      return Response.json({ content: data?.choices?.[0]?.message?.content || '' });
    }

    return new Response('Unsupported action', { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'LLM proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

```


## File: functions\api\lorebook.ts

```ts
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const url = new URL(context.request.url);
        const charId = url.searchParams.get('char_id');
        if(!charId) return Response.json([]);

        const { results } = await context.env.DB.prepare("SELECT * FROM lorebook WHERE char_id = ?").bind(charId).all();
        // 增加空值安全检查
        const safeResults = Array.isArray(results) ? results : [];
        return Response.json(safeResults.map((r: any) => ({ ...r, isActive: r.is_active === 1 })));
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const body: any = await context.request.json();
        // 插入时提供默认值，防止 undefined 报错
        const { meta } = await context.env.DB.prepare("INSERT INTO lorebook (char_id, keywords, content, is_active) VALUES (?, ?, ?, ?)")
            .bind(body.char_id, body.keywords || "", body.content || "", body.isActive ? 1 : 0).run();
        return Response.json({ id: meta.last_row_id });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

// 【核心修复】PUT 方法改为动态构建 SQL
export const onRequestPut: PagesFunction<Env> = async (context) => {
    try {
        const body: any = await context.request.json();
        const { id, ...updates } = body;
        
        if (!id) return new Response("Missing ID", { status: 400 });

        // 1. 映射前端字段到数据库字段
        const dbUpdates: Record<string, any> = {};
        
        // 只有当前端传了这个值时（不为 undefined），才加入更新列表
        if (updates.keywords !== undefined) dbUpdates.keywords = updates.keywords;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        // 特殊处理 isActive (boolean) -> is_active (int)
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive ? 1 : 0;

        const keys = Object.keys(dbUpdates);
        
        // 如果没有有效字段需要更新，直接返回成功
        if (keys.length === 0) return new Response("No updates", { status: 200 });

        // 2. 动态构建 SQL 语句: "UPDATE lorebook SET keywords = ?, content = ? WHERE id = ?"
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const sql = `UPDATE lorebook SET ${setClause} WHERE id = ?`;
        
        // 3. 准备参数数组，最后加上 id
        const values = [...Object.values(dbUpdates), id];

        await context.env.DB.prepare(sql).bind(...values).run();
        
        return new Response("Updated");
    } catch (e: any) {
        // 返回具体错误信息以便调试
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json'} });
    }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if(id) await context.env.DB.prepare("DELETE FROM lorebook WHERE id = ?").bind(id).run();
        return new Response("Deleted");
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
```


## File: functions\api\messages.ts

```ts
interface Env { DB: D1Database; }

/**
 * GET: 获取消息列表
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const charId = url.searchParams.get('char_id');
  const groupId = url.searchParams.get('group_id');

  // 如果提供了 group_id，获取该剧场/群聊的所有消息
  if (groupId && groupId !== 'undefined' && groupId !== 'null') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC"
    ).bind(groupId).all();
    return Response.json(results);
  } 
  
  // 如果提供了 char_id，获取该角色的私聊消息（排除属于任何剧场的消息）
  if (charId && charId !== 'undefined' && charId !== 'null') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE char_id = ? AND group_id IS NULL ORDER BY timestamp ASC"
    ).bind(charId).all();
    return Response.json(results);
  }

  return Response.json([]);
};

/**
 * POST: 新增消息
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare(
      "INSERT INTO messages (char_id, group_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      body.char_id || null, 
      body.group_id || null, 
      body.role, 
      body.content, 
      body.image || "", 
      body.timestamp
    ).run();

    // 返回新插入记录的 ID，供前端同步状态
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

/**
 * PUT: 更新消息（编辑内容）
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    if (!body.id) return new Response("Missing ID", { status: 400 });

    await context.env.DB.prepare(
      "UPDATE messages SET content = ? WHERE id = ?"
    ).bind(body.content, body.id).run();

    return new Response("Updated");
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

/**
 * DELETE: 删除消息
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const charId = url.searchParams.get('char_id');
    const groupId = url.searchParams.get('group_id');
    const type = url.searchParams.get('type');

    // 1. 特殊操作：清理所有包含生成图片的记录
    if (type === 'all_images') {
      await context.env.DB.prepare(
        "DELETE FROM messages WHERE image IS NOT NULL AND image != ''"
      ).run();
      return new Response("All Images Cleared");
    }

    // 2. 删除单条指定 ID 的消息
    if (id && id !== 'undefined' && id !== 'null') {
      await context.env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
      return new Response("Single Message Deleted");
    }

    // 3. 清空整个剧场（群聊）的消息
    if (groupId && groupId !== 'undefined' && groupId !== 'null') {
      await context.env.DB.prepare("DELETE FROM messages WHERE group_id = ?").bind(groupId).run();
      return new Response("Group Messages Cleared");
    }

    // 4. 清空特定角色的私聊消息
    if (charId && charId !== 'undefined' && charId !== 'null') {
      await context.env.DB.prepare(
        "DELETE FROM messages WHERE char_id = ? AND group_id IS NULL"
      ).bind(charId).run();
      return new Response("Character Messages Cleared");
    }

    return new Response("Missing Parameters", { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
```


## File: functions\api\presets.ts

```ts
﻿interface Env { DB: D1Database; }

let apiModeEnsured = false;

async function ensureApiModeColumn(db: D1Database) {
  if (apiModeEnsured) return;
  try {
    await db.prepare("ALTER TABLE api_presets ADD COLUMN api_mode TEXT DEFAULT 'chat_completions'").run();
  } catch {
    // Ignore when column already exists.
  }
  apiModeEnsured = true;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  await ensureApiModeColumn(context.env.DB);
  const { results } = await context.env.DB.prepare(
    "SELECT id, name, api_base, api_key, COALESCE(api_mode, 'chat_completions') AS api_mode FROM api_presets ORDER BY id ASC"
  ).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  await ensureApiModeColumn(context.env.DB);
  const body: any = await context.request.json();
  const mode = body.api_mode === 'responses' ? 'responses' : 'chat_completions';
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO api_presets (name, api_base, api_key, api_mode) VALUES (?, ?, ?, ?)"
  ).bind(body.name || "新预设", body.api_base || "", body.api_key || "", mode).run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  await ensureApiModeColumn(context.env.DB);
  const body: any = await context.request.json();
  const mode = body.api_mode === 'responses' ? 'responses' : 'chat_completions';
  await context.env.DB.prepare(
    "UPDATE api_presets SET name = ?, api_base = ?, api_key = ?, api_mode = ? WHERE id = ?"
  ).bind(body.name, body.api_base, body.api_key, mode, body.id).run();
  return new Response("Updated");
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (id) await context.env.DB.prepare("DELETE FROM api_presets WHERE id = ?").bind(id).run();
  return new Response("Deleted");
};

```


## File: functions\api\rooms.ts

```ts
interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeJsonParse(input: string, fallback: any = null) {
  try { return JSON.parse(input); } catch { return fallback; }
}

async function ensureLogRoom(db: D1Database) {
  const logRoom: any = await db.prepare("SELECT id FROM rooms WHERE mode = 'log' LIMIT 1").first();
  if (logRoom?.id) return Number(logRoom.id);
  const now = Date.now();
  const { meta } = await db.prepare(
    "INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind('世界日志', 'log', 'system', '全局事件日志', '', '', now, now).run();
  return meta.last_row_id as number;
}

async function findOrCreateCharacter(db: D1Database, name: string, description: string, firstMessage: string) {
  const row: any = await db.prepare("SELECT id FROM characters WHERE name = ? LIMIT 1").bind(name).first();
  if (row?.id) return Number(row.id);
  const now = Date.now();
  const { meta } = await db.prepare(
    "INSERT INTO characters (name, description, first_message, summary, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(name, description, firstMessage, '', now).run();
  return meta.last_row_id as number;
}

async function insertRoomMessage(db: D1Database, roomId: number, content: string, meta?: any) {
  const metaJson = meta ? JSON.stringify(meta) : '';
  await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(roomId, null, 'tool', 'system', content || '', '', metaJson, Date.now()).run();
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const roomId = url.searchParams.get('room_id');
  if (type === 'members' && roomId) {
    const { results } = await context.env.DB.prepare(
      "SELECT char_id, role, order_index, is_active FROM room_members WHERE room_id = ? ORDER BY order_index ASC, id ASC"
    ).bind(roomId).all();
    return Response.json(results);
  }

  await ensureLogRoom(context.env.DB);
  const { results } = await context.env.DB.prepare("SELECT * FROM rooms ORDER BY id DESC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const body: any = await context.request.json().catch(() => ({}));

  // default: create room
  const name = String(body?.name || 'New Room');
  const mode = String(body?.mode || 'agents');
  const category = String(body?.category || '');
  const description = String(body?.description || '');
  const rules = String(body?.rules || '');
  const stateJson = typeof body?.state_json === 'string' ? body.state_json : '';
  const now = Date.now();
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(name, mode, category, description, rules, stateJson, now, now).run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const body: any = await context.request.json();
  const now = Date.now();

  if (type === 'members') {
    const roomId = toInt(body?.room_id);
    const members = Array.isArray(body?.members) ? body.members : [];
    if (!roomId) return new Response('Missing room_id', { status: 400 });

    await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(roomId).run();

    let idx = 0;
    for (const m of members) {
      const charId = toInt(m?.char_id);
      if (!charId) continue;
      const role = String(m?.role || 'agent');
      const orderIndex = toInt(m?.order_index, idx) ?? idx;
      const isActive = m?.is_active === 0 || m?.is_active === false ? 0 : 1;
      await context.env.DB.prepare(
        "INSERT INTO room_members (room_id, char_id, role, order_index, is_active) VALUES (?, ?, ?, ?, ?)"
      ).bind(roomId, charId, role, orderIndex, isActive).run();
      idx++;
    }
    return new Response('Updated');
  }

  const id = toInt(body?.id);
  if (!id) return new Response('Missing id', { status: 400 });

  const name = body?.name !== undefined ? String(body.name) : undefined;
  const mode = body?.mode !== undefined ? String(body.mode) : undefined;
  const category = body?.category !== undefined ? String(body.category) : undefined;
  const description = body?.description !== undefined ? String(body.description) : undefined;
  const rules = body?.rules !== undefined ? String(body.rules) : undefined;
  const stateJson = body?.state_json !== undefined ? String(body.state_json) : undefined;

  await context.env.DB.prepare(
    "UPDATE rooms SET name = COALESCE(?, name), mode = COALESCE(?, mode), category = COALESCE(?, category), description = COALESCE(?, description), rules = COALESCE(?, rules), state_json = COALESCE(?, state_json), updated_at = ? WHERE id = ?"
  ).bind(name ?? null, mode ?? null, category ?? null, description ?? null, rules ?? null, stateJson ?? null, now, id).run();

  return new Response('Updated');
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_agent_config WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_turns WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_messages WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_summaries WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_state_snapshots WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM rooms WHERE id = ?").bind(id).run();

  return new Response('Deleted');
};

```


## File: functions\api\room_agent_config.ts

```ts
interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const roomId = url.searchParams.get('room_id');
  if (!roomId) return Response.json([]);
  const { results } = await context.env.DB.prepare(
    "SELECT * FROM room_agent_config WHERE room_id = ? ORDER BY char_id ASC"
  ).bind(roomId).all();
  return Response.json(results);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const roomId = toInt(body?.room_id);
    const charId = toInt(body?.char_id);
    if (!roomId) return new Response('Missing room_id', { status: 400 });
    if (!charId) return new Response('Missing char_id', { status: 400 });

    const apiPresetId = body?.api_preset_id !== undefined && body?.api_preset_id !== null ? toInt(body.api_preset_id) : null;
    const modelId = body?.model_id !== undefined ? String(body.model_id || '') : null;
    const temperature = body?.temperature !== undefined && body?.temperature !== null ? Number(body.temperature) : null;
    const maxOutputTokens = body?.max_output_tokens !== undefined && body?.max_output_tokens !== null ? toInt(body.max_output_tokens) : null;
    const toolPolicyJson = body?.tool_policy_json !== undefined ? String(body.tool_policy_json || '') : null;

    const row: any = await context.env.DB.prepare(
      "SELECT id FROM room_agent_config WHERE room_id = ? AND char_id = ? LIMIT 1"
    ).bind(roomId, charId).first();

    if (row?.id) {
      await context.env.DB.prepare(
        "UPDATE room_agent_config SET api_preset_id = ?, model_id = ?, temperature = ?, max_output_tokens = ?, tool_policy_json = ? WHERE id = ?"
      ).bind(apiPresetId, modelId, temperature, maxOutputTokens, toolPolicyJson, row.id).run();
      return new Response('Updated');
    }

    await context.env.DB.prepare(
      "INSERT INTO room_agent_config (room_id, char_id, api_preset_id, model_id, temperature, max_output_tokens, tool_policy_json) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(roomId, charId, apiPresetId, modelId, temperature, maxOutputTokens, toolPolicyJson).run();

    return new Response('Created');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


```


## File: functions\api\room_chat.ts

```ts
interface Env { DB: D1Database; }

interface RoomChatBody {
  room_id: number;
  user_input: string;
  // Optional override: force a specific speaker (char_id)
  speaker_char_id?: number;
  // Fallback selection from the top bar
  fallback_preset_id?: number;
  fallback_model_id?: string;
  // Non-stream MVP
  stream?: boolean;
  // Optional override: max speakers
  max_speakers?: number;
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function extractResponsesText(res: any): string {
  if (!res) return '';
  if (typeof res.output_text === 'string' && res.output_text.trim()) return res.output_text;
  const output = Array.isArray(res.output) ? res.output : [];
  const texts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === 'string') texts.push(c.text);
      else if (typeof c?.output_text === 'string') texts.push(c.output_text);
    }
  }
  return texts.join('');
}

async function callProvider(base: string, key: string, path: string, payload?: unknown, method = 'POST') {
  const url = `${normalizeBase(base)}${path}`;
  const trimmedKey = (key || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

  const res = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Provider request failed (${res.status}): ${text || res.statusText}`);
  }
  return res;
}

async function insertRoomMessage(db: D1Database, roomId: number, senderType: string, role: string, content: string, charId?: number | null, meta?: any) {
  const metaJson = meta ? JSON.stringify(meta) : '';
  const ts = Date.now();
  const { meta: insertMeta } = await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(roomId, charId || null, senderType, role, content || '', '', metaJson, ts).run();
  return { id: insertMeta.last_row_id as number, timestamp: ts };
}

function safeJsonParse(input: string, fallback: any = null) {
  try { return JSON.parse(input); } catch { return fallback; }
}

function extractTaggedJson(text: string, tag: string): any | null {
  const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'm');
  const m = String(text || '').match(re);
  if (!m) return null;
  const raw = m[1].trim();
  return safeJsonParse(raw, null);
}

function stripTaggedBlocks(text: string): string {
  return String(text || '').replace(/\[(PLAN|TOOLS)\][\s\S]*?\[\/\1\]/g, '').trim();
}

function getAllowedToolNames(roomMode: string): string[] {
  if (roomMode === 'sandbox') {
    return ['update_state', 'send_dispatch', 'query_world', 'commit_memory', 'write_log', 'roll_dice', 'request_image'];
  }
  // agents mode: allow limited tools (dispatch/log/memory) for now
  return ['send_dispatch', 'commit_memory', 'write_log'];
}

type ToolPolicyAction = 'allow' | 'dispatch' | 'deny';
type ToolPolicy = Record<string, ToolPolicyAction>;

function getDefaultToolPolicy(roomMode: string): ToolPolicy {
  return {
    send_dispatch: 'allow',
    commit_memory: 'allow',
    write_log: 'allow',
    query_world: 'allow',
    roll_dice: 'allow',
    // Sandbox state changes default to HITL (dispatch). Can be overridden per-agent.
    update_state: roomMode === 'sandbox' ? 'dispatch' : 'deny',
    // Image requests can be expensive; default to dispatch.
    request_image: 'dispatch',
  };
}

function mergeToolPolicy(roomMode: string, toolPolicyJson?: string | null): ToolPolicy {
  const base = getDefaultToolPolicy(roomMode);
  if (!toolPolicyJson) return base;
  try {
    const parsed = JSON.parse(toolPolicyJson);
    if (!parsed || typeof parsed !== 'object') return base;
    const out: ToolPolicy = { ...base };
    for (const [k, v] of Object.entries(parsed)) {
      const key = String(k || '').trim();
      const val = String(v || '').trim() as ToolPolicyAction;
      if (!key) continue;
      if (val === 'allow' || val === 'dispatch' || val === 'deny') out[key] = val;
    }
    return out;
  } catch {
    return base;
  }
}

function applyPatchOp(state: any, op: any) {
  const operation = String(op?.op || '').toLowerCase();
  const path = String(op?.path || '').trim();
  const value = op?.value;
  if (!path.startsWith('/')) throw new Error('Invalid path');

  const keys = path.split('/').slice(1).map(decodeURIComponent).filter(Boolean);
  let target = state;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (target[k] === undefined || target[k] === null || typeof target[k] !== 'object') target[k] = {};
    target = target[k];
  }
  const last = keys[keys.length - 1];
  if (!last) throw new Error('Invalid path');

  if (operation === 'replace' || operation === 'set') {
    target[last] = value;
    return;
  }
  if (operation === 'add') {
    if (Array.isArray(target[last])) {
      (target[last] as any[]).push(value);
    } else if (target[last] === undefined) {
      target[last] = value;
    } else {
      // fallback to replace
      target[last] = value;
    }
    return;
  }
  if (operation === 'remove') {
    if (Array.isArray(target)) {
      const idx = parseInt(last, 10);
      if (Number.isFinite(idx) && idx >= 0) (target as any[]).splice(idx, 1);
      else delete (target as any)[last];
    } else {
      delete target[last];
    }
    return;
  }
  throw new Error('Unsupported op');
}

async function ensureLogRoomId(db: D1Database): Promise<number | null> {
  const row: any = await db.prepare("SELECT id FROM rooms WHERE mode = 'log' ORDER BY id ASC LIMIT 1").first();
  return row?.id ? Number(row.id) : null;
}

async function getNextSpeaker(db: D1Database, roomId: number): Promise<number | null> {
  const membersRes = await db.prepare(
    "SELECT char_id, order_index FROM room_members WHERE room_id = ? AND is_active = 1 ORDER BY order_index ASC, id ASC"
  ).bind(roomId).all();
  const members: Array<{ char_id: number; order_index: number }> = (membersRes?.results || []) as any;
  if (!members.length) return null;

  const lastTurn: any = await db.prepare(
    "SELECT speaker_char_id, turn_index FROM room_turns WHERE room_id = ? ORDER BY turn_index DESC LIMIT 1"
  ).bind(roomId).first();

  const lastSpeaker = lastTurn?.speaker_char_id ? Number(lastTurn.speaker_char_id) : null;
  if (!lastSpeaker) return members[0].char_id;

  const idx = members.findIndex(m => m.char_id === lastSpeaker);
  const next = idx >= 0 ? members[(idx + 1) % members.length] : members[0];
  return next.char_id;
}

async function resolveAgentConfig(db: D1Database, roomId: number, charId: number, fallbackPresetId?: number, fallbackModelId?: string) {
  const cfg: any = await db.prepare(
    "SELECT api_preset_id, model_id, temperature, max_output_tokens, tool_policy_json FROM room_agent_config WHERE room_id = ? AND char_id = ? LIMIT 1"
  ).bind(roomId, charId).first();

  const apiPresetId = cfg?.api_preset_id ? Number(cfg.api_preset_id) : (fallbackPresetId || undefined);
  const modelId = (cfg?.model_id as string) || (fallbackModelId || '');
  const temperature = cfg?.temperature !== undefined && cfg?.temperature !== null ? Number(cfg.temperature) : undefined;
  const maxOutputTokens = cfg?.max_output_tokens !== undefined && cfg?.max_output_tokens !== null ? Number(cfg.max_output_tokens) : undefined;

  if (!apiPresetId) throw new Error('Missing api_preset_id (agent config or fallback)');
  if (!modelId) throw new Error('Missing model_id (agent config or fallback)');

  const preset: any = await db.prepare("SELECT * FROM api_presets WHERE id = ? LIMIT 1").bind(apiPresetId).first();
  if (!preset?.api_base) throw new Error('Invalid api_preset_id');

  const apiMode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';
  return {
    apiBase: String(preset.api_base),
    apiKey: String(preset.api_key || ''),
    apiMode,
    modelId: String(modelId),
    temperature,
    maxOutputTokens,
    toolPolicyJson: typeof cfg?.tool_policy_json === 'string' ? String(cfg.tool_policy_json) : null,
  };
}

async function resolveDirectorConfig(db: D1Database, roomId: number, fallbackPresetId?: number, fallbackModelId?: string) {
  const cfg: any = await db.prepare(
    "SELECT api_preset_id, model_id, temperature, max_output_tokens FROM room_director_config WHERE room_id = ? LIMIT 1"
  ).bind(roomId).first();

  const apiPresetId = cfg?.api_preset_id ? Number(cfg.api_preset_id) : (fallbackPresetId || undefined);
  const modelId = (cfg?.model_id as string) || (fallbackModelId || '');
  const temperature = cfg?.temperature !== undefined && cfg?.temperature !== null ? Number(cfg.temperature) : undefined;
  const maxOutputTokens = cfg?.max_output_tokens !== undefined && cfg?.max_output_tokens !== null ? Number(cfg.max_output_tokens) : undefined;

  if (!apiPresetId) throw new Error('Missing api_preset_id (director config or fallback)');
  if (!modelId) throw new Error('Missing model_id (director config or fallback)');

  const preset: any = await db.prepare("SELECT * FROM api_presets WHERE id = ? LIMIT 1").bind(apiPresetId).first();
  if (!preset?.api_base) throw new Error('Invalid director api_preset_id');
  const apiMode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';
  return {
    apiBase: String(preset.api_base),
    apiKey: String(preset.api_key || ''),
    apiMode,
    modelId: String(modelId),
    temperature,
    maxOutputTokens,
  };
}

async function callChatOnce(cfg: { apiBase: string; apiKey: string; apiMode: string; modelId: string; temperature?: number; maxOutputTokens?: number; }, systemContent: string, chatMessages: any[]) {
  if (cfg.apiMode === 'responses') {
    const res = await callProvider(cfg.apiBase, cfg.apiKey, '/responses', {
      model: cfg.modelId,
      input: [
        { role: 'system', content: systemContent },
        ...chatMessages,
      ],
      temperature: cfg.temperature ?? 0.8,
      max_output_tokens: cfg.maxOutputTokens,
      stream: false,
    });
    const data: any = await res.json();
    return extractResponsesText(data) || '';
  }
  const res = await callProvider(cfg.apiBase, cfg.apiKey, '/chat/completions', {
    model: cfg.modelId,
    messages: [{ role: 'system', content: systemContent }, ...chatMessages],
    temperature: cfg.temperature ?? 0.8,
    max_tokens: cfg.maxOutputTokens,
    stream: false,
  });
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as RoomChatBody;
    const roomId = Number(body.room_id);
    const userInput = String(body.user_input || '').trim();
    if (!roomId) return new Response('Missing room_id', { status: 400 });
    if (!userInput) return new Response('Missing user_input', { status: 400 });

    const room: any = await context.env.DB.prepare("SELECT * FROM rooms WHERE id = ? LIMIT 1").bind(roomId).first();
    if (!room) return new Response('Room not found', { status: 404 });

    // Phase A: insert user message
    await insertRoomMessage(context.env.DB, roomId, 'user', 'user', userInput, null, { room_mode: room.mode });

    // Turn index
    const lastTurn: any = await context.env.DB.prepare(
      "SELECT turn_index FROM room_turns WHERE room_id = ? ORDER BY turn_index DESC LIMIT 1"
    ).bind(roomId).first();
    const nextTurnIndex = (lastTurn?.turn_index ? Number(lastTurn.turn_index) : 0) + 1;

    // Load room summary + world state (sandbox)
    const summaryRow: any = await context.env.DB.prepare("SELECT summary FROM room_summaries WHERE room_id = ? ORDER BY updated_at DESC LIMIT 1").bind(roomId).first();
    const roomSummary = typeof summaryRow?.summary === 'string' ? summaryRow.summary : '';
    const worldRow: any = await context.env.DB.prepare("SELECT state_json FROM world_state WHERE id = 1").first();
    const globalStateJson = typeof worldRow?.state_json === 'string' ? worldRow.state_json : '{}';
    const roomStateJson = typeof room?.state_json === 'string' ? room.state_json : '{}';

    // History (last 30)
    const { results: historyRows } = await context.env.DB.prepare(
      "SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 30"
    ).bind(roomId).all();
    const history = (historyRows || []).slice().reverse();

    const rules = String(room.rules || '');
    const description = String(room.description || '');
    const roomMode = String(room.mode || 'agents');
    const stopMarker = '惟';

    const allowedTools = getAllowedToolNames(roomMode);
    const maxSpeakers = Math.max(1, Math.min(Number(body.max_speakers || 1), 3));

    // Determine speakers:
    // - manual override -> single speaker
    // - agents mode -> round_robin single speaker
    // - sandbox mode -> director plan (can be 1..maxSpeakers)
    const forcedSpeaker = body.speaker_char_id ? Number(body.speaker_char_id) : null;

    let directorPlan: any = null;
    let speakers: number[] = [];

    if (forcedSpeaker) {
      speakers = [forcedSpeaker];
      directorPlan = { strategy: 'manual', speakers: [{ char_id: forcedSpeaker }] };
    } else if (roomMode !== 'sandbox') {
      const s = await getNextSpeaker(context.env.DB, roomId);
      if (!s) return new Response('No active room members', { status: 400 });
      speakers = [s];
      directorPlan = { strategy: 'round_robin', speakers: [{ char_id: s }] };
    } else {
      // Director plan using LLM
      const membersRes = await context.env.DB.prepare(
        "SELECT char_id, order_index FROM room_members WHERE room_id = ? AND is_active = 1 ORDER BY order_index ASC, id ASC"
      ).bind(roomId).all();
      const members: Array<{ char_id: number }> = (membersRes?.results || []) as any;
      const memberIds = members.map(m => Number((m as any).char_id)).filter(Boolean);
      if (!memberIds.length) return new Response('No active room members', { status: 400 });

      const directorCfg = await resolveDirectorConfig(context.env.DB, roomId, body.fallback_preset_id, body.fallback_model_id);
      const planSystem = [
        `你是“导演/调度器(Director)”，负责选择本回合发言的角色。`,
        `输出必须是严格 JSON，放在 [PLAN]...[/PLAN] 内，除此之外不要输出任何内容。`,
        `JSON 结构：{"policy":{"max_speakers":number},"speakers":[{"char_id":number,"goal":string}]}。`,
        `speakers 数量 1..${maxSpeakers}，char_id 必须来自列表：${memberIds.join(',')}`,
      ].join('\n');

      const planContext: any[] = [];
      if (description) planContext.push({ role: 'user', content: `场景描述：${description}` });
      if (rules) planContext.push({ role: 'user', content: `规则：${rules}` });
      planContext.push({ role: 'user', content: `玩家输入：${userInput}` });

      const rawPlan = await callChatOnce(directorCfg as any, planSystem, planContext);
      directorPlan = extractTaggedJson(rawPlan, 'PLAN') || safeJsonParse(String(rawPlan).trim(), null);

      const planned = Array.isArray(directorPlan?.speakers) ? directorPlan.speakers : [];
      speakers = planned.map((x: any) => Number(x?.char_id)).filter((n: any) => Number.isFinite(n) && memberIds.includes(n));
      if (!speakers.length) {
        // fallback to round robin if director plan fails
        const s = await getNextSpeaker(context.env.DB, roomId);
        if (!s) return new Response('No active room members', { status: 400 });
        speakers = [s];
        directorPlan = { strategy: 'fallback_round_robin', speakers: [{ char_id: s }], raw: String(rawPlan || '').slice(0, 800) };
      }

      await insertRoomMessage(context.env.DB, roomId, 'director', 'system', `【导演计划】本回合发言：${speakers.join(', ')}`, null, { director_plan: directorPlan });
    }

    // Name cache for headers
    const charactersNameCache = new Map<number, string>();
    for (const id of speakers) {
      const c: any = await context.env.DB.prepare("SELECT name FROM characters WHERE id = ? LIMIT 1").bind(id).first();
      if (c?.name) charactersNameCache.set(id, String(c.name));
    }

    // Build shared chatMessages from history
    const chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    for (const m of history) {
      const senderType = String((m as any).sender_type || '');
      const role = String((m as any).role || '');
      const content = String((m as any).content || '');
      const mCharId = (m as any).char_id ? Number((m as any).char_id) : null;
      if (!content) continue;
      if (senderType === 'user' || role === 'user') {
        chatMessages.push({ role: 'user', content });
        continue;
      }
      let name = 'System';
      if (mCharId) {
        if (!charactersNameCache.has(mCharId)) {
          const c: any = await context.env.DB.prepare("SELECT name FROM characters WHERE id = ? LIMIT 1").bind(mCharId).first();
          if (c?.name) charactersNameCache.set(mCharId, String(c.name));
        }
        name = charactersNameCache.get(mCharId) || `#${mCharId}`;
      } else if (senderType === 'director') name = 'Director';
      else if (senderType === 'tool') name = 'Tool';

      chatMessages.push({ role: 'user', content: `(Log: ${name}) -> ${content}` });
    }

    // Execute speakers sequentially
    const outputs: any[] = [];
    const logRoomId = await ensureLogRoomId(context.env.DB);
    let lastInserted: any = null;

    for (const speakerCharId of speakers) {
      const char: any = await context.env.DB.prepare("SELECT * FROM characters WHERE id = ? LIMIT 1").bind(speakerCharId).first();
      if (!char) continue;

      const systemParts: string[] = [];
      systemParts.push(`【房间模式】${roomMode}`);
      if (description) systemParts.push(`【场景描述】\n${description}`);
      if (rules) systemParts.push(`【规则】\n${rules}`);
      if (roomMode === 'sandbox') {
        systemParts.push(`【全局世界状态(JSON)】\n${globalStateJson}`);
        systemParts.push(`【本房间世界状态(JSON)】\n${roomStateJson}`);
      }
      if (roomSummary) systemParts.push(`【本房间长期记忆】\n${roomSummary}`);
      systemParts.push(`【可用工具】${allowedTools.join(', ')}`);
      systemParts.push(
        `如果你需要使用工具，请在回复末尾附加一个 [TOOLS] JSON [/TOOLS] 块，格式：{"tool_calls":[{"name":"...","args":{...}}]}。工具块之外仍需给出正常的角色回复内容。`
      );
      systemParts.push(
        [
          `【工具参数约定(JSON)】`,
          `- update_state: {"target":"room"|"global","patch":[{"op":"set"|"replace"|"add"|"remove","path":"/a/b","value":any}]}`,
          `- send_dispatch: {"to_room_id":number,"abstract":string,"payload":any?}`,
          `- query_world: {"kind":"room_state"|"global_state"|"recent_messages"|"members"|"rooms"|"summary"|"pending_dispatches","limit":number?}`,
          `- commit_memory: {"text":string}`,
          `- write_log: {"text":string}`,
          `- roll_dice: {"sides":number,"reason":string?}`,
          `- request_image: {"prompt":string,"params":object?,"action":"txt2img"|"img2img"?}`,
        ].join('\n')
      );
      systemParts.push(`【你的身份】你是角色「${String(char.name || '')}」。必须以 "${stopMarker}" 结束回复。`);
      const systemContent = systemParts.join('\n\n');

      const cfg = await resolveAgentConfig(
        context.env.DB,
        roomId,
        speakerCharId,
        body.fallback_preset_id,
        body.fallback_model_id,
      );

      const raw = await callChatOnce(cfg as any, systemContent, chatMessages);
      let assistantContent = String(raw || '');
      const toolsObj = extractTaggedJson(assistantContent, 'TOOLS');
      assistantContent = stripTaggedBlocks(assistantContent).replaceAll(stopMarker, '').trim();

      lastInserted = await insertRoomMessage(context.env.DB, roomId, 'agent', 'assistant', assistantContent, speakerCharId, {
        model: cfg.modelId,
        api_mode: cfg.apiMode,
        turn_index: nextTurnIndex,
      });
      outputs.push({ char_id: speakerCharId, content: assistantContent, tool_calls: toolsObj?.tool_calls || [] });

      // Tool proposals execution (Phase C/D, limited)
      const toolCalls: any[] = Array.isArray(toolsObj?.tool_calls) ? toolsObj.tool_calls : [];
      const toolPolicy = mergeToolPolicy(roomMode, (cfg as any)?.toolPolicyJson);
      for (const tc of toolCalls) {
        const name = String(tc?.name || '').trim();
        const args = tc?.args || {};
        if (!allowedTools.includes(name)) continue;
        if (toolPolicy[name] === 'deny') continue;

        if (name === 'send_dispatch') {
          const toRoomId = Number(args?.to_room_id);
          const abstract = String(args?.abstract || '').trim();
          const payloadJson = args?.payload ? JSON.stringify(args.payload) : '';
          if (!toRoomId || !abstract) continue;
          await context.env.DB.prepare(
            "INSERT INTO dispatches (from_room_id, to_room_id, abstract, payload_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind(roomId, toRoomId, abstract, payloadJson, 'pending', Date.now()).run();
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已提交公文】→ room ${toRoomId}: ${abstract}`, null, { tool: 'send_dispatch' });
        }

        if (name === 'commit_memory') {
          const text = String(args?.text || '').trim();
          if (!text) continue;
          await context.env.DB.prepare(
            "INSERT INTO room_summaries (room_id, summary, source, updated_at) VALUES (?, ?, ?, ?)"
          ).bind(roomId, text, 'tool', Date.now()).run();
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已刻印记忆】${text}`, null, { tool: 'commit_memory' });
        }

        if (name === 'write_log' && logRoomId) {
          const text = String(args?.text || '').trim();
          if (!text) continue;
          await insertRoomMessage(context.env.DB, logRoomId, 'tool', 'system', text, null, { tool: 'write_log', from_room_id: roomId });
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已写入世界日志】${text}`, null, { tool: 'write_log' });
        }

        if (name === 'update_state' && roomMode === 'sandbox') {
          const target = String(args?.target || 'room'); // room | global
          const patch = Array.isArray(args?.patch) ? args.patch : [];

          if (!Array.isArray(patch) || patch.length === 0 || patch.length > 50) continue;
          if (target !== 'room' && target !== 'global') continue;

          // Default: dispatch/HITL. Can be overridden to 'allow' per-agent.
          const mode = toolPolicy.update_state || (roomMode === 'sandbox' ? 'dispatch' : 'deny');
          if (mode !== 'allow') {
            const abstract = `状态更新申请 target=${target} op=${patch.length}`;
            const payloadJson = JSON.stringify({ tool: 'update_state', target, patch });
            await context.env.DB.prepare(
              "INSERT INTO dispatches (from_room_id, to_room_id, abstract, payload_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(roomId, roomId, abstract, payloadJson, 'pending', Date.now()).run();
            await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已提交状态更新公文】${abstract}`, null, { tool: 'update_state', target, patch, hitl: true });
            continue;
          }

          // allow: apply directly
          const before = safeJsonParse(target === 'global' ? globalStateJson : roomStateJson, {});
          const next = before;
          for (const op of patch) applyPatchOp(next, op);
          const nextJson = JSON.stringify(next);
          if (target === 'global') {
            await context.env.DB.prepare("UPDATE world_state SET state_json = ?, updated_at = ? WHERE id = 1").bind(nextJson, Date.now()).run();
          } else {
            await context.env.DB.prepare("UPDATE rooms SET state_json = ?, updated_at = ? WHERE id = ?").bind(nextJson, Date.now(), roomId).run();
            await context.env.DB.prepare(
              "INSERT INTO room_state_snapshots (room_id, turn_id, state_json, created_at) VALUES (?, ?, ?, ?)"
            ).bind(roomId, null, nextJson, Date.now()).run();
          }
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【状态已更新】target=${target}`, null, { tool: 'update_state', patch, hitl: false });
        }

        if (name === 'query_world') {
          const kind = String(args?.kind || 'room_state').trim();
          const limit = Math.max(1, Math.min(Number(args?.limit || 10), 50));

          let result: any = null;
          if (kind === 'global_state') result = safeJsonParse(globalStateJson, {});
          else if (kind === 'room_state') result = safeJsonParse(roomStateJson, {});
          else if (kind === 'summary') result = { summary: roomSummary || '' };
          else if (kind === 'rooms') {
            const { results } = await context.env.DB.prepare("SELECT id, name, mode FROM rooms ORDER BY id ASC LIMIT 200").all();
            result = (results || []).map((r: any) => ({ id: Number(r.id), name: String(r.name || ''), mode: String(r.mode || '') }));
          } else if (kind === 'members') {
            const { results } = await context.env.DB.prepare(
              "SELECT rm.char_id, rm.role, rm.order_index, rm.is_active, c.name FROM room_members rm LEFT JOIN characters c ON c.id = rm.char_id WHERE rm.room_id = ? ORDER BY rm.order_index ASC, rm.id ASC"
            ).bind(roomId).all();
            result = (results || []).map((r: any) => ({
              char_id: Number(r.char_id),
              name: String(r.name || ''),
              role: String(r.role || ''),
              order_index: Number(r.order_index || 0),
              is_active: Number(r.is_active || 0),
            }));
          } else if (kind === 'recent_messages') {
            const { results } = await context.env.DB.prepare(
              "SELECT id, sender_type, role, char_id, content, timestamp FROM room_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT ?"
            ).bind(roomId, limit).all();
            result = (results || []).slice().reverse().map((r: any) => ({
              id: Number(r.id),
              sender_type: String(r.sender_type || ''),
              role: String(r.role || ''),
              char_id: r.char_id ? Number(r.char_id) : null,
              content: String(r.content || ''),
              timestamp: Number(r.timestamp || 0),
            }));
          } else if (kind === 'pending_dispatches') {
            const { results } = await context.env.DB.prepare(
              "SELECT id, from_room_id, to_room_id, abstract, status, created_at FROM dispatches WHERE status = 'pending' AND (from_room_id = ? OR to_room_id = ?) ORDER BY created_at DESC LIMIT 50"
            ).bind(roomId, roomId).all();
            result = (results || []).map((r: any) => ({
              id: Number(r.id),
              from_room_id: r.from_room_id ? Number(r.from_room_id) : null,
              to_room_id: r.to_room_id ? Number(r.to_room_id) : null,
              abstract: String(r.abstract || ''),
              status: String(r.status || ''),
              created_at: Number(r.created_at || 0),
            }));
          } else {
            result = { error: `Unsupported kind: ${kind}` };
          }

          const text = JSON.stringify({ kind, result }).slice(0, 4000);
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【query_world】${text}`, null, { tool: 'query_world', kind, limit });
        }

        if (name === 'roll_dice') {
          const sides = Math.max(2, Math.min(Number(args?.sides || 20), 1000));
          const reason = String(args?.reason || '').trim();
          const buf = new Uint32Array(1);
          crypto.getRandomValues(buf);
          const value = (buf[0] % sides) + 1;
          const text = JSON.stringify({ sides, value, reason });
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【roll_dice】${text}`, null, { tool: 'roll_dice', sides, value, reason });
        }

        if (name === 'request_image') {
          const prompt = String(args?.prompt || '').trim();
          const action = String(args?.action || 'txt2img').trim();
          const params = args?.params && typeof args.params === 'object' ? args.params : {};
          if (!prompt) continue;
          const abstract = `图片请求 action=${action}: ${prompt.slice(0, 50)}`;
          const payloadJson = JSON.stringify({ tool: 'request_image', action, prompt, params });
          await context.env.DB.prepare(
            "INSERT INTO dispatches (from_room_id, to_room_id, abstract, payload_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind(roomId, roomId, abstract, payloadJson, 'pending', Date.now()).run();
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已提交图片请求公文】${abstract}`, null, { tool: 'request_image', action, prompt, hitl: true });
        }
      }
    }

    await context.env.DB.prepare(
      "INSERT INTO room_turns (room_id, turn_index, speaker_char_id, director_plan_json, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(roomId, nextTurnIndex, speakers[0] || null, JSON.stringify(directorPlan || {}), Date.now()).run();

    return Response.json({
      room_id: roomId,
      turn_index: nextTurnIndex,
      speaker_char_ids: speakers,
      outputs,
      last_message_id: lastInserted?.id,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'room_chat error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

```


## File: functions\api\room_director_config.ts

```ts
interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const roomId = url.searchParams.get('room_id');
  if (!roomId) return Response.json(null);
  const row: any = await context.env.DB.prepare(
    "SELECT * FROM room_director_config WHERE room_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(roomId).first();
  return Response.json(row || null);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const roomId = toInt(body?.room_id);
    if (!roomId) return new Response('Missing room_id', { status: 400 });

    const apiPresetId = body?.api_preset_id !== undefined && body?.api_preset_id !== null ? toInt(body.api_preset_id) : null;
    const modelId = body?.model_id !== undefined ? String(body.model_id || '') : null;
    const temperature = body?.temperature !== undefined && body?.temperature !== null ? Number(body.temperature) : null;
    const maxOutputTokens = body?.max_output_tokens !== undefined && body?.max_output_tokens !== null ? toInt(body.max_output_tokens) : null;

    const row: any = await context.env.DB.prepare(
      "SELECT id FROM room_director_config WHERE room_id = ? LIMIT 1"
    ).bind(roomId).first();

    if (row?.id) {
      await context.env.DB.prepare(
        "UPDATE room_director_config SET api_preset_id = ?, model_id = ?, temperature = ?, max_output_tokens = ? WHERE id = ?"
      ).bind(apiPresetId, modelId, temperature, maxOutputTokens, row.id).run();
      return new Response('Updated');
    }

    await context.env.DB.prepare(
      "INSERT INTO room_director_config (room_id, api_preset_id, model_id, temperature, max_output_tokens) VALUES (?, ?, ?, ?, ?)"
    ).bind(roomId, apiPresetId, modelId, temperature, maxOutputTokens).run();

    return new Response('Created');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


```


## File: functions\api\room_messages.ts

```ts
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const roomId = url.searchParams.get('room_id');
  if (!roomId) return Response.json([]);
  const { results } = await context.env.DB.prepare(
    "SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp ASC"
  ).bind(roomId).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare(
      "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      body.room_id,
      body.char_id || null,
      body.sender_type || '',
      body.role || '',
      body.content || '',
      body.image || '',
      body.meta_json || '',
      body.timestamp || Date.now(),
    ).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  const roomId = url.searchParams.get('room_id');
  if (id) {
    await context.env.DB.prepare("DELETE FROM room_messages WHERE id = ?").bind(id).run();
    return new Response('Deleted');
  }
  if (roomId) {
    await context.env.DB.prepare("DELETE FROM room_messages WHERE room_id = ?").bind(roomId).run();
    return new Response('Cleared');
  }
  return new Response('Missing Parameters', { status: 400 });
};


```


## File: functions\api\room_state_snapshots.ts

```ts
interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function insertRoomMessage(db: D1Database, roomId: number, content: string, meta?: any) {
  const metaJson = meta ? JSON.stringify(meta) : '';
  await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(roomId, null, 'tool', 'system', content || '', '', metaJson, Date.now()).run();
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const roomId = toInt(url.searchParams.get('room_id'));
  if (!roomId) return new Response('Missing room_id', { status: 400 });

  const { results } = await context.env.DB.prepare(
    "SELECT id, room_id, turn_id, created_at FROM room_state_snapshots WHERE room_id = ? ORDER BY created_at DESC LIMIT 100"
  ).bind(roomId).all();
  return Response.json(results || []);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const id = toInt(body?.id);
    if (!id) return new Response('Missing id', { status: 400 });

    const row: any = await context.env.DB.prepare("SELECT * FROM room_state_snapshots WHERE id = ? LIMIT 1").bind(id).first();
    if (!row) return new Response('Not found', { status: 404 });

    const roomId = toInt(row.room_id);
    const stateJson = typeof row.state_json === 'string' ? String(row.state_json) : '{}';
    if (!roomId) return new Response('Invalid snapshot', { status: 400 });

    await context.env.DB.prepare("UPDATE rooms SET state_json = ?, updated_at = ? WHERE id = ?").bind(stateJson, Date.now(), roomId).run();
    await context.env.DB.prepare(
      "INSERT INTO room_state_snapshots (room_id, turn_id, state_json, created_at) VALUES (?, ?, ?, ?)"
    ).bind(roomId, null, stateJson, Date.now()).run();
    await insertRoomMessage(context.env.DB, roomId, `【已回滚房间状态】snapshot_id=${id}`, { tool: 'restore_snapshot', snapshot_id: id });

    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


```


## File: functions\api\room_summaries.ts

```ts
interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const roomId = url.searchParams.get('room_id');
  if (!roomId) return Response.json([]);
  const { results } = await context.env.DB.prepare(
    "SELECT * FROM room_summaries WHERE room_id = ? ORDER BY updated_at DESC LIMIT 50"
  ).bind(roomId).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const roomId = toInt(body?.room_id);
    const summary = String(body?.summary || '');
    const source = String(body?.source || 'system');
    if (!roomId) return new Response('Missing room_id', { status: 400 });
    const now = Date.now();
    const { meta } = await context.env.DB.prepare(
      "INSERT INTO room_summaries (room_id, summary, source, updated_at) VALUES (?, ?, ?, ?)"
    ).bind(roomId, summary, source, now).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


```


## File: functions\api\settings.ts

```ts
interface Env { DB: D1Database; }
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const item: any = await context.env.DB.prepare("SELECT * FROM settings LIMIT 1").first();
  const config = item?.config ? JSON.parse(item.config) : {};
  return Response.json({ ...config, id: item?.id });
};
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json();
  const { id, ...config } = body; 
  await context.env.DB.prepare("UPDATE settings SET config = ? WHERE id = (SELECT id FROM settings LIMIT 1)").bind(JSON.stringify(config)).run();
  return new Response("Updated");
};
```


## File: functions\api\world_state.ts

```ts
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const item: any = await context.env.DB.prepare("SELECT * FROM world_state WHERE id = 1").first();
  const state_json = item?.state_json ? String(item.state_json) : '{}';
  return Response.json({ id: 1, state_json, updated_at: item?.updated_at });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const state_json = typeof body?.state_json === 'string' ? body.state_json : JSON.stringify(body?.state || {});
    const now = Date.now();
    await context.env.DB.prepare("UPDATE world_state SET state_json = ?, updated_at = ? WHERE id = 1").bind(state_json, now).run();
    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


```


## File: functions\api\world_state_snapshots.ts

```ts
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    "SELECT id, created_at FROM world_state_snapshots ORDER BY created_at DESC LIMIT 200"
  ).all();
  return Response.json(results || []);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const id = typeof body?.id === 'number' ? body.id : parseInt(String(body?.id || ''), 10);
    if (!Number.isFinite(id) || !id) return new Response('Missing id', { status: 400 });

    const row: any = await context.env.DB.prepare("SELECT * FROM world_state_snapshots WHERE id = ? LIMIT 1").bind(id).first();
    if (!row) return new Response('Not found', { status: 404 });

    const stateJson = typeof row.state_json === 'string' ? String(row.state_json) : '{}';
    await context.env.DB.prepare("UPDATE world_state SET state_json = ?, updated_at = ? WHERE id = 1").bind(stateJson, Date.now()).run();
    await context.env.DB.prepare("INSERT INTO world_state_snapshots (state_json, created_at) VALUES (?, ?)").bind(stateJson, Date.now()).run();

    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


```


## File: src\App.tsx

```tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { api, type Message, type Character, type Settings, type Group, type LorebookEntry, type ApiPreset, type ApiMode, type Room, type RoomMember, type RoomMessage, type Dispatch, type RoomAgentConfig, type RoomDirectorConfig, type WorldState, type RoomStateSnapshot, type WorldStateSnapshot } from './lib/db';
import { LLMClient } from './lib/llm';
import { ImageStudio } from './components/ImageStudio';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, 
  BookOpen, Book, Users, RefreshCw, Square, Save, Eraser, Sparkles, Copy, Inbox
} from 'lucide-react';

function App() {
  // --- 核心状态 ---
  const [viewMode, setViewMode] = useState<'char' | 'group' | 'image'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [presets, setPresets] = useState<ApiPreset[]>([]);
  
  // --- API 全局状态 ---
  const [activePresetId, setActivePresetId] = useState<number | undefined>();
  const [activeModel, setActiveModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]); // 仅存储自动获取的
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [presetModelsMap, setPresetModelsMap] = useState<Record<number, string[]>>({});
  const [presetModelsLoading, setPresetModelsLoading] = useState<Record<number, boolean>>({});

  // --- 基础数据状态 ---
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [selectedGroupId, setSelectedGroupId] = useState<number>();
  const [selectedRoomId, setSelectedRoomId] = useState<number>();
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntry[]>([]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- 弹窗控制状态 ---
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [useSdPromptConversion, setUseSdPromptConversion] = useState(true);
  const [showInbox, setShowInbox] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // --- Room 配置状态（Phase B/C/D） ---
  const [roomAgentConfigs, setRoomAgentConfigs] = useState<RoomAgentConfig[]>([]);
  const [roomDirectorConfig, setRoomDirectorConfig] = useState<RoomDirectorConfig | null>(null);
  const [pendingDispatches, setPendingDispatches] = useState<Dispatch[]>([]);
  const [roomDispatches, setRoomDispatches] = useState<Dispatch[]>([]);
  const [roomSummaries, setRoomSummaries] = useState<Array<{ id: number; summary: string; source: string; updated_at: number }>>([]);
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [draftWorldStateJson, setDraftWorldStateJson] = useState<string>('');
  const [roomSnapshots, setRoomSnapshots] = useState<RoomStateSnapshot[]>([]);
  const [worldSnapshots, setWorldSnapshots] = useState<WorldStateSnapshot[]>([]);
  const [roomMembersDraft, setRoomMembersDraft] = useState<RoomMember[]>([]);

  // --- 计算属性：手动配置的模型列表 ---
  const manualModels = useMemo(() => {
    if (!settings?.model_list) return [];
    return settings.model_list.split(/[,，\n]/).map(m => m.trim()).filter(m => m);
  }, [settings?.model_list]);

  const pendingCount = useMemo(
    () => (pendingDispatches || []).filter(d => (d as any)?.status === 'pending' || !(d as any)?.status).length,
    [pendingDispatches]
  );

  const characterNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of characters) {
      if (c.id) m.set(c.id, c.name);
    }
    return m;
  }, [characters]);

  const isLogRoom = useMemo(() => {
    if (viewMode !== 'group' || !selectedRoomId) return false;
    const mode = rooms.find(r => r.id === selectedRoomId)?.mode;
    return mode === 'log';
  }, [viewMode, selectedRoomId, rooms]);

  const getPresetMode = (preset?: ApiPreset): ApiMode =>
    preset?.api_mode === 'responses' ? 'responses' : 'chat_completions';

  const fetchPresetModels = async (presetId?: number, force = false) => {
    if (!presetId) return;
    if (presetModelsLoading[presetId]) return;
    if (!force && presetModelsMap[presetId]?.length) return;

    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    setPresetModelsLoading(prev => ({ ...prev, [presetId]: true }));
    try {
      const llm = new LLMClient(preset.api_base, preset.api_key, getPresetMode(preset));
      const models = await llm.fetchModels();
      setPresetModelsMap(prev => ({ ...prev, [presetId]: models }));
    } finally {
      setPresetModelsLoading(prev => ({ ...prev, [presetId]: false }));
    }
  };

  // --- 初始化数据 ---
  const loadData = async () => {
    try {
        const [c, g, r, s, p, d] = await Promise.all([
            api.characters.list(),
            api.groups.list(),
            api.rooms.list(),
            api.settings.get(),
            api.presets.list(),
            api.dispatches.listPending().catch(() => []),
        ]);
        setCharacters(c); setGroups(g); setRooms(r); setSettings(s); setPresets(p); setPendingDispatches(d as any);
        
        // 恢复上次选择的 Preset 和 Model
        if (s.active_preset_id && p.some(pre => pre.id === s.active_preset_id)) {
            setActivePresetId(s.active_preset_id);
            // 尝试加载模型列表
            const currentPreset = p.find(pre => pre.id === s.active_preset_id);
            if(currentPreset) {
                // 这里传入 s.model_list 以便 refreshModels 知道有手动模型作为兜底
                await refreshModels(currentPreset.api_base, currentPreset.api_key, s.active_model_id, s.model_list, getPresetMode(currentPreset));
            }
        }
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!showSettings) return;
    fetchPresetModels(activePresetId);
    fetchPresetModels(settings?.image_preset_id);
    fetchPresetModels(settings?.summary_preset_id);
    fetchPresetModels(settings?.sd_prompt_preset_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSettings]);

  useEffect(() => {
    if (!showGroupEdit) return;
    if (!selectedRoomId) return;

    (async () => {
      try {
        const [members, agentCfgs, directorCfg, summaries, dispatches, ws, snaps, wsSnaps] = await Promise.all([
          api.rooms.getMembers(selectedRoomId),
          api.roomAgentConfig.list(selectedRoomId).catch(() => []),
          api.roomDirectorConfig.get(selectedRoomId).catch(() => null),
          api.roomSummaries.list(selectedRoomId).catch(() => []),
          api.dispatches.listByRoom(selectedRoomId).catch(() => []),
          api.worldState.get().catch(() => null as any),
          api.roomStateSnapshots.list(selectedRoomId).catch(() => []),
          api.worldStateSnapshots.list().catch(() => []),
        ]);

        setRoomMembersDraft(members as any);
        setRoomAgentConfigs(agentCfgs as any);
        setRoomDirectorConfig(directorCfg as any);
        setRoomSummaries(summaries as any);
        setRoomDispatches(dispatches as any);
        setWorldState(ws as any);
        setDraftWorldStateJson((ws as any)?.state_json || '{}');
        setRoomSnapshots(snaps as any);
        setWorldSnapshots(wsSnaps as any);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [showGroupEdit, selectedRoomId]);

  // --- API 状态管理逻辑 ---
  const refreshModels = async (base: string, key: string, keepModelId?: string, manualListStr?: string, mode: ApiMode = 'chat_completions') => {
      setIsFetchingModels(true);
      const llm = new LLMClient(base, key, mode);
      const fetchedModels = await llm.fetchModels();
      setAvailableModels(fetchedModels);
      setIsFetchingModels(false);
      
      // 解析手动模型列表 (参数传入或使用当前状态)
      const currentManualList = manualListStr !== undefined ? manualListStr : (settings?.model_list || "");
      const manualArr = currentManualList.split(/[,，\n]/).map(m => m.trim()).filter(m => m);
      
      // 决定选中哪个模型
      // 1. 如果之前选中的模型在 自动列表 或 手动列表 中，保持选中
      if (keepModelId && (fetchedModels.includes(keepModelId) || manualArr.includes(keepModelId))) {
          setActiveModel(keepModelId);
      } 
      // 2. 否则优先选自动列表的第一个
      else if (fetchedModels.length > 0) {
          const first = fetchedModels[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      } 
      // 3. 都没有，选手动列表第一个作为兜底
      else if (manualArr.length > 0) {
          const first = manualArr[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      }
      // 4. 如果都为空，UI 会显示 placeholder
  };

  const handlePresetChange = async (presetIdStr: string) => {
      const pid = parseInt(presetIdStr);
      setActivePresetId(pid);
      if(settings) await api.settings.update({ ...settings, active_preset_id: pid });
      
      const p = presets.find(pre => pre.id === pid);
      if (p) await refreshModels(p.api_base, p.api_key, undefined, undefined, getPresetMode(p));
  };

  const handleModelChange = async (modelId: string) => {
      setActiveModel(modelId);
      if(settings) await api.settings.update({ ...settings, active_model_id: modelId });
  };

  // --- 切换角色/剧场时的监听 ---
  useEffect(() => {
    setMessages([]);
    setRoomMessages([]);
    if (viewMode === 'char' && selectedCharId) {
      api.messages.list(selectedCharId).then(setMessages);
      api.lorebook.list(selectedCharId).then(setLorebookEntries);
    } else if (viewMode === 'group' && selectedRoomId) {
      api.rooms.getMembers(selectedRoomId).then((m) => {
        setRoomMembers(m);
        const activeIds = (m || []).filter(x => (x as any).is_active !== 0).map(x => x.char_id);
        setGroupMemberIds(activeIds);
      });
      api.roomMessages.list(selectedRoomId).then(setRoomMessages);
    }
  }, [selectedCharId, selectedRoomId, viewMode]);

  const messageCount = viewMode === 'group' ? roomMessages.length : messages.length;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messageCount, isTyping]);

  // --- 逻辑函数 ---
  const stopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
    }
  };

  const sendRoomChat = async (userText: string, speakerCharId?: number) => {
    if (!settings) return;
    if (!selectedRoomId) return alert("请先选择房间");
    if (!activePresetId || !activeModel) return alert("请先在顶部选择 API 预设和模型！");

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsTyping(true);
    try {
      const roomMode = rooms.find(r => r.id === selectedRoomId)?.mode || 'agents';
      await api.roomChat.send({
        room_id: selectedRoomId,
        user_input: userText,
        speaker_char_id: speakerCharId,
        fallback_preset_id: activePresetId,
        fallback_model_id: activeModel,
        max_speakers: roomMode === 'sandbox' ? 2 : 1,
      }, controller.signal);
      const latest = await api.roomMessages.list(selectedRoomId);
      setRoomMessages(latest);
      const pending = await api.dispatches.listPending().catch(() => []);
      setPendingDispatches(pending as any);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      alert(e.message || String(e));
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleDispatchAction = async (dispatchId: number, action: 'approve' | 'reject' | 'rewrite') => {
    try {
      await api.dispatches.resolve(dispatchId, action);
      const pending = await api.dispatches.listPending().catch(() => []);
      setPendingDispatches(pending as any);
      if (selectedRoomId) {
        const [dispatches, latestMessages, snaps, ws, wsSnaps] = await Promise.all([
          api.dispatches.listByRoom(selectedRoomId).catch(() => []),
          api.roomMessages.list(selectedRoomId).catch(() => []),
          api.roomStateSnapshots.list(selectedRoomId).catch(() => []),
          api.worldState.get().catch(() => null as any),
          api.worldStateSnapshots.list().catch(() => []),
        ]);
        setRoomDispatches(dispatches as any);
        setRoomMessages(latestMessages as any);
        setRoomSnapshots(snaps as any);
        setWorldState(ws as any);
        setDraftWorldStateJson((ws as any)?.state_json || '{}');
        setWorldSnapshots(wsSnaps as any);
      }
    } catch (e: any) {
      alert(e.message || String(e));
    }
  };

  const saveRoomConfigs = async () => {
    if (!selectedRoomId) return;
    const room = rooms.find(x => x.id === selectedRoomId);
    if (!room) return;

    try { JSON.parse(room.state_json || '{}'); } catch { return alert('房间状态 JSON 格式错误'); }
    if (room.mode === 'sandbox') {
      try { JSON.parse(draftWorldStateJson || '{}'); } catch { return alert('全局世界状态 JSON 格式错误'); }
    }

    await api.rooms.update(selectedRoomId, {
      name: room.name,
      description: room.description,
      mode: room.mode || 'agents',
      rules: room.rules || '',
      category: room.category || '',
      state_json: room.state_json || '{}',
    });

    await api.rooms.updateMembers(selectedRoomId, roomMembersDraft.map((m, idx) => ({
      char_id: m.char_id,
      role: m.role || 'agent',
      order_index: m.order_index ?? idx,
      is_active: m.is_active === 0 ? 0 : 1,
    })).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((m, idx) => ({ ...m, order_index: idx })));

    if (room.mode === 'sandbox') {
      await api.worldState.update(draftWorldStateJson || '{}');
    }

    if (roomDirectorConfig) {
      await api.roomDirectorConfig.upsert({ ...roomDirectorConfig, room_id: selectedRoomId });
    }

    for (const cfg of roomAgentConfigs) {
      await api.roomAgentConfig.upsert({ ...cfg, room_id: selectedRoomId });
    }

    setShowGroupEdit(false);
    await loadData();
    const members = await api.rooms.getMembers(selectedRoomId).catch(() => []);
    setRoomMembers(members as any);
    const activeIds = (members as any[]).filter(x => (x as any).is_active !== 0).map(x => Number((x as any).char_id)).filter(Boolean);
    setGroupMemberIds(activeIds);
    alert('房间配置已保存');
  };

  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    if (!activePresetId || !activeModel) { return alert("请先在顶部导航栏选择 API 预设和模型！"); }
    
    const currentPreset = presets.find(p => p.id === activePresetId);
    if (!currentPreset) { return alert("无效的 API 预设"); }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    const currentHistory = (historyOverride || messages).filter(m => m.content || m.role === 'user');
    
    setMessages(prev => [...prev, { role: 'assistant', content: '', char_id: char.id, timestamp: tempTs }]);
    
    const llm = new LLMClient(currentPreset.api_base, currentPreset.api_key, getPresetMode(currentPreset));
    let fullContent = "";

    try {
      const stream = llm.chatStream(
        char, currentHistory, textOverride || "", 
        settings, activeModel, 
        lorebookEntries, 
        undefined,
        controller
      );

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, content: fullContent } : m));
      }
    } catch (e: any) {
        if (e.name !== 'AbortError') console.error("生成失败:", e);
    } finally {
      if (fullContent.trim().length > 0) {
          try {
            const res = await api.messages.add({ 
                role: 'assistant', content: fullContent, char_id: char.id, 
                group_id: undefined, 
                timestamp: tempTs 
            });
            setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, id: res.id } : m));
          } catch (dbErr) { console.error("持久化失败", dbErr); }
      } else {
          setMessages(prev => prev.filter(m => m.timestamp !== tempTs));
      }
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleGenImageAction = async () => {
    const imageBackend = (settings?.image_backend || 'sdwebui') as 'sdwebui' | 'openai';
    if (imageBackend === 'sdwebui' && !settings?.sd_url) return alert("请在设置中配置 SD URL");
    if (!activePresetId || !activeModel) return alert("请先选择 API 模型用于生成 Prompt");

    const rawPrompt =
      genPrompt ||
      (viewMode === 'group'
        ? (roomMessages.length > 0 ? roomMessages[roomMessages.length - 1].content : "")
        : (messages.length > 0 ? messages[messages.length - 1].content : ""));
    if (!rawPrompt) return;

    setShowGenModal(false);
    setIsTyping(true);
    try {
      const currentPreset = presets.find(p => p.id === activePresetId)!;

      const sdPromptPreset =
        presets.find(p => p.id === settings?.sd_prompt_preset_id) || currentPreset;
      const sdPromptModel = settings?.sd_prompt_model_id || activeModel;

      let finalPrompt = rawPrompt;
      if (useSdPromptConversion) {
        const llm = new LLMClient(sdPromptPreset.api_base, sdPromptPreset.api_key, getPresetMode(sdPromptPreset));
        const tags = await llm.generateImageTags(rawPrompt, sdPromptModel);
        finalPrompt = `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${tags}`;
      }

      const payload =
        imageBackend === 'openai'
          ? { prompt: finalPrompt, size: '1024x1024', n: 1, response_format: 'b64_json' }
          : {
              prompt: finalPrompt,
              negative_prompt: "(worst quality:2), (low quality:2), (normal quality:2), lowres, watermark",
              steps: 20,
              cfg_scale: 7,
              sampler_name: "Euler a",
              width: 512,
              height: 768,
              restore_faces: false,
              enable_hr: false,
            };

      const imagePreset =
        presets.find(p => p.id === settings?.image_preset_id) || currentPreset;
      const imageModel = settings?.image_model_id || activeModel;

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          imageBackend === 'sdwebui'
            ? { sd_url: settings!.sd_url, payload }
            : {
                backend: 'openai',
                apiBase: imagePreset.api_base,
                apiKey: imagePreset.api_key,
                model: imageModel,
                payload,
              }
        ),
      });
      if (!res.ok) throw new Error(imageBackend === 'sdwebui' ? "SD 后端未响应" : "OpenAI 生图后端未响应");
      const data = await res.json();
      const imgSrc =
        (Array.isArray(data?.images) && data.images[0] ? `data:image/png;base64,${data.images[0]}` : '') ||
        (Array.isArray(data?.urls) && data.urls[0] ? data.urls[0] : '');

      if (!imgSrc) throw new Error("后端未返回图片");

      const ephemeralMsg: Message = { 
          role: 'assistant', content: '', image: imgSrc, timestamp: Date.now(), 
          group_id: undefined, char_id: selectedCharId 
      };
      setMessages(prev => [...prev, ephemeralMsg]);

    } catch (e: any) { alert("生图失败: " + e.message); } finally { setIsTyping(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || !settings || isTyping) return;
    const text = input; setInput('');
    const tx = inputRef.current; if (tx) tx.style.height = 'auto';

    if (viewMode === 'group') {
      if (isLogRoom) { alert('世界日志为只读房间'); return; }
      await sendRoomChat(text);
      return;
    }

    const timestamp = Date.now();
    const userMsg: Message = { 
      role: 'user', content: text, timestamp,
      char_id: viewMode === 'char' ? selectedCharId : undefined,
      group_id: undefined
    };

    setMessages(prev => [...prev, userMsg]);
    try {
      const res = await api.messages.add(userMsg);
      const msgWithId = { ...userMsg, id: res.id };
      setMessages(prev => prev.map(m => m.timestamp === timestamp ? msgWithId : m));
      if (viewMode === 'char' && selectedCharId) {
        triggerAI(characters.find(c=>c.id===selectedCharId)!, text, [...messages, msgWithId]);
      }
    } catch (e) { console.error(e); }
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || isTyping) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;
    const newHistory = messages.slice(0, -1);
    setMessages(newHistory);
    if (lastMsg.id) await api.messages.delete(lastMsg.id);
    const char = characters.find(c => c.id === lastMsg.char_id);
    const lastUserMsg = [...newHistory].reverse().find(m => m.role === 'user');
    if (char) triggerAI(char, lastUserMsg?.content || "", newHistory);
  };

  // --- UI 组件 ---
  const Sidebar = () => (
    <div className="flex flex-col h-full bg-base-200 w-80 p-4 border-r border-base-content/10 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-6 pl-2">
        <h2 className="font-black text-primary text-xl tracking-tight">SimpleRP Cloud</h2>
        <button className="md:hidden btn btn-ghost btn-xs" onClick={() => setMobileMenuOpen(false)}><X/></button>
      </div>
      <div className="tabs tabs-boxed mb-6">
        <button className={`tab flex-1 transition-all ${viewMode === 'char' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('char')}>单人</button>
        <button className={`tab flex-1 transition-all ${viewMode === 'group' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('group')}>剧场</button>
        <button className={`tab flex-1 transition-all ${viewMode === 'image' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('image')}>生图</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1 text-base-content">
        {viewMode === 'char' ? characters.map(c => (
          <div key={c.id} onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedCharId === c.id ? 'bg-primary text-primary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate max-w-[140px]">{c.name}</span>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity items-center">
                <button className="hover:text-info p-1" title="创建副本" onClick={async (e) => {
                    e.stopPropagation();
                    const newName = prompt("新角色名称:", `${c.name} (Copy)`);
                    if(newName) { await api.characters.duplicate(c.id!, newName); loadData(); }
                }}><Copy size={14}/></button>
                <button className="hover:text-error p-1" title="删除" onClick={(e) => { 
                    e.stopPropagation(); 
                    if(confirm(`删除角色 ${c.name}？`)) api.characters.delete(c.id!).then(() => loadData()); 
                }}><Trash2 size={14} /></button>
            </div>
          </div>
        )) : viewMode === 'group' ? rooms.map(r => (
          <div key={r.id} onClick={() => { setSelectedRoomId(r.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedRoomId === r.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold truncate">{r.name}</span>
              <span className={`badge badge-xs ${r.mode === 'sandbox' ? 'badge-primary' : r.mode === 'agents' ? 'badge-secondary' : r.mode === 'log' ? 'badge-neutral' : 'badge-ghost'}`}>
                {r.mode || 'agents'}
              </span>
            </div>
            {r.mode !== 'log' && (
              <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`删除房间 ${r.name}？`)) api.rooms.delete(r.id!).then(() => loadData()); }} />
            )}
          </div>
        )) : (
          <div className="p-3 rounded-xl border border-base-300 bg-base-100/40 text-xs leading-relaxed">
            <div className="font-black mb-2 flex items-center gap-2"><ImageIcon size={16}/> 生图工作台</div>
            <div>支持文生图、图生图；参数可通过“高级 JSON”适配不同 OpenAI 兼容 API 或 SD WebUI。</div>
          </div>
        )}
        {(viewMode === 'char' || viewMode === 'group') && (
          <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={async () => {
            const n = prompt("名称?");
            if (!n) return;
            if (viewMode === 'char') await api.characters.add({ name: n, description: "", first_message: "你好", summary: "" });
            else await api.rooms.add({ name: n, mode: 'agents', description: "" });
            await loadData();
          }}><Plus size={16} /> 新建</button>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10"><button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 系统设置</button></div>
    </div>
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full bg-base-100 overflow-hidden text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4 sticky top-0 z-20 min-h-[3.5rem]">
          <div className="flex-none md:hidden"><button className="btn btn-square btn-ghost" onClick={()=>setMobileMenuOpen(true)}><Menu/></button></div>
          <div className="flex-1 font-bold truncate px-2 hidden md:block">
            {viewMode === 'image'
              ? '生图工作台'
              : (viewMode === 'char'
                  ? characters.find(c=>c.id===selectedCharId)?.name
                  : rooms.find(r=>r.id===selectedRoomId)?.name) || "SimpleRP"}
          </div>
          
          {/* API Selector (Top Bar) - 已优化，支持分组显示 */}
          <div className="flex-none flex items-center gap-2 mr-2 max-w-[72vw] md:max-w-none overflow-x-auto no-scrollbar">
            <select className="select select-bordered select-sm max-w-[8rem] text-xs" value={activePresetId || ""} onChange={(e) => handlePresetChange(e.target.value)}>
                <option value="" disabled>选择源...</option>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="join">
                <select className="select select-bordered select-sm join-item max-w-[10rem] text-xs" value={activeModel} onChange={(e) => handleModelChange(e.target.value)} disabled={!activePresetId}>
                    {/* 分组显示：区分手动配置与自动获取 */}
                    {manualModels.length === 0 && availableModels.length === 0 && <option value="">无可用模型</option>}
                    
                    {manualModels.length > 0 && (
                        <optgroup label="手动配置 (Settings)">
                            {manualModels.map(m => <option key={`man-${m}`} value={m}>{m}</option>)}
                        </optgroup>
                    )}
                    
                    {availableModels.length > 0 && (
                        <optgroup label="自动获取 (API)">
                             {availableModels.map(m => <option key={`auto-${m}`} value={m}>{m}</option>)}
                        </optgroup>
                    )}
                </select>
                <button className={`btn btn-sm join-item btn-ghost ${isFetchingModels ? 'loading' : ''}`} title="刷新模型列表" onClick={() => { const p = presets.find(pre => pre.id === activePresetId); if(p) refreshModels(p.api_base, p.api_key, activeModel, undefined, getPresetMode(p)); }} disabled={!activePresetId}><RefreshCw size={14}/></button>
            </div>
          </div>

          <div className="hidden md:flex flex-none gap-2">
            {viewMode !== 'image' && (
              <button className="btn btn-sm btn-ghost text-error" title="清空对话" onClick={() => {
                if (!confirm("确定清空会话？")) return;
                if (viewMode === 'group' && selectedRoomId) {
                  api.roomMessages.clear(selectedRoomId).then(() => { setRoomMessages([]); alert("已清空"); });
                } else {
                  api.messages.clear(viewMode==='char'?selectedCharId:undefined, undefined).then(()=>{setMessages([]); alert("已清空");});
                }
              }}><Eraser size={18}/></button>
            )}
            {viewMode === 'char' && selectedCharId && (
              <>
                <button className="btn btn-sm btn-ghost text-info" title="总结新进展" onClick={async ()=>{ 
                    if (!activePresetId || !activeModel) return alert("请先选择模型");
                    try {
                        setIsTyping(true);
                        const char = characters.find(c => c.id === selectedCharId);
                        const currentPreset = presets.find(p => p.id === activePresetId)!;
                        const summaryPreset = presets.find(p => p.id === settings?.summary_preset_id) || currentPreset;
                        const summaryModel = settings?.summary_model_id || activeModel;
                        const llm = new LLMClient(summaryPreset.api_base, summaryPreset.api_key, getPresetMode(summaryPreset));
                        const fragment = await llm.summarizeRecent(messages, summaryModel);
                        if(!fragment) return alert("没有检测到新剧情。");
                        const date = new Date().toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'});
                        const updatedSummary = (char?.summary ? char.summary + "\n\n" : "") + `#### [剧情更新 ${date}]\n${fragment}`;
                        await api.characters.update(selectedCharId, { summary: updatedSummary });
                        await loadData(); alert("新进展已追加。");
                    } catch (e: any) { alert(e.message); } finally { setIsTyping(false); }
                }}><BookOpen size={18}/></button>
                <button className="btn btn-sm btn-ghost text-warning" title="世界书" onClick={()=>setShowLorebook(true)}><Book size={18}/></button>
                <button className="btn btn-sm btn-primary" onClick={()=>setShowCharEdit(true)}><Pencil size={18}/></button>
              </>
            )}
            <button className="btn btn-sm btn-ghost relative" title="公文箱 / Inbox" onClick={() => setShowInbox(true)}>
              <Inbox size={18} />
              {pendingCount > 0 && (
                <span className="badge badge-error badge-xs absolute -top-1 -right-1">{pendingCount}</span>
              )}
            </button>
            {viewMode === 'group' && selectedRoomId && <button className="btn btn-sm btn-secondary" title="房间设置" onClick={()=>setShowGroupEdit(true)}><Users size={18}/></button>}
          </div>
        </div>

        <div className="md:hidden px-2 py-2 border-b border-base-300 bg-base-100">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {viewMode !== 'image' && (
              <button className="btn btn-xs btn-ghost text-error whitespace-nowrap" onClick={() => {
                if (!confirm("确定清空会话？")) return;
                if (viewMode === 'group' && selectedRoomId) {
                  api.roomMessages.clear(selectedRoomId).then(() => { setRoomMessages([]); alert("已清空"); });
                } else {
                  api.messages.clear(viewMode==='char'?selectedCharId:undefined, undefined).then(()=>{setMessages([]); alert("已清空");});
                }
              }}><Eraser size={14}/> 清空</button>
            )}
            {viewMode === 'char' && selectedCharId && (
              <>
                <button
                  className="btn btn-xs btn-ghost text-info whitespace-nowrap"
                  onClick={async ()=>{ 
                    if (!activePresetId || !activeModel) return alert("请先选择模型");
                    try {
                        setIsTyping(true);
                        const char = characters.find(c => c.id === selectedCharId);
                        const currentPreset = presets.find(p => p.id === activePresetId)!;
                        const summaryPreset = presets.find(p => p.id === settings?.summary_preset_id) || currentPreset;
                        const summaryModel = settings?.summary_model_id || activeModel;
                        const llm = new LLMClient(summaryPreset.api_base, summaryPreset.api_key, getPresetMode(summaryPreset));
                        const fragment = await llm.summarizeRecent(messages, summaryModel);
                        if(!fragment) return alert("没有检测到新剧情。");
                        const date = new Date().toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'});
                        const updatedSummary = (char?.summary ? char.summary + "\n\n" : "") + `#### [剧情更新 ${date}]\n${fragment}`;
                        await api.characters.update(selectedCharId, { summary: updatedSummary });
                        await loadData(); alert("新进展已追加。");
                    } catch (e: any) { alert(e.message); } finally { setIsTyping(false); }
                }}
                ><BookOpen size={14}/> 总结</button>
                <button className="btn btn-xs btn-ghost text-warning whitespace-nowrap" onClick={()=>setShowLorebook(true)}><Book size={14}/> 世界书</button>
                <button className="btn btn-xs btn-primary whitespace-nowrap" onClick={()=>setShowCharEdit(true)}><Pencil size={14}/> 人设</button>
              </>
            )}
            <button className="btn btn-xs btn-ghost relative whitespace-nowrap" onClick={() => setShowInbox(true)}>
              <Inbox size={14} /> 公文
              {pendingCount > 0 && (
                <span className="badge badge-error badge-xs absolute -top-1 -right-1">{pendingCount}</span>
              )}
            </button>
            {viewMode === 'group' && selectedRoomId && <button className="btn btn-xs btn-secondary whitespace-nowrap" onClick={()=>setShowGroupEdit(true)}><Users size={14}/> 房间</button>}
          </div>
        </div>

        {viewMode === 'image' ? (
          <ImageStudio
            settings={settings}
            presets={presets}
            activePresetId={activePresetId}
            activeModel={activeModel}
            manualModels={manualModels}
            getPresetMode={getPresetMode}
            fetchPresetModels={fetchPresetModels}
            presetModelsMap={presetModelsMap}
            presetModelsLoading={presetModelsLoading}
          />
        ) : (
          <>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {(viewMode === 'group' ? (roomMessages as any) : (messages as any)).map((m: any, idx: number) => {
                const isUser = m.role === 'user' || m.sender_type === 'user';
                const isSystemLike = viewMode === 'group' && (m.sender_type === 'tool' || m.sender_type === 'director' || m.role === 'system');
                const headerName =
                  isUser
                    ? '我'
                    : viewMode === 'group'
                      ? (m.sender_type === 'director' ? 'Director' : m.sender_type === 'tool' ? 'Tool' : (characterNameById.get(m.char_id) || 'AI'))
                      : (characterNameById.get(m.char_id) || 'AI');

                return (
                <div key={`${m.id || m.timestamp}-${idx}`} className={`chat ${isUser ? 'chat-end' : 'chat-start'} group animate-message`}>
                  <div className="chat-header opacity-50 text-[10px] mb-1 flex items-center gap-2">
                    {headerName}
                    {viewMode === 'char' && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          {!m.image && <button className="hover:text-primary" onClick={()=>{setEditingMsgId(m.id!); setEditContent(m.content)}}><Pencil size={10}/></button>}
                          {m.role !== 'user' && idx === messages.length - 1 && <button className="hover:text-primary" onClick={handleRegenerate}><RefreshCw size={10}/></button>}
                          <button className="hover:text-error" onClick={async () => { if (confirm("删除该条记录？")) { if (m.id) { await api.messages.delete(m.id); setMessages(prev => prev.filter(msg => msg.id !== m.id)); } else { setMessages(prev => prev.filter(msg => msg.timestamp !== m.timestamp)); } } }}><Trash2 size={10}/></button>
                      </div>
                    )}
                  </div>
                  {m.image ? (
                    <div className="chat-bubble p-1 bg-base-200 border-base-300 shadow-xl overflow-hidden relative group/img">
                      <img src={m.image} className="max-w-xs md:max-w-md rounded-lg"/>
                      {!m.id && (<div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity"><button className="btn btn-circle btn-xs btn-primary shadow-lg" title="保存" onClick={async () => { try { const res = await api.messages.add(m); setMessages(prev => prev.map(msg => msg.timestamp === m.timestamp ? { ...msg, id: res.id } : msg)); alert("已保存"); } catch (err) { alert("保存失败"); } }}><Save size={12}/></button></div>)}
                    </div>
                  ) : (
                    <div className={`chat-bubble shadow-lg border ${isUser ? 'chat-bubble-primary border-primary' : isSystemLike ? 'bg-base-300 text-base-content border-base-300 text-xs' : 'bg-base-200 text-base-content border-base-300'}`}>
                      {viewMode === 'char' && editingMsgId === m.id ? (
                          <div className="flex flex-col gap-2 min-w-[200px]"><textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/><div className="flex justify-end gap-1"><button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>取消</button><button className="btn btn-xs btn-primary" onClick={async ()=>{await api.messages.update(m.id!, editContent); setMessages(prev => prev.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); setEditingMsgId(null)}}>保存</button></div></div>
                      ) : <div className={`prose prose-sm break-words ${isSystemLike ? 'prose-p:my-1' : ''}`}><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>}
                    </div>
                  )}
                </div>
              );
              })}
              {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">思考中...</div></div>}
              <div ref={bottomRef} className="h-20" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-base-100 border-t border-base-300">
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                {viewMode === 'group' && selectedRoomId && !isLogRoom && (
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {characters.filter(c => groupMemberIds.includes(c.id!)).map(m => (
                      <button key={m.id} onClick={() => sendRoomChat(input || '', m.id)} disabled={isTyping || !input.trim()} className="btn btn-xs btn-outline btn-secondary whitespace-nowrap rounded-full">
                        @{m.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end bg-base-200 p-2 rounded-2xl shadow-inner border border-base-300">
                    <button className="btn btn-circle btn-ghost btn-sm text-accent" disabled={isLogRoom} onClick={()=>{const src = viewMode === 'group' ? (roomMessages as any[]) : (messages as any[]); setGenPrompt(src[src.length-1]?.content || ""); setUseSdPromptConversion(true); setShowGenModal(true)}}><ImageIcon size={20}/></button>
                  <textarea ref={inputRef} disabled={isLogRoom} className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-48 resize-none py-2 px-2 focus:outline-none" rows={1} value={input} onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'}} placeholder={isLogRoom ? "世界日志只读（不能发言）" : "输入消息..."} onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); handleSend();}}} />
                  {isTyping ? (<button className="btn btn-circle btn-error btn-sm shadow-lg" onClick={stopGeneration}><Square size={16} fill="currentColor"/></button>) : (<button className="btn btn-circle btn-primary btn-sm shadow-lg" onClick={handleSend} disabled={isLogRoom || !input.trim()}><Send size={18}/></button>)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {/* 1. 设置面板 (恢复手动模型列表输入) */}
      {showSettings && settings && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b bg-base-200 font-bold flex justify-between items-center">系统配置<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">基础与沉浸</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control"><label className="label text-xs font-bold">玩家姓名</label><input className="input input-bordered" placeholder="如：陈墨" value={settings.user_name || ''} onChange={e=>setSettings({...settings, user_name:e.target.value})} /></div>
                            <div className="form-control">
                              <label className="label text-xs font-bold">生图后端</label>
                              <select className="select select-bordered" value={settings.image_backend || 'sdwebui'} onChange={e=>setSettings({...settings, image_backend: e.target.value as any})}>
                                <option value="sdwebui">SD WebUI (txt2img)</option>
                                <option value="openai">OpenAI 兼容 (/images/generations)</option>
                              </select>
                            </div>
                            { (settings.image_backend || 'sdwebui') === 'sdwebui' ? (
                              <div className="form-control"><label className="label text-xs font-bold">SD 地址 (API)</label><input className="input input-bordered" placeholder="http://127.0.0.1:7860" value={settings.sd_url || ''} onChange={e=>setSettings({...settings, sd_url:e.target.value})} /></div>
                            ) : (
                              <div className="form-control"><label className="label text-xs font-bold">OpenAI 生图模型 (可选)</label><input className="input input-bordered" placeholder="留空则使用顶部已选模型；如：gpt-image-1 / sdxl / flux-dev" value={settings.image_model_id || ''} onChange={e=>setSettings({...settings, image_model_id:e.target.value})} /></div>
                            )}
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">模型绑定 (可选)</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">生图模型（OpenAI 兼容后端用）</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select
                                    className="select select-bordered"
                                    value={settings.image_preset_id ? String(settings.image_preset_id) : ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (!v) {
                                        setSettings({ ...settings, image_preset_id: undefined, image_model_id: '' });
                                        return;
                                      }
                                      const pid = parseInt(v, 10);
                                      setSettings({ ...settings, image_preset_id: pid });
                                      fetchPresetModels(pid);
                                    }}
                                  >
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`img-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select
                                      className="select select-bordered join-item w-full"
                                      disabled={!settings.image_preset_id}
                                      value={settings.image_model_id || ''}
                                      onChange={(e) => setSettings({ ...settings, image_model_id: e.target.value })}
                                    >
                                      <option value="">跟随顶部模型</option>
                                      {settings.image_preset_id && (presetModelsMap[settings.image_preset_id] || []).map(m => (
                                        <option key={`img-model-${m}`} value={m}>{m}</option>
                                      ))}
                                      {settings.image_preset_id && (presetModelsMap[settings.image_preset_id]?.length || 0) === 0 && manualModels.map(m => (
                                        <option key={`img-manual-${m}`} value={m}>{m}</option>
                                      ))}
                                    </select>
                                    <button
                                      className={`btn btn-sm join-item btn-ghost ${settings.image_preset_id && presetModelsLoading[settings.image_preset_id] ? 'loading' : ''}`}
                                      title="刷新模型列表"
                                      onClick={() => fetchPresetModels(settings.image_preset_id, true)}
                                      disabled={!settings.image_preset_id}
                                    >
                                      <RefreshCw size={14}/>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">记忆总结模型</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select
                                    className="select select-bordered"
                                    value={settings.summary_preset_id ? String(settings.summary_preset_id) : ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (!v) {
                                        setSettings({ ...settings, summary_preset_id: undefined, summary_model_id: '' });
                                        return;
                                      }
                                      const pid = parseInt(v, 10);
                                      setSettings({ ...settings, summary_preset_id: pid });
                                      fetchPresetModels(pid);
                                    }}
                                  >
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`sum-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select
                                      className="select select-bordered join-item w-full"
                                      disabled={!settings.summary_preset_id}
                                      value={settings.summary_model_id || ''}
                                      onChange={(e) => setSettings({ ...settings, summary_model_id: e.target.value })}
                                    >
                                      <option value="">跟随顶部模型</option>
                                      {settings.summary_preset_id && (presetModelsMap[settings.summary_preset_id] || []).map(m => (
                                        <option key={`sum-model-${m}`} value={m}>{m}</option>
                                      ))}
                                      {settings.summary_preset_id && (presetModelsMap[settings.summary_preset_id]?.length || 0) === 0 && manualModels.map(m => (
                                        <option key={`sum-manual-${m}`} value={m}>{m}</option>
                                      ))}
                                    </select>
                                    <button
                                      className={`btn btn-sm join-item btn-ghost ${settings.summary_preset_id && presetModelsLoading[settings.summary_preset_id] ? 'loading' : ''}`}
                                      title="刷新模型列表"
                                      onClick={() => fetchPresetModels(settings.summary_preset_id, true)}
                                      disabled={!settings.summary_preset_id}
                                    >
                                      <RefreshCw size={14}/>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">SD 转换模型（描述 → tags）</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select
                                    className="select select-bordered"
                                    value={settings.sd_prompt_preset_id ? String(settings.sd_prompt_preset_id) : ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (!v) {
                                        setSettings({ ...settings, sd_prompt_preset_id: undefined, sd_prompt_model_id: '' });
                                        return;
                                      }
                                      const pid = parseInt(v, 10);
                                      setSettings({ ...settings, sd_prompt_preset_id: pid });
                                      fetchPresetModels(pid);
                                    }}
                                  >
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`sd-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select
                                      className="select select-bordered join-item w-full"
                                      disabled={!settings.sd_prompt_preset_id}
                                      value={settings.sd_prompt_model_id || ''}
                                      onChange={(e) => setSettings({ ...settings, sd_prompt_model_id: e.target.value })}
                                    >
                                      <option value="">跟随顶部模型</option>
                                      {settings.sd_prompt_preset_id && (presetModelsMap[settings.sd_prompt_preset_id] || []).map(m => (
                                        <option key={`sd-model-${m}`} value={m}>{m}</option>
                                      ))}
                                      {settings.sd_prompt_preset_id && (presetModelsMap[settings.sd_prompt_preset_id]?.length || 0) === 0 && manualModels.map(m => (
                                        <option key={`sd-manual-${m}`} value={m}>{m}</option>
                                      ))}
                                    </select>
                                    <button
                                      className={`btn btn-sm join-item btn-ghost ${settings.sd_prompt_preset_id && presetModelsLoading[settings.sd_prompt_preset_id] ? 'loading' : ''}`}
                                      title="刷新模型列表"
                                      onClick={() => fetchPresetModels(settings.sd_prompt_preset_id, true)}
                                      disabled={!settings.sd_prompt_preset_id}
                                    >
                                      <RefreshCw size={14}/>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                      </section>
                      <section>
                          <div className="flex justify-between items-end mb-3">
                              <h4 className="text-sm font-black text-primary uppercase">API 预设库 (用于顶部导航栏切换)</h4>
                              <button className="btn btn-xs btn-primary" onClick={() => api.presets.add({name: "New Preset", api_base: "", api_key: "", api_mode: 'chat_completions'}).then(() => loadData())}>+ 新增</button>
                          </div>
                          <div className="overflow-x-auto border border-base-300 rounded-xl mb-4">
                              <table className="table table-compact w-full text-xs">
                                  <thead><tr className="bg-base-200"><th>名称</th><th>Base URL</th><th>Key</th><th>Mode</th><th className="w-20">操作</th></tr></thead>
                                  <tbody>
                                      {presets.map((p, idx) => (
                                          <tr key={p.id}>
                                              <td><input className="input input-ghost input-xs w-full font-bold" value={p.name} onChange={e=>{const n=[...presets]; n[idx].name=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" value={p.api_base} onChange={e=>{const n=[...presets]; n[idx].api_base=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" type="password" value={p.api_key} onChange={e=>{const n=[...presets]; n[idx].api_key=e.target.value; setPresets(n);}} /></td>
                                              <td><select className="select select-bordered select-xs w-full" value={p.api_mode || 'chat_completions'} onChange={e=>{const n=[...presets]; n[idx].api_mode=e.target.value as ApiMode; setPresets(n);}}><option value="chat_completions">chat.completions</option><option value="responses">responses</option></select></td>
                                              <td className="flex gap-1">
                                                  <button className="btn btn-ghost btn-xs text-success" onClick={() => api.presets.update(p.id!, { ...p, api_mode: p.api_mode || 'chat_completions' }).then(() => alert("已更新"))}><Save size={14}/></button>
                                                  <button className="btn btn-ghost btn-xs text-error" onClick={() => {if(confirm("删除？")) api.presets.delete(p.id!).then(() => loadData());}}><Trash2 size={14}/></button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          {/* 【恢复】手动模型列表输入框 */}
                          <div className="form-control">
                                <label className="label font-bold text-xs">备用模型列表 (手动输入，逗号分隔)</label>
                                <textarea className="textarea textarea-bordered w-full text-xs h-20" placeholder="当 API 不支持自动获取模型列表时使用，例如：gpt-4o, claude-3-5-sonnet, deepseek-chat" value={settings.model_list || ""} onChange={e=>setSettings({...settings, model_list:e.target.value})} />
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-error uppercase">数据管理</h4>
                          <div className="p-4 border border-error/20 rounded-xl bg-error/5 flex justify-between items-center gap-4">
                              <div className="flex-1"><p className="text-xs font-bold text-error">清理数据库图片</p><p className="text-[10px] opacity-60 mt-1">永久删除 D1 数据库中存储的所有图片消息。</p></div>
                              <button className="btn btn-error btn-sm shadow-md" onClick={async () => { if(confirm("确定清理图片？")) { await api.messages.clearAllImages(); alert("清理成功"); } }}><Eraser size={14} className="mr-1"/> 清理图片</button>
                          </div>
                      </section>
                  </div>
                  <div className="p-4 border-t bg-base-200"><button className="btn btn-primary btn-block" onClick={async ()=>{await api.settings.update(settings!); setShowSettings(false); loadData();}}>保存配置</button></div>
              </div>
          </div>
      )}

      {/* 2. 角色编辑器 (已移除 API 覆盖) */}
      {showCharEdit && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">角色档案<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="form-control"><label className="label font-bold text-xs">角色姓名</label><input className="input input-bordered" value={characters.find(c=>c.id===selectedCharId)?.name} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, name:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs">人设/世界观描述</label><textarea className="textarea textarea-bordered h-48 font-mono text-sm" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs text-primary">长期记忆 (Summary)</label><textarea className="textarea textarea-bordered h-32 font-mono text-xs" value={characters.find(c=>c.id===selectedCharId)?.summary} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, summary:e.target.value}:c))} /></div>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{await api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false); loadData();}}>确认保存</button></div>
              </div>
          </div>
      )}

      {/* 3. 房间编辑器 (Phase A-D) */}
      {showGroupEdit && selectedRoomId && (() => {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (!room) return null;
        const roomPendingDispatches = roomDispatches.filter(d => d.status === 'pending');
        return (
          <div className="modal modal-open text-base-content">
            <div className="modal-box max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
              <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">
                <h3>房间配置 / Sandbox & Agent</h3>
                <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowGroupEdit(false)}><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label font-bold">房间名</label>
                    <input className="input input-bordered" value={room.name || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, name: e.target.value } : r))} />
                  </div>
                  <div className="form-control">
                    <label className="label font-bold">模式</label>
                    <select className="select select-bordered" value={room.mode || 'agents'} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, mode: e.target.value as any } : r))}>
                      <option value="agents">Agent 模式</option>
                      <option value="sandbox">Sandbox 模式</option>
                      <option value="chat">Chat 模式</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label font-bold">分类</label>
                    <input className="input input-bordered" placeholder="例如：主线 / 支线 / 系统" value={room.category || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, category: e.target.value } : r))} />
                  </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label font-bold text-xs text-primary">场景描述</label>
                    <textarea className="textarea textarea-bordered h-40" value={room.description || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, description: e.target.value } : r))} />
                  </div>
                  <div className="form-control">
                    <label className="label font-bold text-xs text-secondary">规则 / 调度说明</label>
                    <textarea className="textarea textarea-bordered h-40 font-mono text-xs" placeholder="例如：严格回合制；导演每回合最多选择 2 名角色；状态修改须走 HITL..." value={room.rules || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, rules: e.target.value } : r))} />
                  </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label font-bold text-xs">房间状态 JSON</label>
                    <textarea className="textarea textarea-bordered h-52 font-mono text-[11px]" value={room.state_json || '{}'} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, state_json: e.target.value } : r))} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="label font-bold text-xs m-0">全局世界状态 JSON</label>
                      {room.mode === 'sandbox' && <span className="badge badge-primary badge-sm">保存房间时同步</span>}
                    </div>
                    <textarea className="textarea textarea-bordered h-52 font-mono text-[11px]" value={draftWorldStateJson} onChange={e => setDraftWorldStateJson(e.target.value)} />
                  </div>
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-black text-sm">成员 / 顺序 / 角色</div>
                      <div className="text-[11px] opacity-60">可在聊天输入区通过 @角色 指定发言</div>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {characters.map(c => {
                        const existing = roomMembersDraft.find(m => m.char_id === c.id);
                        const active = !!existing;
                        return (
                          <div key={c.id} className={`p-3 rounded-xl border ${active ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'}`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary checkbox-sm"
                                checked={active}
                                onChange={e => {
                                  if (!c.id) return;
                                  if (e.target.checked) {
                                    setRoomMembersDraft(prev => [...prev, { char_id: c.id!, role: 'agent', order_index: prev.length, is_active: 1 }]);
                                  } else {
                                    setRoomMembersDraft(prev => prev.filter(m => m.char_id !== c.id).map((m, idx) => ({ ...m, order_index: idx })));
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold truncate">{c.name}</div>
                                <div className="text-[11px] opacity-60 truncate">{c.description || '未填写描述'}</div>
                              </div>
                              {active && (
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    min={0}
                                    className="input input-bordered input-xs w-16"
                                    value={existing?.order_index ?? 0}
                                    onChange={e => setRoomMembersDraft(prev => prev.map(m => m.char_id === c.id ? { ...m, order_index: parseInt(e.target.value || '0', 10) || 0 } : m))}
                                  />
                                  <select
                                    className="select select-bordered select-xs"
                                    value={existing?.role || 'agent'}
                                    onChange={e => setRoomMembersDraft(prev => prev.map(m => m.char_id === c.id ? { ...m, role: e.target.value } : m))}
                                  >
                                    <option value="agent">agent</option>
                                    <option value="npc">npc</option>
                                    <option value="narrator">narrator</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="font-black text-sm">导演配置</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="form-control">
                        <label className="label text-xs font-bold">预设</label>
                        <select className="select select-bordered" value={roomDirectorConfig?.api_preset_id ? String(roomDirectorConfig.api_preset_id) : ''} onChange={e => {
                          const v = e.target.value ? parseInt(e.target.value, 10) : null;
                          if (v) fetchPresetModels(v);
                          setRoomDirectorConfig(prev => ({ ...(prev || { room_id: selectedRoomId }), api_preset_id: v, model_id: prev?.model_id || null, temperature: prev?.temperature ?? 0.7, max_output_tokens: prev?.max_output_tokens ?? 600 }));
                        }}>
                          <option value="">跟随顶部预设</option>
                          {presets.map(p => <option key={`dir-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">模型</label>
                        <select className="select select-bordered" value={roomDirectorConfig?.model_id || ''} onChange={e => setRoomDirectorConfig(prev => ({ ...(prev || { room_id: selectedRoomId }), model_id: e.target.value || null, api_preset_id: prev?.api_preset_id ?? null, temperature: prev?.temperature ?? 0.7, max_output_tokens: prev?.max_output_tokens ?? 600 }))}>
                          <option value="">跟随顶部模型</option>
                          {(roomDirectorConfig?.api_preset_id ? (presetModelsMap[roomDirectorConfig.api_preset_id] || []) : []).map(m => <option key={`dir-model-${m}`} value={m}>{m}</option>)}
                          {manualModels.map(m => <option key={`dir-manual-${m}`} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">温度</label>
                        <input type="number" step="0.1" className="input input-bordered" value={roomDirectorConfig?.temperature ?? 0.7} onChange={e => setRoomDirectorConfig(prev => ({ ...(prev || { room_id: selectedRoomId }), api_preset_id: prev?.api_preset_id ?? null, model_id: prev?.model_id ?? null, temperature: parseFloat(e.target.value || '0.7'), max_output_tokens: prev?.max_output_tokens ?? 600 }))} />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">输出上限</label>
                        <input type="number" className="input input-bordered" value={roomDirectorConfig?.max_output_tokens ?? 600} onChange={e => setRoomDirectorConfig(prev => ({ ...(prev || { room_id: selectedRoomId }), api_preset_id: prev?.api_preset_id ?? null, model_id: prev?.model_id ?? null, temperature: prev?.temperature ?? 0.7, max_output_tokens: parseInt(e.target.value || '600', 10) || 600 }))} />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="p-4 rounded-xl border border-base-300 space-y-3">
                  <div className="font-black text-sm">Agent 配置（按成员）</div>
                  <div className="space-y-3">
                    {roomMembersDraft.slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map(member => {
                      const cfg = roomAgentConfigs.find(x => x.char_id === member.char_id) || { room_id: selectedRoomId, char_id: member.char_id, temperature: 0.8, max_output_tokens: 800, tool_policy_json: '{"update_state":"dispatch","request_image":"dispatch"}' };
                      const selectedPresetId = cfg.api_preset_id || undefined;
                      return (
                        <div key={`agent-cfg-${member.char_id}`} className="p-3 rounded-xl border border-base-300 bg-base-100">
                          <div className="font-bold mb-3">{characterNameById.get(member.char_id) || `#${member.char_id}`}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                            <select className="select select-bordered" value={selectedPresetId ? String(selectedPresetId) : ''} onChange={e => {
                              const pid = e.target.value ? parseInt(e.target.value, 10) : null;
                              if (pid) fetchPresetModels(pid);
                              setRoomAgentConfigs(prev => {
                                const next = prev.filter(x => x.char_id !== member.char_id);
                                return [...next, { ...cfg, api_preset_id: pid }];
                              });
                            }}>
                              <option value="">跟随顶部预设</option>
                              {presets.map(p => <option key={`agent-preset-${member.char_id}-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                            </select>
                            <select className="select select-bordered" value={cfg.model_id || ''} onChange={e => setRoomAgentConfigs(prev => {
                              const next = prev.filter(x => x.char_id !== member.char_id);
                              return [...next, { ...cfg, model_id: e.target.value || null }];
                            })}>
                              <option value="">跟随顶部模型</option>
                              {(selectedPresetId ? (presetModelsMap[selectedPresetId] || []) : []).map(m => <option key={`agent-model-${member.char_id}-${m}`} value={m}>{m}</option>)}
                              {manualModels.map(m => <option key={`agent-manual-${member.char_id}-${m}`} value={m}>{m}</option>)}
                            </select>
                            <input type="number" step="0.1" className="input input-bordered" value={cfg.temperature ?? 0.8} onChange={e => setRoomAgentConfigs(prev => {
                              const next = prev.filter(x => x.char_id !== member.char_id);
                              return [...next, { ...cfg, temperature: parseFloat(e.target.value || '0.8') }];
                            })} />
                            <input type="number" className="input input-bordered" value={cfg.max_output_tokens ?? 800} onChange={e => setRoomAgentConfigs(prev => {
                              const next = prev.filter(x => x.char_id !== member.char_id);
                              return [...next, { ...cfg, max_output_tokens: parseInt(e.target.value || '800', 10) || 800 }];
                            })} />
                            <input className="input input-bordered font-mono text-xs" value={cfg.tool_policy_json || ''} onChange={e => setRoomAgentConfigs(prev => {
                              const next = prev.filter(x => x.char_id !== member.char_id);
                              return [...next, { ...cfg, tool_policy_json: e.target.value }];
                            })} placeholder='{"update_state":"dispatch"}' />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="font-black text-sm">长期记忆</div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {roomSummaries.length === 0 ? <div className="text-sm opacity-60">暂无记忆摘要。</div> : roomSummaries.map(s => (
                        <div key={s.id} className="p-3 rounded-lg bg-base-200 border border-base-content/5">
                          <div className="text-[11px] opacity-60 mb-1">{s.source} · {new Date(s.updated_at).toLocaleString()}</div>
                          <div className="text-sm whitespace-pre-wrap">{s.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="font-black text-sm">房间状态快照</div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {roomSnapshots.length === 0 ? <div className="text-sm opacity-60">暂无快照。</div> : roomSnapshots.map(s => (
                        <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-base-200">
                          <span className="text-xs">#{s.id} · {new Date(s.created_at).toLocaleString()}</span>
                          <button className="btn btn-xs" onClick={async () => {
                            await api.roomStateSnapshots.restore(s.id);
                            const [snaps, latestMessages] = await Promise.all([
                              api.roomStateSnapshots.list(selectedRoomId),
                              api.roomMessages.list(selectedRoomId),
                            ]);
                            setRoomSnapshots(snaps as any);
                            setRoomMessages(latestMessages as any);
                            const refreshedRooms = await api.rooms.list();
                            setRooms(refreshedRooms);
                          }}>回滚</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="font-black text-sm">全局状态快照</div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {worldSnapshots.length === 0 ? <div className="text-sm opacity-60">暂无快照。</div> : worldSnapshots.map(s => (
                        <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-base-200">
                          <span className="text-xs">#{s.id} · {new Date(s.created_at).toLocaleString()}</span>
                          <button className="btn btn-xs" onClick={async () => {
                            await api.worldStateSnapshots.restore(s.id);
                            const [ws, wsSnaps] = await Promise.all([api.worldState.get(), api.worldStateSnapshots.list()]);
                            setWorldState(ws);
                            setDraftWorldStateJson(ws.state_json || '{}');
                            setWorldSnapshots(wsSnaps);
                          }}>回滚</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="p-4 rounded-xl border border-base-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-sm">房间公文流</div>
                    <div className="badge badge-secondary badge-sm">pending {roomPendingDispatches.length}</div>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {roomDispatches.length === 0 ? <div className="text-sm opacity-60">暂无公文。</div> : roomDispatches.map(d => (
                      <div key={d.id} className="p-3 rounded-lg bg-base-200 border border-base-content/5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-sm">{d.abstract}</div>
                          <span className={`badge badge-sm ${d.status === 'approved' ? 'badge-success' : d.status === 'rejected' ? 'badge-error' : d.status === 'rewrite_requested' ? 'badge-warning' : 'badge-secondary'}`}>{d.status || 'pending'}</span>
                        </div>
                        <div className="text-[11px] opacity-60 mt-1">#{d.id} · from {d.from_room_id ?? '-'} → {d.to_room_id} · {d.created_at ? new Date(d.created_at).toLocaleString() : ''}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="p-6 border-t bg-base-200 flex justify-between items-center gap-3">
                <div className="text-xs opacity-70">Global updated: {worldState?.updated_at ? new Date(worldState.updated_at).toLocaleString() : '未加载'}</div>
                <div className="flex gap-2">
                  <button className="btn" onClick={() => setShowGroupEdit(false)}>取消</button>
                  <button className="btn btn-primary" onClick={saveRoomConfigs}>保存房间</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3b. 公文箱 / Inbox (Phase D) */}
      {showInbox && (
        <div className="modal modal-open text-base-content">
          <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
            <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">
              <h3 className="flex items-center gap-2"><Inbox size={18}/> 公文箱 / Inbox</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowInbox(false)}><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs opacity-70">待处理：{pendingCount}</div>
                <button className="btn btn-sm" onClick={async () => {
                  const pending = await api.dispatches.listPending().catch(() => []);
                  setPendingDispatches(pending as any);
                }}><RefreshCw size={16}/> 刷新</button>
              </div>

              {(pendingDispatches || []).filter(d => (d as any)?.status === 'pending' || !(d as any)?.status).length === 0 ? (
                <div className="p-4 rounded-xl border border-base-300 text-sm opacity-70">暂无待处理公文。</div>
              ) : (
                <div className="space-y-3">
                  {(pendingDispatches || []).filter(d => (d as any)?.status === 'pending' || !(d as any)?.status).map(d => {
                    const payloadObj = (() => {
                      try { return d.payload_json ? JSON.parse(d.payload_json) : null; } catch { return null; }
                    })();
                    return (
                      <div key={d.id} className="p-4 rounded-xl border border-base-300 bg-base-100 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold truncate">{d.abstract}</div>
                            <div className="text-[11px] opacity-70 mt-1">
                              from: {d.from_room_id ?? '-'} → to: {d.to_room_id} · #{d.id}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button className="btn btn-sm btn-success" onClick={() => handleDispatchAction(d.id!, 'approve')}>批准</button>
                            <button className="btn btn-sm btn-error" onClick={() => handleDispatchAction(d.id!, 'reject')}>驳回</button>
                          </div>
                        </div>
                        {payloadObj && (
                          <details className="collapse collapse-arrow bg-base-200 border border-base-content/5">
                            <summary className="collapse-title text-xs font-bold">Payload</summary>
                            <div className="collapse-content">
                              <pre className="text-[11px] whitespace-pre-wrap break-words font-mono">{JSON.stringify(payloadObj, null, 2)}</pre>
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. 世界书编辑器 (保持不变) */}
      {showLorebook && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[75vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-4 border-b bg-base-200 font-bold flex justify-between items-center">世界书 (Worldbook)<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowLorebook(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {lorebookEntries.map(e => (
                        <div key={e.id} className="collapse collapse-arrow bg-base-200 border border-base-content/5">
                            <input type="checkbox"/>
                            <div className="collapse-title text-sm font-bold flex justify-between items-center pr-12">
                                <span>{e.keywords}</span>
                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${e.isActive ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>{e.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="collapse-content space-y-2">
                                <textarea className="textarea textarea-bordered w-full h-32 text-xs font-mono" defaultValue={e.content} onBlur={(evt)=>api.lorebook.update(e.id!, {content: evt.target.value})} />
                                <div className="flex gap-2 items-center">
                                    <input className="input input-bordered input-sm flex-1 text-xs" defaultValue={e.keywords} onBlur={(evt)=>api.lorebook.update(e.id!, {keywords: evt.target.value})} />
                                    <div className="flex items-center gap-2 bg-base-300 px-3 py-1 rounded-full"><span className="text-[10px] font-bold">启用</span><input type="checkbox" className="toggle toggle-success toggle-xs" checked={e.isActive} onChange={(evt) => {const val = evt.target.checked; api.lorebook.update(e.id!, { isActive: val }).then(() => {setLorebookEntries(prev => prev.map(item => item.id === e.id ? {...item, isActive: val} : item));});}} /></div>
                                    <button className="btn btn-sm btn-error" onClick={()=>api.lorebook.delete(e.id!).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button className="btn btn-block btn-outline border-dashed btn-sm mt-4" onClick={()=>api.lorebook.add({char_id:selectedCharId, keywords:"新词条", content:"", isActive:true}).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}>+ 添加新设定</button>
                  </div>
              </div>
          </div>
      )}

      {/* 5. 生图提示词弹窗 */}
      {showGenModal && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary"><Sparkles/> 极速生图</h3>
                <textarea className="textarea textarea-bordered w-full h-32" value={genPrompt} onChange={e=>setGenPrompt(e.target.value)} placeholder="描述你想生成的画面细节，支持自然语言..." />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={useSdPromptConversion} onChange={(e)=>setUseSdPromptConversion(e.target.checked)} />
                    使用 SD 转换模型（描述 → tags）
                  </label>
                </div>
                <div className="modal-action flex gap-2">
                    <button className="btn btn-primary flex-1 shadow-lg" onClick={handleGenImageAction}>开始生成</button>
                    <button className="btn flex-1" onClick={()=>setShowGenModal(false)}>取消</button>
                </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;

```


## File: src\index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* =========================================
   全局基础设置 (纯色版)
   ========================================= */
html, body, #root {
  height: 100dvh; 
  width: 100vw;
  overflow: hidden; 
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  
  /* 1. 移除复杂的径向渐变背景，改为纯深色 */
  background-color: #0f172a; /* Slate-900 */
  background-image: none;    /* 禁用背景图 */

  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* =========================================
   组件样式工具
   ========================================= */

/* 1. 实心面板 (替代原本的玻璃面板) */
/* 移除 backdrop-blur，改为实心 bg-base-200 */
.solid-panel {
  @apply bg-base-200 border border-base-content/10 shadow-lg;
}

/* 2. 消息动画 (保持不变) */
@keyframes messageIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-message {
  animation: messageIn 0.2s ease-out forwards;
}

/* 3. 滚动条 */
.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-base-content/20 rounded-full; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.overflow-y-auto { -webkit-overflow-scrolling: touch; }

/* =========================================
   Markdown 内容美化 (实心版)
   ========================================= */
.prose {
  @apply text-base-content/90 max-w-none leading-relaxed text-[15px];
}
.prose p { @apply mb-2; }

/* 引用块 -> 实心深色块 */
.prose blockquote {
  @apply not-italic border-l-4 border-primary bg-base-300 rounded-r-lg py-2 px-3 my-3 shadow-sm;
  border-left-color: oklch(var(--p)); 
}

/* 分割线 -> 实线 */
.prose hr {
  @apply border-0 h-[1px] bg-base-content/10 my-4;
}

.prose ul { @apply list-disc list-outside ml-4 my-2 opacity-90; }
.prose ol { @apply list-decimal list-outside ml-4 my-2 opacity-90; }
.prose li { @apply my-0.5 pl-1; }
.prose strong { @apply text-primary font-bold; }
.prose h1, .prose h2, .prose h3 { @apply font-bold text-base-content mt-4 mb-2; }

.prose code { @apply bg-base-300 px-1 py-0.5 rounded text-xs font-mono text-secondary; }
.prose pre { @apply bg-[#1e1e1e] p-2 rounded-lg overflow-x-auto text-xs my-2 border border-white/5; }
.prose pre code { @apply bg-transparent text-gray-300 p-0; }

.prose table { @apply w-full text-xs my-2 border-collapse; }
.prose th { @apply text-left p-2 border-b border-base-content/20 text-primary; }
.prose td { @apply p-2 border-b border-base-content/10; }

```


## File: src\main.tsx

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```


## File: src\components\ImageStudio.tsx

```tsx
import { useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';
import { LLMClient } from '../lib/llm';
import type { ApiMode, ApiPreset, Settings } from '../lib/db';

type StudioMode = 'txt2img' | 'img2img';

type Props = {
  settings?: Settings;
  presets: ApiPreset[];
  activePresetId?: number;
  activeModel: string;
  manualModels: string[];
  getPresetMode: (preset?: ApiPreset) => ApiMode;
  fetchPresetModels: (presetId?: number, force?: boolean) => Promise<void>;
  presetModelsMap: Record<number, string[]>;
  presetModelsLoading: Record<number, boolean>;
};

const parseExtraJson = (raw: string): Record<string, unknown> => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return {};
  const obj = JSON.parse(trimmed);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  return obj as Record<string, unknown>;
};

const dataUrlToBase64 = (dataUrl: string): string => {
  const idx = dataUrl.indexOf(',');
  if (idx >= 0) return dataUrl.slice(idx + 1);
  return dataUrl;
};

const parseSize = (size: string): { w: number; h: number } | null => {
  const m = (size || '').trim().match(/^(\d+)x(\d+)$/);
  if (!m) return null;
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
};

const resizeDataUrl = async (dataUrl: string, maxW: number, maxH: number, mime: string): Promise<string> => {
  const img = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image load failed'));
  });
  img.src = dataUrl;
  await loaded;

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return dataUrl;

  const scale = Math.min(maxW / iw, maxH / ih, 1);
  const tw = Math.max(1, Math.round(iw * scale));
  const th = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, tw, th);

  return canvas.toDataURL(mime);
};

const normalizeSdWebUiUiUrl = (input?: string): string => {
  const raw = (input || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  const idx = raw.indexOf('/sdapi/');
  if (idx >= 0) return raw.slice(0, idx);
  return raw;
};

export function ImageStudio({
  settings,
  presets,
  activePresetId,
  activeModel,
  manualModels,
  getPresetMode,
  fetchPresetModels,
  presetModelsMap,
  presetModelsLoading,
}: Props) {
  const [mode, setMode] = useState<StudioMode>('txt2img');
  const [prompt, setPrompt] = useState('');
  const [negative, setNegative] = useState("(worst quality:2), (low quality:2), (normal quality:2), lowres, watermark");
  const [useConversion, setUseConversion] = useState(true);

  const [imagePresetId, setImagePresetId] = useState<string>(''); // empty => follow settings/top
  const [imageModelId, setImageModelId] = useState<string>(''); // empty => follow settings/top

  const [openAiSize, setOpenAiSize] = useState<string>('1024x1024');
  const [openAiN, setOpenAiN] = useState<number>(1);
  const [openAiQuality, setOpenAiQuality] = useState<string>('');
  const [openAiStyle, setOpenAiStyle] = useState<string>('');
  const [openAiResponseFormat, setOpenAiResponseFormat] = useState<string>('b64_json');
  const [openAiPath, setOpenAiPath] = useState<string>(''); // optional override
  const [openAiMultipart, setOpenAiMultipart] = useState<boolean>(true);
  const [openAiImageField, setOpenAiImageField] = useState<string>('image');
  const [openAiMaskField, setOpenAiMaskField] = useState<string>('mask');
  const [autoResizeUpload, setAutoResizeUpload] = useState<boolean>(true);

  const [extraJson, setExtraJson] = useState<string>('');

  const [sdWidth, setSdWidth] = useState<number>(512);
  const [sdHeight, setSdHeight] = useState<number>(768);
  const [sdSteps, setSdSteps] = useState<number>(20);
  const [sdCfg, setSdCfg] = useState<number>(7);
  const [sdSampler, setSdSampler] = useState<string>('Euler a');
  const [sdDenoise, setSdDenoise] = useState<number>(0.6);
  const [initImage, setInitImage] = useState<string>(''); // dataURL

  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // --- 图片预览（缩放/拖拽） ---
  const [viewerSrc, setViewerSrc] = useState<string>('');
  const [viewerZoom, setViewerZoom] = useState<number>(1);
  const [viewerOffset, setViewerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewerDragging, setViewerDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);

  const resolvePresetById = (id?: number) => presets.find(p => p.id === id);
  const currentPreset = presets.find(p => p.id === activePresetId);

  const backend = (settings?.image_backend || 'sdwebui') as 'sdwebui' | 'openai';
  const sdWebUiUrl = useMemo(() => normalizeSdWebUiUiUrl(settings?.sd_url), [settings?.sd_url]);

  const resolvedImagePreset =
    (imagePresetId ? resolvePresetById(parseInt(imagePresetId, 10)) : undefined) ||
    resolvePresetById(settings?.image_preset_id) ||
    currentPreset;

  const resolvedImageModel =
    (imageModelId || '').trim() ||
    (settings?.image_model_id || '').trim() ||
    (activeModel || '').trim();

  const resolvedPresetModels = resolvedImagePreset?.id ? (presetModelsMap[resolvedImagePreset.id] || []) : [];

  const resolveSdPromptPresetAndModel = () => {
    const preset = resolvePresetById(settings?.sd_prompt_preset_id) || currentPreset;
    const model = (settings?.sd_prompt_model_id || '').trim() || (activeModel || '').trim();
    return { preset, model };
  };

  const commonSizes = ['1024x1024', '1024x1792', '1792x1024', '1280x720', '720x1280'];

  const openViewer = (src: string) => {
    setViewerSrc(src);
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
    // daisyUI modal uses checkbox via class; we use dialog pattern here with conditional render
  };

  const closeViewer = () => {
    setViewerSrc('');
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
    setViewerDragging(false);
    dragStart.current = null;
  };

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const onViewerWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    const next = clamp(viewerZoom + direction * 0.15, 0.2, 6);
    setViewerZoom(next);
  };

  const onViewerPointerDown = (e: React.PointerEvent) => {
    if (!viewerSrc) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setViewerDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: viewerOffset.x, oy: viewerOffset.y };
  };

  const onViewerPointerMove = (e: React.PointerEvent) => {
    if (!viewerDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setViewerOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };

  const onViewerPointerUp = () => {
    setViewerDragging(false);
    dragStart.current = null;
  };

  const run = async () => {
    if (!settings) return;
    setError('');

    if (backend === 'sdwebui' && !settings.sd_url) {
      setError('请在系统设置中配置 SD URL');
      return;
    }
    if (!activePresetId || !activeModel) {
      setError('请先在顶部选择 API 预设与模型');
      return;
    }
    if (backend === 'openai' && (!resolvedImagePreset || !resolvedImageModel)) {
      setError('请配置生图预设/模型（或在顶部选择）');
      return;
    }

    const rawPrompt = (prompt || '').trim();
    if (!rawPrompt) {
      setError('请输入提示词');
      return;
    }
    if (mode === 'img2img' && !initImage) {
      setError('请先上传一张初始图片');
      return;
    }

    let promptToUse = rawPrompt;
    if (useConversion) {
      const { preset: sdPreset, model: sdModel } = resolveSdPromptPresetAndModel();
      if (!sdPreset || !sdModel) {
        setError('请配置 SD 转换模型（或在顶部选择）');
        return;
      }
      setLoading(true);
      try {
        const llm = new LLMClient(sdPreset.api_base, sdPreset.api_key, getPresetMode(sdPreset));
        const tags = await llm.generateImageTags(rawPrompt, sdModel);
        promptToUse = `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${tags}`;
      } catch (e: any) {
        setError(e?.message || String(e));
        setLoading(false);
        return;
      }
    }

    let extra: Record<string, unknown> = {};
    try {
      extra = parseExtraJson(extraJson);
    } catch (e: any) {
      setError(`高级参数 JSON 无效：${e.message || e}`);
      return;
    }

    setLoading(true);
    try {
      if (backend === 'sdwebui') {
        const payload: any =
          mode === 'txt2img'
            ? {
                prompt: promptToUse,
                negative_prompt: negative,
                steps: sdSteps,
                cfg_scale: sdCfg,
                sampler_name: sdSampler,
                width: sdWidth,
                height: sdHeight,
                restore_faces: false,
                enable_hr: false,
                ...extra,
              }
            : {
                prompt: promptToUse,
                negative_prompt: negative,
                steps: sdSteps,
                cfg_scale: sdCfg,
                sampler_name: sdSampler,
                width: sdWidth,
                height: sdHeight,
                denoising_strength: sdDenoise,
                init_images: [dataUrlToBase64(initImage)],
                ...extra,
              };

        const res = await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: mode,
            sd_url: settings.sd_url,
            payload,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: any = await res.json();
        const imgs = Array.isArray(data?.images) ? data.images : [];
        const out = imgs.map((b64: string) => `data:image/png;base64,${b64}`);
        setResults(out);
        return;
      }

      const payload: any = {
        prompt: promptToUse,
        size: openAiSize || '1024x1024',
        n: openAiN || 1,
        response_format: openAiResponseFormat || 'b64_json',
        ...extra,
      };
      if (openAiQuality) payload.quality = openAiQuality;
      if (openAiStyle) payload.style = openAiStyle;
      if (mode === 'img2img') {
        payload.image = initImage;
      }

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backend: 'openai',
          action: mode,
          multipart: mode === 'img2img' ? openAiMultipart : undefined,
          imageField: mode === 'img2img' && openAiMultipart ? openAiImageField : undefined,
          maskField: mode === 'img2img' && openAiMultipart ? openAiMaskField : undefined,
          apiBase: resolvedImagePreset!.api_base,
          apiKey: resolvedImagePreset!.api_key,
          model: resolvedImageModel,
          path: openAiPath || undefined,
          payload,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: any = await res.json();
      const out: string[] = [];
      if (Array.isArray(data?.images) && data.images[0]) {
        out.push(...data.images.map((b64: string) => `data:image/png;base64,${b64}`));
      }
      if (Array.isArray(data?.urls) && data.urls[0]) {
        out.push(...data.urls);
      }
      if (out.length === 0) throw new Error('后端未返回图片');
      setResults(out);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-black text-primary flex items-center gap-2"><ImageIcon size={18}/> 生图工作台</div>
            <div className="badge badge-outline">{backend === 'sdwebui' ? 'SD WebUI' : 'OpenAI 兼容'}</div>
            {backend === 'sdwebui' && sdWebUiUrl && (
              <button className="btn btn-xs btn-outline" onClick={() => window.open(sdWebUiUrl, '_blank', 'noopener,noreferrer')}>打开 WebUI</button>
            )}
          </div>
          <div className="join">
            <button className={`btn btn-sm join-item ${mode === 'txt2img' ? 'btn-primary' : ''}`} onClick={() => setMode('txt2img')}>文生图</button>
            <button className={`btn btn-sm join-item ${mode === 'img2img' ? 'btn-primary' : ''}`} onClick={() => setMode('img2img')}>图生图</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card bg-base-200 border border-base-300 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">输入</div>
              <textarea className="textarea textarea-bordered w-full h-32" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="输入提示词（自然语言或 tags 都可）" />

              <label className="flex items-center gap-2 text-xs font-bold">
                <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={useConversion} onChange={(e)=>setUseConversion(e.target.checked)} />
                使用 SD 转换模型（描述 → tags）
              </label>

              {mode === 'img2img' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input file-input-bordered w-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const raw = String(reader.result || '');
                        if (!autoResizeUpload) {
                          setInitImage(raw);
                          return;
                        }

                        try {
                          if (backend === 'openai') {
                            const sz = parseSize(openAiSize) || { w: 1024, h: 1024 };
                            const resized = await resizeDataUrl(raw, sz.w, sz.h, 'image/png');
                            setInitImage(resized);
                            return;
                          }
                          const resized = await resizeDataUrl(raw, sdWidth || 1024, sdHeight || 1024, 'image/png');
                          setInitImage(resized);
                        } catch {
                          setInitImage(raw);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={autoResizeUpload} onChange={(e)=>setAutoResizeUpload(e.target.checked)} />
                    上传后缩放到目标尺寸（减少超时/断连）
                  </label>
                  {initImage && (
                    <div className="rounded-xl overflow-hidden border border-base-300 bg-base-100/60">
                      <img src={initImage} className="max-h-48 w-full object-contain" />
                    </div>
                  )}
                </div>
              )}

              {backend === 'sdwebui' && (
                <>
                  <textarea className="textarea textarea-bordered w-full h-20" value={negative} onChange={e => setNegative(e.target.value)} placeholder="Negative prompt（可选）" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label text-xs font-bold">宽</label>
                      <input className="input input-bordered input-sm" type="number" value={sdWidth} onChange={e => setSdWidth(parseInt(e.target.value || '0', 10) || 0)} />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">高</label>
                      <input className="input input-bordered input-sm" type="number" value={sdHeight} onChange={e => setSdHeight(parseInt(e.target.value || '0', 10) || 0)} />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">Steps</label>
                      <input className="input input-bordered input-sm" type="number" value={sdSteps} onChange={e => setSdSteps(parseInt(e.target.value || '0', 10) || 0)} />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">CFG</label>
                      <input className="input input-bordered input-sm" type="number" step="0.5" value={sdCfg} onChange={e => setSdCfg(parseFloat(e.target.value || '0') || 0)} />
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold">Sampler</label>
                    <input className="input input-bordered input-sm" value={sdSampler} onChange={e => setSdSampler(e.target.value)} />
                  </div>
                  {mode === 'img2img' && (
                    <div className="form-control">
                      <label className="label text-xs font-bold">Denoise</label>
                      <input className="range range-primary" type="range" min="0" max="1" step="0.05" value={sdDenoise} onChange={e => setSdDenoise(parseFloat(e.target.value || '0'))} />
                      <div className="text-[10px] opacity-70 mt-1">{sdDenoise.toFixed(2)}</div>
                    </div>
                  )}
                </>
              )}

              {backend === 'openai' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label text-xs font-bold">Size</label>
                      <select className="select select-bordered select-sm" value={openAiSize} onChange={e => setOpenAiSize(e.target.value)}>
                        {commonSizes.map(s => <option key={`sz-${s}`} value={s}>{s}</option>)}
                      </select>
                      <div className="text-[10px] opacity-70 mt-1">不同供应商限制不同，可用“高级 JSON / path 覆盖”适配。</div>
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">n</label>
                      <input className="input input-bordered input-sm" type="number" min="1" max="8" value={openAiN} onChange={e => setOpenAiN(parseInt(e.target.value || '1', 10) || 1)} />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">quality（可选）</label>
                      <input className="input input-bordered input-sm" value={openAiQuality} onChange={e => setOpenAiQuality(e.target.value)} placeholder="如：standard / hd" />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">style（可选）</label>
                      <input className="input input-bordered input-sm" value={openAiStyle} onChange={e => setOpenAiStyle(e.target.value)} placeholder="如：vivid / natural" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label text-xs font-bold">response_format</label>
                      <select className="select select-bordered select-sm" value={openAiResponseFormat} onChange={e => setOpenAiResponseFormat(e.target.value)}>
                        <option value="b64_json">b64_json</option>
                        <option value="url">url</option>
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">path 覆盖（可选）</label>
                      <input className="input input-bordered input-sm" value={openAiPath} onChange={e => setOpenAiPath(e.target.value)} placeholder="如：/v1/images/generations" />
                    </div>
                  </div>
                  {mode === 'img2img' && (
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={openAiMultipart} onChange={(e)=>setOpenAiMultipart(e.target.checked)} />
                      使用 multipart（常见 OpenAI `/images/edits`）
                    </label>
                  )}
                  {mode === 'img2img' && openAiMultipart && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="form-control">
                        <label className="label text-xs font-bold">image 字段名</label>
                        <input className="input input-bordered input-sm" value={openAiImageField} onChange={e => setOpenAiImageField(e.target.value)} placeholder="默认 image" />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">mask 字段名（可选）</label>
                        <input className="input input-bordered input-sm" value={openAiMaskField} onChange={e => setOpenAiMaskField(e.target.value)} placeholder="默认 mask" />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="form-control">
                <label className="label text-xs font-bold">高级参数 JSON（可选，合并到请求 payload）</label>
                <textarea className="textarea textarea-bordered w-full h-24 font-mono text-xs" value={extraJson} onChange={e => setExtraJson(e.target.value)} placeholder='例如：{"seed":123,"user":"demo"}' />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="form-control">
                  <label className="label text-xs font-bold">生图预设（可选）</label>
                  <select
                    className="select select-bordered select-sm"
                    value={imagePresetId}
                    onChange={(e) => {
                      setImagePresetId(e.target.value);
                      setImageModelId('');
                      const v = e.target.value;
                      if (v) fetchPresetModels(parseInt(v, 10));
                    }}
                  >
                    <option value="">跟随系统绑定/顶栏</option>
                    {presets.map(p => <option key={`studio-p-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label text-xs font-bold">生图模型（可选）</label>
                  <div className="join">
                    <select className="select select-bordered select-sm join-item w-full" value={imageModelId} onChange={(e) => setImageModelId(e.target.value)}>
                      <option value="">跟随系统绑定/顶栏</option>
                      {resolvedPresetModels.map(m => <option key={`studio-m-${m}`} value={m}>{m}</option>)}
                      {resolvedPresetModels.length === 0 && manualModels.map(m => <option key={`studio-man-${m}`} value={m}>{m}</option>)}
                    </select>
                    <button
                      className={`btn btn-sm join-item btn-ghost ${resolvedImagePreset?.id && presetModelsLoading[resolvedImagePreset.id] ? 'loading' : ''}`}
                      title="刷新模型列表"
                      onClick={() => resolvedImagePreset?.id && fetchPresetModels(resolvedImagePreset.id, true)}
                      disabled={!resolvedImagePreset?.id}
                    >
                      <RefreshCw size={14}/>
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert alert-error py-2 text-xs">
                  <span className="break-words">{error}</span>
                </div>
              )}

              <button className={`btn btn-primary ${loading ? 'loading' : ''}`} onClick={run} disabled={loading}>
                {mode === 'txt2img' ? '生成图片' : '开始图生图'}
              </button>
            </div>
          </div>

          <div className="card bg-base-200 border border-base-300 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">结果</div>
              {results.length === 0 ? (
                <div className="text-xs opacity-70">暂无结果，点击左侧按钮开始生成。</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((src, i) => (
                    <button
                      key={`r-${i}`}
                      className="rounded-xl overflow-hidden border border-base-300 bg-base-100/60 hover:border-primary transition-colors text-left"
                      onClick={() => openViewer(src)}
                      title="点击放大查看"
                    >
                      <img src={src} className="w-full h-64 md:h-80 object-contain bg-base-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewerSrc && (
        <div className="modal modal-open">
          <div className="modal-box max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden">
            <div className="p-3 border-b border-base-300 bg-base-200 flex items-center justify-between">
              <div className="text-xs font-black">预览（滚轮缩放 / 拖拽移动）</div>
              <div className="flex items-center gap-2">
                <button className="btn btn-xs" onClick={() => { setViewerZoom(1); setViewerOffset({ x: 0, y: 0 }); }}>重置</button>
                <button className="btn btn-xs btn-ghost" onClick={closeViewer}>关闭</button>
              </div>
            </div>
            <div
              ref={viewerContainerRef}
              className="w-full h-full bg-base-100 flex items-center justify-center select-none touch-none"
              onWheel={onViewerWheel}
              onPointerDown={onViewerPointerDown}
              onPointerMove={onViewerPointerMove}
              onPointerUp={onViewerPointerUp}
              onPointerCancel={onViewerPointerUp}
              onPointerLeave={onViewerPointerUp}
            >
              <img
                src={viewerSrc}
                className="max-w-none max-h-none"
                style={{
                  transform: `translate(${viewerOffset.x}px, ${viewerOffset.y}px) scale(${viewerZoom})`,
                  transformOrigin: 'center',
                  cursor: viewerDragging ? 'grabbing' : 'grab',
                }}
                draggable={false}
              />
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeViewer}></div>
        </div>
      )}
    </div>
  );
}

```


## File: src\lib\db.ts

```ts
﻿// src/lib/db.ts

export type ApiMode = 'chat_completions' | 'responses';

export interface Character {
  id?: number;
  name: string;
  description: string;
  first_message: string;
  summary?: string;
  created_at?: number;
  model_id?: string;
  api_base_override?: string;
  api_key_override?: string;
  api_preset_id?: number;
}

export interface Message {
  id?: number;
  char_id?: number;
  group_id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  timestamp: number;
}

export interface Group {
  id?: number;
  name: string;
  description: string;
  memberIds?: number[];
}

export type RoomMode = 'chat' | 'agents' | 'sandbox' | 'log';

export interface Room {
  id?: number;
  name: string;
  mode?: RoomMode;
  category?: string;
  description?: string;
  rules?: string;
  state_json?: string;
  created_at?: number;
  updated_at?: number;
}

export interface RoomMember {
  char_id: number;
  role?: string;
  order_index?: number;
  is_active?: number;
}

export interface RoomMessage {
  id?: number;
  room_id: number;
  char_id?: number;
  sender_type?: 'user' | 'agent' | 'director' | 'tool';
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  meta_json?: string;
  timestamp: number;
}

export interface Dispatch {
  id?: number;
  from_room_id?: number;
  to_room_id: number;
  abstract: string;
  payload_json?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'rewrite_requested';
  created_at?: number;
  resolved_at?: number;
  resolved_by?: string;
}

export interface RoomAgentConfig {
  id?: number;
  room_id: number;
  char_id: number;
  api_preset_id?: number | null;
  model_id?: string | null;
  temperature?: number | null;
  max_output_tokens?: number | null;
  tool_policy_json?: string | null;
}

export interface RoomDirectorConfig {
  id?: number;
  room_id: number;
  api_preset_id?: number | null;
  model_id?: string | null;
  temperature?: number | null;
  max_output_tokens?: number | null;
}

export interface WorldState {
  id: number;
  state_json: string;
  updated_at?: number;
}

export interface RoomStateSnapshot {
  id: number;
  room_id: number;
  turn_id?: number | null;
  created_at: number;
}

export interface WorldStateSnapshot {
  id: number;
  created_at: number;
}

export interface ApiPreset {
  id?: number;
  name: string;
  api_base: string;
  api_key: string;
  api_mode?: ApiMode;
}

export interface Settings {
  id?: number;
  user_name?: string;
  sd_url?: string;
  image_backend?: 'sdwebui' | 'openai';
  image_preset_id?: number;
  image_model_id?: string;
  summary_preset_id?: number;
  summary_model_id?: string;
  sd_prompt_preset_id?: number;
  sd_prompt_model_id?: string;
  temperature?: number;
  model_list?: string;
  active_preset_id?: number;
  active_model_id?: string;
}

export interface LorebookEntry {
  id?: number;
  char_id: number;
  keywords: string;
  content: string;
  isActive: boolean;
}

const API = '/api';
const headers = { 'Content-Type': 'application/json' };

export const api = {
  characters: {
    list: () => fetch(`${API}/characters`).then(r => r.json() as Promise<Character[]>),
    add: (c: Character) => fetch(`${API}/characters`, { method: 'POST', headers, body: JSON.stringify(c) }).then(r => r.json() as Promise<{ id: number }>),
    duplicate: (sourceId: number, newName: string) =>
      fetch(`${API}/characters?action=duplicate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source_id: sourceId, new_name: newName })
      }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, c: Partial<Character>) => fetch(`${API}/characters`, { method: 'PUT', headers, body: JSON.stringify({ id, ...c }) }),
    delete: (id: number) => fetch(`${API}/characters?id=${id}`, { method: 'DELETE' }),
  },
  groups: {
    list: () => fetch(`${API}/groups`).then(r => r.json() as Promise<Group[]>),
    add: (g: Group) => fetch(`${API}/groups`, { method: 'POST', headers, body: JSON.stringify(g) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, g: Partial<Group>) => fetch(`${API}/groups`, { method: 'PUT', headers, body: JSON.stringify({ id, ...g }) }),
    delete: (id: number) => fetch(`${API}/groups?id=${id}`, { method: 'DELETE' }),
    getMembers: (groupId: number) => fetch(`${API}/groups?type=members&group_id=${groupId}`).then(r => r.json() as Promise<number[]>),
  },
  rooms: {
    list: () => fetch(`${API}/rooms`).then(r => r.json() as Promise<Room[]>),
    add: (room: Partial<Room>) => fetch(`${API}/rooms`, { method: 'POST', headers, body: JSON.stringify(room) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, room: Partial<Room>) => fetch(`${API}/rooms`, { method: 'PUT', headers, body: JSON.stringify({ id, ...room }) }),
    delete: (id: number) => fetch(`${API}/rooms?id=${id}`, { method: 'DELETE' }),
    getMembers: (roomId: number) => fetch(`${API}/rooms?type=members&room_id=${roomId}`).then(r => r.json() as Promise<RoomMember[]>),
    updateMembers: (roomId: number, members: RoomMember[]) =>
      fetch(`${API}/rooms?type=members`, { method: 'PUT', headers, body: JSON.stringify({ room_id: roomId, members }) }),
  },
  roomMessages: {
    list: (roomId: number) => fetch(`${API}/room_messages?room_id=${roomId}`).then(r => r.json() as Promise<RoomMessage[]>),
    add: (m: RoomMessage) => fetch(`${API}/room_messages`, { method: 'POST', headers, body: JSON.stringify(m) }).then(r => r.json() as Promise<{ id: number }>),
    clear: (roomId: number) => fetch(`${API}/room_messages?room_id=${roomId}`, { method: 'DELETE' }),
  },
  roomChat: {
    send: (body: { room_id: number; user_input: string; speaker_char_id?: number; fallback_preset_id?: number; fallback_model_id?: string; max_speakers?: number; }, signal?: AbortSignal) =>
      fetch(`${API}/room_chat`, { method: 'POST', headers, body: JSON.stringify(body), signal }).then(async r => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      }),
  },
  dispatches: {
    listPending: () => fetch(`${API}/dispatches?status=pending`).then(r => r.json() as Promise<Dispatch[]>),
    listByRoom: (roomId: number) => fetch(`${API}/dispatches?room_id=${roomId}`).then(r => r.json() as Promise<Dispatch[]>),
    add: (d: Partial<Dispatch>) => fetch(`${API}/dispatches`, { method: 'POST', headers, body: JSON.stringify(d) }).then(async r => {
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ id: number }>;
    }),
    resolve: (id: number, action: 'approve' | 'reject' | 'rewrite') =>
      fetch(`${API}/dispatches`, { method: 'PUT', headers, body: JSON.stringify({ id, action, resolved_by: 'user' }) }).then(async r => {
        if (!r.ok) throw new Error(await r.text());
        return r.text();
      }),
  },
  roomAgentConfig: {
    list: (roomId: number) => fetch(`${API}/room_agent_config?room_id=${roomId}`).then(r => r.json() as Promise<RoomAgentConfig[]>),
    upsert: (cfg: RoomAgentConfig) => fetch(`${API}/room_agent_config`, { method: 'PUT', headers, body: JSON.stringify(cfg) }).then(async r => {
      if (!r.ok) throw new Error(await r.text());
      return r.text();
    }),
  },
  roomDirectorConfig: {
    get: (roomId: number) => fetch(`${API}/room_director_config?room_id=${roomId}`).then(r => r.json() as Promise<RoomDirectorConfig | null>),
    upsert: (cfg: RoomDirectorConfig) => fetch(`${API}/room_director_config`, { method: 'PUT', headers, body: JSON.stringify(cfg) }).then(async r => {
      if (!r.ok) throw new Error(await r.text());
      return r.text();
    }),
  },
  roomSummaries: {
    list: (roomId: number) => fetch(`${API}/room_summaries?room_id=${roomId}`).then(r => r.json() as Promise<Array<{ id: number; summary: string; source: string; updated_at: number }>>),
    add: (roomId: number, summary: string, source = 'system') =>
      fetch(`${API}/room_summaries`, { method: 'POST', headers, body: JSON.stringify({ room_id: roomId, summary, source }) }).then(async r => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<{ id: number }>;
      }),
  },
  worldState: {
    get: () => fetch(`${API}/world_state`).then(r => r.json() as Promise<WorldState>),
    update: (state_json: string) => fetch(`${API}/world_state`, { method: 'PUT', headers, body: JSON.stringify({ state_json }) }).then(async r => {
      if (!r.ok) throw new Error(await r.text());
      return r.text();
    }),
  },
  roomStateSnapshots: {
    list: (roomId: number) => fetch(`${API}/room_state_snapshots?room_id=${roomId}`).then(r => r.json() as Promise<RoomStateSnapshot[]>),
    restore: (id: number) => fetch(`${API}/room_state_snapshots`, { method: 'PUT', headers, body: JSON.stringify({ id }) }).then(async r => {
      if (!r.ok) throw new Error(await r.text());
      return r.text();
    }),
  },
  worldStateSnapshots: {
    list: () => fetch(`${API}/world_state_snapshots`).then(r => r.json() as Promise<WorldStateSnapshot[]>),
    restore: (id: number) => fetch(`${API}/world_state_snapshots`, { method: 'PUT', headers, body: JSON.stringify({ id }) }).then(async r => {
      if (!r.ok) throw new Error(await r.text());
      return r.text();
    }),
  },
  presets: {
    list: () => fetch(`${API}/presets`).then(r => r.json() as Promise<ApiPreset[]>),
    add: (p: ApiPreset) => fetch(`${API}/presets`, { method: 'POST', headers, body: JSON.stringify(p) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, p: ApiPreset) => fetch(`${API}/presets`, { method: 'PUT', headers, body: JSON.stringify({ id, ...p }) }),
    delete: (id: number) => fetch(`${API}/presets?id=${id}`, { method: 'DELETE' }),
  },
  messages: {
    list: (charId?: number, groupId?: number) => {
      let url = `${API}/messages?`;
      if (groupId) url += `group_id=${groupId}`;
      else url += `char_id=${charId}`;
      return fetch(url).then(r => r.json() as Promise<Message[]>);
    },
    add: (m: Message) => fetch(`${API}/messages`, { method: 'POST', headers, body: JSON.stringify(m) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, content: string) => fetch(`${API}/messages`, { method: 'PUT', headers, body: JSON.stringify({ id, content }) }),
    delete: (id: number) => fetch(`${API}/messages?id=${id}`, { method: 'DELETE' }),
    clear: (charId?: number, groupId?: number) => {
      const p = new URLSearchParams();
      if (groupId) p.append('group_id', groupId.toString());
      else if (charId) p.append('char_id', charId.toString());
      return fetch(`${API}/messages?${p.toString()}`, { method: 'DELETE' });
    },
    clearAllImages: () => fetch(`${API}/messages?type=all_images`, { method: 'DELETE' })
  },
  settings: {
    get: () => fetch(`${API}/settings`).then(r => r.json() as Promise<Settings>),
    update: (s: Settings) => fetch(`${API}/settings`, { method: 'POST', headers, body: JSON.stringify(s) })
  },
  lorebook: {
    list: (charId: number) => fetch(`${API}/lorebook?char_id=${charId}`).then(r => r.json() as Promise<LorebookEntry[]>),
    add: (l: LorebookEntry) => fetch(`${API}/lorebook`, { method: 'POST', headers, body: JSON.stringify(l) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, l: Partial<LorebookEntry>) => fetch(`${API}/lorebook`, { method: 'PUT', headers, body: JSON.stringify({ id, ...l }) }),
    delete: (id: number) => fetch(`${API}/lorebook?id=${id}`, { method: 'DELETE' }),
  }
};

```


## File: src\lib\llm.ts

```ts
﻿import type { Character, Settings, Message, LorebookEntry, ApiMode } from './db';
import { replaceVariables } from './variables';

export class LLMClient {
  private apiBase: string;
  private apiKey: string;
  private mode: ApiMode;

  constructor(apiBase: string, apiKey: string, mode: ApiMode = 'chat_completions') {
    this.apiBase = apiBase;
    this.apiKey = apiKey;
    this.mode = mode;
  }

  async fetchModels(): Promise<string[]> {
    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'models',
          apiBase: this.apiBase,
          apiKey: this.apiKey,
        }),
      });
      if (!res.ok) return [];
      const data: any = await res.json();
      return Array.isArray(data?.models) ? data.models : [];
    } catch (e: any) {
      console.error('Fetch Models Error:', e);
      return [];
    }
  }

  private async createTextCompletion(model: string, systemPrompt: string, userPrompt: string, temperature: number): Promise<string> {
    const res = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        apiBase: this.apiBase,
        apiKey: this.apiKey,
        mode: this.mode,
        model,
        systemPrompt,
        userPrompt,
        temperature,
      }),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data: any = await res.json();
    return data?.content || userPrompt;
  }

  async generateImageTags(description: string, modelName: string): Promise<string> {
    if (!modelName) return description;
    const systemInstruction = 'You are a specialized Stable Diffusion Prompt Engineer. Convert descriptions into concise comma-separated English keywords. Output ONLY keywords.';
    try {
      return await this.createTextCompletion(modelName, systemInstruction, `Convert this to tags: ${description}`, 0.3);
    } catch {
      return description;
    }
  }

  private scanLorebook(currentInput: string, history: Message[], entries: LorebookEntry[]): string {
  if (!entries || entries.length === 0) return '';
    const contextText = (currentInput + ' ' + history.map(m => m.content).join(' ')).toLowerCase();
    const hits = entries.filter((e: LorebookEntry) => {
      if (!e.isActive || !e.keywords) return false;
      if (e.keywords.trim() === '*') return true;
      return e.keywords.split(/[,，\n]/).some((k: string) => {
        const trimmedK = k.trim().toLowerCase();
        return trimmedK.length > 0 && contextText.includes(trimmedK);
      });
    });
    if (hits.length === 0) return '';
    return `\n\n### [WORLD SETTING / CRITICAL RULES]\n${hits.map((h: LorebookEntry) => h.content).join('\n---\n')}\n`;
  }

  private extractStreamText(payload: any): string {
    if (!payload) return '';

    const delta = payload?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') return delta;

    const message = payload?.choices?.[0]?.message?.content;
    if (typeof message === 'string') return message;

    if (payload?.type === 'response.output_text.delta' && typeof payload?.delta === 'string') {
      return payload.delta;
    }

    if (payload?.delta && typeof payload.delta?.text === 'string') {
      return payload.delta.text;
    }

    return '';
  }

  private async *readSseStream(res: Response): AsyncGenerator<string> {
    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/g);
      buffer = events.pop() || '';

      for (const event of events) {
        const dataLines = event
          .split(/\r?\n/g)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());

        if (dataLines.length === 0) continue;

        const rawData = dataLines.join('\n');
        if (rawData === '[DONE]') return;

        try {
          const payload = JSON.parse(rawData);
          const text = this.extractStreamText(payload);
          if (text) yield text;
        } catch {
          // Ignore non-JSON heartbeat lines.
        }
      }
    }
  }

  async *chatStream(
    char: Character,
    history: Message[],
    userInputs: string,
    settings: Settings,
    modelName: string,
    lorebookEntries: LorebookEntry[] = [],
    groupCtx?: any,
    controller?: AbortController,
  ) {
    if (!modelName) {
      yield '\n[Error]: Model is not selected.';
      return;
    }

    const isGroupMode = !!groupCtx;
    const stopMarker = '惟';
    const playerDisplayName = settings.user_name || 'User';

    let basePrompt = char.description + (char.summary ? `\n\n[Long-term Memory Archive]:\n${char.summary}` : '');
    const lorebookInjection = this.scanLorebook(userInputs, history, lorebookEntries);

    if (isGroupMode) {
      basePrompt = `【剧场模式】身份：[${char.name}]，玩家：[${playerDisplayName}]。必须以 "${stopMarker}" 结束回复。\n${basePrompt}`;
    }

    const fullSystemContent = replaceVariables(basePrompt + lorebookInjection, settings, char);

    const chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    history.forEach((m: Message) => {
      if (isGroupMode) {
        const name = m.role === 'user' ? playerDisplayName : (char.name || 'AI');
        chatMessages.push({ role: m.role, content: `(Log: ${name}) -> ${m.content}` });
      } else {
        chatMessages.push({ role: m.role, content: m.content });
      }
    });

    if (userInputs) {
      chatMessages.push({
        role: 'user',
        content: isGroupMode
          ? `(Input: ${playerDisplayName}) -> ${replaceVariables(userInputs, settings, char)}`
          : replaceVariables(userInputs, settings, char),
      });
    }

    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller?.signal,
        body: JSON.stringify({
          action: 'chat',
          apiBase: this.apiBase,
          apiKey: this.apiKey,
          mode: this.mode,
          model: modelName,
          systemContent: fullSystemContent,
          chatMessages,
          temperature: settings.temperature || 0.8,
          stop: isGroupMode ? [stopMarker] : ['User:', '\nUser:'],
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        for await (const chunk of this.readSseStream(res)) {
          if (chunk) yield chunk.replaceAll(stopMarker, '');
        }
        return;
      }

      const data: any = await res.json();
      const content = (data?.content || '').replaceAll(stopMarker, '');
      if (content) yield content;
    } catch (e: any) {
      if (e.name !== 'AbortError') yield `\n[API Error]: ${e.message}`;
    }
  }

  async summarizeRecent(history: Message[], modelName: string): Promise<string> {
    if (!modelName) throw new Error('未配置总结模型');

    const facts = history
      .filter(m => m.content && m.content.trim() && !m.image)
      .map(m => `${m.role === 'user' ? '玩家' : '角色'}: ${m.content}`)
      .join('\n');

    if (!facts) return '';

    const prompt = `你是一个严谨的剧情记录员。请从以下【最近对话】中提取并概括出“新发生的关键剧情进展”。
要求：
1. 重点提取。
2. 使用简短的条目格式。
3. 只输出新发生的进展，不要输出任何已有的历史背景。

【最近对话】：
${facts}

新进展总结：`;

    return await this.createTextCompletion(modelName, '你是精简且客观的剧情总结助手。', prompt, 0.3);
  }
}

```


## File: src\lib\variables.ts

```ts
import type { Character, Settings } from './db';

export function replaceVariables(text: string, settings: Settings, char?: Character): string {
  if (!text) return "";

  const userName = settings.user_name || "User";

  const variables: Record<string, string> = {
    'user': userName,
    'char': char?.name || 'Assistant',
    'char_name': char?.name || 'Assistant',
    'date': new Date().toLocaleDateString(),
    'time': new Date().toLocaleTimeString(),
    'weekday': new Date().toLocaleDateString('zh-CN', { weekday: 'long' }),
  };

  return text.replace(/\{\{([\w_]+)\}\}/g, (match, key) => {
    const k = key.toLowerCase();
    return variables[k] !== undefined ? variables[k] : match;
  });
}
```
