export type ApiMode = 'chat_completions' | 'responses';

export type VariableType = 'number' | 'string' | 'boolean' | 'range' | 'dict' | 'list';
export type SnapshotType = 'manual' | 'auto' | 'checkpoint' | 'milestone';
export type ComfyWorkflowMode = 'txt2img' | 'img2img';
export type LorebookPosition =
  | 'before_system'
  | 'after_system'
  | 'last'
  | 'before_user'
  | 'after_user'
  | 'before_ai'
  | 'after_ai';
export type TriggerMode = 'constant' | 'keyword' | 'regex';
export type MatchLogic = 'any' | 'all' | 'not' | 'expression';

export interface ComfyWorkflowApiNode {
  inputs: Record<string, any>;
  class_type: string;
}

export type ComfyWorkflowApi = Record<string, ComfyWorkflowApiNode>;

export interface ComfyWorkflowLoraSlot {
  id: string;
  node_id: string;
  label: string;
  lora_name_input: string;
  strength_model_input?: string;
  strength_clip_input?: string;
  default_lora_name?: string;
  default_strength_model?: number;
  default_strength_clip?: number;
}

export interface ComfyWorkflowLoraSelection {
  enabled?: boolean;
  lora_name?: string;
  strength_model?: number;
  strength_clip?: number;
}

export interface ComfyWorkflowTemplate {
  id: string;
  name: string;
  mode: ComfyWorkflowMode;
  workflow_api: ComfyWorkflowApi;
  prompt_node_id: string;
  prompt_input_name: string;
  negative_prompt_node_id?: string;
  negative_prompt_input_name?: string;
  source_image_node_id?: string;
  source_image_input_name?: string;
  output_node_id: string;
  width_node_id?: string;
  width_input_name?: string;
  height_node_id?: string;
  height_input_name?: string;
  denoise_node_id?: string;
  denoise_input_name?: string;
  lora_slots?: ComfyWorkflowLoraSlot[];
  notes?: string;
  imported_at?: number;
}

export interface Character {
  id?: number;
  name: string;
  description: string;
  first_message: string;
  summary?: string;
  hidden_message_count?: number;
  context_cutoff_message_id?: number | null;
  created_at?: number;
}

export interface CharacterExportPayload {
  version: 1;
  meta?: {
    format: 'simplerp-character-archive';
    exported_at?: string;
  };
  character: {
    name: string;
    description: string;
    first_message: string;
    summary: string;
    hidden_message_count?: number;
  };
  variables: Array<
    Omit<Variable, 'id' | 'char_id' | 'room_id'> & {
      ref: string;
      stages?: Array<Omit<VariableStage, 'id' | 'variable_id'> & { ref?: string }>;
    }
  >;
  lorebook_v2: Array<
    Omit<LorebookV2Entry, 'id' | 'char_id' | 'room_id' | 'parent_id'> & {
      ref: string;
      parent_ref?: string;
    }
  >;
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

export interface PromptProfile {
  id: string;
  name: string;
  global_system_instruction: string;
  global_post_history_instruction: string;
  image_prompt_prefix: string;
  summary_system_prompt: string;
  summary_user_prompt: string;
  sd_system_prompt: string;
  sd_user_prompt: string;
  thought_prompt: string;
}

export interface Settings {
  id?: number;
  user_name?: string;
  image_backend?: 'huggingface' | 'openai' | 'modelscope';
  image_execution_mode?: 'sync' | 'async';
  baidu_translate_appid?: string;
  baidu_translate_secret?: string;
  modelscope_api_key?: string;
  modelscope_model?: string;
  image_preset_id?: number;
  image_model_id?: string;
  hf_keys?: string;
  hf_model_id?: string;
  summary_preset_id?: number;
  summary_model_id?: string;
  sd_prompt_preset_id?: number;
  sd_prompt_model_id?: string;
  thought_preset_id?: number;
  thought_model_id?: string;
  thought_execution_mode?: 'sync' | 'async';
  thought_interval?: number;
  is_thought_auto_update?: boolean;
  snapshot_trigger_interval?: number;
  snapshot_max_keep_count?: number;
  temperature?: number;
  model_list?: string;
  active_preset_id?: number;
  active_model_id?: string;
  prompt_profiles?: PromptProfile[];
  active_prompt_profile_id?: string;
  comfyui_workflows?: ComfyWorkflowTemplate[];
  comfyui_lora_catalog?: string;
  comfyui_quick_txt2img_workflow_id?: string;
  comfyui_quick_img2img_workflow_id?: string;
  comfyui_studio_txt2img_workflow_id?: string;
  comfyui_studio_img2img_workflow_id?: string;
}

export interface LorebookEntry {
  id?: number;
  char_id: number;
  keywords: string;
  content: string;
  is_active: boolean;
  priority?: number;
  isActive?: boolean;
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

export interface AsyncJob {
  id: string;
  job_type: 'variable_thought' | 'image_generation';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  char_id?: number | null;
  room_id?: number | null;
  request_json?: string | null;
  result_json?: string | null;
  error?: string | null;
  request?: any;
  result?: any;
  created_at?: number;
  updated_at?: number;
}

export interface Variable {
  id?: number;
  char_id?: number;
  room_id?: number;
  name: string;
  key: string;
  type: VariableType;
  value?: any;
  default_value?: any;
  min_value?: number;
  max_value?: number;
  step?: number;
  is_persistent: boolean;
  is_visible: boolean;
  description?: string;
  tags?: string;
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
  effects?: string;
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
  trigger_mode?: TriggerMode;
  keywords?: string;
  regex_pattern?: string;
  match_logic?: MatchLogic;
  match_expression?: string;
  content: string;
  trigger_condition?: string;
  priority: number;
  group_name?: string;
  category?: string;
  position: LorebookPosition;
  insertion_depth?: number;
  parent_id?: number;
  probability: number;
  use_once: boolean;
  cooldown_messages: number;
  last_triggered_at?: number;
  trigger_count?: number;
  scan_depth?: number;
  is_active: boolean;
  is_constant?: boolean;
  sort_order?: number;
  created_at?: number;
  updated_at?: number;
}

export interface Snapshot {
  id?: number;
  char_id?: number;
  room_id?: number;
  name: string;
  description?: string;
  snapshot_order?: number;
  snapshot_type?: SnapshotType;
  user_message?: string;
  ai_response?: string;
  message_count?: number;
  max_message_id?: number;
  thumbnail?: string;
  is_active?: boolean;
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
  value?: any;
  type?: string;
}

export interface LorebookGroup {
  id?: number;
  char_id?: number;
  room_id?: number;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order?: number;
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

function safeParse(val: any): any {
  if (val == null) return null;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch {
    return val;
  }
}

export const api = {
  characters: {
    list: () => fetch(`${API}/characters`).then((r) => r.json() as Promise<Character[]>),
    add: (c: Character) =>
      fetch(`${API}/characters`, { method: 'POST', headers, body: JSON.stringify(c) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    duplicate: (sourceId: number, newName: string) =>
      fetch(`${API}/characters?action=duplicate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source_id: sourceId, new_name: newName }),
      }).then((r) => r.json() as Promise<{ id: number }>),
    update: (id: number, c: Partial<Character>) =>
      fetch(`${API}/characters`, { method: 'PUT', headers, body: JSON.stringify({ id, ...c }) }),
    delete: (id: number) => fetch(`${API}/characters?id=${id}`, { method: 'DELETE' }),
  },
  rooms: {
    list: () => fetch(`${API}/rooms`).then((r) => r.json() as Promise<Room[]>),
    add: (room: Partial<Room>) =>
      fetch(`${API}/rooms`, { method: 'POST', headers, body: JSON.stringify(room) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    update: (id: number, room: Partial<Room>) =>
      fetch(`${API}/rooms`, { method: 'PUT', headers, body: JSON.stringify({ id, ...room }) }),
    delete: (id: number) => fetch(`${API}/rooms?id=${id}`, { method: 'DELETE' }),
    getMembers: (roomId: number) =>
      fetch(`${API}/rooms?type=members&room_id=${roomId}`).then((r) => r.json() as Promise<RoomMember[]>),
    updateMembers: (roomId: number, members: RoomMember[]) =>
      fetch(`${API}/rooms?type=members`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ room_id: roomId, members }),
      }),
  },
  roomMessages: {
    list: (roomId: number) =>
      fetch(`${API}/room_messages?room_id=${roomId}`).then((r) => r.json() as Promise<RoomMessage[]>),
    add: (m: RoomMessage) =>
      fetch(`${API}/room_messages`, { method: 'POST', headers, body: JSON.stringify(m) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    delete: (id: number) => fetch(`${API}/room_messages?id=${id}`, { method: 'DELETE' }),
    clear: (roomId: number) => fetch(`${API}/room_messages?room_id=${roomId}`, { method: 'DELETE' }),
  },
  roomChat: {
    send: (body: {
      room_id: number;
      user_input?: string;
      speaker_char_id: number;
      fallback_preset_id?: number;
      fallback_model_id?: string;
      global_system_instruction?: string;
      global_post_history_instruction?: string;
    }) =>
      fetch(`${API}/room_chat`, { method: 'POST', headers, body: JSON.stringify(body) }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      }),
  },
  presets: {
    list: () => fetch(`${API}/presets`).then((r) => r.json() as Promise<ApiPreset[]>),
    add: (p: ApiPreset) =>
      fetch(`${API}/presets`, { method: 'POST', headers, body: JSON.stringify(p) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    update: (id: number, p: ApiPreset) =>
      fetch(`${API}/presets`, { method: 'PUT', headers, body: JSON.stringify({ id, ...p }) }),
    delete: (id: number) => fetch(`${API}/presets?id=${id}`, { method: 'DELETE' }),
  },
  messages: {
    list: (charId?: number) => fetch(`${API}/messages?char_id=${charId}`).then((r) => r.json() as Promise<Message[]>),
    add: (m: Message) =>
      fetch(`${API}/messages`, { method: 'POST', headers, body: JSON.stringify(m) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    update: (id: number, content: string) =>
      fetch(`${API}/messages`, { method: 'PUT', headers, body: JSON.stringify({ id, content }) }),
    delete: (id: number) => fetch(`${API}/messages?id=${id}`, { method: 'DELETE' }),
    clear: (charId?: number) => fetch(`${API}/messages?char_id=${charId}`, { method: 'DELETE' }),
    clearAllImages: () => fetch(`${API}/messages?type=all_images`, { method: 'DELETE' }),
  },
  settings: {
    get: () => fetch(`${API}/settings`).then((r) => r.json() as Promise<Settings>),
    update: (s: Settings) => fetch(`${API}/settings`, { method: 'POST', headers, body: JSON.stringify(s) }),
  },
  lorebook: {
    list: (charId: number) => fetch(`${API}/lorebook?char_id=${charId}`).then((r) => r.json() as Promise<LorebookEntry[]>),
    add: (l: LorebookEntry) =>
      fetch(`${API}/lorebook`, { method: 'POST', headers, body: JSON.stringify(l) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    update: (id: number, l: Partial<LorebookEntry>) =>
      fetch(`${API}/lorebook`, { method: 'PUT', headers, body: JSON.stringify({ id, ...l }) }),
    delete: (id: number) => fetch(`${API}/lorebook?id=${id}`, { method: 'DELETE' }),
  },
  images: {
    get: (key: string) => fetch(`${API}/images?key=${encodeURIComponent(key)}`),
    list: (charId?: number, roomId?: number) =>
      fetch(`${API}/images?${charId ? `char_id=${charId}` : `room_id=${roomId}`}`).then(
        (r) => r.json() as Promise<ImageRecord[]>,
      ),
    delete: (id?: number, key?: string, charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (id) params.set('id', String(id));
      if (key) params.set('key', key);
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/images?${params}`, { method: 'DELETE' });
    },
  },
  asyncJobs: {
    get: (id: string) =>
      fetch(`${API}/async-jobs?id=${encodeURIComponent(id)}`).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<AsyncJob>;
      }),
  },
  comfyui: {
    listLoras: (apiBase: string, apiKey?: string) =>
      fetch(`${API}/comfyui`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'loras', apiBase, apiKey }),
      }).then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || 'ComfyUI LoRA 列表拉取失败。');
        return Array.isArray(data?.loras) ? (data.loras as string[]) : [];
      }),
  },
  variables: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/variables?${params}`)
        .then((r) => r.json() as Promise<Variable[]>)
        .then((vars) =>
          vars.map((v) => ({
            ...v,
            value: safeParse(v.value),
            default_value: safeParse(v.default_value),
          })),
        );
    },
    get: (id: number) =>
      fetch(`${API}/variables?id=${id}`)
        .then((r) => r.json() as Promise<Variable>)
        .then((v) => ({ ...v, value: safeParse(v.value), default_value: safeParse(v.default_value) })),
    add: (v: Variable) => {
      const payload = {
        ...v,
        value: typeof v.value === 'object' ? JSON.stringify(v.value) : v.value,
        default_value: typeof v.default_value === 'object' ? JSON.stringify(v.default_value) : v.default_value,
      };
      return fetch(`${API}/variables`, { method: 'POST', headers, body: JSON.stringify(payload) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      );
    },
    update: (id: number, v: Partial<Variable>) => {
      const payload: any = { id, ...v };
      if (v.value !== undefined && typeof v.value === 'object') payload.value = JSON.stringify(v.value);
      if (v.default_value !== undefined && typeof v.default_value === 'object') {
        payload.default_value = JSON.stringify(v.default_value);
      }
      return fetch(`${API}/variables`, { method: 'PUT', headers, body: JSON.stringify(payload) });
    },
    delete: (id: number) => fetch(`${API}/variables?id=${id}`, { method: 'DELETE' }),
    bulkUpdate: (updates: Array<{ id: number; value: any }>) =>
      fetch(`${API}/variables?action=bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          updates: updates.map((u) => ({
            ...u,
            value: typeof u.value === 'object' ? JSON.stringify(u.value) : u.value,
          })),
        }),
      }),
    reset: (id: number) => fetch(`${API}/variables?action=reset&id=${id}`, { method: 'POST' }),
  },
  variableStages: {
    list: (variableId: number) =>
      fetch(`${API}/variables-stages?variable_id=${variableId}`).then((r) => r.json() as Promise<VariableStage[]>),
    add: (s: VariableStage) =>
      fetch(`${API}/variables-stages`, { method: 'POST', headers, body: JSON.stringify(s) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    update: (id: number, s: Partial<VariableStage>) =>
      fetch(`${API}/variables-stages`, { method: 'PUT', headers, body: JSON.stringify({ id, ...s }) }),
    delete: (id: number) => fetch(`${API}/variables-stages?id=${id}`, { method: 'DELETE' }),
  },
  variableThoughtConfig: {
    get: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/variables-thought-config?${params}`).then(
        (r) => r.json() as Promise<VariableThoughtConfig | null>,
      );
    },
    save: (config: VariableThoughtConfig) =>
      fetch(`${API}/variables-thought-config`, { method: 'POST', headers, body: JSON.stringify(config) }),
    triggerThought: (body: {
      char_id?: number;
      room_id?: number;
      history?: any[];
      user_input?: string;
      preset_id?: number;
      model?: string;
      thought_prompt?: string;
      defer?: boolean;
    }) =>
      fetch(`${API}/variables-thought`, { method: 'POST', headers, body: JSON.stringify(body) }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      }),
  },
  lorebookV2: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/lorebook-v2?${params}`).then((r) => r.json() as Promise<LorebookV2Entry[]>);
    },
    add: (entry: LorebookV2Entry) =>
      fetch(`${API}/lorebook-v2`, { method: 'POST', headers, body: JSON.stringify(entry) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    update: (id: number, entry: Partial<LorebookV2Entry>) =>
      fetch(`${API}/lorebook-v2`, { method: 'PUT', headers, body: JSON.stringify({ id, ...entry }) }),
    delete: (id: number) => fetch(`${API}/lorebook-v2?id=${id}`, { method: 'DELETE' }),
    migrateFromV1: (charId: number) => fetch(`${API}/lorebook-v2?action=migrate&char_id=${charId}`, { method: 'POST' }),
    bulkUpdate: (updates: Array<{ id: number; [key: string]: any }>) =>
      fetch(`${API}/lorebook-v2?action=bulk`, { method: 'POST', headers, body: JSON.stringify({ updates }) }),
  },
  lorebookGroups: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/lorebook-groups?${params}`).then((r) => r.json() as Promise<LorebookGroup[]>);
    },
    add: (group: LorebookGroup) =>
      fetch(`${API}/lorebook-groups`, { method: 'POST', headers, body: JSON.stringify(group) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    update: (id: number, group: Partial<LorebookGroup>) =>
      fetch(`${API}/lorebook-groups`, { method: 'PUT', headers, body: JSON.stringify({ id, ...group }) }),
    delete: (id: number) => fetch(`${API}/lorebook-groups?id=${id}`, { method: 'DELETE' }),
  },
  snapshots: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/snapshots?${params}`).then((r) => r.json() as Promise<Snapshot[]>);
    },
    get: (id: number) =>
      fetch(`${API}/snapshots?id=${id}`).then(
        (r) =>
          r.json() as Promise<{ snapshot: Snapshot; messages: SnapshotMessage[]; variables: SnapshotVariable[] }>,
      ),
    create: (body: {
      char_id?: number;
      room_id?: number;
      name: string;
      description?: string;
      snapshot_type?: SnapshotType;
      user_message?: string;
      ai_response?: string;
    }) =>
      fetch(`${API}/snapshots`, { method: 'POST', headers, body: JSON.stringify(body) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
    update: (id: number, updates: Partial<Snapshot> & { snapshot_variables?: Array<{ id: number; value: any }> }) =>
      fetch(`${API}/snapshots`, { method: 'PUT', headers, body: JSON.stringify({ id, ...updates }) }).then((r) =>
        r.json(),
      ),
    delete: (id: number) => fetch(`${API}/snapshots?id=${id}`, { method: 'DELETE' }),
    restore: (id: number) =>
      fetch(`${API}/snapshots-restore`, { method: 'POST', headers, body: JSON.stringify({ id }) }).then((r) =>
        r.json(),
      ),
    edit: (id: number, updates: { user_message?: string; ai_response?: string; messages?: SnapshotMessage[] }) =>
      fetch(`${API}/snapshots/edit`, { method: 'POST', headers, body: JSON.stringify({ id, ...updates }) }),
    createBranch: (id: number, name: string) =>
      fetch(`${API}/snapshots/branch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ snapshot_id: id, name }),
      }).then((r) => r.json() as Promise<{ branch_id: string }>),
    autoCreate: (body: { char_id?: number; room_id?: number; user_message: string; ai_response: string }) =>
      fetch(`${API}/snapshots?action=auto`, { method: 'POST', headers, body: JSON.stringify(body) }).then(
        (r) => r.json() as Promise<{ id: number }>,
      ),
  },
  branches: {
    list: (charId?: number, roomId?: number) => {
      const params = new URLSearchParams();
      if (charId) params.set('char_id', String(charId));
      if (roomId) params.set('room_id', String(roomId));
      return fetch(`${API}/branches?${params}`).then((r) => r.json() as Promise<BranchInfo[]>);
    },
    switch: (branchId: string) =>
      fetch(`${API}/branches/switch`, { method: 'POST', headers, body: JSON.stringify({ branch_id: branchId }) }),
    delete: (branchId: string) =>
      fetch(`${API}/branches?branch_id=${encodeURIComponent(branchId)}`, { method: 'DELETE' }),
  },
};

export type { VariableType as VarType };
