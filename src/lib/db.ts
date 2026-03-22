// src/lib/db.ts

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
