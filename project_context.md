# Project Structure

simplerp-web/
├── .gitignore
├── README.md
├── eslint.config.js
├── functions
│   ├── _middleware.ts
│   └── api
│       ├── auto-snapshot-rules.ts
│       ├── branches.ts
│       ├── characters.ts
│       ├── images.ts
│       ├── llm.ts
│       ├── lorebook-v2.ts
│       ├── lorebook.ts
│       ├── messages.ts
│       ├── presets.ts
│       ├── room_chat.ts
│       ├── room_messages.ts
│       ├── rooms.ts
│       ├── settings.ts
│       ├── snapshots-branch.ts
│       ├── snapshots-restore.ts
│       ├── snapshots.ts
│       ├── variables-stages.ts
│       ├── variables-thought-config.ts
│       ├── variables-thought.ts
│       └── variables.ts
├── index.html
├── package.json
├── postcss.config.js
├── public
├── schema.sql
├── src
│   ├── App.tsx
│   ├── assets
│   ├── components
│   │   ├── ImageStudio.tsx
│   │   ├── lorebook
│   │   │   └── LorebookManager.tsx
│   │   ├── snapshots
│   │   │   └── SnapshotManager.tsx
│   │   └── variables
│   │       └── VariableManager.tsx
│   ├── index.css
│   ├── lib
│   │   ├── db.ts
│   │   ├── llm.ts
│   │   ├── lorebook-engine.ts
│   │   ├── variable-engine.ts
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
.kiro
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
*.tsbuildinfo
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
    <!-- 移动端防放大与刘海屏/安全区适配 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover" />
    <title>SimpleRP Cloud</title>
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
# SimpleRP Cloud

一个轻量、纯粹、基于 Cloudflare 生态的全栈 AI 角色扮演与多智能体沙箱平台。

## ✨ 核心亮点

- 💬 **双对话模式**：支持沉浸式的「单人角色扮演」与支持多 AI 互动的「剧场群聊」模式。
- 🧠 **动态记忆**：内置世界书（Lorebook）系统与对话长线记忆自动总结功能。
- 🎨 **极速生图**：集成独立生图工作台，支持 OpenAI 兼容接口及 ComfyUI 本地内网穿透（Hugging Face 隧道）。
- ⚡ **Serverless 架构**：纯 Cloudflare 原生应用（Pages + Functions + D1 数据库），前端 React + Vite，轻松实现零成本高可用部署。

## 🛠️ 技术栈

- **前端**: React 19, TypeScript, Vite, Tailwind CSS, DaisyUI
- **后端 & 边缘计算**: Cloudflare Pages Functions
- **数据库**: Cloudflare D1 (SQLite)

## 🚀 快速开始

确保你已安装 Node.js 18+ 与 npm。

### 1. 克隆与安装

```bash
git clone [https://github.com/hdbqx/simplerp-web.git](https://github.com/hdbqx/simplerp-web.git)
cd simplerp-web
npm install

```
### 2. 初始化本地数据库
项目依赖 Cloudflare D1，本地开发前需要先将表结构写入本地 SQLite 模拟环境：
```bash
npx wrangler d1 execute simplerp-db --file=./schema.sql

```
### 3. 启动开发服务器
```bash
npm run dev

```
打开浏览器访问终端提示的本地地址（通常为 http://localhost:5173）即可使用。
## ☁️ 部署指南
本项目可一键部署至 **Cloudflare Pages**：
 1. 在 Cloudflare 面板创建一个新的 D1 数据库，并将其 ID 填入 wrangler.toml 中的 database_id。
 2. 运行 npx wrangler d1 execute simplerp-db --file=./schema.sql --remote 初始化线上数据库。
 3. 连接你的 GitHub 仓库到 Cloudflare Pages，构建命令填 npm run build，输出目录填 dist，并绑定 D1 数据库。
**安全提醒**：部署后，请务必在 Cloudflare Pages 的「Settings -> Environment variables」中配置 AUTH_USER 和 AUTH_PASS，以启用网页的基础密码访问保护。


```


## File: schema.sql

```sql
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

[[r2_buckets]]
bucket_name = "simplerp-images"
binding = "IMAGES_BUCKET"
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


## File: functions\api\auto-snapshot-rules.ts

```ts
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');

    let query = 'SELECT * FROM auto_snapshot_rules WHERE 1=1';
    const params: any[] = [];
    if (charId) { query += ' AND char_id = ?'; params.push(Number(charId)); }
    if (roomId) { query += ' AND room_id = ?'; params.push(Number(roomId)); }

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results?.map(r => ({ ...r, is_active: r.is_active === 1 })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare(
      'INSERT INTO auto_snapshot_rules (char_id, room_id, name, rule_type, interval_minutes, turn_count, variable_key, keep_count, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.name,
      body.rule_type,
      body.interval_minutes || null,
      body.turn_count || null,
      body.variable_key || null,
      body.keep_count || 10,
      body.is_active !== false ? 1 : 0,
      Date.now()
    ).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { id, ...updates } = body;

    if (!id) return new Response('Missing id', { status: 400 });

    const setFields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) { setFields.push('name = ?'); params.push(updates.name); }
    if (updates.rule_type !== undefined) { setFields.push('rule_type = ?'); params.push(updates.rule_type); }
    if (updates.interval_minutes !== undefined) { setFields.push('interval_minutes = ?'); params.push(updates.interval_minutes); }
    if (updates.turn_count !== undefined) { setFields.push('turn_count = ?'); params.push(updates.turn_count); }
    if (updates.variable_key !== undefined) { setFields.push('variable_key = ?'); params.push(updates.variable_key); }
    if (updates.keep_count !== undefined) { setFields.push('keep_count = ?'); params.push(updates.keep_count); }
    if (updates.is_active !== undefined) { setFields.push('is_active = ?'); params.push(updates.is_active ? 1 : 0); }

    params.push(id);

    await context.env.DB.prepare(`UPDATE auto_snapshot_rules SET ${setFields.join(', ')} WHERE id = ?`).bind(...params).run();
    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    await context.env.DB.prepare('DELETE FROM auto_snapshot_rules WHERE id = ?').bind(Number(id)).run();
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

```


## File: functions\api\branches.ts

```ts
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');

    const mockBranches = [
      { id: 'main', name: '主线', snapshot_id: null, created_at: Date.now() - 86400000 }
    ];
    return Response.json(mockBranches);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    return new Response('Switched');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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


## File: functions\api\images.ts

```ts
type ImageBackend = 'huggingface' | 'openai';
type ImageAction = 'txt2img' | 'img2img';

interface ImageProxyBody {
  backend: ImageBackend;
  action?: ImageAction;
  model: string;
  apiKey?: string;
  apiBase?: string;
  payload?: Record<string, unknown>;
  char_id?: number;
  room_id?: number;
  prompt?: string;
}

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
}

const PROMPT_NODE_ID = "70";
const SAMPLER_NODE_ID = "69";

const getComfyUIWorkflow = (promptText: string) => {
  const workflow: any = {
    "9": {
      "inputs": { "filename_prefix": "z-image-turbo", "images": ["65", 0] },
      "class_type": "SaveImage"
    },
    "62": {
      "inputs": { "clip_name": "qwen_3_4b.safetensors", "type": "lumina2", "device": "default" },
      "class_type": "CLIPLoader"
    },
    "63": {
      "inputs": { "vae_name": "ae.safetensors" },
      "class_type": "VAELoader"
    },
    "64": {
      "inputs": { "conditioning": ["70", 0] },
      "class_type": "ConditioningZeroOut"
    },
    "65": {
      "inputs": { "samples": ["69", 0], "vae": ["63", 0] },
      "class_type": "VAEDecode"
    },
    "66": {
      "inputs": { "unet_name": "z_image_turbo_bf16.safetensors", "weight_dtype": "default" },
      "class_type": "UNETLoader"
    },
    "67": {
      "inputs": { "width": 1024, "height": 1024, "batch_size": 1 },
      "class_type": "EmptySD3LatentImage"
    },
    "68": {
      "inputs": { "shift": 3, "model": ["66", 0] },
      "class_type": "ModelSamplingAuraFlow"
    },
    "69": {
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000000000),
        "steps": 8,
        "cfg": 1,
        "sampler_name": "res_multistep",
        "scheduler": "simple",
        "denoise": 1,
        "model": ["68", 0],
        "positive": ["70", 0],
        "negative": ["64", 0],
        "latent_image": ["67", 0]
      },
      "class_type": "KSampler"
    },
    "70": {
      "inputs": { "text": promptText, "clip": ["62", 0] },
      "class_type": "CLIPTextEncode"
    }
  };

  return workflow;
};

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function generateImageKey(charId?: number, roomId?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const prefix = roomId ? `rooms/${roomId}` : (charId ? `chars/${charId}` : 'misc');
  return `${prefix}/${timestamp}-${random}.png`;
}

async function uploadToR2(bucket: R2Bucket, imageBuffer: ArrayBuffer, key: string): Promise<string> {
  await bucket.put(key, imageBuffer, {
    httpMetadata: {
      contentType: 'image/png',
    },
  });
  return key;
}

async function saveImageRecord(db: D1Database, r2Key: string, charId?: number, roomId?: number, prompt?: string): Promise<number> {
  const { meta } = await db.prepare(
    "INSERT INTO images (r2_key, char_id, room_id, prompt, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(r2Key, charId || null, roomId || null, prompt || null, Date.now()).run();
  return meta.last_row_id;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const key = url.searchParams.get('key');
  const charId = url.searchParams.get('char_id');
  const roomId = url.searchParams.get('room_id');
  
  if (key) {
    try {
      const object = await context.env.IMAGES_BUCKET.get(key);
      if (!object) {
        return new Response('Image not found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000');
      headers.set('ETag', object.httpEtag);

      return new Response(object.body, { headers });
    } catch (e: any) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  }
  
  if (charId || roomId) {
    const query = roomId 
      ? "SELECT * FROM images WHERE room_id = ? ORDER BY created_at DESC"
      : "SELECT * FROM images WHERE char_id = ? ORDER BY created_at DESC";
    const bindId = roomId || charId;
    
    const { results } = await context.env.DB.prepare(query).bind(bindId).all();
    return Response.json(results);
  }
  
  const { results } = await context.env.DB.prepare("SELECT * FROM images ORDER BY created_at DESC LIMIT 100").all();
  return Response.json(results);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const key = url.searchParams.get('key');
  const imageId = url.searchParams.get('id');
  const charId = url.searchParams.get('char_id');
  const roomId = url.searchParams.get('room_id');
  
  try {
    if (imageId) {
      const { results } = await context.env.DB.prepare("SELECT r2_key FROM images WHERE id = ?").bind(imageId).all();
      if (results.length > 0) {
        const r2Key = (results[0] as any).r2_key;
        await context.env.IMAGES_BUCKET.delete(r2Key);
        await context.env.DB.prepare("DELETE FROM images WHERE id = ?").bind(imageId).run();
      }
      return new Response('Deleted');
    }
    
    if (key) {
      await context.env.IMAGES_BUCKET.delete(key);
      await context.env.DB.prepare("DELETE FROM images WHERE r2_key = ?").bind(key).run();
      return new Response('Deleted');
    }
    
    if (charId) {
      const { results } = await context.env.DB.prepare("SELECT r2_key FROM images WHERE char_id = ?").bind(charId).all();
      for (const row of results as any[]) {
        await context.env.IMAGES_BUCKET.delete(row.r2_key);
      }
      await context.env.DB.prepare("DELETE FROM images WHERE char_id = ?").bind(charId).run();
      return new Response('Deleted all images for character');
    }
    
    if (roomId) {
      const { results } = await context.env.DB.prepare("SELECT r2_key FROM images WHERE room_id = ?").bind(roomId).all();
      for (const row of results as any[]) {
        await context.env.IMAGES_BUCKET.delete(row.r2_key);
      }
      await context.env.DB.prepare("DELETE FROM images WHERE room_id = ?").bind(roomId).run();
      return new Response('Deleted all images for room');
    }
    
    return new Response('Missing parameters', { status: 400 });
  } catch (e: any) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as ImageProxyBody;
    const backend: ImageBackend = body.backend || 'openai';
    
    const rawPrompt = body.payload?.prompt || body.prompt || '';
    const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
    if (!prompt) return new Response('Missing prompt', { status: 400 });

    const charId = body.char_id;
    const roomId = body.room_id;

    if (backend === 'huggingface') {
      const comfyUrl = normalizeBase(body.apiKey || '');
      if (!comfyUrl || !comfyUrl.startsWith('http')) {
        return new Response('请在系统设置的 HF Access Token 框填入完整的 ComfyUI 穿透 URL', { status: 400 });
      }

      const workflow = getComfyUIWorkflow(prompt);

      try {
        const promptRes = await fetch(`${comfyUrl}/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: workflow })
        });

        if (!promptRes.ok) throw new Error(`ComfyUI 拒绝请求: ${promptRes.status}`);

        const { prompt_id } = await promptRes.json() as any;
        if (!prompt_id) throw new Error("未获取到任务 ID");

        let historyData: any = null;
        for (let i = 0; i < 125; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const histRes = await fetch(`${comfyUrl}/history/${prompt_id}`);
          if (histRes.ok) {
            const histJson: any = await histRes.json();
            if (histJson[prompt_id]) {
              historyData = histJson[prompt_id];
              break;
            }
          }
        }

        if (!historyData) throw new Error("生成超时（显卡可能正在忙）");

        const outputs = historyData.outputs["9"];
        if (!outputs || !outputs.images || outputs.images.length === 0) {
          throw new Error("工作流跑完了，但节点 9 没有保存图像");
        }

        const { filename, subfolder, type } = outputs.images[0];

        const viewUrl = `${comfyUrl}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
        const imgRes = await fetch(viewUrl);
        if (!imgRes.ok) throw new Error("无法从 ComfyUI 下载生成的图片");

        const imgBuf = await imgRes.arrayBuffer();
        
        const imageKey = generateImageKey(charId, roomId);
        await uploadToR2(context.env.IMAGES_BUCKET, imgBuf, imageKey);
        const imageId = await saveImageRecord(context.env.DB, imageKey, charId, roomId, prompt);
        
        const imageUrl = `/api/images?key=${encodeURIComponent(imageKey)}`;
        
        return Response.json({ 
          images: [], 
          urls: [imageUrl],
          keys: [imageKey],
          image_ids: [imageId]
        });

      } catch (err: any) {
         return new Response(JSON.stringify({ error: `ComfyUI 生成失败: ${err.message}` }), { status: 500 });
      }
    }

    if (!body.apiBase) return new Response('Missing apiBase', { status: 400 });
    const res = await fetch(`${normalizeBase(body.apiBase)}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${body.apiKey}` },
      body: JSON.stringify({ ...body.payload, model: body.model, prompt, response_format: 'b64_json' })
    });
    
    if (!res.ok) return new Response(await res.text(), { status: res.status });
    const data: any = await res.json();
    
    const urls: string[] = [];
    const keys: string[] = [];
    const imageIds: number[] = [];
    
    for (const item of data.data) {
      if (item.b64_json) {
        const binaryString = atob(item.b64_json);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const imgBuf = bytes.buffer;
        
        const imageKey = generateImageKey(charId, roomId);
        await uploadToR2(context.env.IMAGES_BUCKET, imgBuf, imageKey);
        const imageId = await saveImageRecord(context.env.DB, imageKey, charId, roomId, prompt);
        
        const imageUrl = `/api/images?key=${encodeURIComponent(imageKey)}`;
        urls.push(imageUrl);
        keys.push(imageKey);
        imageIds.push(imageId);
      }
    }
    
    return Response.json({ 
      images: [], 
      urls,
      keys,
      image_ids: imageIds
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
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


## File: functions\api\lorebook-v2.ts

```ts
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');

    let query = 'SELECT * FROM lorebook_v2 WHERE 1=1';
    const params: any[] = [];
    if (charId) { query += ' AND char_id = ?'; params.push(Number(charId)); }
    if (roomId) { query += ' AND room_id = ?'; params.push(Number(roomId)); }
    query += ' ORDER BY priority DESC, created_at DESC';

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results?.map(r => ({ ...r, is_active: r.is_active === 1, use_once: r.use_once === 1 })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');
    const charId = url.searchParams.get('char_id');

    if (action === 'migrate' && charId) {
      const { results } = await context.env.DB.prepare('SELECT * FROM lorebook WHERE char_id = ?').bind(Number(charId)).all();
      for (const entry of results || []) {
        await context.env.DB.prepare(
          'INSERT INTO lorebook_v2 (char_id, name, keywords, content, priority, position, probability, use_once, cooldown_messages, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          Number(charId),
          entry.keywords?.substring(0, 50) || '未命名条目',
          entry.keywords,
          entry.content,
          0,
          'before_system',
          1.0,
          0,
          0,
          entry.is_active,
          Date.now(),
          Date.now()
        ).run();
      }
      return new Response('Migrated');
    }

    const body: any = await context.request.json();
    const now = Date.now();
    const { meta } = await context.env.DB.prepare(
      'INSERT INTO lorebook_v2 (char_id, room_id, name, keywords, regex_pattern, content, trigger_condition, priority, category, position, insertion_depth, parent_id, probability, use_once, cooldown_messages, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.name,
      body.keywords || null,
      body.regex_pattern || null,
      body.content,
      body.trigger_condition || null,
      body.priority || 0,
      body.category || null,
      body.position || 'before_system',
      body.insertion_depth || null,
      body.parent_id || null,
      body.probability ?? 1.0,
      body.use_once ? 1 : 0,
      body.cooldown_messages || 0,
      body.is_active !== false ? 1 : 0,
      now,
      now
    ).run();

    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { id, ...updates } = body;

    if (!id) return new Response('Missing id', { status: 400 });

    const setFields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) { setFields.push('name = ?'); params.push(updates.name); }
    if (updates.keywords !== undefined) { setFields.push('keywords = ?'); params.push(updates.keywords); }
    if (updates.regex_pattern !== undefined) { setFields.push('regex_pattern = ?'); params.push(updates.regex_pattern); }
    if (updates.content !== undefined) { setFields.push('content = ?'); params.push(updates.content); }
    if (updates.trigger_condition !== undefined) { setFields.push('trigger_condition = ?'); params.push(updates.trigger_condition); }
    if (updates.priority !== undefined) { setFields.push('priority = ?'); params.push(updates.priority); }
    if (updates.category !== undefined) { setFields.push('category = ?'); params.push(updates.category); }
    if (updates.position !== undefined) { setFields.push('position = ?'); params.push(updates.position); }
    if (updates.insertion_depth !== undefined) { setFields.push('insertion_depth = ?'); params.push(updates.insertion_depth); }
    if (updates.parent_id !== undefined) { setFields.push('parent_id = ?'); params.push(updates.parent_id); }
    if (updates.probability !== undefined) { setFields.push('probability = ?'); params.push(updates.probability); }
    if (updates.use_once !== undefined) { setFields.push('use_once = ?'); params.push(updates.use_once ? 1 : 0); }
    if (updates.cooldown_messages !== undefined) { setFields.push('cooldown_messages = ?'); params.push(updates.cooldown_messages); }
    if (updates.last_triggered_at !== undefined) { setFields.push('last_triggered_at = ?'); params.push(updates.last_triggered_at); }
    if (updates.is_active !== undefined) { setFields.push('is_active = ?'); params.push(updates.is_active ? 1 : 0); }

    setFields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    await context.env.DB.prepare(`UPDATE lorebook_v2 SET ${setFields.join(', ')} WHERE id = ?`).bind(...params).run();
    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    await context.env.DB.prepare('DELETE FROM lorebook_v2 WHERE id = ?').bind(Number(id)).run();
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
interface Env { 
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const charId = url.searchParams.get('char_id');
  const groupId = url.searchParams.get('group_id');

  if (groupId && groupId !== 'undefined' && groupId !== 'null') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC"
    ).bind(groupId).all();
    return Response.json(results);
  } 
  
  if (charId && charId !== 'undefined' && charId !== 'null') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE char_id = ? AND group_id IS NULL ORDER BY timestamp ASC"
    ).bind(charId).all();
    return Response.json(results);
  }

  return Response.json([]);
};

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

    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

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

async function extractAndDeleteImage(db: D1Database, bucket: R2Bucket, messageId: string) {
  const { results } = await db.prepare("SELECT image FROM messages WHERE id = ?").bind(messageId).all();
  if (results.length > 0) {
    const imageUrl = (results[0] as any).image;
    if (imageUrl && imageUrl.includes('/api/images?key=')) {
      const match = imageUrl.match(/key=([^&]+)/);
      if (match) {
        const r2Key = decodeURIComponent(match[1]);
        try {
          await bucket.delete(r2Key);
          await db.prepare("DELETE FROM images WHERE r2_key = ?").bind(r2Key).run();
        } catch (e) {
          console.error("Failed to delete image from R2:", e);
        }
      }
    }
  }
}

async function deleteImagesForChar(db: D1Database, bucket: R2Bucket, charId: string) {
  const { results } = await db.prepare("SELECT image FROM messages WHERE char_id = ? AND group_id IS NULL").bind(charId).all();
  for (const row of results as any[]) {
    if (row.image && row.image.includes('/api/images?key=')) {
      const match = row.image.match(/key=([^&]+)/);
      if (match) {
        const r2Key = decodeURIComponent(match[1]);
        try {
          await bucket.delete(r2Key);
          await db.prepare("DELETE FROM images WHERE r2_key = ?").bind(r2Key).run();
        } catch (e) {
          console.error("Failed to delete image from R2:", e);
        }
      }
    }
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const charId = url.searchParams.get('char_id');
    const groupId = url.searchParams.get('group_id');
    const type = url.searchParams.get('type');

    if (type === 'all_images') {
      const { results } = await context.env.DB.prepare("SELECT image FROM messages WHERE image IS NOT NULL AND image != ''").all();
      for (const row of results as any[]) {
        if (row.image && row.image.includes('/api/images?key=')) {
          const match = row.image.match(/key=([^&]+)/);
          if (match) {
            const r2Key = decodeURIComponent(match[1]);
            try {
              await context.env.IMAGES_BUCKET.delete(r2Key);
              await context.env.DB.prepare("DELETE FROM images WHERE r2_key = ?").bind(r2Key).run();
            } catch (e) {}
          }
        }
      }
      await context.env.DB.prepare(
        "DELETE FROM messages WHERE image IS NOT NULL AND image != ''"
      ).run();
      return new Response("All Images Cleared");
    }

    if (id && id !== 'undefined' && id !== 'null') {
      await extractAndDeleteImage(context.env.DB, context.env.IMAGES_BUCKET, id);
      await context.env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
      return new Response("Single Message Deleted");
    }

    if (groupId && groupId !== 'undefined' && groupId !== 'null') {
      const { results } = await context.env.DB.prepare("SELECT image FROM messages WHERE group_id = ?").bind(groupId).all();
      for (const row of results as any[]) {
        if (row.image && row.image.includes('/api/images?key=')) {
          const match = row.image.match(/key=([^&]+)/);
          if (match) {
            const r2Key = decodeURIComponent(match[1]);
            try {
              await context.env.IMAGES_BUCKET.delete(r2Key);
              await context.env.DB.prepare("DELETE FROM images WHERE r2_key = ?").bind(r2Key).run();
            } catch (e) {}
          }
        }
      }
      await context.env.DB.prepare("DELETE FROM messages WHERE group_id = ?").bind(groupId).run();
      return new Response("Group Messages Cleared");
    }

    if (charId && charId !== 'undefined' && charId !== 'null') {
      await deleteImagesForChar(context.env.DB, context.env.IMAGES_BUCKET, charId);
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const roomId = url.searchParams.get('room_id');
  
  // 获取房间成员
  if (type === 'members' && roomId) {
    const { results } = await context.env.DB.prepare(
      "SELECT char_id FROM room_members WHERE room_id = ?"
    ).bind(roomId).all();
    return Response.json(results);
  }

  // 获取房间列表
  const { results } = await context.env.DB.prepare("SELECT * FROM rooms ORDER BY id DESC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json().catch(() => ({}));

  const name = String(body?.name || 'New Room');
  const description = String(body?.description || '');
  const summary = String(body?.summary || '');
  const now = Date.now();
  
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO rooms (name, description, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(name, description, summary, now, now).run();
  
  return Response.json({ id: meta.last_row_id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const body: any = await context.request.json();
  const now = Date.now();

  // 更新房间成员
  if (type === 'members') {
    const roomId = toInt(body?.room_id);
    const members = Array.isArray(body?.members) ? body.members : [];
    if (!roomId) return new Response('Missing room_id', { status: 400 });

    // 先清空，再插入
    await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(roomId).run();

    for (const m of members) {
      const charId = toInt(m?.char_id);
      if (!charId) continue;
      await context.env.DB.prepare(
        "INSERT INTO room_members (room_id, char_id) VALUES (?, ?)"
      ).bind(roomId, charId).run();
    }
    return new Response('Updated');
  }

  // 更新房间基础信息（包含记忆 summary）
  const id = toInt(body?.id);
  if (!id) return new Response('Missing id', { status: 400 });

  const name = body?.name !== undefined ? String(body.name) : undefined;
  const description = body?.description !== undefined ? String(body.description) : undefined;
  const summary = body?.summary !== undefined ? String(body.summary) : undefined;

  await context.env.DB.prepare(
    "UPDATE rooms SET name = COALESCE(?, name), description = COALESCE(?, description), summary = COALESCE(?, summary), updated_at = ? WHERE id = ?"
  ).bind(name ?? null, description ?? null, summary ?? null, now, id).run();

  return new Response('Updated');
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  // 极简模式下，只需级联删除成员和消息记录，不牵扯废弃表
  await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_messages WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM rooms WHERE id = ?").bind(id).run();

  return new Response('Deleted');
};
```


## File: functions\api\room_chat.ts

```ts
interface Env { DB: D1Database; }

interface RoomChatBody {
  room_id: number;
  user_input?: string; // 玩家发言（可选）
  speaker_char_id: number; // 指定谁来回答
  fallback_preset_id?: number;
  fallback_model_id?: string;
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

async function callProvider(base: string, key: string, path: string, payload?: unknown, method = 'POST') {
  const url = `${normalizeBase(base)}${path}`;
  const trimmedKey = (key || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

  const res = await fetch(url, { method, headers, body: payload ? JSON.stringify(payload) : undefined });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Provider request failed (${res.status}): ${text || res.statusText}`);
  }
  return res;
}

async function insertRoomMessage(db: D1Database, roomId: number, senderType: string, role: string, content: string, charId?: number | null) {
  const ts = Date.now();
  const { meta } = await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(roomId, charId || null, senderType, role, content || '', ts).run();
  return { id: meta.last_row_id as number, timestamp: ts };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as RoomChatBody;
    const roomId = Number(body.room_id);
    const speakerCharId = Number(body.speaker_char_id);
    const userInput = String(body.user_input || '').trim();

    if (!roomId) return new Response('Missing room_id', { status: 400 });
    if (!speakerCharId) return new Response('Missing speaker_char_id', { status: 400 });

    // 1. 获取房间和角色信息
    const room: any = await context.env.DB.prepare("SELECT * FROM rooms WHERE id = ? LIMIT 1").bind(roomId).first();
    if (!room) return new Response('Room not found', { status: 404 });

    const char: any = await context.env.DB.prepare("SELECT * FROM characters WHERE id = ? LIMIT 1").bind(speakerCharId).first();
    if (!char) return new Response('Character not found', { status: 404 });

    // 2. 如果玩家有输入，先存入数据库
    if (userInput) {
      await insertRoomMessage(context.env.DB, roomId, 'user', 'user', userInput);
    }

    // 3. 获取 API 配置 (直接使用全局 fallback)
    if (!body.fallback_preset_id || !body.fallback_model_id) {
      throw new Error('请在页面顶部选择 API 预设和模型');
    }
    const preset: any = await context.env.DB.prepare("SELECT * FROM api_presets WHERE id = ? LIMIT 1").bind(body.fallback_preset_id).first();
    const apiMode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';

    // 4. 获取历史记录并构建上下文
    const { results: historyRows } = await context.env.DB.prepare(
      "SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 30"
    ).bind(roomId).all();
    const history = (historyRows || []).slice().reverse();

    // 缓存角色名字用于构建 Log
    const nameCache = new Map<number, string>();
    nameCache.set(speakerCharId, String(char.name));

    const chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    for (const m of history) {
      const senderType = String((m as any).sender_type || '');
      const role = String((m as any).role || '');
      const content = String((m as any).content || '');
      const mCharId = (m as any).char_id ? Number((m as any).char_id) : null;
      
      if (!content) continue;
      if (senderType === 'user' || role === 'user') {
        chatMessages.push({ role: 'user', content: `(Log: 朕) -> ${content}` }); // 强制玩家名为 朕
        continue;
      }
      
      let name = 'AI';
      if (mCharId) {
        if (!nameCache.has(mCharId)) {
          const c: any = await context.env.DB.prepare("SELECT name FROM characters WHERE id = ? LIMIT 1").bind(mCharId).first();
          if (c?.name) nameCache.set(mCharId, String(c.name));
        }
        name = nameCache.get(mCharId) || `#${mCharId}`;
      }
      chatMessages.push({ role: 'user', content: `(Log: ${name}) -> ${content}` });
    }

    // 5. 构建三段式防串戏 System Prompt
    const systemParts = [
      `【当前场景】\n${room.description || '无'}`,
      `【全局记忆】\n${room.summary || '无'}`,
      `【你的身份】\n姓名：${char.name}\n设定：${char.description}\n${char.summary ? `你的个人记忆：${char.summary}` : ''}`,
      `【规则】`,
      `1. 你现在扮演且仅扮演「${char.name}」。`,
      `2. 聊天记录中的格式为 (Log: 角色名) -> 内容。你绝不能扮演别人，只能以「${char.name}」的口吻和视角回应。`,
      `3. 玩家的身份是皇帝（朕），你需要符合你的臣子/妃子身份。`
    ];
    const systemContent = systemParts.join('\n\n');

    // 6. 调用 LLM
    let assistantContent = '';
    if (apiMode === 'responses') {
      const res = await callProvider(String(preset.api_base), String(preset.api_key), '/responses', {
        model: body.fallback_model_id,
        input: [{ role: 'system', content: systemContent }, ...chatMessages],
        temperature: 0.8
      });
      const data: any = await res.json();
      assistantContent = data?.output_text || data?.output?.[0]?.content?.[0]?.text || '';
    } else {
      const res = await callProvider(String(preset.api_base), String(preset.api_key), '/chat/completions', {
        model: body.fallback_model_id,
        messages: [{ role: 'system', content: systemContent }, ...chatMessages],
        temperature: 0.8
      });
      const data: any = await res.json();
      assistantContent = data?.choices?.[0]?.message?.content || '';
    }

    // 7. 保存 AI 回复
    const lastInserted = await insertRoomMessage(context.env.DB, roomId, 'agent', 'assistant', assistantContent, speakerCharId);

    return Response.json({
      room_id: roomId,
      content: assistantContent,
      last_message_id: lastInserted?.id,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'room_chat error' }), { status: 500 });
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


## File: functions\api\snapshots-branch.ts

```ts
interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { snapshot_id, name } = body;
    const branchId = `branch_${snapshot_id}_${Date.now()}`;

    return Response.json({ branch_id: branchId });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

```


## File: functions\api\snapshots-restore.ts

```ts
import { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const id = body.id;
    if (!id) return new Response('Missing snapshot id', { status: 400 });

    // 1. 获取快照元数据
    const snapshot: any = await context.env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(Number(id)).first();
    if (!snapshot) return new Response('Snapshot not found', { status: 404 });

    // 单人角色存档回滚
    if (snapshot.char_id) {
      // (1) 清空当前角色主聊天记录 (不影响群聊记录)
      await context.env.DB.prepare('DELETE FROM messages WHERE char_id = ? AND group_id IS NULL').bind(snapshot.char_id).run();
      
      // (2) 恢复聊天记录
      const { results: msgs } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
      for (const m of msgs || []) {
        const msg: any = m;
        await context.env.DB.prepare(
          'INSERT INTO messages (char_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          snapshot.char_id, 
          msg.role || 'user', 
          msg.content || '', 
          msg.image || null, // 强制防 undefined 崩溃
          msg.timestamp || Date.now()
        ).run();
      }

      // (3) 恢复变量状态
      const { results: vars } = await context.env.DB.prepare('SELECT * FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).all();
      for (const v of vars || []) {
        const sv: any = v;
        if (sv.variable_id) {
            // 直接更新回原变量 ID
            await context.env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
                .bind(sv.value ?? null, Date.now(), sv.variable_id).run();
        }
      }
    } 
    // 群聊房间存档回滚
    else if (snapshot.room_id) {
      // (1) 清空当前群聊主聊天记录
      await context.env.DB.prepare('DELETE FROM room_messages WHERE room_id = ?').bind(snapshot.room_id).run();
      
      // (2) 恢复群聊记录
      const { results: msgs } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
      for (const m of msgs || []) {
        const msg: any = m;
        await context.env.DB.prepare(
          'INSERT INTO room_messages (room_id, char_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          snapshot.room_id, 
          msg.char_id || null, 
          msg.role || 'user', 
          msg.content || '', 
          msg.image || null, // 强制防 undefined 崩溃
          msg.timestamp || Date.now()
        ).run();
      }
    }

    return Response.json({ success: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
```


## File: functions\api\snapshots.ts

```ts
import { D1Database } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');
    const id = url.searchParams.get('id');

    if (id) {
      const snapshot = await context.env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(Number(id)).first();
      const { results: messages } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
      const { results: variables } = await context.env.DB.prepare('SELECT * FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).all();
      return Response.json({ snapshot, messages, variables });
    }

    let query = 'SELECT * FROM snapshots WHERE 1=1';
    const params: any[] = [];
    if (charId && charId !== 'undefined' && charId !== 'null') { query += ' AND char_id = ?'; params.push(Number(charId)); }
    if (roomId && roomId !== 'undefined' && roomId !== 'null') { query += ' AND room_id = ?'; params.push(Number(roomId)); }
    query += ' ORDER BY snapshot_order ASC';

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const now = Date.now();

    const maxOrderRes = await context.env.DB.prepare('SELECT COALESCE(MAX(snapshot_order), 0) as max_order FROM snapshots WHERE char_id = ? OR room_id = ?')
      .bind(body.char_id || null, body.room_id || null).first();
    const snapshotOrder = ((maxOrderRes?.max_order as number) || 0) + 1;

    const { meta } = await context.env.DB.prepare(
      `INSERT INTO snapshots (char_id, room_id, name, description, snapshot_order, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(body.char_id || null, body.room_id || null, body.name, body.description || null, snapshotOrder, now).run();
    
    const snapshotId = meta.last_row_id as number;

    if (body.char_id) {
      const { results: msgs } = await context.env.DB.prepare('SELECT * FROM messages WHERE char_id = ? AND group_id IS NULL ORDER BY timestamp ASC').bind(body.char_id).all();
      for (let i = 0; i < (msgs?.length || 0); i++) {
        const m: any = msgs[i];
        await context.env.DB.prepare(
          `INSERT INTO snapshot_messages (snapshot_id, char_id, role, content, image, timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(snapshotId, body.char_id, m.role || 'user', m.content || '', m.image || null, m.timestamp || now, i).run();
      }
      
      const { results: vars } = await context.env.DB.prepare('SELECT * FROM variables WHERE char_id = ?').bind(body.char_id).all();
      for (const v of vars || []) {
        await context.env.DB.prepare(
          `INSERT INTO snapshot_variables (snapshot_id, variable_id, key, value, type) VALUES (?, ?, ?, ?, ?)`
        ).bind(snapshotId, (v as any).id || null, (v as any).key || '', (v as any).value ?? null, (v as any).type || 'string').run();
      }
    } else if (body.room_id) {
      const { results: msgs } = await context.env.DB.prepare('SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp ASC').bind(body.room_id).all();
      for (let i = 0; i < (msgs?.length || 0); i++) {
        const m: any = msgs[i];
        await context.env.DB.prepare(
          `INSERT INTO snapshot_messages (snapshot_id, room_id, char_id, role, content, image, timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(snapshotId, body.room_id, m.char_id || null, m.role || 'user', m.content || '', m.image || null, m.timestamp || now, i).run();
      }
    }

    return Response.json({ id: snapshotId });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    await context.env.DB.prepare('DELETE FROM snapshot_messages WHERE snapshot_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM snapshots WHERE id = ?').bind(Number(id)).run();
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
```


## File: functions\api\variables-stages.ts

```ts
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const variableId = url.searchParams.get('variable_id');

    if (!variableId) return new Response('Missing variable_id', { status: 400 });

    const { results } = await context.env.DB.prepare('SELECT * FROM variable_stages WHERE variable_id = ? ORDER BY priority DESC').bind(Number(variableId)).all();
    return Response.json(results?.map(r => ({ ...r, is_active: r.is_active === 1 })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare(
      'INSERT INTO variable_stages (variable_id, name, condition, priority, stage_prompt, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.variable_id,
      body.name,
      body.condition,
      body.priority || 0,
      body.stage_prompt || null,
      body.is_active !== false ? 1 : 0,
      Date.now()
    ).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { id, ...updates } = body;

    if (!id) return new Response('Missing id', { status: 400 });

    const setFields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) { setFields.push('name = ?'); params.push(updates.name); }
    if (updates.condition !== undefined) { setFields.push('condition = ?'); params.push(updates.condition); }
    if (updates.priority !== undefined) { setFields.push('priority = ?'); params.push(updates.priority); }
    if (updates.stage_prompt !== undefined) { setFields.push('stage_prompt = ?'); params.push(updates.stage_prompt); }
    if (updates.is_active !== undefined) { setFields.push('is_active = ?'); params.push(updates.is_active ? 1 : 0); }

    params.push(id);

    await context.env.DB.prepare(`UPDATE variable_stages SET ${setFields.join(', ')} WHERE id = ?`).bind(...params).run();
    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    await context.env.DB.prepare('DELETE FROM variable_stages WHERE id = ?').bind(Number(id)).run();
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

```


## File: functions\api\variables-thought-config.ts

```ts
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');

    let query = 'SELECT * FROM variable_thought_config WHERE 1=1';
    const params: any[] = [];
    if (charId) { query += ' AND char_id = ?'; params.push(Number(charId)); }
    if (roomId) { query += ' AND room_id = ?'; params.push(Number(roomId)); }

    const result = await context.env.DB.prepare(query).bind(...params).first();
    if (!result) return Response.json(null);
    return Response.json({ ...result, is_auto_update: result.is_auto_update === 1 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();

    await context.env.DB.prepare('DELETE FROM variable_thought_config WHERE char_id = ? OR room_id = ?').bind(body.char_id || null, body.room_id || null).run();

    const { meta } = await context.env.DB.prepare(
      'INSERT INTO variable_thought_config (char_id, room_id, preset_id, model, thought_prompt, update_condition, update_interval, is_auto_update, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.preset_id || null,
      body.model || null,
      body.thought_prompt || null,
      body.update_condition || null,
      body.update_interval || null,
      body.is_auto_update ? 1 : 0,
      Date.now()
    ).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

```


## File: functions\api\variables-thought.ts

```ts
interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { char_id, room_id, history, user_input } = body;

    let config: any = null;
    if (char_id) {
      config = await context.env.DB.prepare('SELECT * FROM variable_thought_config WHERE char_id = ?').bind(Number(char_id)).first();
    }
    if (!config && room_id) {
      config = await context.env.DB.prepare('SELECT * FROM variable_thought_config WHERE room_id = ?').bind(Number(room_id)).first();
    }

    if (!config) return new Response('No thought config found', { status: 400 });

    const variables: any[] = [];
    if (char_id) {
      const { results } = await context.env.DB.prepare('SELECT * FROM variables WHERE char_id = ?').bind(Number(char_id)).all();
      variables.push(...(results || []));
    }
    if (room_id) {
      const { results } = await context.env.DB.prepare('SELECT * FROM variables WHERE room_id = ?').bind(Number(room_id)).all();
      variables.push(...(results || []));
    }

    if (variables.length === 0) return Response.json({ updates: [] });

    let preset: any = null;
    if (config.preset_id) {
      preset = await context.env.DB.prepare('SELECT * FROM api_presets WHERE id = ?').bind(config.preset_id).first();
    }

    let thoughtPrompt = config.thought_prompt || `你是一个剧情分析师。请分析最近的对话，根据角色的反应和对话内容，更新相关的变量值。

变量定义：
{VARIABLES}

最近对话：
{HISTORY}

请只返回一个JSON，格式为：
{
  "updates": [
    { "key": "变量key", "value": 新值, "reason": "原因" }
  ]
}`;

    const varsStr = variables.map(v => `- ${v.name} (${v.key}): ${v.description || '无描述'}`).join('\n');
    const historyStr = (history || []).slice(-20).map((m: any) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n');

    thoughtPrompt = thoughtPrompt.replace('{VARIABLES}', varsStr).replace('{HISTORY}', historyStr);
    if (user_input) {
      thoughtPrompt += `\n\n用户最新输入：${user_input}`;
    }

    if (!preset) {
      return new Response('No API preset configured', { status: 400 });
    }

    const model = config.model;
    if (!model) return new Response('No model configured', { status: 400 });

    const normalizedBase = (preset.api_base || '').trim().replace(/\/+$/, '');
    const trimmedKey = (preset.api_key || '').trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (trimmedKey) { headers['Authorization'] = `Bearer ${trimmedKey}`; }

    const mode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';

    let resultContent = '';
    if (mode === 'responses') {
      const res = await fetch(`${normalizedBase}/responses`, {
        method: 'POST', headers, body: JSON.stringify({
          model,
          input: [{ role: 'user', content: thoughtPrompt }],
          temperature: 0.7
        })
      });
      const data = await res.json();
      resultContent = data.output_text || data.output?.[0]?.content?.[0]?.text || '';
    } else {
      const res = await fetch(`${normalizedBase}/chat/completions`, {
        method: 'POST', headers, body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: thoughtPrompt }],
          temperature: 0.7
        })
      });
      const data = await res.json();
      resultContent = data.choices?.[0]?.message?.content || '';
    }

    let updates: any[] = [];
    try {
      const jsonMatch = resultContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        updates = parsed.updates || [];
      }
    } catch (e) {
      console.warn('Failed to parse thought response');
    }

    for (const update of updates) {
      const variable = variables.find(v => v.key === update.key);
      if (variable) {
        await context.env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
          .bind(JSON.stringify(update.value), Date.now(), variable.id).run();
      }
    }

    return Response.json({ updates });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

```


## File: functions\api\variables.ts

```ts
import { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

// 安全解析函数，防止单一数据格式错误导致整个列表崩溃
function safeParse(val: any) {
  if (val == null) return null;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch {
    return val; // 如果解析失败，直接原样返回
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');

    // 获取单条详情
    if (id) {
      const result = await context.env.DB.prepare('SELECT * FROM variables WHERE id = ?').bind(Number(id)).first();
      if (!result) return new Response('Not found', { status: 404 });
      return Response.json({ ...result, value: safeParse(result.value) });
    }

    // 获取列表
    let query = 'SELECT * FROM variables WHERE 1=1';
    const params: any[] = [];
    
    // 过滤可能传过来的字符串 "undefined" 或 "null"
    if (charId && charId !== 'undefined' && charId !== 'null') { 
      query += ' AND char_id = ?'; 
      params.push(Number(charId)); 
    }
    if (roomId && roomId !== 'undefined' && roomId !== 'null') { 
      query += ' AND room_id = ?'; 
      params.push(Number(roomId)); 
    }
    
    query += ' ORDER BY created_at DESC';

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results?.map(r => ({ ...r, value: safeParse(r.value) })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const now = Date.now();
    
    // 确保 value 在入库前转换为合适的字符串
    const valStr = typeof body.value === 'object' ? JSON.stringify(body.value) : String(body.value ?? '');

    const { meta } = await context.env.DB.prepare(
      `INSERT INTO variables (char_id, room_id, name, key, type, value, is_persistent, is_visible, step, min_value, max_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.name || '新变量',
      body.key || 'new_var',
      body.type || 'number', // 默认设为数字型
      valStr,
      body.is_persistent !== false ? 1 : 0,
      body.is_visible !== false ? 1 : 0,
      body.step ?? null,
      body.min_value ?? null,
      body.max_value ?? null,
      now,
      now
    ).run();

    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    
    if (!id) return new Response('Missing id', { status: 400 });

    const updates: string[] = [];
    const params: any[] = [];

    const fields = ['name', 'key', 'type', 'is_persistent', 'is_visible', 'step', 'min_value', 'max_value'];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(typeof body[f] === 'boolean' ? (body[f] ? 1 : 0) : body[f]);
      }
    }

    if (body.value !== undefined) {
      updates.push(`value = ?`);
      params.push(typeof body.value === 'object' ? JSON.stringify(body.value) : String(body.value));
    }

    if (updates.length === 0) return Response.json({ success: true });

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(Number(id)); // WHERE id = ?

    await context.env.DB.prepare(`UPDATE variables SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    return Response.json({ success: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    
    // 级联删除相关的阶段(Stages)配置
    await context.env.DB.prepare('DELETE FROM variable_stages WHERE variable_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM variables WHERE id = ?').bind(Number(id)).run();
    
    return Response.json({ success: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
```


## File: src\App.tsx

```tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { api, type Message, type Character, type Settings, type ApiPreset, type ApiMode, type Room, type RoomMember, type RoomMessage, type Variable, type VariableStage, type VariableThoughtConfig } from './lib/db';
import { LLMClient } from './lib/llm';
import { VariableEngine } from './lib/variable-engine';
import { LorebookEngine } from './lib/lorebook-engine';
import { replaceVariables as replaceBuiltInVariables } from './lib/variables';
import { ImageStudio } from './components/ImageStudio';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, 
  BookOpen, Book, Users, RefreshCw, Square, Save, Eraser, Sparkles, Copy, Edit
} from 'lucide-react';

function App() {
  const [viewMode, setViewMode] = useState<'char' | 'group' | 'image'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [presets, setPresets] = useState<ApiPreset[]>([]);
  
  const [activePresetId, setActivePresetId] = useState<number | undefined>();
  const [activeModel, setActiveModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [presetModelsMap, setPresetModelsMap] = useState<Record<number, string[]>>({});
  const [presetModelsLoading, setPresetModelsLoading] = useState<Record<number, boolean>>({});

  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [selectedRoomId, setSelectedRoomId] = useState<number>();
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [lorebookEntries, setLorebookEntries] = useState<any[]>([]);
  
  // 【新增】全局变量与思考引擎状态
  const [globalVariables, setGlobalVariables] = useState<Variable[]>([]);
  const [globalStages, setGlobalStages] = useState<VariableStage[]>([]);
  const [thoughtConfig, setThoughtConfig] = useState<VariableThoughtConfig | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [charEditTab, setCharEditTab] = useState<'basic' | 'variables' | 'snapshots'>('basic');
  const [charVariables, setCharVariables] = useState<any[]>([]);
  const [charSnapshots, setCharSnapshots] = useState<any[]>([]);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [useSdPromptConversion, setUseSdPromptConversion] = useState(true);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const [roomMembersDraft, setRoomMembersDraft] = useState<RoomMember[]>([]);

  const manualModels = useMemo(() => {
    if (!settings?.model_list) return [];
    return settings.model_list.split(/[,，\n]/).map(m => m.trim()).filter(m => m);
  }, [settings?.model_list]);

  const characterNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of characters) {
      if (c.id) m.set(c.id, c.name);
    }
    return m;
  }, [characters]);

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

  const loadData = async () => {
    try {
        const [c, r, s, p] = await Promise.all([
            api.characters.list(),
            api.rooms.list(),
            api.settings.get(),
            api.presets.list()
        ]);
        setCharacters(c); setRooms(r); setSettings(s); setPresets(p); 
        
        if (s.active_preset_id && p.some(pre => pre.id === s.active_preset_id)) {
            setActivePresetId(s.active_preset_id);
            const currentPreset = p.find(pre => pre.id === s.active_preset_id);
            if(currentPreset) {
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
  }, [showSettings]);

  useEffect(() => {
    if (!showGroupEdit) return;
    if (!selectedRoomId) return;
    api.rooms.getMembers(selectedRoomId).then(m => setRoomMembersDraft(m as any));
  }, [showGroupEdit, selectedRoomId]);

  useEffect(() => {
    if (!showCharEdit || !selectedCharId) return;
    loadCharData();
  }, [showCharEdit, selectedCharId, charEditTab]);

  // 在 src/App.tsx 中，找到 loadCharData 函数并替换为：
  const loadCharData = async () => {
    try {
      const [vars, snaps] = await Promise.all([
        api.variables.list(selectedCharId, undefined),
        api.snapshots.list(selectedCharId, undefined)
      ]);
      setCharVariables(vars);
      setCharSnapshots(snaps);
      
      // 【核心修复】创建变量后，立即同步更新给对话引擎所在的全局状态！
      setGlobalVariables(vars);
      let allStages: VariableStage[] = [];
      for (const v of vars) {
        if (v.id) {
          const st = await api.variableStages.list(v.id);
          allStages = [...allStages, ...st];
        }
      }
      setGlobalStages(allStages);
    } catch (e) {
      console.error('Failed to load char data', e);
    }
  };

  const addVariable = async () => {
    const newVar = {
      name: '新变量',
      key: 'new_var',
      type: 'number' as const,
      value: 0,
      char_id: selectedCharId,
      is_persistent: true,
      is_visible: true
    };
    await api.variables.add(newVar);
    await loadCharData();
  };

  const editVariable = async (variable: any) => {
    const name = prompt('变量名称:', variable.name);
    if (!name) return;
    const key = prompt('变量键:', variable.key);
    if (!key) return;
    await api.variables.update(variable.id!, { name, key });
    await loadCharData();
  };

  const updateVariableValue = async (id: number, value: any) => {
    await api.variables.update(id, { value });
    await loadCharData();
  };

  const deleteVariable = async (id: number) => {
    if (!confirm('确定删除此变量？')) return;
    await api.variables.delete(id);
    await loadCharData();
  };

  const createSnapshot = async () => {
    const name = prompt('快照名称:', `快照 ${new Date().toLocaleString()}`);
    if (!name) return;
    const description = prompt('快照描述:') || undefined;
    await api.snapshots.create({ char_id: selectedCharId, name, description });
    await loadCharData();
  };

  const viewSnapshot = (snapshot: any) => {
    alert(`快照内容:\n名称: ${snapshot.name}\n创建时间: ${new Date(snapshot.created_at).toLocaleString()}`);
  };

  const restoreSnapshot = async (snapshot: any) => {
    if (!confirm(`确定回滚到快照 "${snapshot.name}"？当前进度将丢失。`)) return;
    await api.snapshots.restore(snapshot.id!);
    await loadCharData();
    setMessages([]);
    await api.messages.list(selectedCharId).then(setMessages);
    alert('快照已恢复');
  };

  const deleteSnapshot = async (id: number) => {
    if (!confirm('确定删除此快照？')) return;
    await api.snapshots.delete(id);
    await loadCharData();
  };

  const loadLorebookEntries = async () => {
    if (!selectedCharId) return;
    const entries = await api.lorebookV2.list(selectedCharId, undefined);
    setLorebookEntries(entries as any);
  };

  const refreshModels = async (base: string, key: string, keepModelId?: string, manualListStr?: string, mode: ApiMode = 'chat_completions') => {
      setIsFetchingModels(true);
      const llm = new LLMClient(base, key, mode);
      const fetchedModels = await llm.fetchModels();
      setAvailableModels(fetchedModels);
      setIsFetchingModels(false);
      
      const currentManualList = manualListStr !== undefined ? manualListStr : (settings?.model_list || "");
      const manualArr = currentManualList.split(/[,，\n]/).map(m => m.trim()).filter(m => m);
      
      if (keepModelId && (fetchedModels.includes(keepModelId) || manualArr.includes(keepModelId))) {
          setActiveModel(keepModelId);
      } else if (fetchedModels.length > 0) {
          const first = fetchedModels[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      } else if (manualArr.length > 0) {
          const first = manualArr[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      }
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

  // 【核心修改】在此处装载全量变量数据、引擎配置和世界书
  useEffect(() => {
    setMessages([]);
    setRoomMessages([]);
    if (viewMode === 'char' && selectedCharId) {
      api.messages.list(selectedCharId).then(setMessages);
      loadLorebookEntries();
      
      api.variables.list(selectedCharId).then(async vars => {
        setGlobalVariables(vars);
        let allStages: VariableStage[] = [];
        for (const v of vars) {
          if (v.id) {
            const st = await api.variableStages.list(v.id);
            allStages = [...allStages, ...st];
          }
        }
        setGlobalStages(allStages);
      });
      api.variableThoughtConfig.get(selectedCharId).then(setThoughtConfig);
      setTurnCount(0); // 重置会话计数器

    } else if (viewMode === 'group' && selectedRoomId) {
      api.rooms.getMembers(selectedRoomId).then((m) => {
        setRoomMembers(m);
        setGroupMemberIds((m || []).map(x => x.char_id));
      });
      api.roomMessages.list(selectedRoomId).then(setRoomMessages);
    }
  }, [selectedCharId, selectedRoomId, viewMode]);

  const messageCount = viewMode === 'group' ? roomMessages.length : messages.length;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messageCount, isTyping]);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
    }
  };

  const sendRoomChat = async (userText: string, speakerCharId: number | null) => {
    if (!settings) return;
    if (!selectedRoomId) return alert("请先选择房间");
    
    setIsTyping(true);
    try {
      if (speakerCharId) {
        if (!activePresetId || !activeModel) return alert("请先在顶部选择 API 预设和模型！");
        await api.roomChat.send({
          room_id: selectedRoomId,
          user_input: userText || undefined,
          speaker_char_id: speakerCharId,
          fallback_preset_id: activePresetId,
          fallback_model_id: activeModel,
        });
      } else if (userText) {
        await api.roomMessages.add({ room_id: selectedRoomId, role: 'user', sender_type: 'user', content: userText, timestamp: Date.now() });
      }
      const latest = await api.roomMessages.list(selectedRoomId);
      setRoomMessages(latest);
      setInput(''); 
      if (inputRef.current) inputRef.current.style.height = 'auto';
    } catch (e: any) { alert(e.message || String(e)); } finally { setIsTyping(false); }
  };

  const saveRoomConfigs = async () => {
    if (!selectedRoomId) return;
    const room = rooms.find(x => x.id === selectedRoomId);
    if (!room) return;

    await api.rooms.update(selectedRoomId, {
      name: room.name,
      description: room.description,
      summary: room.summary || '',
    });
    await api.rooms.updateMembers(selectedRoomId, roomMembersDraft.map(m => ({ char_id: m.char_id })));

    setShowGroupEdit(false);
    await loadData();
    const members = await api.rooms.getMembers(selectedRoomId).catch(() => []);
    setRoomMembers(members as any);
    setGroupMemberIds((members as any[]).map(x => Number((x as any).char_id)).filter(Boolean));
    alert('房间配置已保存');
  };

  // 【核心修改】重写单人 AI 触发逻辑，集成引擎装配
  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    if (!activePresetId || !activeModel) return alert("请先在顶部导航栏选择 API 预设和模型！");
    const currentPreset = presets.find(p => p.id === activePresetId);
    if (!currentPreset) return alert("无效的 API 预设");

    // 1. 初始化引擎
    const varEngine = new VariableEngine(globalVariables, globalStages);
    const loreEngine = new LorebookEngine(lorebookEntries);
    const currentHistory = (historyOverride || messages).filter(m => m.content || m.role === 'user');

    // 2. 世界书动态扫描与注入组装
    const triggeredLorebook = loreEngine.scan(textOverride || "", currentHistory, {}, {});
    const lorebookInjections = loreEngine.buildInjection(triggeredLorebook);

    // 3. 获取变量阶段的心理/行为暗示
    const stagePrompts = varEngine.getActiveStagePrompts().join('\n');

    // 4. 构建防串戏与人设基础的 System Prompt
    let basePrompt = char.description;
    if (char.summary) basePrompt += `\n\n[个人长期记忆]:\n${char.summary}`;
    if (stagePrompts) basePrompt += `\n\n[当前状态与心理防线]:\n${stagePrompts}`;

    // 5. 宏替换：先替换自定义变量（来自 VariableEngine），再替换内置系统变量 (如 {{user}}, {{time}})
    const rawSystemContent = 
      (lorebookInjections.beforeSystem ? lorebookInjections.beforeSystem + '\n---\n' : '') +
      basePrompt +
      (lorebookInjections.afterSystem ? '\n---\n' + lorebookInjections.afterSystem : '');
      
    const fullSystemContent = replaceBuiltInVariables(
      varEngine.replaceVariables(rawSystemContent, settings, char),
      settings, char
    );

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', char_id: char.id, timestamp: tempTs }]);
    
    const llm = new LLMClient(currentPreset.api_base, currentPreset.api_key, getPresetMode(currentPreset));
    let fullContent = "";

    try {
      // 传入组装好的完整 System Prompt
      const stream = llm.chatStream(char, currentHistory, textOverride || "", settings, activeModel, fullSystemContent, undefined, controller);
      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, content: fullContent } : m));
      }
    } catch (e: any) {
        if (e.name !== 'AbortError') console.error("生成失败:", e);
    } finally {
      if (fullContent.trim().length > 0) {
          try {
            const res = await api.messages.add({ role: 'assistant', content: fullContent, char_id: char.id, timestamp: tempTs });
            setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, id: res.id } : m));

            // 【核心修改】触发后台自动分析更新变量机制
            setTurnCount(prev => {
              const nextCount = prev + 1;
              if (thoughtConfig?.is_auto_update && thoughtConfig.update_interval && nextCount >= thoughtConfig.update_interval) {
                // 静默触发分析
                api.variableThoughtConfig.triggerThought({
                  char_id: char.id,
                  history: currentHistory.slice(-10), // 取近10条用于分析
                  user_input: textOverride
                }).then(() => {
                  // 分析完成后静默刷新前端变量展示状态
                  api.variables.list(char.id).then(setGlobalVariables);
                }).catch(console.error);
                return 0; // 重置计数器
              }
              return nextCount;
            });

          } catch (dbErr) { }
      } else {
          setMessages(prev => prev.filter(m => m.timestamp !== tempTs));
      }
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleGenImageAction = async () => {
    if (!settings) return;
    const imageBackend = (settings.image_backend || 'huggingface');
    const rawPrompt = genPrompt || (viewMode === 'group' ? (roomMessages.length > 0 ? roomMessages[roomMessages.length - 1].content : "") : (messages.length > 0 ? messages[messages.length - 1].content : ""));
    if (!rawPrompt) return;

    setShowGenModal(false);
    setIsTyping(true);
    try {
      let finalPrompt = rawPrompt;

      if (useSdPromptConversion) {
        const sdPromptPreset = presets.find(p => p.id === settings.sd_prompt_preset_id) || presets.find(p => p.id === activePresetId);
        const sdPromptModel = settings.sd_prompt_model_id || activeModel;
        if (sdPromptPreset && sdPromptModel) {
            const llm = new LLMClient(sdPromptPreset.api_base, sdPromptPreset.api_key, getPresetMode(sdPromptPreset));
            const tags = await llm.generateImageTags(rawPrompt, sdPromptModel);
            finalPrompt = `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${tags}`;
        }
      }

      let reqBody: any = {
        char_id: viewMode === 'char' ? selectedCharId : undefined,
        room_id: viewMode === 'group' ? selectedRoomId : undefined,
      };
      
      if (imageBackend === 'huggingface') {
        if (!settings.hf_keys) throw new Error("请在系统设置中配置 ComfyUI 内网穿透 URL");
        reqBody = {
          ...reqBody,
          backend: 'huggingface',
          model: 'comfyui-local',
          apiKey: settings.hf_keys,
          payload: { prompt: finalPrompt }
        };
      } else {
        const imagePreset = presets.find(p => p.id === settings.image_preset_id) || presets.find(p => p.id === activePresetId);
        const imageModel = settings.image_model_id || activeModel;
        if (!imagePreset || !imageModel) throw new Error("请配置 OpenAI 生图预设和模型");
        reqBody = {
          ...reqBody,
          backend: 'openai',
          apiBase: imagePreset.api_base,
          apiKey: imagePreset.api_key,
          model: imageModel,
          payload: { prompt: finalPrompt, size: '1024x1024', n: 1, response_format: 'b64_json' }
        };
      }

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      if (!res.ok) {
         const errData = await res.json().catch(()=>({error: "生图失败"}));
         throw new Error(errData.error || "后端未响应");
      }
      
      const data = await res.json();
      const imgSrc = (Array.isArray(data?.images) && data.images[0] ? `data:image/png;base64,${data.images[0]}` : '') || (Array.isArray(data?.urls) && data.urls[0] ? data.urls[0] : '');
      if (!imgSrc) throw new Error("后端未返回图片");

      const timestamp = Date.now();
      const imageMsg: Message = { role: 'assistant', content: '', image: imgSrc, timestamp, char_id: selectedCharId };
      setMessages(prev => [...prev, imageMsg]);
      
      try {
        const saveRes = await api.messages.add(imageMsg);
        setMessages(prev => prev.map(m => m.timestamp === timestamp ? { ...m, id: saveRes.id } : m));
      } catch (saveErr) {
        console.error("保存图片消息失败:", saveErr);
      }
    } catch (e: any) { alert("生图失败: " + e.message); } finally { setIsTyping(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || !settings || isTyping) return;
    const text = input; setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    if (viewMode === 'group') {
      await sendRoomChat(text, null); 
      return;
    }

    const timestamp = Date.now();
    const userMsg: Message = { role: 'user', content: text, timestamp, char_id: selectedCharId };

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
                <button className="hover:text-info p-1" title="创建副本" onClick={async (e) => { e.stopPropagation(); const newName = prompt("新角色名称:", `${c.name} (Copy)`); if(newName) { await api.characters.duplicate(c.id!, newName); loadData(); } }}><Copy size={14}/></button>
                <button className="hover:text-error p-1" title="删除" onClick={(e) => { e.stopPropagation(); if(confirm(`删除角色 ${c.name}？`)) api.characters.delete(c.id!).then(() => loadData()); }}><Trash2 size={14} /></button>
            </div>
          </div>
        )) : viewMode === 'group' ? rooms.map(r => (
          <div key={r.id} onClick={() => { setSelectedRoomId(r.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedRoomId === r.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <div className="flex items-center gap-2 min-w-0"><span className="font-bold truncate">{r.name}</span></div>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`删除房间 ${r.name}？`)) api.rooms.delete(r.id!).then(() => loadData()); }} />
          </div>
        )) : (
          <div className="p-3 rounded-xl border border-base-300 bg-base-100/40 text-xs leading-relaxed">
            <div className="font-black mb-2 flex items-center gap-2"><ImageIcon size={16}/> 生图工作台</div>
            <div>支持 本地 ComfyUI 异步穿透生图 与 OpenAI 兼容端点生图。</div>
          </div>
        )}
        {(viewMode === 'char' || viewMode === 'group') && (
          <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={async () => { const n = prompt("名称?"); if (!n) return; if (viewMode === 'char') await api.characters.add({ name: n, description: "", first_message: "你好", summary: "" }); else await api.rooms.add({ name: n, description: "" }); await loadData(); }}><Plus size={16} /> 新建</button>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10"><button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 系统设置</button></div>
    </div>
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="drawer md:drawer-open fixed inset-0 w-full bg-base-100 overflow-hidden text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        
        <div className="bg-base-100 border-b border-base-300 safe-pt z-20 shrink-0">
          <div className="navbar min-h-[3rem] px-2 md:px-4">
            <div className="flex-none md:hidden">
              <button className="btn btn-square btn-sm btn-ghost" onClick={()=>setMobileMenuOpen(true)}><Menu size={20}/></button>
            </div>
            <div className="flex-1 font-bold text-base md:text-lg truncate px-2">
              {viewMode === 'image' ? '生图工作台' : (viewMode === 'char' ? characters.find(c=>c.id===selectedCharId)?.name : rooms.find(r=>r.id===selectedRoomId)?.name) || "SimpleRP"}
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 pb-2 w-full">
            <select className="select select-bordered select-xs md:select-sm shrink-0" value={activePresetId || ""} onChange={(e) => handlePresetChange(e.target.value)}>
                <option value="" disabled>选择源...</option>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="join shrink-0">
                <select className="select select-bordered select-xs md:select-sm join-item max-w-[8rem] md:max-w-[10rem]" value={activeModel} onChange={(e) => handleModelChange(e.target.value)} disabled={!activePresetId}>
                    {manualModels.length === 0 && availableModels.length === 0 && <option value="">无可用模型</option>}
                    {manualModels.length > 0 && <optgroup label="手动配置">{manualModels.map(m => <option key={`man-${m}`} value={m}>{m}</option>)}</optgroup>}
                    {availableModels.length > 0 && <optgroup label="自动获取">{availableModels.map(m => <option key={`auto-${m}`} value={m}>{m}</option>)}</optgroup>}
                </select>
                <button className={`btn btn-xs md:btn-sm join-item btn-ghost ${isFetchingModels ? 'loading' : ''}`} title="刷新模型" onClick={() => { const p = presets.find(pre => pre.id === activePresetId); if(p) refreshModels(p.api_base, p.api_key, activeModel, undefined, getPresetMode(p)); }} disabled={!activePresetId}><RefreshCw size={14}/></button>
            </div>

            <div className="flex shrink-0 gap-1 ml-auto border-l border-base-300 pl-2">
              {viewMode !== 'image' && (
                <button className="btn btn-xs md:btn-sm btn-ghost text-error" title="清空对话" onClick={() => { if (!confirm("确定清空会话？")) return; if (viewMode === 'group' && selectedRoomId) { api.roomMessages.clear(selectedRoomId).then(() => { setRoomMessages([]); alert("已清空"); }); } else { api.messages.clear(viewMode==='char'?selectedCharId:undefined).then(()=>{setMessages([]); alert("已清空");}); } }}><Eraser size={16}/></button>
              )}
              {(viewMode === 'char' || viewMode === 'group') && (selectedCharId || selectedRoomId) && (
                <button className="btn btn-xs md:btn-sm btn-ghost text-info" title="总结剧情进展" onClick={async ()=>{ 
                    if (!activePresetId || !activeModel) return alert("请先选择模型");
                    try {
                        setIsTyping(true);
                        const currentPreset = presets.find(p => p.id === activePresetId)!;
                        const summaryPreset = presets.find(p => p.id === settings?.summary_preset_id) || currentPreset;
                        const summaryModel = settings?.summary_model_id || activeModel;
                        const llm = new LLMClient(summaryPreset.api_base, summaryPreset.api_key, getPresetMode(summaryPreset));
                        
                        const sourceMessages = viewMode === 'group' ? roomMessages : messages;
                        const fragment = await llm.summarizeRecent(sourceMessages as any, summaryModel);
                        if(!fragment) return alert("没有检测到新剧情。");
                        
                        const date = new Date().toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'});
                        if (viewMode === 'char' && selectedCharId) {
                           const char = characters.find(c => c.id === selectedCharId);
                           const updatedSummary = (char?.summary ? char.summary + "\n\n" : "") + `#### [剧情更新 ${date}]\n${fragment}`;
                           await api.characters.update(selectedCharId, { summary: updatedSummary });
                        } else if (viewMode === 'group' && selectedRoomId) {
                           const room = rooms.find(r => r.id === selectedRoomId);
                           const updatedSummary = (room?.summary ? room.summary + "\n\n" : "") + `#### [群聊更新 ${date}]\n${fragment}`;
                           await api.rooms.update(selectedRoomId, { summary: updatedSummary });
                        }
                        await loadData(); alert("新进展已追加。");
                    } catch (e: any) { alert(e.message); } finally { setIsTyping(false); }
                }}><BookOpen size={16}/></button>
              )}
              {viewMode === 'char' && selectedCharId && (
                <><button className="btn btn-xs md:btn-sm btn-ghost text-warning" title="世界书" onClick={()=>setShowLorebook(true)}><Book size={16}/></button><button className="btn btn-xs md:btn-sm btn-primary" onClick={()=>setShowCharEdit(true)}><Pencil size={16}/></button></>
              )}
              {viewMode === 'group' && selectedRoomId && (
                <button className="btn btn-xs md:btn-sm btn-secondary" title="房间设置" onClick={()=>setShowGroupEdit(true)}><Users size={16}/></button>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'image' && (
          <ImageStudio settings={settings} presets={presets} activePresetId={activePresetId} activeModel={activeModel} manualModels={manualModels} getPresetMode={getPresetMode} fetchPresetModels={fetchPresetModels} presetModelsMap={presetModelsMap} presetModelsLoading={presetModelsLoading} />
        )}
        {viewMode === 'char' && !selectedCharId && (
          <div className="flex-1 flex items-center justify-center opacity-60">
            <div className="text-center">
              <Pencil size={48} className="mx-auto mb-4 opacity-30" />
              <p>请在左侧选择一个角色开始对话</p>
            </div>
          </div>
        )}
        {viewMode === 'group' && !selectedRoomId && (
          <div className="flex-1 flex items-center justify-center opacity-60">
            <div className="text-center">
              <Users size={48} className="mx-auto mb-4 opacity-30" />
              <p>请在左侧选择一个房间开始群聊</p>
            </div>
          </div>
        )}
        {(selectedCharId && viewMode === 'char') || (selectedRoomId && viewMode === 'group') ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {(viewMode === 'group' ? (roomMessages as any) : (messages as any)).map((m: any, idx: number) => {
                const isUser = m.role === 'user' || m.sender_type === 'user';
                const headerName = isUser ? (settings?.user_name || '我') : (characterNameById.get(m.char_id) || 'AI');
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
                      {!m.id && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <button className="btn btn-circle btn-xs btn-primary shadow-lg" title="保存" onClick={async () => { 
                            try { 
                              const res = await api.messages.add(m); 
                              setMessages(prev => prev.map(msg => msg.timestamp === m.timestamp ? { ...msg, id: res.id } : msg)); 
                              alert("已保存"); 
                            } catch (err) { 
                              alert("保存失败"); 
                            } 
                          }}>
                            <Save size={12}/>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`chat-bubble shadow-lg border ${isUser ? 'chat-bubble-primary border-primary' : 'bg-base-200 text-base-content border-base-300'}`}>
                      {viewMode === 'char' && editingMsgId === m.id ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/>
                          <div className="flex justify-end gap-1">
                            <button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>取消</button>
                            <button className="btn btn-xs btn-primary" onClick={async ()=>{
                              await api.messages.update(m.id!, editContent); 
                              setMessages(prev => prev.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); 
                              setEditingMsgId(null);
                            }}>保存</button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm break-words">
                          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                            {replaceBuiltInVariables(
                              m.content, 
                              settings || {}, 
                              viewMode === 'char' ? characters.find(c => c.id === selectedCharId) : undefined
                            )}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
              {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">思考中...</div></div>}
              <div ref={bottomRef} className="h-20" />
            </div>

            <div className="p-2 md:p-4 bg-base-100 border-t border-base-300 safe-pb shrink-0">
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                {viewMode === 'group' && selectedRoomId && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button onClick={() => sendRoomChat(input || '', null)} disabled={isTyping || !input.trim()} className="btn btn-sm btn-outline whitespace-nowrap rounded-full">发送 (玩家发言)</button>
                    {characters.filter(c => groupMemberIds.includes(c.id!)).map(m => (
                      <button key={m.id} onClick={() => sendRoomChat(input || '', m.id!)} disabled={isTyping} className="btn btn-sm btn-secondary whitespace-nowrap rounded-full">@{m.name} 回应</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end bg-base-200 p-1.5 md:p-2 rounded-2xl shadow-inner border border-base-300">
                  <button className="btn btn-circle btn-ghost btn-sm text-accent shrink-0 mb-1" onClick={()=>{setGenPrompt(""); setShowGenModal(true)}}><ImageIcon size={22}/></button>
                  <textarea 
                    ref={inputRef} 
                    className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-32 md:max-h-48 resize-none py-2 px-1 focus:outline-none text-base leading-relaxed" 
                    rows={1} 
                    value={input} 
                    onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'}} 
                    placeholder={viewMode === 'group' ? "输入并点击上面的 @..." : "输入消息..."} 
                    onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); if(viewMode === 'char') handleSend();}}} 
                  />
                  {isTyping ? (
                    <button className="btn btn-circle btn-error btn-sm shadow-lg shrink-0 mb-1" onClick={stopGeneration}><Square size={18} fill="currentColor"/></button>
                  ) : (
                    viewMode === 'char' && <button className="btn btn-circle btn-primary btn-sm shadow-lg shrink-0 mb-1" onClick={handleSend} disabled={!input.trim()}><Send size={18}/></button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
      
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {showSettings && settings && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b bg-base-200 font-bold flex justify-between items-center">系统配置<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">基础与沉浸</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control"><label className="label text-xs font-bold">玩家姓名</label><input className="input input-bordered" placeholder="如：朕" value={settings.user_name || ''} onChange={e=>setSettings({...settings, user_name:e.target.value})} /></div>
                            <div className="form-control">
                              <label className="label text-xs font-bold">默认生图后端</label>
                              <select className="select select-bordered" value={settings.image_backend || 'huggingface'} onChange={e=>setSettings({...settings, image_backend: e.target.value as any})}>
                                <option value="huggingface">ComfyUI 本地穿透 (利用 HF 通道)</option>
                                <option value="openai">OpenAI 兼容端点</option>
                              </select>
                            </div>
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">生图核心配置</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 border border-base-300 rounded-xl bg-base-100">
                              <div className="text-xs font-black mb-3 text-accent">ComfyUI 本地穿透参数</div>
                              <div className="grid grid-cols-1 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">Cloudflare Tunnel URL</label>
                                  <textarea className="textarea textarea-bordered h-12 text-xs font-mono" placeholder="如：https://xxx.trycloudflare.com (替代原来的 HF Key 填入)" value={settings.hf_keys || ''} onChange={e=>setSettings({...settings, hf_keys:e.target.value})} />
                                </div>
                              </div>
                            </div>
                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">OpenAI 生图参数（备用）</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select className="select select-bordered select-sm" value={settings.image_preset_id ? String(settings.image_preset_id) : ''} onChange={(e) => { const v = e.target.value; if (!v) { setSettings({ ...settings, image_preset_id: undefined, image_model_id: '' }); return; } const pid = parseInt(v, 10); setSettings({ ...settings, image_preset_id: pid }); fetchPresetModels(pid); }}>
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`img-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select className="select select-bordered select-sm join-item w-full" disabled={!settings.image_preset_id} value={settings.image_model_id || ''} onChange={(e) => setSettings({ ...settings, image_model_id: e.target.value })}>
                                      <option value="">跟随顶部模型</option>
                                      {settings.image_preset_id && (presetModelsMap[settings.image_preset_id] || []).map(m => <option key={`img-model-${m}`} value={m}>{m}</option>)}
                                      {settings.image_preset_id && (presetModelsMap[settings.image_preset_id]?.length || 0) === 0 && manualModels.map(m => <option key={`img-manual-${m}`} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">其他辅助模型绑定</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">记忆总结模型</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select className="select select-bordered select-sm" value={settings.summary_preset_id ? String(settings.summary_preset_id) : ''} onChange={(e) => { const v = e.target.value; if (!v) { setSettings({ ...settings, summary_preset_id: undefined, summary_model_id: '' }); return; } const pid = parseInt(v, 10); setSettings({ ...settings, summary_preset_id: pid }); fetchPresetModels(pid); }}>
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`sum-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select className="select select-bordered select-sm join-item w-full" disabled={!settings.summary_preset_id} value={settings.summary_model_id || ''} onChange={(e) => setSettings({ ...settings, summary_model_id: e.target.value })}>
                                      <option value="">跟随顶部模型</option>
                                      {settings.summary_preset_id && (presetModelsMap[settings.summary_preset_id] || []).map(m => <option key={`sum-model-${m}`} value={m}>{m}</option>)}
                                      {settings.summary_preset_id && (presetModelsMap[settings.summary_preset_id]?.length || 0) === 0 && manualModels.map(m => <option key={`sum-manual-${m}`} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">SD 转换模型（生图描述翻译与丰富）</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select className="select select-bordered select-sm" value={settings.sd_prompt_preset_id ? String(settings.sd_prompt_preset_id) : ''} onChange={(e) => { const v = e.target.value; if (!v) { setSettings({ ...settings, sd_prompt_preset_id: undefined, sd_prompt_model_id: '' }); return; } const pid = parseInt(v, 10); setSettings({ ...settings, sd_prompt_preset_id: pid }); fetchPresetModels(pid); }}>
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`sd-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select className="select select-bordered select-sm join-item w-full" disabled={!settings.sd_prompt_preset_id} value={settings.sd_prompt_model_id || ''} onChange={(e) => setSettings({ ...settings, sd_prompt_model_id: e.target.value })}>
                                      <option value="">跟随顶部模型</option>
                                      {settings.sd_prompt_preset_id && (presetModelsMap[settings.sd_prompt_preset_id] || []).map(m => <option key={`sd-model-${m}`} value={m}>{m}</option>)}
                                      {settings.sd_prompt_preset_id && (presetModelsMap[settings.sd_prompt_preset_id]?.length || 0) === 0 && manualModels.map(m => <option key={`sd-manual-${m}`} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                      </section>
                      <section>
                          <div className="flex justify-between items-end mb-3">
                              <h4 className="text-sm font-black text-primary uppercase">API 预设库</h4>
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
                          <div className="form-control">
                                <label className="label font-bold text-xs">备用模型列表 (手动输入，逗号分隔)</label>
                                <textarea className="textarea textarea-bordered w-full text-xs h-20" placeholder="当 API 不支持自动获取模型列表时使用" value={settings.model_list || ""} onChange={e=>setSettings({...settings, model_list:e.target.value})} />
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

      {showCharEdit && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">
                    <div className="flex items-center gap-2">
                      <span>角色档案</span>
                      <button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X/></button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="tabs tabs-boxed">
                      <button className={`tab ${charEditTab === 'basic' ? 'tab-active' : ''}`} onClick={() => setCharEditTab('basic')}>基础设定</button>
                      <button className={`tab ${charEditTab === 'variables' ? 'tab-active' : ''}`} onClick={() => setCharEditTab('variables')}>变量管理</button>
                      <button className={`tab ${charEditTab === 'snapshots' ? 'tab-active' : ''}`} onClick={() => setCharEditTab('snapshots')}>历史快照</button>
                    </div>
                    <div className="p-6">
                      {charEditTab === 'basic' && (
                        <div className="space-y-6">
                          <div className="form-control"><label className="label font-bold text-xs">角色姓名</label><input className="input input-bordered" value={characters.find(c=>c.id===selectedCharId)?.name} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, name:e.target.value}:c))} /></div>
                          <div className="form-control"><label className="label font-bold text-xs">人设/世界观描述</label><textarea className="textarea textarea-bordered h-48 font-mono text-sm" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description:e.target.value}:c))} /></div>
                          <div className="form-control"><label className="label font-bold text-xs text-primary">个人长期记忆 (Summary)</label><textarea className="textarea textarea-bordered h-32 font-mono text-xs" value={characters.find(c=>c.id===selectedCharId)?.summary} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, summary:e.target.value}:c))} /></div>
                        </div>
                      )}
                      {charEditTab === 'variables' && (
                        <div className="space-y-3">
                          {charVariables.map(v => (
                            <div key={v.id} className="card bg-base-100 border border-base-content/10 p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-bold">{v.name}</span>
                                  <span className="text-xs opacity-60 font-mono ml-2">{v.key}</span>
                                </div>
                                <div className="flex gap-1">
                                  <button className="btn btn-ghost btn-xs" onClick={() => editVariable(v)}><Edit size={14} /></button>
                                  <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteVariable(v.id!)}><Trash2 size={14} /></button>
                                </div>
                              </div>
                              {v.type === 'number' || v.type === 'range' ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    className="input input-bordered input-sm w-24"
                                    value={v.value}
                                    onChange={(e) => updateVariableValue(v.id!, parseFloat(e.target.value))}
                                    step={v.step || 1}
                                    min={v.min_value}
                                    max={v.max_value}
                                  />
                                  {v.min_value !== undefined && v.max_value !== undefined && (
                                    <div className="flex-1">
                                      <progress className="progress progress-primary w-full" value={((v.value - v.min_value) / (v.max_value - v.min_value)) * 100} max="100" />
                                    </div>
                                  )}
                                </div>
                              ) : v.type === 'boolean' ? (
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
                                    checked={Boolean(v.value)}
                                    onChange={(e) => updateVariableValue(v.id!, e.target.checked)}
                                  />
                                  <span>{v.value ? '是' : '否'}</span>
                                </label>
                              ) : (
                                <textarea
                                  className="textarea textarea-bordered text-sm"
                                  value={v.value}
                                  onChange={(e) => updateVariableValue(v.id!, e.target.value)}
                                />
                              )}
                            </div>
                          ))}
                          <button className="btn btn-block btn-outline border-dashed btn-sm" onClick={addVariable}>+ 添加变量</button>
                        </div>
                      )}
                      {charEditTab === 'snapshots' && (
                        <div className="space-y-3">
                          {charSnapshots.map(s => (
                            <div key={s.id} className="card bg-base-100 border border-base-content/10 p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-bold">{s.name}</span>
                                  <span className="text-xs opacity-60 ml-2">{new Date(s.created_at!).toLocaleString()}</span>
                                </div>
                                <div className="flex gap-1">
                                  <button className="btn btn-ghost btn-xs" onClick={() => viewSnapshot(s)}>查看</button>
                                  <button className="btn btn-ghost btn-xs" onClick={() => restoreSnapshot(s)}>回滚</button>
                                  <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteSnapshot(s.id!)}><Trash2 size={14} /></button>
                                </div>
                              </div>
                              {s.description && <p className="text-sm opacity-70">{s.description}</p>}
                            </div>
                          ))}
                          <button className="btn btn-block btn-outline border-dashed btn-sm" onClick={createSnapshot}>+ 创建快照</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{await api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false); loadData();}}>确认保存</button></div>
              </div>
          </div>
      )}

      {showGroupEdit && selectedRoomId && (() => {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (!room) return null;
        return (
          <div className="modal modal-open text-base-content">
            <div className="modal-box max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
              <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">
                <h3>房间配置</h3>
                <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowGroupEdit(false)}><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <section className="grid grid-cols-1 gap-4">
                  <div className="form-control">
                    <label className="label font-bold">房间名</label>
                    <input className="input input-bordered" value={room.name || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, name: e.target.value } : r))} />
                  </div>
                  <div className="form-control">
                    <label className="label font-bold text-xs text-primary">场景设定</label>
                    <textarea className="textarea textarea-bordered h-32" value={room.description || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, description: e.target.value } : r))} placeholder="例如：这是御前会议，气氛严肃..." />
                  </div>
                  <div className="form-control">
                    <label className="label font-bold text-xs text-info">全局剧情记忆 (Summary)</label>
                    <textarea className="textarea textarea-bordered h-40 font-mono text-xs" value={room.summary || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, summary: e.target.value } : r))} placeholder="点击顶部界面的【书本】图标可以自动总结对话并追加到这里..." />
                  </div>
                </section>
                <section className="p-4 rounded-xl border border-base-300 space-y-3">
                  <div className="font-black text-sm">选择房间成员</div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 grid grid-cols-2 gap-2">
                    {characters.map(c => {
                      const active = !!roomMembersDraft.find(m => m.char_id === c.id);
                      return (
                        <div key={c.id} className={`p-3 rounded-xl border ${active ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'} flex items-center gap-3`}>
                          <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={active} onChange={e => {
                              if (!c.id) return;
                              if (e.target.checked) setRoomMembersDraft(prev => [...prev, { char_id: c.id! }]);
                              else setRoomMembersDraft(prev => prev.filter(m => m.char_id !== c.id));
                            }} />
                          <div className="font-bold truncate text-sm">{c.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
              <div className="p-6 border-t bg-base-200 flex justify-end gap-3">
                <button className="btn" onClick={() => setShowGroupEdit(false)}>取消</button>
                <button className="btn btn-primary" onClick={saveRoomConfigs}>保存房间</button>
              </div>
            </div>
          </div>
        );
      })()}

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
                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${(e as any).is_active ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>{(e as any).is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="collapse-content space-y-2">
                                <textarea className="textarea textarea-bordered w-full h-32 text-xs font-mono" defaultValue={e.content} onBlur={(evt)=>api.lorebookV2.update(e.id!, {content: evt.target.value})} />
                                <div className="flex gap-2 items-center">
                                    <input className="input input-bordered input-sm flex-1 text-xs" defaultValue={e.keywords} onBlur={(evt)=>api.lorebookV2.update(e.id!, {keywords: evt.target.value})} />
                                    <input type="number" className="input input-bordered input-sm w-20 text-xs" defaultValue={(e as any).priority || 0} onBlur={(evt)=>api.lorebookV2.update(e.id!, {priority: parseInt(evt.target.value) || 0})} placeholder="优先级" />
                                    <div className="flex items-center gap-2 bg-base-300 px-3 py-1 rounded-full"><span className="text-[10px] font-bold">启用</span><input type="checkbox" className="toggle toggle-success toggle-xs" checked={Boolean((e as any).is_active)} onChange={(evt) => {const val = evt.target.checked; api.lorebookV2.update(e.id!, { is_active: val }).then(() => {setLorebookEntries(prev => prev.map(item => item.id === e.id ? {...item, is_active: val} : item));});}} /></div>
                                    <button className="btn btn-sm btn-error" onClick={()=>api.lorebookV2.delete(e.id!).then(()=>loadLorebookEntries())}><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button className="btn btn-block btn-outline border-dashed btn-sm mt-4" onClick={()=>api.lorebookV2.add({char_id:selectedCharId, name:"新词条", keywords:"新词条", content:"", priority:0, position:'before_system', probability:1.0, is_active:true, use_once:false, cooldown_messages:0}).then(()=>loadLorebookEntries())}>+ 添加新设定</button>
                  </div>
              </div>
          </div>
      )}

      {showGenModal && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary"><Sparkles/> 极速生图</h3>
                <textarea className="textarea textarea-bordered w-full h-32 text-base" value={genPrompt} onChange={e=>setGenPrompt(e.target.value)} placeholder="描述你想生成的画面细节，支持自然语言..." />
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={useSdPromptConversion} onChange={(e)=>setUseSdPromptConversion(e.target.checked)} />
                    自动扩写词条
                  </label>
                  <span className="opacity-70">后端: <b>{settings?.image_backend === 'openai' ? 'OpenAI' : 'ComfyUI 本地穿透'}</b></span>
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

html, body, #root {
  height: 100%; 
  width: 100vw;
  overflow: hidden; 
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #0f172a; 
  background-image: none;    
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  overscroll-behavior-y: none; /* 彻底禁止下拉刷新和橡皮筋回弹 */
}

.solid-panel {
  @apply bg-base-200 border border-base-content/10 shadow-lg;
}

@keyframes messageIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-message {
  animation: messageIn 0.2s ease-out forwards;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-base-content/20 rounded-full; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.overflow-y-auto { -webkit-overflow-scrolling: touch; }

.prose { @apply text-base-content/90 max-w-none leading-relaxed text-[15px]; }
.prose p { @apply mb-2; }
.prose blockquote { @apply not-italic border-l-4 border-primary bg-base-300 rounded-r-lg py-2 px-3 my-3 shadow-sm; border-left-color: oklch(var(--p)); }
.prose hr { @apply border-0 h-[1px] bg-base-content/10 my-4; }
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

/* iOS 底部小黑条与顶部刘海安全区适配 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .safe-pb {
    padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem) !important;
  }
  .safe-pt {
    padding-top: env(safe-area-inset-top) !important;
  }
}
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
import { useState, useRef } from 'react';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';
import type { ApiMode, ApiPreset, Settings } from '../lib/db';

type StudioMode = 'txt2img';

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

export function ImageStudio({
  settings,
  presets,
  activePresetId,
  activeModel,
  manualModels,
  fetchPresetModels,
  presetModelsMap,
  presetModelsLoading,
}: Props) {
  const [prompt, setPrompt] = useState('');
  
  // OpenAI 专属配置
  const [openAiSize, setOpenAiSize] = useState<string>('1024x1024');
  
  // HF 高级配置（可选参数，通常放入 JSON 中传递）
  const [extraJson, setExtraJson] = useState<string>('');

  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // --- 图片预览 ---
  const [viewerSrc, setViewerSrc] = useState<string>('');
  const [viewerZoom, setViewerZoom] = useState<number>(1);
  const [viewerOffset, setViewerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewerDragging, setViewerDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);

  const backend = (settings?.image_backend || 'huggingface') as 'huggingface' | 'openai';

  const resolvePresetById = (id?: number) => presets.find(p => p.id === id);
  const currentPreset = presets.find(p => p.id === activePresetId);

  const resolvedImagePreset =
    resolvePresetById(settings?.image_preset_id) || currentPreset;

  const resolvedImageModel =
    (settings?.image_model_id || '').trim() || (activeModel || '').trim();

  const commonSizes = ['1024x1024', '1024x1792', '1792x1024', '1280x720', '720x1280'];

  const openViewer = (src: string) => {
    setViewerSrc(src);
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
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

    const rawPrompt = (prompt || '').trim();
    if (!rawPrompt) {
      setError('请输入提示词');
      return;
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
      let reqBody: any;
      
      if (backend === 'huggingface') {
        if (!settings.hf_keys) throw new Error('请在系统设置中配置 Hugging Face Keys');
        const modelId = settings.hf_model_id || 'black-forest-labs/FLUX.1-schnell';
        
        reqBody = {
          backend: 'huggingface',
          model: modelId,
          apiKey: settings.hf_keys,
          payload: { prompt: rawPrompt, ...extra }
        };
      } else {
        if (!resolvedImagePreset || !resolvedImageModel) throw new Error('请配置生图预设/模型（或在顶部选择）');
        reqBody = {
          backend: 'openai',
          apiBase: resolvedImagePreset.api_base,
          apiKey: resolvedImagePreset.api_key,
          model: resolvedImageModel,
          payload: { prompt: rawPrompt, size: openAiSize || '1024x1024', n: 1, response_format: 'b64_json', ...extra }
        };
      }

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      
      if (!res.ok) {
        const errObj = await res.json().catch(()=>({error: "生图失败"}));
        throw new Error(errObj.error || "请求失败");
      }
      
      const data: any = await res.json();
      const out: string[] = [];
      if (Array.isArray(data?.images) && data.images[0]) {
        out.push(...data.images.map((b64: string) => `data:image/png;base64,${b64}`));
      }
      if (Array.isArray(data?.urls) && data.urls[0]) {
        out.push(...data.urls);
      }
      if (out.length === 0) throw new Error('后端未返回任何图片');
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
            <div className={`badge badge-outline ${backend === 'huggingface' ? 'badge-accent' : 'badge-info'}`}>
              {backend === 'huggingface' ? 'Hugging Face API' : 'OpenAI Compatible'}
            </div>
          </div>
          <div className="text-xs opacity-60">使用自然语言描述你想要生成的画面。</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card bg-base-200 border border-base-300 shadow-sm">
            <div className="card-body space-y-3">
              <div className="text-sm font-black">输入参数</div>
              
              <div className="form-control">
                <textarea className="textarea textarea-bordered w-full h-32" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="输入提示词（如: A cinematic shot of a cyberpunk city...）" />
              </div>

              {backend === 'openai' && (
                <div className="form-control">
                  <label className="label text-xs font-bold">生成尺寸 (Size)</label>
                  <select className="select select-bordered select-sm" value={openAiSize} onChange={e => setOpenAiSize(e.target.value)}>
                    {commonSizes.map(s => <option key={`sz-${s}`} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="form-control">
                <label className="label text-xs font-bold">高级参数 Payload (JSON)</label>
                <textarea className="textarea textarea-bordered w-full h-24 font-mono text-xs" value={extraJson} onChange={e => setExtraJson(e.target.value)} placeholder='如：{"guidance_scale": 7.5, "num_inference_steps": 25}' />
                <label className="label text-[10px] opacity-60 py-1">这部分参数将被合并发送到 API。</label>
              </div>

              {error && (
                <div className="alert alert-error py-2 text-xs">
                  <span className="break-words">{error}</span>
                </div>
              )}

              <button className={`btn btn-primary ${loading ? 'loading' : ''}`} onClick={run} disabled={loading}>
                开始生成
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


## File: src\components\lorebook\LorebookManager.tsx

```tsx
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import type { LorebookV2Entry } from '../../lib/db';
import { api } from '../../lib/db';

interface Props {
  charId?: number;
  roomId?: number;
}

export function LorebookManager({ charId, roomId }: Props) {
  const [entries, setEntries] = useState<LorebookV2Entry[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LorebookV2Entry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [charId, roomId]);

  const loadData = async () => {
    try {
      const data = await api.lorebookV2.list(charId, roomId);
      setEntries(data);
    } catch (e) {
      console.error('Failed to load lorebook', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    const newEntry: Partial<LorebookV2Entry> = {
      name: '新条目',
      content: '',
      priority: 0,
      position: 'before_system',
      probability: 1.0,
      use_once: false,
      cooldown_messages: 0,
      is_active: true
    };
    if (charId) newEntry.char_id = charId;
    if (roomId) newEntry.room_id = roomId;
    await api.lorebookV2.add(newEntry as LorebookV2Entry);
    await loadData();
  };

  const handleMigrate = async () => {
    if (confirm('要从旧世界书迁移数据吗？这会复制所有条目。')) {
      if (charId) await api.lorebookV2.migrateFromV1(charId);
      await loadData();
    }
  };

  const handleUpdate = async (id: number, updates: Partial<LorebookV2Entry>) => {
    await api.lorebookV2.update(id, updates);
    await loadData();
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定删除？')) {
      await api.lorebookV2.delete(id);
      await loadData();
    }
  };

  const categories = Array.from(new Set(entries.map(e => e.category).filter(Boolean)));
  const filteredEntries = entries.filter(e => {
    const matchesSearch = !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.keywords?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="p-4">加载中...</div>;

  return (
    <div className="flex flex-col h-full bg-base-200">
      <div className="p-4 border-b border-base-content/10">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">世界书 v2</h2>
          <div className="flex gap-2">
            {charId && (
              <button className="btn btn-sm btn-outline" onClick={handleMigrate}>迁移旧数据</button>
            )}
            <button className="btn btn-sm btn-primary" onClick={handleAddEntry}>
              <Plus size={16} className="mr-1" /> 新增条目
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="form-control flex-1 min-w-48">
            <div className="input-group">
              <Search size={16} className="opacity-60" />
              <input
                type="text"
                className="input input-bordered input-sm"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {categories.length > 0 && (
            <select
              className="select select-bordered select-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">所有分类</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center opacity-60 py-8">
            {searchTerm || filterCategory ? '没有匹配的条目' : '还没有条目，点击上方按钮创建'}
          </div>
        ) : (
          filteredEntries.map(entry => (
            <LorebookEntryCard
              key={entry.id || `temp-${Math.random()}`}
              entry={entry}
              onEdit={setEditingEntry}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {showEditor && editingEntry && editingEntry.id && (
        <LorebookEntryEditor
          entry={editingEntry}
          onClose={() => { setShowEditor(false); setEditingEntry(null); }}
          onSave={async (updates) => {
            await handleUpdate(editingEntry.id!, updates);
            setShowEditor(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}

function LorebookEntryCard({
  entry,
  onEdit,
  onUpdate,
  onDelete
}: {
  entry: LorebookV2Entry;
  onEdit: (e: LorebookV2Entry) => void;
  onUpdate: (id: number, updates: Partial<LorebookV2Entry>) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleEdit = () => {
    if (entry.id) {
      onEdit(entry);
    }
  };

  const handleDeleteClick = () => {
    if (entry.id) {
      onDelete(entry.id);
    }
  };

  return (
    <div className={`card bg-base-100 border ${entry.is_active ? 'border-base-content/10' : 'border-error/30 opacity-60'}`}>
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{entry.name}</h3>
              {entry.category && (
                <span className="badge badge-outline badge-sm">{entry.category}</span>
              )}
              <span className="badge badge-sm opacity-60">优先级: {entry.priority}</span>
            </div>
            {entry.keywords && (
              <p className="text-sm opacity-60 font-mono mt-1">{entry.keywords}</p>
            )}
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-sm" onClick={handleEdit}>
              <Edit size={16} />
            </button>
            <button className="btn btn-ghost btn-sm text-error" onClick={handleDeleteClick}>
              <Trash2 size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-base-content/10 space-y-3">
            <div className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {entry.content}
            </div>
            <div className="flex flex-wrap gap-2 text-xs opacity-70">
              {entry.regex_pattern && <span className="badge badge-ghost">正则匹配</span>}
              {entry.trigger_condition && <span className="badge badge-ghost">条件触发</span>}
              {entry.probability < 1 && <span className="badge badge-ghost">{(entry.probability * 100).toFixed(0)}% 概率</span>}
              {entry.use_once && <span className="badge badge-ghost">仅一次</span>}
              {entry.cooldown_messages > 0 && <span className="badge badge-ghost">冷却 {entry.cooldown_messages} 条</span>}
              <span className="badge badge-ghost">位置: {entry.position}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LorebookEntryEditor({
  entry,
  onClose,
  onSave
}: {
  entry: LorebookV2Entry;
  onClose: () => void;
  onSave: (updates: Partial<LorebookV2Entry>) => void;
}) {
  const [form, setForm] = useState(entry);

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">编辑条目</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label font-bold text-sm">名称</label>
              <input
                className="input input-bordered"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label font-bold text-sm">分类</label>
              <input
                className="input input-bordered"
                value={form.category ?? ''}
                onChange={(e) => setForm({ ...form, category: e.target.value || undefined })}
                placeholder="可选"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label font-bold text-sm">关键词（逗号分隔）</label>
            <input
              className="input input-bordered font-mono"
              value={form.keywords ?? ''}
              onChange={(e) => setForm({ ...form, keywords: e.target.value || undefined })}
              placeholder="* 表示始终触发"
            />
          </div>

          <div className="form-control">
            <label className="label font-bold text-sm">正则匹配</label>
            <input
              className="input input-bordered font-mono"
              value={form.regex_pattern ?? ''}
              onChange={(e) => setForm({ ...form, regex_pattern: e.target.value || undefined })}
              placeholder="可选"
            />
          </div>

          <div className="form-control">
            <label className="label font-bold text-sm">内容</label>
            <textarea
              className="textarea textarea-bordered h-48"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label font-bold text-sm">优先级</label>
              <input
                type="number"
                className="input input-bordered"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-control">
              <label className="label font-bold text-sm">触发概率</label>
              <input
                type="number"
                className="input input-bordered"
                step="0.01"
                min="0"
                max="1"
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label font-bold text-sm">注入位置</label>
              <select
                className="select select-bordered"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value as any })}
              >
                <option value="before_system">在系统提示词前</option>
                <option value="after_system">在系统提示词后</option>
                <option value="last">最后</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label font-bold text-sm">冷却（消息数）</label>
              <input
                type="number"
                className="input input-bordered"
                min="0"
                value={form.cooldown_messages}
                onChange={(e) => setForm({ ...form, cooldown_messages: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label font-bold text-sm">触发条件（JavaScript 表达式）</label>
            <textarea
              className="textarea textarea-bordered font-mono text-sm h-24"
              value={form.trigger_condition ?? ''}
              onChange={(e) => setForm({ ...form, trigger_condition: e.target.value || undefined })}
              placeholder="例如: variables.affection > 50"
            />
          </div>

          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span className="text-sm">启用</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.use_once}
                onChange={(e) => setForm({ ...form, use_once: e.target.checked })}
              />
              <span className="text-sm">仅触发一次</span>
            </label>
          </div>
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>保存</button>
        </div>
      </div>
    </div>
  );
}

```


## File: src\components\snapshots\SnapshotManager.tsx

```tsx
import { useState, useEffect } from 'react';
import { Plus, History, RotateCcw, GitBranch, Calendar, Clock, X, Trash2 } from 'lucide-react';
import type { Snapshot, SnapshotMessage, SnapshotVariable, BranchInfo, AutoSnapshotRule } from '../../lib/db';
import { api } from '../../lib/db';

interface Props {
  charId?: number;
  roomId?: number;
  onRestore?: () => void;
}

export function SnapshotManager({ charId, roomId, onRestore }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [rules, setRules] = useState<AutoSnapshotRule[]>([]);
  const [showViewer, setShowViewer] = useState(false);
  const [viewingSnapshot, setViewingSnapshot] = useState<{ snapshot: Snapshot; messages: SnapshotMessage[]; variables: SnapshotVariable[] } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [charId, roomId]);

  const loadData = async () => {
    try {
      const [s, b, r] = await Promise.all([
        api.snapshots.list(charId, roomId),
        api.branches.list(charId, roomId),
        api.autoSnapshotRules.list(charId, roomId)
      ]);
      setSnapshots(s);
      setBranches(b);
      setRules(r);
    } catch (e) {
      console.error('Failed to load snapshots', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async (name: string, description?: string) => {
    await api.snapshots.create({ char_id: charId, room_id: roomId, name, description });
    await loadData();
  };

  const handleRestore = async (snapshot: Snapshot) => {
    if (confirm(`确定要恢复到快照 "${snapshot.name}" 吗？当前进度将会丢失。`)) {
      if (snapshot.id) await api.snapshots.restore(snapshot.id);
      await loadData();
      onRestore?.();
    }
  };

  const handleView = async (snapshot: Snapshot) => {
    if (snapshot.id) {
      const data = await api.snapshots.get(snapshot.id);
      setViewingSnapshot(data);
      setShowViewer(true);
    }
  };

  const handleDelete = async (snapshot: Snapshot) => {
    if (confirm(`确定要删除快照 "${snapshot.name}" 吗？`)) {
      if (snapshot.id) await api.snapshots.delete(snapshot.id);
      await loadData();
    }
  };

  if (loading) return <div className="p-4">加载中...</div>;

  return (
    <div className="flex flex-col h-full bg-base-200">
      <div className="p-4 border-b border-base-content/10">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">快照管理</h2>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus size={16} className="mr-1" /> 创建快照
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <History size={16} /> 快照
          </h3>
          <div className="space-y-2">
            {snapshots.length === 0 ? (
              <div className="text-center opacity-60 py-4">还没有快照</div>
            ) : (
              snapshots.map(s => (
                <div key={s.id} className="card bg-base-100 border border-base-content/10">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{s.name}</h4>
                        <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
                          <Calendar size={12} />
                          {new Date(s.created_at!).toLocaleString()}
                          <span className="badge badge-sm">{s.snapshot_type}</span>
                          {s.message_count && <span className="badge badge-sm">{s.message_count} 条消息</span>}
                        </div>
                        {s.description && <p className="text-sm opacity-70 mt-1">{s.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleView(s)}>查看</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRestore(s)}><RotateCcw size={14} /></button>
                        <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDelete(s)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <GitBranch size={16} /> 分支
          </h3>
          <div className="space-y-2">
            {branches.map(b => (
              <div key={b.id} className="card bg-base-100 border border-base-content/10">
                <div className="card-body p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">{b.name}</h4>
                    <div className="text-xs opacity-60">
                      {new Date(b.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm">切换</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showViewer && viewingSnapshot && (
        <SnapshotViewer
          snapshot={viewingSnapshot.snapshot}
          messages={viewingSnapshot.messages}
          variables={viewingSnapshot.variables}
          onClose={() => { setShowViewer(false); setViewingSnapshot(null); }}
          onRestore={() => handleRestore(viewingSnapshot.snapshot)}
        />
      )}

      {showCreateDialog && (
        <CreateSnapshotDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={async (name, desc) => {
            await handleCreateSnapshot(name, desc);
            setShowCreateDialog(false);
          }}
        />
      )}
    </div>
  );
}

function SnapshotViewer({
  snapshot,
  messages,
  variables,
  onClose,
  onRestore
}: {
  snapshot: Snapshot;
  messages: SnapshotMessage[];
  variables: SnapshotVariable[];
  onClose: () => void;
  onRestore: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'messages' | 'variables'>('messages');

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center border-b border-base-content/10 pb-4 mb-4">
          <h3 className="font-bold text-lg">{snapshot.name}</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tabs tabs-boxed mb-4">
          <button className={`tab ${activeTab === 'messages' ? 'tab-active' : ''}`} onClick={() => setActiveTab('messages')}>
            消息 ({messages.length})
          </button>
          <button className={`tab ${activeTab === 'variables' ? 'tab-active' : ''}`} onClick={() => setActiveTab('variables')}>
            变量 ({variables.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'messages' ? (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                  <div className="chat-bubble text-sm">{m.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {variables.map((v, i) => (
                <div key={i} className="card bg-base-200 p-3">
                  <div className="flex justify-between">
                    <span className="font-bold">{v.key}</span>
                    <span className="font-mono">{JSON.stringify(v.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-action pt-4 border-t border-base-content/10 mt-4">
          <button className="btn" onClick={onClose}>关闭</button>
          <button className="btn btn-primary" onClick={onRestore}>恢复此快照</button>
        </div>
      </div>
    </div>
  );
}

function CreateSnapshotDialog({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const defaultName = `快照 ${new Date().toLocaleString()}`;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">创建快照</h3>
        <div className="space-y-4">
          <div className="form-control">
            <label className="label font-bold text-sm">名称</label>
            <input
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
            />
          </div>
          <div className="form-control">
            <label className="label font-bold text-sm">描述</label>
            <textarea
              className="textarea textarea-bordered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选"
            />
          </div>
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onCreate(name || defaultName, description)}>创建</button>
        </div>
      </div>
    </div>
  );
}

```


## File: src\components\variables\VariableManager.tsx

```tsx
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import type { Variable, VariableStage, VariableThoughtConfig } from '../../lib/db';
import { api } from '../../lib/db';

interface Props {
  charId?: number;
  roomId?: number;
}

export function VariableManager({ charId, roomId }: Props) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [stages, setStages] = useState<Map<number, VariableStage[]>>(new Map());
  const [thoughtConfig, setThoughtConfig] = useState<VariableThoughtConfig | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [showThoughtConfig, setShowThoughtConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [charId, roomId]);

  const loadData = async () => {
    try {
      const vars = await api.variables.list(charId, roomId);
      setVariables(vars);
      for (const v of vars) {
        if (v.id) {
          const st = await api.variableStages.list(v.id);
          setStages(prev => new Map(prev).set(v.id!, st));
        }
      }
      const config = await api.variableThoughtConfig.get(charId, roomId);
      setThoughtConfig(config);
    } catch (e) {
      console.error('Failed to load variables', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariable = async () => {
    const newVar: Partial<Variable> = {
      name: '新变量',
      key: 'new_var',
      type: 'number',
      value: 0,
      is_persistent: true,
      is_visible: true
    };
    if (charId) newVar.char_id = charId;
    if (roomId) newVar.room_id = roomId;
    await api.variables.add(newVar as Variable);
    await loadData();
  };

  const handleUpdateVariable = async (id: number, updates: Partial<Variable>) => {
    await api.variables.update(id, updates);
    await loadData();
  };

  const handleDeleteVariable = async (id: number) => {
    if (confirm('确定要删除这个变量吗？')) {
      await api.variables.delete(id);
      await loadData();
    }
  };

  if (loading) return <div className="p-4">加载中...</div>;

  return (
    <div className="flex flex-col h-full bg-base-200">
      <div className="p-4 border-b border-base-content/10 flex justify-between items-center">
        <h2 className="font-bold text-lg">变量管理</h2>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setShowThoughtConfig(true)}
          >
            <Settings size={16} className="mr-1" /> 思考配置
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleAddVariable}>
            <Plus size={16} className="mr-1" /> 新增变量
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {variables.length === 0 ? (
          <div className="text-center opacity-60 py-8">
            还没有变量，点击上方按钮创建一个
          </div>
        ) : (
          variables.map(v => (
            <VariableCard
              key={v.id || `temp-${Math.random()}`}
              variable={v}
              stages={stages.get(v.id!) || []}
              onEdit={setEditingVariable}
              onUpdate={handleUpdateVariable}
              onDelete={handleDeleteVariable}
            />
          ))
        )}
      </div>

      {showEditor && editingVariable && (
        <VariableEditor
          variable={editingVariable}
          stages={stages.get(editingVariable.id!) || []}
          onClose={() => { setShowEditor(false); setEditingVariable(null); }}
          onSave={async (updates) => {
            if (editingVariable.id) await handleUpdateVariable(editingVariable.id, updates);
            setShowEditor(false);
            setEditingVariable(null);
          }}
        />
      )}

      {showThoughtConfig && (
        <ThoughtConfigModal
          charId={charId}
          roomId={roomId}
          config={thoughtConfig}
          onClose={() => setShowThoughtConfig(false)}
          onSave={async (config) => {
            await api.variableThoughtConfig.save(config);
            await loadData();
            setShowThoughtConfig(false);
          }}
        />
      )}
    </div>
  );
}

function VariableCard({
  variable,
  stages,
  onEdit,
  onUpdate,
  onDelete
}: {
  variable: Variable;
  stages: VariableStage[];
  onEdit: (v: Variable) => void;
  onUpdate: (id: number, updates: Partial<Variable>) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tempValue, setTempValue] = useState(variable.value);
  const [isEditingValue, setIsEditingValue] = useState(false);

  const getPercentage = () => {
    if (variable.min_value !== undefined && variable.max_value !== undefined) {
      const range = variable.max_value - variable.min_value;
      if (range > 0) {
        return Math.min(100, Math.max(0, ((variable.value - variable.min_value) / range) * 100));
      }
    }
    return undefined;
  };

  const activeStage = stages.find(s => {
    try {
      const func = new Function('v', `return ${s.condition};`);
      return func(variable.value);
    } catch {
      return false;
    }
  });

  const percentage = getPercentage();

  const handleSaveValue = async () => {
    if (variable.id) {
      await onUpdate(variable.id, { value: tempValue });
      setIsEditingValue(false);
    }
  };

  const handleEdit = () => {
    onEdit(variable);
  };

  const handleDeleteClick = () => {
    if (variable.id) {
      onDelete(variable.id);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-content/10">
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold">{variable.name}</h3>
            <p className="text-sm opacity-60 font-mono">{variable.key}</p>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-sm" onClick={handleEdit}>
              <Edit size={16} />
            </button>
            <button className="btn btn-ghost btn-sm text-error" onClick={handleDeleteClick}>
              <Trash2 size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <div className="mt-3">
          {variable.type === 'number' || variable.type === 'range' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isEditingValue ? (
                  <>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-24"
                      value={tempValue}
                      onChange={(e) => setTempValue(parseFloat(e.target.value))}
                      step={variable.step || 1}
                      min={variable.min_value}
                      max={variable.max_value}
                    />
                    <button className="btn btn-sm btn-primary" onClick={handleSaveValue}>保存</button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg">{variable.value}</span>
                    <button className="btn btn-ghost btn-xs" onClick={() => setIsEditingValue(true)}>
                      <Edit size={12} />
                    </button>
                  </div>
                )}
              </div>
              {percentage !== undefined && (
                <progress className="progress progress-primary w-full" value={percentage} max="100" />
              )}
              <div className="text-xs opacity-60 flex gap-2">
                {variable.min_value !== undefined && <span>min: {variable.min_value}</span>}
                {variable.max_value !== undefined && <span>max: {variable.max_value}</span>}
              </div>
            </div>
          ) : variable.type === 'boolean' ? (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={Boolean(variable.value)}
                onChange={(e) => variable.id && onUpdate(variable.id, { value: e.target.checked })}
              />
              <span>{variable.value ? '是' : '否'}</span>
            </div>
          ) : (
            <div>
              {isEditingValue ? (
                <>
                  <textarea
                    className="textarea textarea-bordered w-full text-sm"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                  />
                  <button className="btn btn-sm btn-primary mt-2" onClick={handleSaveValue}>保存</button>
                </>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="font-mono">{variable.value}</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => setIsEditingValue(true)}>
                    <Edit size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {activeStage && (
          <div className="mt-3 p-2 bg-primary/10 rounded-lg border border-primary/20">
            <span className="text-xs font-bold text-primary">当前阶段：{activeStage.name}</span>
          </div>
        )}

        {expanded && (
          <div className="mt-4 pt-4 border-t border-base-content/10">
            {variable.description && (
              <p className="text-sm opacity-70 mb-3">{variable.description}</p>
            )}
            {stages.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold">阶段配置</h4>
                {stages.map(s => (
                  <div key={s.id} className="text-sm p-2 bg-base-200 rounded">
                    <div className="font-bold">{s.name}</div>
                    <div className="font-mono text-xs opacity-70">{s.condition}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VariableEditor({
  variable,
  stages,
  onClose,
  onSave
}: {
  variable: Variable;
  stages: VariableStage[];
  onClose: () => void;
  onSave: (updates: Partial<Variable>) => void;
}) {
  const [form, setForm] = useState(variable);

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">编辑变量</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label font-bold text-sm">名称</label>
              <input
                className="input input-bordered"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label font-bold text-sm">键</label>
              <input
                className="input input-bordered font-mono"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
              />
            </div>
          </div>
          <div className="form-control">
            <label className="label font-bold text-sm">类型</label>
            <select
              className="select select-bordered"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            >
              <option value="number">数字</option>
              <option value="range">范围</option>
              <option value="string">字符串</option>
              <option value="boolean">布尔</option>
            </select>
          </div>
          {(form.type === 'number' || form.type === 'range') && (
            <div className="grid grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label font-bold text-sm">最小值</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.min_value ?? ''}
                  onChange={(e) => setForm({ ...form, min_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div className="form-control">
                <label className="label font-bold text-sm">最大值</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.max_value ?? ''}
                  onChange={(e) => setForm({ ...form, max_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div className="form-control">
                <label className="label font-bold text-sm">步长</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.step ?? ''}
                  onChange={(e) => setForm({ ...form, step: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
            </div>
          )}
          <div className="form-control">
            <label className="label font-bold text-sm">描述</label>
            <textarea
              className="textarea textarea-bordered"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.is_persistent}
                onChange={(e) => setForm({ ...form, is_persistent: e.target.checked })}
              />
              <span className="text-sm">持久化</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.is_visible}
                onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
              />
              <span className="text-sm">可见</span>
            </label>
          </div>
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>保存</button>
        </div>
      </div>
    </div>
  );
}

function ThoughtConfigModal({
  charId,
  roomId,
  config,
  onClose,
  onSave
}: {
  charId?: number;
  roomId?: number;
  config: VariableThoughtConfig | null;
  onClose: () => void;
  onSave: (config: VariableThoughtConfig) => void;
}) {
  const [form, setForm] = useState(config || {
    char_id: charId,
    room_id: roomId,
    is_auto_update: false
  });

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">思考配置</h3>
        <div className="space-y-4">
          <div className="form-control">
            <label className="label font-bold text-sm">自动更新</label>
            <label className="label cursor-pointer">
              <span className="text-sm">启用自动变量更新</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={form.is_auto_update}
                onChange={(e) => setForm({ ...form, is_auto_update: e.target.checked })}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label font-bold text-sm">更新间隔（N条消息后）</label>
            <input
              type="number"
              className="input input-bordered"
              value={form.update_interval ?? ''}
              onChange={(e) => setForm({ ...form, update_interval: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
          <div className="form-control">
            <label className="label font-bold text-sm">思考提示词</label>
            <textarea
              className="textarea textarea-bordered h-48 font-mono text-sm"
              value={form.thought_prompt ?? ''}
              onChange={(e) => setForm({ ...form, thought_prompt: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>保存</button>
        </div>
      </div>
    </div>
  );
}

```


## File: src\lib\db.ts

```ts
export type ApiMode = 'chat_completions' | 'responses';

export type VariableType = 'number' | 'string' | 'boolean' | 'range';
export type SnapshotType = 'manual' | 'auto' | 'checkpoint';
export type LorebookPosition = 'before_system' | 'after_system' | 'last';
export type RuleType = 'interval' | 'turn_count' | 'variable_change';

export interface Character {
  id?: number;
  name: string;
  description: string;
  first_message: string;
  summary?: string;
  created_at?: number;
}

export interface Message {
  id?: number;
  char_id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  timestamp: number;
  snapshot_id?: number;
  branch_id?: string;
}

export interface Room {
  id?: number;
  name: string;
  description?: string;
  summary?: string;
  created_at?: number;
  updated_at?: number;
}

export interface RoomMember {
  char_id: number;
}

export interface RoomMessage {
  id?: number;
  room_id: number;
  char_id?: number;
  sender_type?: 'user' | 'agent' | 'system';
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  meta_json?: string;
  timestamp: number;
  snapshot_id?: number;
  branch_id?: string;
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
  image_backend?: 'huggingface' | 'openai';
  image_preset_id?: number;
  image_model_id?: string;
  hf_keys?: string;
  hf_model_id?: string;
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
  is_active: boolean;
  priority?: number;
  isActive?: boolean; // 向后兼容
}

export interface ImageRecord {
  id?: number;
  r2_key: string;
  message_id?: number;
  room_message_id?: number;
  char_id?: number;
  room_id?: number;
  prompt?: string;
  created_at?: number;
}

// ============================================
// 新增: v3.0 类型定义
// ============================================

export interface Variable {
  id?: number;
  char_id?: number;
  room_id?: number;
  name: string;
  key: string;
  type: VariableType;
  value?: any;
  min_value?: number;
  max_value?: number;
  step?: number;
  is_persistent: boolean;
  is_visible: boolean;
  description?: string;
  created_at?: number;
  updated_at?: number;
}

export interface VariableStage {
  id?: number;
  variable_id: number;
  name: string;
  condition: string;
  priority: number;
  stage_prompt?: string;
  is_active: boolean;
  created_at?: number;
}

export interface VariableThoughtConfig {
  id?: number;
  char_id?: number;
  room_id?: number;
  preset_id?: number;
  model?: string;
  thought_prompt?: string;
  update_condition?: string;
  update_interval?: number;
  is_auto_update: boolean;
  created_at?: number;
}

export interface LorebookV2Entry {
  id?: number;
  char_id?: number;
  room_id?: number;
  name: string;
  keywords?: string;
  regex_pattern?: string;
  content: string;
  trigger_condition?: string;
  priority: number;
  category?: string;
  position: LorebookPosition;
  insertion_depth?: number;
  parent_id?: number;
  probability: number;
  use_once: boolean;
  cooldown_messages: number;
  last_triggered_at?: number;
  is_active: boolean;
  created_at?: number;
  updated_at?: number;
}

export interface Snapshot {
  id?: number;
  char_id?: number;
  room_id?: number;
  name: string;
  description?: string;
  thumbnail?: string;
  snapshot_type: SnapshotType;
  message_count?: number;
  created_at?: number;
}

export interface SnapshotMessage {
  id?: number;
  snapshot_id: number;
  original_message_id?: number;
  char_id?: number;
  room_id?: number;
  role: string;
  content?: string;
  image?: string;
  timestamp?: number;
  order_index?: number;
}

export interface SnapshotVariable {
  id?: number;
  snapshot_id: number;
  variable_id?: number;
  key: string;
  value?: string;
  type?: string;
}

export interface AutoSnapshotRule {
  id?: number;
  char_id?: number;
  room_id?: number;
  name: string;
  rule_type: RuleType;
  interval_minutes?: number;
  turn_count?: number;
  variable_key?: string;
  keep_count: number;
  is_active: boolean;
  created_at?: number;
}

export interface MessageEdit {
  id?: number;
  message_id: number;
  char_id?: number;
  room_id?: number;
  old_content?: string;
  new_content?: string;
  edited_at?: number;
}

export interface BranchInfo {
  id: string;
  name: string;
  snapshot_id?: number;
  created_at: number;
}

const API = '/api';
const headers = { 'Content-Type': 'application/json' };

export const api = {
  characters: {
    list: () => fetch(`${API}/characters`).then(r => r.json() as Promise<Character[]>),
    add: (c: Character) => fetch(`${API}/characters`, { method: 'POST', headers, body: JSON.stringify(c) }).then(r => r.json() as Promise<{ id: number }>),
    duplicate: (sourceId: number, newName: string) => fetch(`${API}/characters?action=duplicate`, { method: 'POST', headers, body: JSON.stringify({ source_id: sourceId, new_name: newName }) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, c: Partial<Character>) => fetch(`${API}/characters`, { method: 'PUT', headers, body: JSON.stringify({ id, ...c }) }),
    delete: (id: number) => fetch(`${API}/characters?id=${id}`, { method: 'DELETE' }),
  },
  
  rooms: {
    list: () => fetch(`${API}/rooms`).then(r => r.json() as Promise<Room[]>),
    add: (room: Partial<Room>) => fetch(`${API}/rooms`, { method: 'POST', headers, body: JSON.stringify(room) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, room: Partial<Room>) => fetch(`${API}/rooms`, { method: 'PUT', headers, body: JSON.stringify({ id, ...room }) }),
    delete: (id: number) => fetch(`${API}/rooms?id=${id}`, { method: 'DELETE' }),
    getMembers: (roomId: number) => fetch(`${API}/rooms?type=members&room_id=${roomId}`).then(r => r.json() as Promise<RoomMember[]>),
    updateMembers: (roomId: number, members: RoomMember[]) => fetch(`${API}/rooms?type=members`, { method: 'PUT', headers, body: JSON.stringify({ room_id: roomId, members }) }),
  },
  
  roomMessages: {
    list: (roomId: number) => fetch(`${API}/room_messages?room_id=${roomId}`).then(r => r.json() as Promise<RoomMessage[]>),
    add: (m: RoomMessage) => fetch(`${API}/room_messages`, { method: 'POST', headers, body: JSON.stringify(m) }).then(r => r.json() as Promise<{ id: number }>),
    delete: (id: number) => fetch(`${API}/room_messages?id=${id}`, { method: 'DELETE' }),
    clear: (roomId: number) => fetch(`${API}/room_messages?room_id=${roomId}`, { method: 'DELETE' }),
  },
  
  roomChat: {
    send: (body: { room_id: number; user_input?: string; speaker_char_id: number; fallback_preset_id?: number; fallback_model_id?: string; }) =>
      fetch(`${API}/room_chat`, { method: 'POST', headers, body: JSON.stringify(body) }).then(async r => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      }),
  },
  
  presets: {
    list: () => fetch(`${API}/presets`).then(r => r.json() as Promise<ApiPreset[]>),
    add: (p: ApiPreset) => fetch(`${API}/presets`, { method: 'POST', headers, body: JSON.stringify(p) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, p: ApiPreset) => fetch(`${API}/presets`, { method: 'PUT', headers, body: JSON.stringify({ id, ...p }) }),
    delete: (id: number) => fetch(`${API}/presets?id=${id}`, { method: 'DELETE' }),
  },
  
  messages: {
    list: (charId?: number) => fetch(`${API}/messages?char_id=${charId}`).then(r => r.json() as Promise<Message[]>),
    add: (m: Message) => fetch(`${API}/messages`, { method: 'POST', headers, body: JSON.stringify(m) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, content: string) => fetch(`${API}/messages`, { method: 'PUT', headers, body: JSON.stringify({ id, content }) }),
    delete: (id: number) => fetch(`${API}/messages?id=${id}`, { method: 'DELETE' }),
    clear: (charId?: number) => fetch(`${API}/messages?char_id=${charId}`, { method: 'DELETE' }),
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
  },
  
  images: {
    get: (key: string) => fetch(`${API}/images?key=${encodeURIComponent(key)}`),
    list: (charId?: number, roomId?: number) => fetch(`${API}/images?${charId ? `char_id=${charId}` : `room_id=${roomId}`}`).then(r => r.json() as Promise<ImageRecord[]>),
    delete: (id?: number, key?: string, charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (id) params.set('id', String(id));
      if (key) params.set('key', key);
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/images?${params}`, { method: 'DELETE' });
    },
  },

  // ============================================
  // 新增: v3.0 API 客户端
  // ============================================

  variables: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/variables?${params}`).then(r => r.json() as Promise<Variable[]>);
    },
    get: (id: number) => fetch(`${API}/variables?id=${id}`).then(r => r.json() as Promise<Variable>),
    add: (v: Variable) => fetch(`${API}/variables`, { method: 'POST', headers, body: JSON.stringify(v) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, v: Partial<Variable>) => fetch(`${API}/variables`, { method: 'PUT', headers, body: JSON.stringify({ id, ...v }) }),
    delete: (id: number) => fetch(`${API}/variables?id=${id}`, { method: 'DELETE' }),
    bulkUpdate: (updates: Array<{ id: number; value: any }>) =>
      fetch(`${API}/variables?action=bulk`, { method: 'POST', headers, body: JSON.stringify({ updates }) }),
  },

  variableStages: {
    list: (variableId: number) => fetch(`${API}/variables/stages?variable_id=${variableId}`).then(r => r.json() as Promise<VariableStage[]>),
    add: (s: VariableStage) => fetch(`${API}/variables/stages`, { method: 'POST', headers, body: JSON.stringify(s) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, s: Partial<VariableStage>) => fetch(`${API}/variables/stages`, { method: 'PUT', headers, body: JSON.stringify({ id, ...s }) }),
    delete: (id: number) => fetch(`${API}/variables/stages?id=${id}`, { method: 'DELETE' }),
  },

  variableThoughtConfig: {
    get: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/variables/thought-config?${params}`).then(r => r.json() as Promise<VariableThoughtConfig | null>);
    },
    save: (config: VariableThoughtConfig) => fetch(`${API}/variables/thought-config`, { method: 'POST', headers, body: JSON.stringify(config) }),
    triggerThought: (body: { char_id?: number; room_id?: number; history?: any[]; user_input?: string }) =>
      fetch(`${API}/variables/thought`, { method: 'POST', headers, body: JSON.stringify(body) }).then(async r => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      }),
  },

  lorebookV2: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/lorebook-v2?${params}`).then(r => r.json() as Promise<LorebookV2Entry[]>);
    },
    add: (entry: LorebookV2Entry) => fetch(`${API}/lorebook-v2`, { method: 'POST', headers, body: JSON.stringify(entry) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, entry: Partial<LorebookV2Entry>) => fetch(`${API}/lorebook-v2`, { method: 'PUT', headers, body: JSON.stringify({ id, ...entry }) }),
    delete: (id: number) => fetch(`${API}/lorebook-v2?id=${id}`, { method: 'DELETE' }),
    migrateFromV1: (charId: number) => fetch(`${API}/lorebook-v2?action=migrate&char_id=${charId}`, { method: 'POST' }),
  },

  snapshots: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/snapshots?${params}`).then(r => r.json() as Promise<Snapshot[]>);
    },
    get: (id: number) => fetch(`${API}/snapshots?id=${id}`).then(r => r.json() as Promise<{ snapshot: Snapshot; messages: SnapshotMessage[]; variables: SnapshotVariable[] }>),
    create: (body: { char_id?: number; room_id?: number; name: string; description?: string }) =>
      fetch(`${API}/snapshots`, { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json() as Promise<{ id: number }>),
    delete: (id: number) => fetch(`${API}/snapshots?id=${id}`, { method: 'DELETE' }),
    restore: (id: number) => fetch(`${API}/snapshots/restore`, { method: 'POST', headers, body: JSON.stringify({ id }) }),
    createBranch: (id: number, name: string) => fetch(`${API}/snapshots/branch`, { method: 'POST', headers, body: JSON.stringify({ snapshot_id: id, name }) }).then(r => r.json() as Promise<{ branch_id: string }>),
  },

  branches: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/branches?${params}`).then(r => r.json() as Promise<BranchInfo[]>);
    },
    switch: (branchId: string) => fetch(`${API}/branches/switch`, { method: 'POST', headers, body: JSON.stringify({ branch_id: branchId }) }),
    delete: (branchId: string) => fetch(`${API}/branches?branch_id=${encodeURIComponent(branchId)}`, { method: 'DELETE' }),
  },

  autoSnapshotRules: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/auto-snapshot-rules?${params}`).then(r => r.json() as Promise<AutoSnapshotRule[]>);
    },
    add: (rule: AutoSnapshotRule) => fetch(`${API}/auto-snapshot-rules`, { method: 'POST', headers, body: JSON.stringify(rule) }).then(r => r.json() as Promise<{ id: number }>),
    update: (id: number, rule: Partial<AutoSnapshotRule>) => fetch(`${API}/auto-snapshot-rules`, { method: 'PUT', headers, body: JSON.stringify({ id, ...rule }) }),
    delete: (id: number) => fetch(`${API}/auto-snapshot-rules?id=${id}`, { method: 'DELETE' }),
  }
};

```


## File: src\lib\llm.ts

```ts
﻿import type { Character, Settings, Message, ApiMode } from './db';

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
    systemContent: string, // [修改] 直接接收外部组装好的完整 System Prompt
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
          ? `(Input: ${playerDisplayName}) -> ${userInputs}`
          : userInputs,
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
          systemContent: systemContent, // 使用传入的完整 Prompt
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


## File: src\lib\lorebook-engine.ts

```ts
import type { LorebookV2Entry, Message } from './db';

export class LorebookEngine {
  private entries: LorebookV2Entry[];
  private triggerHistory: Map<number, { count: number; lastTriggered: number }>;
  private totalMessageCount: number = 0;

  constructor(entries: LorebookV2Entry[] = []) {
    this.entries = entries;
    this.triggerHistory = new Map();
  }

  setEntries(entries: LorebookV2Entry[]) {
    this.entries = entries;
  }

  incrementMessageCount() {
    this.totalMessageCount++;
  }

  scan(
    input: string,
    history: Message[],
    variables: Record<string, any> = {},
    context: any = {}
  ): LorebookV2Entry[] {
    const triggered: LorebookV2Entry[] = [];
    const contextText = (input + ' ' + history.map(m => m.content).join(' ')).toLowerCase();

    const activeEntries = this.entries
      .filter(e => e.is_active)
      .sort((a, b) => b.priority - a.priority);

    for (const entry of activeEntries) {
      if (this.shouldTrigger(entry, contextText, history, variables, context)) {
        triggered.push(entry);
        this.recordTrigger(entry.id!);
      }
    }

    const byParent = new Map<number | null, LorebookV2Entry[]>();
    for (const entry of triggered) {
      const parentId = entry.parent_id || null;
      const children = byParent.get(parentId) || [];
      children.push(entry);
      byParent.set(parentId, children);
    }

    const result: LorebookV2Entry[] = [];
    const addWithChildren = (entry: LorebookV2Entry, depth = 0) => {
      if (entry.insertion_depth !== undefined && depth > entry.insertion_depth) return;
      result.push(entry);
      const children = byParent.get(entry.id ?? null) || [];
      for (const child of children) {
        addWithChildren(child, depth + 1);
      }
    };

    for (const entry of byParent.get(null) || []) {
      addWithChildren(entry);
    }

    return result;
  }

  private shouldTrigger(
    entry: LorebookV2Entry,
    contextText: string,
    history: Message[],
    variables: Record<string, any>,
    context: any
  ): boolean {
    const historyData = this.triggerHistory.get(entry.id!);
    if (entry.use_once && historyData && historyData.count > 0) return false;
    if (entry.cooldown_messages > 0 && historyData) {
      const messagesSince = this.totalMessageCount - historyData.lastTriggered;
      if (messagesSince < entry.cooldown_messages) return false;
    }
    if (entry.probability < 1 && Math.random() > entry.probability) return false;

    let matchesKeywords = false;
    if (entry.keywords) {
      if (entry.keywords.trim() === '*') {
        matchesKeywords = true;
      } else {
        const keywords = entry.keywords.split(/[,，\n]/).map(k => k.trim().toLowerCase()).filter(k => k);
        matchesKeywords = keywords.some(k => contextText.includes(k));
      }
    }

    let matchesRegex = false;
    if (entry.regex_pattern) {
      try {
        const regex = new RegExp(entry.regex_pattern, 'i');
        matchesRegex = regex.test(contextText);
      } catch {
        matchesRegex = false;
      }
    }

    let matchesCondition = true;
    if (entry.trigger_condition) {
      try {
        const func = new Function('variables', 'history', 'context', `return ${entry.trigger_condition};`);
        matchesCondition = func(variables, history, context);
      } catch {
        matchesCondition = false;
      }
    }

    const hasAnyMatch = entry.keywords || entry.regex_pattern ? (matchesKeywords || matchesRegex) : true;
    return hasAnyMatch && matchesCondition;
  }

  private recordTrigger(entryId: number) {
    const existing = this.triggerHistory.get(entryId) || { count: 0, lastTriggered: this.totalMessageCount };
    this.triggerHistory.set(entryId, {
      count: existing.count + 1,
      lastTriggered: this.totalMessageCount
    });
  }

  buildInjection(triggered: LorebookV2Entry[]): { beforeSystem: string; afterSystem: string; last: string } {
    const byPosition = {
      beforeSystem: [] as string[],
      afterSystem: [] as string[],
      last: [] as string[]
    };

    for (const entry of triggered) {
      const position = entry.position || 'before_system';
      const arr = byPosition[position as keyof typeof byPosition] || byPosition.beforeSystem;
      arr.push(entry.content);
    }

    return {
      beforeSystem: byPosition.beforeSystem.join('\n---\n'),
      afterSystem: byPosition.afterSystem.join('\n---\n'),
      last: byPosition.last.join('\n---\n')
    };
  }

  resetTriggerHistory() {
    this.triggerHistory.clear();
    this.totalMessageCount = 0;
  }
}

```


## File: src\lib\variable-engine.ts

```ts
import type { Variable, VariableStage } from './db';

export class VariableEngine {
  private variables: Variable[];
  private stages: Map<number, VariableStage[]>;

  constructor(variables: Variable[] = [], stages: VariableStage[] = []) {
    this.variables = variables;
    this.stages = new Map();
    for (const stage of stages) {
      const existing = this.stages.get(stage.variable_id) || [];
      existing.push(stage);
      this.stages.set(stage.variable_id, existing);
    }
  }

  getVariables(): Variable[] {
    return this.variables;
  }

  getVariable(key: string): Variable | undefined {
    return this.variables.find(v => v.key === key);
  }

  setVariable(key: string, value: any): Variable | null {
    const index = this.variables.findIndex(v => v.key === key);
    if (index === -1) return null;
    this.variables[index] = { ...this.variables[index], value };
    return this.variables[index];
  }

  evaluateCondition(condition: string, value: any): boolean {
    try {
      const func = new Function('v', `return ${condition};`);
      return func(value);
    } catch {
      return false;
    }
  }

  getActiveStage(variable: Variable): VariableStage | null {
    const stages = this.stages.get(variable.id!) || [];
    const activeStages = stages.filter(s => s.is_active).sort((a, b) => b.priority - a.priority);
    for (const stage of activeStages) {
      if (this.evaluateCondition(stage.condition, variable.value)) {
        return stage;
      }
    }
    return null;
  }

  getActiveStagePrompts(): string[] {
    const prompts: string[] = [];
    for (const variable of this.variables) {
      const stage = this.getActiveStage(variable);
      if (stage && stage.stage_prompt) {
        prompts.push(stage.stage_prompt);
      }
    }
    return prompts;
  }

  replaceVariables(text: string, settings?: any, char?: any): string {
    if (!text) return text;
    let result = text;
    for (const variable of this.variables) {
      const regex = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'gi');
      result = result.replace(regex, String(variable.value ?? ''));
    }
    return result;
  }

  getVariableDisplay(variable: Variable): { value: any; percentage?: number; stage?: VariableStage } {
    const stage = this.getActiveStage(variable);
    let percentage: number | undefined;
    if (variable.type === 'number' || variable.type === 'range') {
      if (variable.min_value !== undefined && variable.max_value !== undefined) {
        const range = variable.max_value - variable.min_value;
        if (range > 0) {
          percentage = ((variable.value - variable.min_value) / range) * 100;
        }
      }
    }
    const resultStage = stage === null ? undefined : stage;
    return { value: variable.value, percentage, stage: resultStage };
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
