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
