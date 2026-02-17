# Project Structure

simplerp-web/
├── .git
├── .gitignore
├── README.md
├── dist
├── eslint.config.js
├── functions
│   ├── _middleware.ts
│   └── api
│       ├── characters.ts
│       ├── groups.ts
│       ├── lorebook.ts
│       ├── messages.ts
│       ├── presets.ts
│       └── settings.ts
├── index.html
├── node_modules
├── package.json
├── postcss.config.js
├── public
├── schema.sql
├── src
│   ├── App.tsx
│   ├── assets
│   ├── index.css
│   ├── lib
│   │   ├── db.ts
│   │   ├── llm.ts
│   │   ├── translate.ts
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
    "@types/blueimp-md5": "^2.18.2",
    "@types/fetch-jsonp": "^1.0.0",
    "autoprefixer": "^10.4.22",
    "blueimp-md5": "^2.19.0",
    "clsx": "^2.1.1",
    "daisyui": "4.12.14",
    "fetch-jsonp": "^1.3.0",
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

```


## File: schema.sql

```sql
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
    api_key TEXT
);

-- 初始化默认数据
INSERT INTO settings (id, config) SELECT 1, '{}' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);
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
interface Env { DB: D1Database; }
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare("SELECT * FROM characters ORDER BY id ASC").all();
  return Response.json(results);
};
export const onRequestPost: PagesFunction<Env> = async (context) => {
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
// Update logic
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
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare("SELECT * FROM api_presets ORDER BY id ASC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { meta } = await context.env.DB.prepare("INSERT INTO api_presets (name, api_base, api_key) VALUES (?, ?, ?)")
    .bind(body.name || "新预设", body.api_base || "", body.api_key || "").run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  await context.env.DB.prepare("UPDATE api_presets SET name = ?, api_base = ?, api_key = ? WHERE id = ?")
    .bind(body.name, body.api_base, body.api_key, body.id).run();
  return new Response("Updated");
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (id) await context.env.DB.prepare("DELETE FROM api_presets WHERE id = ?").bind(id).run();
  return new Response("Deleted");
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


## File: src\App.tsx

```tsx
import { useState, useEffect, useRef } from 'react';
import { api, type Message, type Character, type Settings, type Group, type LorebookEntry, type ApiPreset } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, 
  BookOpen, Book, Users, RefreshCw, Square, Save, Eraser, Sparkles 
} from 'lucide-react';

function App() {
  // --- 核心状态 ---
  const [viewMode, setViewMode] = useState<'char' | 'group'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [presets, setPresets] = useState<ApiPreset[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [selectedGroupId, setSelectedGroupId] = useState<number>();
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntry[]>([]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- 弹窗控制状态 ---
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // --- 初始化数据 ---
  const loadData = async () => {
    try {
        const [c, g, s, p] = await Promise.all([
            api.characters.list(), 
            api.groups.list(), 
            api.settings.get(), 
            api.presets.list()
        ]);
        setCharacters(c); setGroups(g); setSettings(s); setPresets(p);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // --- 切换角色/剧场时的监听 ---
  useEffect(() => {
    setMessages([]);
    if (viewMode === 'char' && selectedCharId) {
      api.messages.list(selectedCharId).then(setMessages);
      api.lorebook.list(selectedCharId).then(setLorebookEntries);
    } else if (viewMode === 'group' && selectedGroupId) {
      api.groups.getMembers(selectedGroupId).then(ids => {
          setGroupMemberIds(ids);
          api.messages.list(undefined, selectedGroupId).then(setMessages);
          if(ids.length > 0) api.lorebook.list(ids[0]).then(setLorebookEntries);
      });
    }
  }, [selectedCharId, selectedGroupId, viewMode]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isTyping]);

  // --- 逻辑函数 ---
  const stopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
    }
  };

  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    // 过滤掉本地暂存的图片消息，防止发送给 AI 导致 Token 溢出或 Context 混乱
    const currentHistory = (historyOverride || messages).filter(m => m.content || m.role === 'user');
    
    setMessages(prev => [...prev, { role: 'assistant', content: '', char_id: char.id, timestamp: tempTs }]);
    
    const llm = new LLMClient(settings);
    let fullContent = "";

    try {
      const stream = llm.chatStream(
        char, currentHistory, textOverride || "", 
        settings, lorebookEntries, 
        viewMode === 'group' ? {
          name: groups.find(g => g.id === selectedGroupId)?.name || "",
          description: groups.find(g => g.id === selectedGroupId)?.description || "",
          members: characters.filter(c => groupMemberIds.includes(c.id!))
        } : undefined,
        presets, controller
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
                group_id: viewMode === 'group' ? selectedGroupId : undefined, 
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
    if (!settings?.sd_url) return alert("请在设置中配置 SD URL");
    const rawPrompt = genPrompt || (messages.length > 0 ? messages[messages.length - 1].content : "");
    if (!rawPrompt) return;

    setShowGenModal(false);
    setIsTyping(true);
    try {
      const llm = new LLMClient(settings!);
      const tags = await llm.generateImageTags(rawPrompt, settings!);
      const finalTags = settings!.baidu_appid ? await translateToEnglish(tags, settings!.baidu_appid, settings!.baidu_secret!) : tags;
      
      const payload = {
        prompt: `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${finalTags}`,
        negative_prompt: "(worst quality:2), (low quality:2), (normal quality:2), lowres, watermark",
        steps: 20, 
        cfg_scale: 7, 
        sampler_name: "Euler a", 
        width: 512, 
        height: 768, 
        restore_faces: false,
        enable_hr: false, // 移除高分辨率修复，追求极速
      };

      const res = await fetch(`${settings!.sd_url.replace(/\/$/, '')}/sdapi/v1/txt2img`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("SD 后端未响应");
      const data = await res.json();
      const base64Img = `data:image/png;base64,${data.images[0]}`;

      // 仅暂存，不写入数据库
      const ephemeralMsg: Message = { 
          role: 'assistant', content: '', 
          image: base64Img, 
          timestamp: Date.now(), 
          group_id: selectedGroupId, 
          char_id: selectedCharId 
      };
      setMessages(prev => [...prev, ephemeralMsg]);

    } catch (e: any) { alert("生图失败: " + e.message); } finally { setIsTyping(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || !settings || isTyping) return;
    const text = input; setInput('');
    const tx = document.querySelector('textarea'); if (tx) tx.style.height = 'auto';

    const timestamp = Date.now();
    const userMsg: Message = { 
      role: 'user', content: text, timestamp,
      char_id: viewMode === 'char' ? selectedCharId : undefined,
      group_id: viewMode === 'group' ? selectedGroupId : undefined
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
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1 text-base-content">
        {viewMode === 'char' ? characters.map(c => (
          <div key={c.id} onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedCharId === c.id ? 'bg-primary text-primary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate">{c.name}</span>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`删除角色 ${c.name}？`)) api.characters.delete(c.id!).then(() => loadData()); }} />
          </div>
        )) : groups.map(g => (
          <div key={g.id} onClick={() => { setSelectedGroupId(g.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedGroupId === g.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate">{g.name}</span>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`删除剧场 ${g.name}？`)) api.groups.delete(g.id!).then(() => loadData()); }} />
          </div>
        ))}
        <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={async () => { const n = prompt("名称?"); if(n) { if(viewMode==='char') await api.characters.add({name:n, description:"", first_message:"你好", summary:""}); else await api.groups.add({name:n, description:""}); await loadData(); } }}><Plus size={16} /> 新建</button>
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10"><button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 系统设置</button></div>
    </div>
  );

  const modelOptions = settings?.model_list?.split(',').map(m => m.trim()).filter(m => m) || [];

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full bg-base-100 overflow-hidden text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4 sticky top-0 z-20">
          <div className="flex-none md:hidden"><button className="btn btn-square btn-ghost" onClick={()=>setMobileMenuOpen(true)}><Menu/></button></div>
          <div className="flex-1 font-bold truncate px-2">{viewMode==='char'?characters.find(c=>c.id===selectedCharId)?.name:groups.find(g=>g.id===selectedGroupId)?.name || "请选择"}</div>
          <div className="flex-none gap-2">
            {settings && (
              <select className="select select-bordered select-sm max-w-[6rem] md:max-w-[10rem] text-xs" value={settings.model || ''} onChange={async (e) => { const newM = e.target.value; setSettings({...settings, model: newM}); await api.settings.update({...settings, model: newM}); }}>
                <option value="">未选模型</option>
                {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            
            {/* 还原后的清空按钮：只清理聊天文字记录 */}
            <button className="btn btn-sm btn-ghost text-error" title="清空对话" onClick={() => {
                if(confirm("确定清空当前会话的聊天记录？这将不可逆。")) {
                    const cid = viewMode === 'char' ? selectedCharId : undefined;
                    const gid = viewMode === 'group' ? selectedGroupId : undefined;
                    api.messages.clear(cid, gid).then(() => { setMessages([]); alert("已清空"); });
                }
            }}><Eraser size={18}/></button>

            {viewMode === 'char' && selectedCharId && (
              <>
                <button className="btn btn-sm btn-ghost text-info" title="总结新进展" onClick={async ()=>{ 
                    try {
                        setIsTyping(true);
                        const char = characters.find(c => c.id === selectedCharId);
                        const llm = new LLMClient(settings!);
                        const fragment = await llm.summarizeRecent(messages, settings!);
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
            {viewMode === 'group' && selectedGroupId && <button className="btn btn-sm btn-secondary" onClick={()=>setShowGroupEdit(true)}><Users size={18}/></button>}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.map((m, idx) => (
            <div key={`${m.id || m.timestamp}-${idx}`} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'} group animate-message`}>
              <div className="chat-header opacity-50 text-[10px] mb-1 flex items-center gap-2">
                {m.role === 'user' ? '我' : (characters.find(c=>c.id===m.char_id)?.name || 'AI')}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    {!m.image && <button className="hover:text-primary" onClick={()=>{setEditingMsgId(m.id!); setEditContent(m.content)}}><Pencil size={10}/></button>}
                    {m.role !== 'user' && idx === messages.length - 1 && <button className="hover:text-primary" onClick={handleRegenerate}><RefreshCw size={10}/></button>}
                    
                    {/* 删除单条消息按钮 */}
                    <button className="hover:text-error" onClick={async () => {
                      if (confirm("删除该条记录？")) {
                        if (m.id) {
                          await api.messages.delete(m.id);
                          setMessages(prev => prev.filter(msg => msg.id !== m.id));
                        } else {
                          setMessages(prev => prev.filter(msg => msg.timestamp !== m.timestamp));
                        }
                      }
                    }}>
                      <Trash2 size={10}/>
                    </button>
                </div>
              </div>

              {m.image ? (
                <div className="chat-bubble p-1 bg-base-200 border-base-300 shadow-xl overflow-hidden relative group/img">
                  <img src={m.image} className="max-w-xs md:max-w-md rounded-lg"/>
                  {/* 未入库图片的保存按钮 */}
                  {!m.id && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <button 
                            className="btn btn-circle btn-xs btn-primary shadow-lg" 
                            title="保存到数据库"
                            onClick={async () => {
                                try {
                                    const res = await api.messages.add(m);
                                    setMessages(prev => prev.map(msg => msg.timestamp === m.timestamp ? { ...msg, id: res.id } : msg));
                                    alert("已保存");
                                } catch (err) { alert("保存失败"); }
                            }}
                        >
                            <Save size={12}/>
                        </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`chat-bubble shadow-lg border ${m.role === 'user' ? 'chat-bubble-primary border-primary' : 'bg-base-200 text-base-content border-base-300'}`}>
                  {editingMsgId === m.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/>
                          <div className="flex justify-end gap-1"><button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>取消</button><button className="btn btn-xs btn-primary" onClick={async ()=>{await api.messages.update(m.id!, editContent); setMessages(prev => prev.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); setEditingMsgId(null)}}>保存</button></div>
                      </div>
                  ) : <div className="prose prose-sm break-words"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>}
                </div>
              )}
            </div>
          ))}
          {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">思考中...</div></div>}
          <div ref={bottomRef} className="h-20" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-base-100 border-t border-base-300">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {viewMode === 'group' && selectedGroupId && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {characters.filter(c => groupMemberIds.includes(c.id!)).map(m => (
                  <button key={m.id} onClick={() => triggerAI(m)} disabled={isTyping} className="btn btn-xs btn-outline btn-secondary whitespace-nowrap rounded-full">@{m.name}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end bg-base-200 p-2 rounded-2xl shadow-inner border border-base-300">
              <button className="btn btn-circle btn-ghost btn-sm text-accent" onClick={()=>{setGenPrompt(messages[messages.length-1]?.content || ""); setShowGenModal(true)}}><ImageIcon size={20}/></button>
              <textarea className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-48 resize-none py-2 px-2 focus:outline-none" rows={1} value={input} onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'}} placeholder="输入消息..." onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); handleSend();}}} />
              {isTyping ? (
                  <button className="btn btn-circle btn-error btn-sm shadow-lg" onClick={stopGeneration}><Square size={16} fill="currentColor"/></button>
              ) : (
                  <button className="btn btn-circle btn-primary btn-sm shadow-lg" onClick={handleSend} disabled={!input.trim()}><Send size={18}/></button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {/* --- 全量弹窗模块 --- */}

      {/* 1. 设置面板 */}
      {showSettings && settings && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b bg-base-200 font-bold flex justify-between items-center">系统配置<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">基础与沉浸</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control"><label className="label text-xs font-bold">玩家姓名</label><input className="input input-bordered" placeholder="如：陈墨" value={settings.user_name || ''} onChange={e=>setSettings({...settings, user_name:e.target.value})} /></div>
                            <div className="form-control"><label className="label text-xs font-bold">SD 地址 (API)</label><input className="input input-bordered" placeholder="http://127.0.0.1:7860" value={settings.sd_url || ''} onChange={e=>setSettings({...settings, sd_url:e.target.value})} /></div>
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">全局 API</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="input input-bordered" placeholder="API BASE" value={settings.api_base} onChange={e=>setSettings({...settings, api_base:e.target.value})} />
                            <input className="input input-bordered" placeholder="API KEY" type="password" value={settings.api_key} onChange={e=>setSettings({...settings, api_key:e.target.value})} />
                          </div>
                          <textarea className="textarea textarea-bordered w-full text-xs h-20 mt-4" placeholder="模型列表 (用逗号隔开)" value={settings.model_list} onChange={e=>setSettings({...settings, model_list:e.target.value})} />
                      </section>
                      <section>
                          <div className="flex justify-between items-end mb-3">
                              <h4 className="text-sm font-black text-primary uppercase">API 预设库</h4>
                              <button className="btn btn-xs btn-primary" onClick={() => api.presets.add({name: "新预设", api_base: "", api_key: ""}).then(() => loadData())}>+ 新增</button>
                          </div>
                          <div className="overflow-x-auto border border-base-300 rounded-xl">
                              <table className="table table-compact w-full text-xs">
                                  <thead><tr className="bg-base-200"><th>名称</th><th>Base URL</th><th>Key</th><th className="w-20">操作</th></tr></thead>
                                  <tbody>
                                      {presets.map((p, idx) => (
                                          <tr key={p.id}>
                                              <td><input className="input input-ghost input-xs w-full font-bold" value={p.name} onChange={e=>{const n=[...presets]; n[idx].name=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" value={p.api_base} onChange={e=>{const n=[...presets]; n[idx].api_base=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" type="password" value={p.api_key} onChange={e=>{const n=[...presets]; n[idx].api_key=e.target.value; setPresets(n);}} /></td>
                                              <td className="flex gap-1">
                                                  <button className="btn btn-ghost btn-xs text-success" onClick={() => api.presets.update(p.id!, p).then(() => alert("已更新"))}><Save size={14}/></button>
                                                  <button className="btn btn-ghost btn-xs text-error" onClick={() => {if(confirm("删除？")) api.presets.delete(p.id!).then(() => loadData());}}><Trash2 size={14}/></button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </section>
                      {/* 【新位置】图片清理按钮放置于此 */}
                      <section>
                          <h4 className="text-sm font-black mb-3 text-error uppercase">数据管理与空间维护</h4>
                          <div className="p-4 border border-error/20 rounded-xl bg-error/5 flex justify-between items-center gap-4">
                              <div className="flex-1">
                                  <p className="text-xs font-bold text-error">清理数据库图片</p>
                                  <p className="text-[10px] opacity-60 mt-1">永久删除 D1 数据库中存储的所有图片消息。这可以显著释放数据库空间。不影响当前页面已加载的暂存图片。</p>
                              </div>
                              <button className="btn btn-error btn-sm shadow-md" onClick={async () => {
                                  if(confirm("确定彻底删除数据库中存储的所有历史图片消息？此操作不可逆。")) {
                                      await api.messages.clearAllImages();
                                      alert("清理成功，数据库空间已释放。");
                                  }
                              }}>
                                  <Eraser size={14} className="mr-1"/> 清理图片
                              </button>
                          </div>
                      </section>
                  </div>
                  <div className="p-4 border-t bg-base-200"><button className="btn btn-primary btn-block" onClick={async ()=>{await api.settings.update(settings!); setShowSettings(false); loadData();}}>保存配置</button></div>
              </div>
          </div>
      )}

      {/* 2. 角色编辑器 */}
      {showCharEdit && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">角色档案<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-control"><label className="label font-bold text-xs">专用模型</label>
                            <select className="select select-bordered select-sm" value={characters.find(c=>c.id===selectedCharId)?.model_id || ""} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, model_id:e.target.value}:c))}>
                                <option value="">全局默认</option>{modelOptions.map(m=><option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="form-control"><label className="label font-bold text-xs">API 预设</label>
                            <select className="select select-bordered select-sm" value={characters.find(c=>c.id===selectedCharId)?.api_preset_id || ""} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, api_preset_id:parseInt(e.target.value)}:c))}>
                                <option value="">全局设置</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                      </div>
                      <div className="form-control"><label className="label font-bold text-xs">角色姓名</label><input className="input input-bordered" value={characters.find(c=>c.id===selectedCharId)?.name} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, name:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs">人设/世界观描述</label><textarea className="textarea textarea-bordered h-48 font-mono text-sm" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs text-primary">长期记忆 (Summary)</label><textarea className="textarea textarea-bordered h-32 font-mono text-xs" value={characters.find(c=>c.id===selectedCharId)?.summary} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, summary:e.target.value}:c))} /></div>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{await api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false); loadData();}}>确认保存</button></div>
              </div>
          </div>
      )}

      {/* 3. 剧场编辑器 */}
      {showGroupEdit && selectedGroupId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center"><h3>剧场/群聊配置</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowGroupEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="form-control"><label className="label font-bold">剧场名</label><input className="input input-bordered" value={groups.find(g=>g.id===selectedGroupId)?.name} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, name:e.target.value}:g))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs text-primary">当前场景描述</label><textarea className="textarea textarea-bordered h-40" value={groups.find(g=>g.id===selectedGroupId)?.description} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, description:e.target.value}:g))} /></div>
                      <div className="space-y-4">
                          <label className="label font-bold text-xs">选择成员</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {characters.map(c => (
                                  <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${groupMemberIds.includes(c.id!) ? 'border-primary bg-primary/10' : 'border-base-300'}`}>
                                      <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={groupMemberIds.includes(c.id!)} onChange={e => {
                                          const next = e.target.checked ? [...groupMemberIds, c.id!] : groupMemberIds.filter(id => id !== c.id);
                                          setGroupMemberIds(next);
                                      }} />
                                      <span className="text-sm truncate font-bold">{c.name}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{const g=groups.find(grp=>grp.id===selectedGroupId); if(g){await api.groups.update(selectedGroupId, {...g, memberIds: groupMemberIds}); setShowGroupEdit(false); alert("已更新剧场成员")}}}>保存剧场</button></div>
              </div>
          </div>
      )}

      {/* 4. 世界书编辑器 */}
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
                                    <div className="flex items-center gap-2 bg-base-300 px-3 py-1 rounded-full">
                                        <span className="text-[10px] font-bold">启用</span>
                                        <input type="checkbox" className="toggle toggle-success toggle-xs" checked={e.isActive} onChange={(evt) => {
                                            const val = evt.target.checked;
                                            api.lorebook.update(e.id!, { isActive: val }).then(() => {
                                                setLorebookEntries(prev => prev.map(item => item.id === e.id ? {...item, isActive: val} : item));
                                            });
                                        }} />
                                    </div>
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


## File: src\lib\db.ts

```ts
// src/lib/db.ts

export interface Character { id?: number; name: string; description: string; first_message: string; summary?: string; model_id?: string; api_base_override?: string; api_key_override?: string; api_preset_id?: number; }
export interface Message { 
    id?: number; 
    char_id?: number; 
    group_id?: number; 
    role: 'user' | 'assistant' | 'system'; // 允许 system 角色
    content: string; 
    image?: string; 
    timestamp: number; 
}
export interface Group { id?: number; name: string; description: string; memberIds?: number[]; }
export interface ApiPreset { id?: number; name: string; api_base: string; api_key: string; }
export interface Settings { 
    id?: number; api_base?: string; api_key?: string; model?: string; 
    model_list?: string; sd_url?: string; baidu_appid?: string; 
    baidu_secret?: string; temperature?: number; 
    user_name?: string; 
}
export interface LorebookEntry { id?: number; char_id: number; keywords: string; content: string; isActive: boolean; }

const API = '/api';
const headers = { 'Content-Type': 'application/json' };

export const api = {
  characters: {
    list: () => fetch(`${API}/characters`).then(r => r.json() as Promise<Character[]>),
    add: (c: Character) => fetch(`${API}/characters`, { method: 'POST', headers, body: JSON.stringify(c) }).then(r=>r.json() as Promise<{id: number}>),
    update: (id: number, c: Partial<Character>) => fetch(`${API}/characters`, { method: 'PUT', headers, body: JSON.stringify({ id, ...c }) }),
    delete: (id: number) => fetch(`${API}/characters?id=${id}`, { method: 'DELETE' }),
  },
  groups: {
    list: () => fetch(`${API}/groups`).then(r => r.json() as Promise<Group[]>),
    add: (g: Group) => fetch(`${API}/groups`, { method: 'POST', headers, body: JSON.stringify(g) }).then(r=>r.json() as Promise<{id: number}>),
    update: (id: number, g: Partial<Group>) => fetch(`${API}/groups`, { method: 'PUT', headers, body: JSON.stringify({ id, ...g }) }),
    delete: (id: number) => fetch(`${API}/groups?id=${id}`, { method: 'DELETE' }),
    getMembers: (groupId: number) => fetch(`${API}/groups?type=members&group_id=${groupId}`).then(r => r.json() as Promise<number[]>),
  },
  presets: {
    list: () => fetch(`${API}/presets`).then(r => r.json() as Promise<ApiPreset[]>),
    add: (p: ApiPreset) => fetch(`${API}/presets`, { method: 'POST', headers, body: JSON.stringify(p) }).then(r => r.json() as Promise<{id: number}>),
    update: (id: number, p: ApiPreset) => fetch(`${API}/presets`, { method: 'PUT', headers, body: JSON.stringify({ id, ...p }) }),
    delete: (id: number) => fetch(`${API}/presets?id=${id}`, { method: 'DELETE' }),
  },
  messages: {
    list: (charId?: number, groupId?: number) => {
        let url = `${API}/messages?`;
        if (groupId) url += `group_id=${groupId}`; else url += `char_id=${charId}`;
        return fetch(url).then(r => r.json() as Promise<Message[]>);
    },
    add: (m: Message) => fetch(`${API}/messages`, { method: 'POST', headers, body: JSON.stringify(m) }).then(r => r.json() as Promise<{id: number}>),
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
    add: (l: LorebookEntry) => fetch(`${API}/lorebook`, { method: 'POST', headers, body: JSON.stringify(l) }).then(r => r.json() as Promise<{id: number}>),
    update: (id: number, l: Partial<LorebookEntry>) => fetch(`${API}/lorebook`, { method: 'PUT', headers, body: JSON.stringify({ id, ...l }) }),
    delete: (id: number) => fetch(`${API}/lorebook?id=${id}`, { method: 'DELETE' }),
  }
};
```


## File: src\lib\llm.ts

```ts
import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry, ApiPreset } from './db';
import { replaceVariables } from './variables'; 

export class LLMClient {
  private client: OpenAI;

  constructor(settings: Settings) {
    this.client = new OpenAI({ 
      baseURL: settings.api_base, 
      apiKey: settings.api_key, 
      dangerouslyAllowBrowser: true 
    });
  }

  /**
   * 将场景转化为 SD 标签
   */
  async generateImageTags(description: string, settings: Settings): Promise<string> {
    const model = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!model) return description;
    const systemInstruction = `You are a specialized Stable Diffusion Prompt Engineer. Convert descriptions into concise comma-separated English keywords. Output ONLY keywords.`;
    try {
      const res = await this.client.chat.completions.create({
        model: model,
        messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: `Convert this to tags: ${description}` }],
        temperature: 0.3,
      });
      return res.choices[0]?.message?.content || description;
    } catch (e) { return description; }
  }

  /**
   * 世界书注入逻辑：确保在末尾以增强执行性
   */
  private scanLorebook(currentInput: string, history: Message[], entries: LorebookEntry[]): string {
    if (!entries || entries.length === 0) return "";
    const contextText = (currentInput + " " + history.slice(-10).map(m => m.content).join(" ")).toLowerCase();
    const hits = entries.filter((e: LorebookEntry) => {
        if (!e.isActive || !e.keywords) return false;
        if (e.keywords.trim() === "*") return true; 
        return e.keywords.split(/[,，]/).some((k: string) => {
            const trimmedK = k.trim().toLowerCase();
            return trimmedK.length > 0 && contextText.includes(trimmedK);
        });
    });
    if (hits.length === 0) return "";
    return `\n\n### [WORLD SETTING / CRITICAL RULES]\n${hits.map((h: LorebookEntry) => h.content).join('\n---\n')}\n`;
  }

  async *chatStream(
    char: Character, history: Message[], userInputs: string, settings: Settings, 
    lorebookEntries: LorebookEntry[] = [], groupCtx?: any, presets: ApiPreset[] = [],
    controller?: AbortController 
  ) {
    const preset = presets.find((p: ApiPreset) => p.id === char.api_preset_id);
    const apiBase = char.api_base_override || preset?.api_base || settings.api_base;
    const apiKey = char.api_key_override || preset?.api_key || settings.api_key;
    const currentModel = char.model_id || settings.model || (settings.model_list?.split(',')[0].trim());
    if (!currentModel) { yield "\n[错误]: 未配置模型。"; return; }

    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true });
    const isGroupMode = !!groupCtx;
    const STOP_MARKER = "Ω"; 
    const playerDisplayName = settings.user_name || "User";

    let basePrompt = char.description + (char.summary ? `\n\n[Long-term Memory Archive]:\n${char.summary}` : "");
    const lorebookInjection = this.scanLorebook(userInputs, history, lorebookEntries);

    if (isGroupMode) {
      basePrompt = `【剧场模式】身份：[${char.name}]，玩家：[${playerDisplayName}]。必须以 "${STOP_MARKER}" 结束回复。\n${basePrompt}`;
    }

    const fullSystemContent = replaceVariables(basePrompt + lorebookInjection, settings, char);

    const chatMessages: any[] = [];
    history.slice(-15).forEach((m: Message) => {
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
            content: isGroupMode ? `(Input: ${playerDisplayName}) -> ${replaceVariables(userInputs, settings, char)}` : replaceVariables(userInputs, settings, char)
        });
    }

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: fullSystemContent }, ...chatMessages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        stop: isGroupMode ? [STOP_MARKER] : ["User:", "\nUser:"] 
      }, { signal: controller?.signal });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) yield text.replace(STOP_MARKER, "");
      }
    } catch (e: any) { if (e.name !== 'AbortError') yield `\n[API Error]: ${e.message}`; }
  }

  /**
   * 修复后的增量总结方法：仅提取新事实，不重写旧内容
   */
  async summarizeRecent(history: Message[], settings: Settings): Promise<string> {
    const summaryModel = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!summaryModel) throw new Error("未配置总结模型");
    const facts = history
        .filter(m => m.content && m.content.trim() && !m.image)
        .map(m => `${m.role === 'user' ? '玩家' : '角色'}: ${m.content}`)
        .slice(-40) 
        .join('\n');
    if (!facts) return "";
    
    const prompt = `你是一个严谨的剧情记录员。请从以下【最近对话】中提取并概括出“新发生的关键剧情进展”。
    要求：
    1. 重点提取。
    2. 使用简短的条目格式。
    3. 只输出新发生的进展，不要输出任何已有的历史背景。
    
    【最近对话】：
    ${facts}
    
    新进展总结：`;

    const res = await this.client.chat.completions.create({
      model: summaryModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });
    return res.choices[0]?.message?.content || "";
  }
}
```


## File: src\lib\translate.ts

```ts
import md5 from 'blueimp-md5';
import fetchJsonp from 'fetch-jsonp';

export async function translateToEnglish(text: string, appid: string, secret: string): Promise<string> {
  if (!appid || !secret) return text;
  // 如果是纯ASCII字符（英文），直接返回，不调API
  if (/^[\x00-\x7F]*$/.test(text)) return text;

  const salt = Date.now();
  const sign = md5(appid + text + salt + secret);
  const url = `https://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=auto&to=en&appid=${appid}&salt=${salt}&sign=${sign}`;

  try {
    const res = await fetchJsonp(url);
    const data = await res.json();
    if (data.trans_result?.[0]?.dst) return data.trans_result[0].dst;
  } catch (e) {
    console.error("Translate Error:", e);
  }
  return text;
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
