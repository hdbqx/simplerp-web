// src/lib/db.ts 完整替换内容
export interface Character { id?: number; name: string; description: string; first_message: string; summary?: string; model_id?: string; api_base_override?: string; api_key_override?: string; }
export interface Message { id?: number; char_id?: number; group_id?: number; role: 'user' | 'assistant'; content: string; image?: string; timestamp: number; }
export interface LorebookEntry { id?: number; char_id: number; keywords: string; content: string; isActive: boolean; }
export interface Settings { id?: number; api_base?: string; api_key?: string; model?: string; model_list?: string; sd_url?: string; baidu_appid?: string; baidu_secret?: string; temperature?: number; }
export interface Group { id?: number; name: string; description: string; memberIds?: number[]; }

const API = '/api';

export const api = {
  characters: {
    list: () => fetch(`${API}/characters`).then(r => r.json() as Promise<Character[]>),
    // 修复：确保返回结果被正确解析
    add: (c: Character) => fetch(`${API}/characters`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c) 
    }).then(r => r.json()),
    update: (id: number, c: Partial<Character>) => fetch(`${API}/characters`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...c }) 
    }),
    delete: (id: number) => fetch(`${API}/characters?id=${id}`, { method: 'DELETE' }),
  },
  groups: {
    list: () => fetch(`${API}/groups`).then(r => r.json() as Promise<Group[]>),
    add: (g: Group) => fetch(`${API}/groups`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(g) 
    }).then(r => r.json()),
    update: (id: number, g: Partial<Group>) => fetch(`${API}/groups`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...g }) 
    }),
    delete: (id: number) => fetch(`${API}/groups?id=${id}`, { method: 'DELETE' }),
    getMembers: (groupId: number) => fetch(`${API}/groups?type=members&group_id=${groupId}`).then(r => r.json() as Promise<number[]>),
  },
  messages: {
    list: (charId?: number, groupId?: number) => {
        let url = `${API}/messages?`;
        if (groupId) url += `group_id=${groupId}`;
        else if (charId) url += `char_id=${charId}`;
        return fetch(url).then(r => r.json() as Promise<Message[]>);
    },
    add: (m: Message) => fetch(`${API}/messages`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m) 
    }).then(r => r.json()),
    update: (id: number, content: string) => fetch(`${API}/messages`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content }) 
    }),
    delete: (id: number) => fetch(`${API}/messages?id=${id}`, { method: 'DELETE' }),
    clear: (charId?: number, groupId?: number) => {
        let url = `${API}/messages?`;
        if (groupId) url += `group_id=${groupId}`;
        else if (charId) url += `char_id=${charId}`;
        return fetch(url, { method: 'DELETE' });
    },
    clearAllImages: () => fetch(`${API}/messages?type=all_images`, { method: 'DELETE' }) 
  },
  settings: {
    get: () => fetch(`${API}/settings`).then(r => r.json() as Promise<Settings>),
    update: (s: Settings) => fetch(`${API}/settings`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s) 
    })
  },
  lorebook: {
    list: (charId: number) => fetch(`${API}/lorebook?char_id=${charId}`).then(r => r.json() as Promise<LorebookEntry[]>),
    add: (l: LorebookEntry) => fetch(`${API}/lorebook`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(l) 
    }).then(r => r.json()),
    update: (id: number, l: Partial<LorebookEntry>) => fetch(`${API}/lorebook`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...l }) 
    }),
    delete: (id: number) => fetch(`${API}/lorebook?id=${id}`, { method: 'DELETE' }),
  }
};