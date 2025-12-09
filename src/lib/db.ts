export interface Character { id?: number; name: string; description: string; first_message: string; summary?: string; }
export interface Message { id?: number; char_id: number; role: 'user' | 'assistant'; content: string; image?: string; timestamp: number; }
export interface LorebookEntry { id?: number; char_id: number; keywords: string; content: string; isActive: boolean; }
export interface Settings { id?: number; api_base?: string; api_key?: string; model?: string; model_list?: string; sd_url?: string; baidu_appid?: string; baidu_secret?: string; temperature?: number; }

const API = '/api';

export const api = {
  characters: {
    list: () => fetch(`${API}/characters`).then(r => r.json() as Promise<Character[]>),
    add: (c: Character) => fetch(`${API}/characters`, { method: 'POST', body: JSON.stringify(c) }).then(r=>r.json()),
    update: (id: number, c: Partial<Character>) => fetch(`${API}/characters`, { method: 'PUT', body: JSON.stringify({ id, ...c }) }),
    delete: (id: number) => fetch(`${API}/characters?id=${id}`, { method: 'DELETE' }),
  },
  messages: {
    list: (charId: number) => fetch(`${API}/messages?char_id=${charId}`).then(r => r.json() as Promise<Message[]>),
    add: (m: Message) => fetch(`${API}/messages`, { method: 'POST', body: JSON.stringify(m) }).then(r => r.json()),
    update: (id: number, content: string) => fetch(`${API}/messages`, { method: 'PUT', body: JSON.stringify({ id, content }) }),
    delete: (id: number) => fetch(`${API}/messages?id=${id}`, { method: 'DELETE' }),
    clear: (charId: number) => fetch(`${API}/messages?char_id=${charId}`, { method: 'DELETE' })
  },
  lorebook: {
    list: (charId: number) => fetch(`${API}/lorebook?char_id=${charId}`).then(r => r.json() as Promise<LorebookEntry[]>),
    add: (l: LorebookEntry) => fetch(`${API}/lorebook`, { method: 'POST', body: JSON.stringify(l) }).then(r => r.json()),
    update: (id: number, l: Partial<LorebookEntry>) => fetch(`${API}/lorebook`, { method: 'PUT', body: JSON.stringify({ id, ...l }) }),
    delete: (id: number) => fetch(`${API}/lorebook?id=${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => fetch(`${API}/settings`).then(r => r.json() as Promise<Settings>),
    update: (s: Settings) => fetch(`${API}/settings`, { method: 'POST', body: JSON.stringify(s) })
  }
};

export const db = {}; // Placeholder
export async function initDB() { console.log("Cloudflare D1 Mode"); }