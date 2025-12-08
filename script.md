# Project Structure

root: simplerp-web
├── README.md
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── lib/
│   │   │   ├── db.ts
│   │   │   ├── llm.ts
│   │   │   └── translate.ts



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
    "dexie": "^4.2.1",
    "dexie-react-hooks": "^4.2.0",
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
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
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


## File: src\App.tsx

```tsx
import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, User, Bot, Pencil, Plus, Trash2, Code, X } from 'lucide-react';

function App() {
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [isGenImage, setIsGenImage] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const characters = useLiveQuery(() => db.characters.toArray());
  const messages = useLiveQuery(
    () => selectedCharId ? db.messages.where('char_id').equals(selectedCharId).toArray() : [], 
    [selectedCharId]
  );
  const settings = useLiveQuery(() => db.settings.orderBy('id').first());

  useEffect(() => {
    initDB().then(() => {
      if (characters && characters.length > 0 && !selectedCharId) {
        setSelectedCharId(characters[0].id);
      }
    });
  }, [characters?.length]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const currentChar = characters?.find(c => c.id === selectedCharId);
  const modelOptions = (settings?.model_list || "").split(',').map(m => m.trim()).filter(m => m);

  const handleSend = async () => {
    if (!input.trim() || !selectedCharId || !settings || isTyping) return;
    const text = input; setInput(''); setIsTyping(true);
    await db.messages.add({ char_id: selectedCharId, role: 'user', content: text, timestamp: Date.now() });
    const aiMsgId = await db.messages.add({ char_id: selectedCharId, role: 'assistant', content: '...', timestamp: Date.now()+1 });

    const char = await db.characters.get(selectedCharId);
    if(char) {
      const llm = new LLMClient(settings);
      const history = await db.messages.where('char_id').equals(selectedCharId).and(m => m.id !== aiMsgId).toArray();
      let fullText = "";
      for await (const chunk of llm.chatStream(char, history, text, settings)) {
        fullText += chunk;
        await db.messages.update(aiMsgId, { content: fullText });
      }
    }
    setIsTyping(false);
  };

  const handleGenImage = async () => {
    if (!settings?.sd_url) return alert("请配置 SD URL");
    const lastMsg = messages?.[messages.length - 1]?.content;
    if (!lastMsg) return;
    if (!confirm("基于此消息生图？")) return;

    setIsGenImage(true);
    try {
      let prompt = lastMsg.replace(/<[^>]*>?/gm, ''); 
      if (settings.baidu_appid) prompt = await translateToEnglish(prompt, settings.baidu_appid, settings.baidu_secret);
      
      const res = await fetch(`${settings.sd_url}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `masterpiece, ${prompt}`, steps: 20, width: 512, height: 768, cfg_scale: 7 })
      });
      if (!res.ok) throw new Error("SD Error");
      const data = await res.json();
      await db.messages.add({ char_id: selectedCharId!, role: 'assistant', content: '', image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now() });
    } catch (e: any) { alert(e.message); } finally { setIsGenImage(false); }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-base-200 text-base-content w-80 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-primary">SimpleRP</h2>
        <button className="btn btn-sm btn-circle btn-outline" onClick={() => {
           const name = prompt("角色名:"); 
           if(name) db.characters.add({ name, description:"", personality:"", scenario:"", first_message:"", mes_example:"" });
        }}><Plus size={16}/></button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {characters?.map(c => (
          <div key={c.id} className="flex group bg-base-100 rounded-lg p-1">
            <button onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className={`btn btn-sm flex-1 justify-start no-animation ${selectedCharId===c.id ? 'btn-primary' : 'btn-ghost'}`}>{c.name}</button>
            {selectedCharId === c.id && <button className="btn btn-sm btn-square btn-ghost text-error" onClick={(e)=>{e.stopPropagation();if(confirm("删?")) db.characters.delete(c.id!)}}><Trash2 size={14}/></button>}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10">
        <button className="btn btn-outline btn-block gap-2" onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}><SettingsIcon size={16}/> 设置</button>
      </div>
    </div>
  );

  return (
    <div className="drawer md:drawer-open h-full">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e => setMobileMenuOpen(e.target.checked)} />
      
      <div className="drawer-content flex flex-col h-full overflow-hidden bg-base-100">
        <div className="navbar bg-base-100 border-b border-base-content/10 min-h-[3.5rem] z-10 shadow-sm">
          <div className="flex-none md:hidden"><label htmlFor="my-drawer" className="btn btn-square btn-ghost"><Menu/></label></div>
          <div className="flex-1 px-2 mx-2 flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-lg truncate">{currentChar?.name}</span>
            <button className="btn btn-xs btn-ghost btn-circle" onClick={() => setShowCharEdit(true)}><Pencil size={14}/></button>
          </div>
          <div className="flex-none">
            <select className="select select-bordered select-sm max-w-[8rem] md:max-w-xs" value={settings?.model || ''} onChange={(e) => db.settings.update(settings!.id!, { model: e.target.value })}>
              {modelOptions.length===0 && <option value="">无模型</option>}
              {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 bg-base-200/50">
          {currentChar?.custom_css && <style>{currentChar.custom_css}</style>}

          {messages?.map(m => {
            const isUser = m.role === 'user';
            const isImage = !!m.image;
            return (
              <div key={m.id} className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-header opacity-50 text-xs mb-1 flex items-center gap-1">
                  {isUser ? <User size={12}/> : <Bot size={12}/>} 
                  {isUser ? 'You' : currentChar?.name}
                </div>
                {isImage ? (
                  <div className="chat-bubble p-0 bg-transparent border-2 border-primary/20 rounded-xl overflow-hidden"><img src={m.image} className="max-w-xs md:max-w-md"/></div>
                ) : (
                  <div className={`${isUser ? 'chat-bubble chat-bubble-primary shadow-lg' : 'w-full max-w-none bg-transparent text-base-content p-0'}`}>
                    <div className={`prose prose-invert max-w-none ${isUser ? 'text-sm' : ''}`}>
                      <ReactMarkdown 
                        rehypePlugins={[rehypeRaw]}
                        // 核心修复点：这里加上了 as any，强制绕过 TS 检查
                        components={{
                          "response": ({node, ...props}: any) => <div className="xml-response" {...props} />,
                          "scene": ({node, ...props}: any) => <div className="xml-scene" {...props} />,
                          "current_task": ({node, ...props}: any) => <div className="xml-current-task" {...props} />,
                          "participants": ({node, ...props}: any) => <div className="xml-participants" {...props} />,
                          "environment": ({node, ...props}: any) => <div className="xml-environment" {...props} />,
                          "dialogue": ({node, ...props}: any) => <div className="xml-dialogue" {...props} />
                        } as any} 
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="p-2 md:p-4 bg-base-100 border-t border-base-content/10">
          <div className="flex gap-2 max-w-4xl mx-auto items-end">
            <button className="btn btn-circle btn-ghost text-accent shrink-0" onClick={handleGenImage} disabled={isGenImage}>
               {isGenImage ? <span className="loading loading-spinner loading-xs"/> : <ImageIcon size={20}/>}
            </button>
            <textarea className="textarea textarea-bordered flex-1 min-h-[2.5rem] max-h-32 leading-tight resize-none py-2" value={input} rows={1} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }} placeholder="发送消息..."/>
            <button className="btn btn-circle btn-primary shrink-0" onClick={handleSend} disabled={isTyping}><Send size={18}/></button>
          </div>
        </div>
      </div>

      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><SidebarContent /></div>

      {showSettings && settings && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-base-100 w-full max-w-lg max-h-[80vh] rounded-xl flex flex-col shadow-2xl">
            <div className="p-4 border-b border-base-content/10 flex justify-between items-center"><h3 className="font-bold text-lg">设置</h3><button onClick={()=>setShowSettings(false)}><X/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.settings.update(settings.id!, Object.fromEntries(fd) as any).then(()=>{ setShowSettings(false); window.location.reload(); }); }} className="p-4 overflow-y-auto space-y-4">
               <div><label className="label-text">API Base</label><input name="api_base" defaultValue={settings.api_base} className="input input-bordered w-full"/></div>
               <div><label className="label-text">API Key</label><input name="api_key" type="password" defaultValue={settings.api_key} className="input input-bordered w-full"/></div>
               <div><label className="label-text">模型列表 (Endpoint ID)</label><textarea name="model_list" defaultValue={settings.model_list} className="textarea textarea-bordered w-full"/></div>
               <div className="divider">生图</div>
               <div><label className="label-text">SD URL (HTTPS)</label><input name="sd_url" defaultValue={settings.sd_url} className="input input-bordered w-full"/></div>
               <div className="grid grid-cols-2 gap-2"><input name="baidu_appid" placeholder="AppID" defaultValue={settings.baidu_appid} className="input input-bordered"/><input name="baidu_secret" placeholder="Secret" type="password" defaultValue={settings.baidu_secret} className="input input-bordered"/></div>
               <button className="btn btn-primary btn-block mt-4">保存并刷新</button>
            </form>
          </div>
        </div>
      )}

      {showCharEdit && currentChar && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-base-100 w-full max-w-lg max-h-[90vh] rounded-xl flex flex-col shadow-2xl">
            <div className="p-4 border-b border-base-content/10 flex justify-between items-center"><h3 className="font-bold text-lg">编辑: {currentChar.name}</h3><button onClick={()=>setShowCharEdit(false)}><X/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.characters.update(selectedCharId!, Object.fromEntries(fd) as any).then(()=>setShowCharEdit(false)); }} className="p-4 overflow-y-auto space-y-4 flex-1">
               <input name="name" defaultValue={currentChar.name} className="input input-bordered w-full" placeholder="姓名"/>
               <textarea name="description" defaultValue={currentChar.description} className="textarea textarea-bordered w-full h-20" placeholder="简介"/>
               <div className="collapse collapse-arrow bg-base-200"><input type="checkbox"/><div className="collapse-title font-medium text-sm flex items-center gap-2"><Code size={14}/> XML 模板 & CSS</div><div className="collapse-content space-y-2"><textarea name="output_template" defaultValue={currentChar.output_template} className="textarea textarea-bordered w-full h-32 font-mono text-xs" placeholder="<response>..."/><textarea name="custom_css" defaultValue={currentChar.custom_css} className="textarea textarea-bordered w-full h-20 font-mono text-xs" placeholder="custom css..."/></div></div>
               <div className="grid grid-cols-2 gap-2"><input name="personality" defaultValue={currentChar.personality} className="input input-bordered" placeholder="性格"/><input name="scenario" defaultValue={currentChar.scenario} className="input input-bordered" placeholder="场景"/></div>
               <textarea name="first_message" defaultValue={currentChar.first_message} className="textarea textarea-bordered w-full" placeholder="开场白"/>
               <button className="btn btn-primary btn-block">保存</button>
            </form>
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

/* --- XML 自定义标签样式 --- */
.xml-response, .xml-scene, .xml-current-task, .xml-participants, .xml-environment, .xml-dialogue {
  display: block;
  width: 100%;
  margin-bottom: 0.5rem;
}

.xml-scene {
  margin-top: 1rem;
  font-weight: bold;
  opacity: 0.9;
}

.xml-current-task {
  margin: 0.5rem 0;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
}

/* --- Markdown 基础样式 --- */
.prose { @apply text-base-content max-w-none; }
.prose p { margin-bottom: 0.5rem; line-height: 1.6; }
.prose code { @apply bg-base-300 px-1 py-0.5 rounded text-primary font-mono text-sm; }
.prose pre { @apply bg-base-300 p-2 rounded-lg overflow-x-auto; }

/* --- 滚动条 --- */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { @apply bg-gray-600 rounded-full; }

html, body, #root {
  height: 100dvh;
  overflow: hidden;
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


## File: src\lib\db.ts

```ts
import Dexie, { type Table } from 'dexie';

export interface Character {
  id?: number;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_message: string;
  mes_example: string;
  // --- 修复点：添加这两个可选字段 ---
  output_template?: string;
  custom_css?: string; 
}

export interface Message {
  id?: number;
  char_id: number;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number;
}

export interface Settings {
  id?: number;
  api_base: string;
  api_key: string;
  model: string;
  model_list: string;
  sd_url: string;
  baidu_appid: string;
  baidu_secret: string;
  temperature: number;
}

class RPDatabase extends Dexie {
  characters!: Table<Character>;
  messages!: Table<Message>;
  settings!: Table<Settings>;

  constructor() {
    super('SimpleRPDB');
    this.version(1).stores({
      characters: '++id, name',
      messages: '++id, char_id, timestamp',
      settings: '++id'
    });
  }
}

export const db = new RPDatabase();

export async function initDB() {
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.add({
      api_base: import.meta.env.VITE_API_BASE || "https://ark.cn-beijing.volces.com/api/v3",
      api_key: import.meta.env.VITE_API_KEY || "",
      model: "",
      model_list: "",
      sd_url: import.meta.env.VITE_SD_URL || "http://127.0.0.1:7860",
      baidu_appid: "",
      baidu_secret: "",
      temperature: 0.7
    });
  }

  const charCount = await db.characters.count();
  if (charCount === 0) {
    await db.characters.add({
      name: "薇薇安",
      description: "薇薇安是来自2077年夜之城的黑客。",
      personality: "傲娇, 毒舌",
      scenario: "赛博朋克公寓",
      first_message: "喂，别碰我的控制台！",
      mes_example: "",
      custom_css: "",
      output_template: ""
    });
  }
}
```


## File: src\lib\llm.ts

```ts
import OpenAI from 'openai';
import type { Character, Settings, Message } from './db';

export class LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(settings: Settings) {
    this.client = new OpenAI({
      baseURL: settings.api_base,
      apiKey: settings.api_key,
      dangerouslyAllowBrowser: true // 允许在浏览器端直接调用 API
    });
    // 确保 model 不为 undefined，防止 SDK 报错
    this.model = settings.model || "";
  }

  /**
   * 构建系统提示词 (System Prompt)
   * 包含角色设定 + XML 输出格式强指令
   */
  private buildSystemPrompt(char: Character): string {
    // 1. 基础角色设定
    let prompt = `
<system_instruction>
You are roleplaying as <char_name>${char.name}</char_name>.
Stay in character deeply. Never break the fourth wall.
Current Date: ${new Date().toLocaleDateString()}
</system_instruction>

<character_profile>
<description>${char.description}</description>
<personality>${char.personality}</personality>
<scenario>${char.scenario}</scenario>
</character_profile>

<dialogue_examples>
${char.mes_example}
</dialogue_examples>
`.trim();

    // 2. 注入 XML 输出模板 (如果存在)
    // 关键优化：明确禁止使用 markdown 代码块包裹
    if (char.output_template) {
      prompt += `\n\n<output_format_instruction>\nYOU MUST STRICTLY FOLLOW THE XML FORMAT BELOW FOR EVERY RESPONSE.\n\nIMPORTANT RULES:\n1. DO NOT wrap the output in Markdown code blocks (like \`\`\`xml ... \`\`\`).\n2. Output RAW XML text directly.\n3. Ensure all tags are properly closed.\n\nTemplate:\n${char.output_template}\n</output_format_instruction>`;
    }

    return prompt;
  }

  /**
   * 流式对话生成器
   */
  async *chatStream(char: Character, history: Message[], userInputs: string, settings: Settings) {
    // 1. 防御性检查
    if (!this.model || this.model.trim() === "") {
      yield "\n[系统错误: 未选择模型]\n请在页面顶部下拉菜单中选择一个模型，或在设置中配置 Endpoint ID。";
      return;
    }

    // 2. 构造消息链
    const messages: any[] = [
      { role: 'system', content: this.buildSystemPrompt(char) },
      // 取最近 15 条历史，避免上下文溢出。
      // 注意：这里只取 role 和 content，过滤掉 id 等数据库字段
      ...history.slice(-15).map(m => ({ 
        role: m.role, 
        content: m.content 
      })),
      { role: 'user', content: userInputs }
    ];

    try {
      // 3. 发起请求
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        stream: true, // 开启流式
        temperature: settings.temperature,
      });

      // 4. 逐块返回数据
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) yield content;
      }

    } catch (e: any) {
      console.error("LLM Request Error:", e);
      
      // 5. 错误处理与友好提示
      if (e.status === 400 && e.error?.code === 'model_not_found') {
        yield `\n[模型不存在]\n服务端无法识别模型 ID: "${this.model}"。\n请检查设置中的 Endpoint ID 是否正确 (火山引擎通常以 ep- 开头)。`;
      } else if (e.status === 401) {
        yield `\n[认证失败]\nAPI Key 无效或过期。请在设置中检查密钥。`;
      } else {
        yield `\n[连接中断: ${e.message || "网络异常"}]\n请检查 Base URL 是否正确或网络是否通畅。`;
      }
    }
  }
}

/**
 * 辅助函数：尝试获取模型列表
 * 注意：由于 CORS 限制，此函数在纯前端环境(浏览器)直接连接火山引擎/OpenAI时经常会失败。
 * 建议用户手动填写模型 ID。
 */
export async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  // 移除 URL 末尾多余的斜杠
  let cleanBase = baseUrl.replace(/\/+$/, '');
  
  // 针对火山引擎 URL 的常见误填进行修正
  cleanBase = cleanBase.replace(/\/chat\/completions$/, '');

  const url = `${cleanBase}/models`;
  console.log("Fetching models from:", url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    
    // 兼容 OpenAI 标准格式 { data: [...] } 和部分非标格式
    const list = data.data || data;

    if (Array.isArray(list)) {
      return list.map((item: any) => item.id);
    } else {
      return [];
    }
  } catch (e) {
    // 这里抛出错误供 UI 层捕获并弹窗提示
    throw e;
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
