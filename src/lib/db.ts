export interface Character { 
  id?: number; name: string; description: string; first_message: string; summary?: string; 
  model_id?: string; api_base_override?: string; api_key_override?: string; 
}
export interface Message { 
  id?: number; char_id?: number; group_id?: number; role: 'user' | 'assistant'; 
  content: string; image?: string; timestamp: number; 
}
export interface LorebookEntry { id?: number; char_id: number; keywords: string; content: string; isActive: boolean; }
export interface Settings { id?: number; api_base?: string; api_key?: string; model?: string; model_list?: string; sd_url?: string; baidu_appid?: string; baidu_secret?: string; temperature?: number; }
export interface Group { id?: number; name: string; description: string; memberIds?: number[]; }

const API = '/api';

export const api = {
  characters: {
    list: () => fetch(`${API}/characters`).then(r => r.json() as Promise<Character[]>),
    add: (c: Character) => fetch(`${API}/characters`, { method: 'POST', body: JSON.stringify(c) }).then(r=>r.json()),
    update: (id: number, c: Partial<Character>) => fetch(`${API}/characters`, { method: 'PUT', body: JSON.stringify({ id, ...c }) }),
    delete: (id: number) => fetch(`${API}/characters?id=${id}`, { method: 'DELETE' }),
  },
  groups: {
    list: () => fetch(`${API}/groups`).then(r => r.json() as Promise<Group[]>),
    add: (g: Group) => fetch(`${API}/groups`, { method: 'POST', body: JSON.stringify(g) }).then(r=>r.json()),
    delete: (id: number) => fetch(`${API}/groups?id=${id}`, { method: 'DELETE' }),
    update: (id: number, g: Partial<Group>) => fetch(`${API}/groups`, { method: 'PUT', body: JSON.stringify({ id, ...g }) }),
    getMembers: (groupId: number) => fetch(`${API}/groups?type=members&group_id=${groupId}`).then(r => r.json() as Promise<Character[]>),
  },
  messages: {
    list: (charId?: number, groupId?: number) => {
        const url = groupId ? `${API}/messages?group_id=${groupId}` : `${API}/messages?char_id=${charId}`;
        return fetch(url).then(r => r.json() as Promise<Message[]>);
    },
    add: (m: Message) => fetch(`${API}/messages`, { method: 'POST', body: JSON.stringify(m) }).then(r => r.json()),
    update: (id: number, content: string) => fetch(`${API}/messages`, { method: 'PUT', body: JSON.stringify({ id, content }) }),
    delete: (id: number) => fetch(`${API}/messages?id=${id}`, { method: 'DELETE' }),
    clear: (charId?: number, groupId?: number) => {
        const params = groupId ? `group_id=${groupId}` : `char_id=${charId}`;
        return fetch(`${API}/messages?${params}`, { method: 'DELETE' });
    },
    clearAllImages: () => fetch(`${API}/messages?type=all_images`, { method: 'DELETE' }) 
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