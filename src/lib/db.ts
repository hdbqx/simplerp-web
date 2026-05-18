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
  isActive: boolean;
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
