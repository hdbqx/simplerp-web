export type ApiMode = 'chat_completions' | 'responses';

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
  group_id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  timestamp: number;
}

export interface Group { id?: number; name: string; description: string; }

export interface Room {
  id?: number;
  name: string;
  description?: string;
  summary?: string;
  created_at?: number;
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
  timestamp: number;
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
  // OpenAI 相关
  image_preset_id?: number;
  image_model_id?: string;
  // Hugging Face 相关
  hf_keys?: string;
  hf_model_id?: string;
  // 剧情总结模型
  summary_preset_id?: number;
  summary_model_id?: string;
  // 提示词扩写/翻译模型（保留此项，非常有用）
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
    list: (charId?: number, groupId?: number) => fetch(`${API}/messages?char_id=${charId}`).then(r => r.json() as Promise<Message[]>),
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
  }
};