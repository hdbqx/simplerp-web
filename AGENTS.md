# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (port 5173)
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # Preview production build
```

No test framework is configured.

## Architecture

**SimpleRP Cloud** is a serverless AI roleplay/multi-agent sandbox running on Cloudflare Pages + Functions + D1 (SQLite) + R2 (images).

### Frontend

Single-page React 19 + TypeScript app with no router. View switching (character/group/image modes) is managed entirely via `useState` in [src/App.tsx](src/App.tsx), which is a large monolithic component (~76KB) containing most UI logic and state.

Supporting components live in [src/components/](src/components/):
- `ImageStudio.tsx` — image generation UI
- `lorebook/LorebookManager.tsx` — world book / context injection UI
- `snapshots/SnapshotManager.tsx` — conversation snapshot UI
- `variables/VariableManager.tsx` — global variable UI

### Library Layer (`src/lib/`)

Domain logic is extracted into standalone modules:
- [db.ts](src/lib/db.ts) — TypeScript interfaces for all DB entities + fetch-based API client that calls Cloudflare Pages Functions
- [llm.ts](src/lib/llm.ts) — `LLMClient` wrapping the OpenAI SDK for OpenAI-compatible APIs; calls `/api/llm` with actions `'models'` or `'complete'`
- [lorebook-engine.ts](src/lib/lorebook-engine.ts) — `LorebookEngine` class: trigger matching, context injection, trigger history
- [variable-engine.ts](src/lib/variable-engine.ts) — `VariableEngine` class: variable state, stage management, change listeners
- [variables.ts](src/lib/variables.ts) — built-in variable replacement utilities

### Backend (Cloudflare Pages Functions)

Not in this repo's `src/` directory. The frontend communicates with it via `fetch` POST requests. Cloudflare bindings configured in [wrangler.toml](wrangler.toml):
- `DB` → D1 database (`simplerp-db`)
- `IMAGES_BUCKET` → R2 bucket (`simplerp-images`)

### Styling

Tailwind CSS 3 + DaisyUI 4. Use DaisyUI component classes where possible. The `cn()` helper (clsx + tailwind-merge) is available for conditional class merging.

## Key Patterns

- **No global state library** — all state lives in `useState`/`useRef` hooks inside `App.tsx` and the engine classes.
- **Engine classes** (`VariableEngine`, `LorebookEngine`) own their domain state and expose event listeners; `App.tsx` instantiates them via `useRef`.
- **TypeScript interfaces** for all data shapes are defined in `src/lib/db.ts` — check there before defining new types.
- **Markdown rendering** uses `react-markdown` + `rehype-raw` (raw HTML allowed in content).
