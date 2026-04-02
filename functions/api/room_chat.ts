interface Env { DB: D1Database; }

interface RoomChatBody {
  room_id: number;
  user_input: string;
  // Optional override: force a specific speaker (char_id)
  speaker_char_id?: number;
  // Fallback selection from the top bar
  fallback_preset_id?: number;
  fallback_model_id?: string;
  // Non-stream MVP
  stream?: boolean;
  // Optional override: max speakers
  max_speakers?: number;
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function extractResponsesText(res: any): string {
  if (!res) return '';
  if (typeof res.output_text === 'string' && res.output_text.trim()) return res.output_text;
  const output = Array.isArray(res.output) ? res.output : [];
  const texts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === 'string') texts.push(c.text);
      else if (typeof c?.output_text === 'string') texts.push(c.output_text);
    }
  }
  return texts.join('');
}

async function callProvider(base: string, key: string, path: string, payload?: unknown, method = 'POST') {
  const url = `${normalizeBase(base)}${path}`;
  const trimmedKey = (key || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

  const res = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Provider request failed (${res.status}): ${text || res.statusText}`);
  }
  return res;
}

async function insertRoomMessage(db: D1Database, roomId: number, senderType: string, role: string, content: string, charId?: number | null, meta?: any) {
  const metaJson = meta ? JSON.stringify(meta) : '';
  const ts = Date.now();
  const { meta: insertMeta } = await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(roomId, charId || null, senderType, role, content || '', '', metaJson, ts).run();
  return { id: insertMeta.last_row_id as number, timestamp: ts };
}

function safeJsonParse(input: string, fallback: any = null) {
  try { return JSON.parse(input); } catch { return fallback; }
}

function extractTaggedJson(text: string, tag: string): any | null {
  const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'm');
  const m = String(text || '').match(re);
  if (!m) return null;
  const raw = m[1].trim();
  return safeJsonParse(raw, null);
}

function stripTaggedBlocks(text: string): string {
  return String(text || '').replace(/\[(PLAN|TOOLS)\][\s\S]*?\[\/\1\]/g, '').trim();
}

function getAllowedToolNames(roomMode: string): string[] {
  if (roomMode === 'sandbox') {
    return ['update_state', 'send_dispatch', 'query_world', 'commit_memory', 'write_log', 'roll_dice', 'request_image'];
  }
  // agents mode: allow limited tools (dispatch/log/memory) for now
  return ['send_dispatch', 'commit_memory', 'write_log'];
}

type ToolPolicyAction = 'allow' | 'dispatch' | 'deny';
type ToolPolicy = Record<string, ToolPolicyAction>;

function getDefaultToolPolicy(roomMode: string): ToolPolicy {
  return {
    send_dispatch: 'allow',
    commit_memory: 'allow',
    write_log: 'allow',
    query_world: 'allow',
    roll_dice: 'allow',
    // Sandbox state changes default to HITL (dispatch). Can be overridden per-agent.
    update_state: roomMode === 'sandbox' ? 'dispatch' : 'deny',
    // Image requests can be expensive; default to dispatch.
    request_image: 'dispatch',
  };
}

function mergeToolPolicy(roomMode: string, toolPolicyJson?: string | null): ToolPolicy {
  const base = getDefaultToolPolicy(roomMode);
  if (!toolPolicyJson) return base;
  try {
    const parsed = JSON.parse(toolPolicyJson);
    if (!parsed || typeof parsed !== 'object') return base;
    const out: ToolPolicy = { ...base };
    for (const [k, v] of Object.entries(parsed)) {
      const key = String(k || '').trim();
      const val = String(v || '').trim() as ToolPolicyAction;
      if (!key) continue;
      if (val === 'allow' || val === 'dispatch' || val === 'deny') out[key] = val;
    }
    return out;
  } catch {
    return base;
  }
}

function applyPatchOp(state: any, op: any) {
  const operation = String(op?.op || '').toLowerCase();
  const path = String(op?.path || '').trim();
  const value = op?.value;
  if (!path.startsWith('/')) throw new Error('Invalid path');

  const keys = path.split('/').slice(1).map(decodeURIComponent).filter(Boolean);
  let target = state;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (target[k] === undefined || target[k] === null || typeof target[k] !== 'object') target[k] = {};
    target = target[k];
  }
  const last = keys[keys.length - 1];
  if (!last) throw new Error('Invalid path');

  if (operation === 'replace' || operation === 'set') {
    target[last] = value;
    return;
  }
  if (operation === 'add') {
    if (Array.isArray(target[last])) {
      (target[last] as any[]).push(value);
    } else if (target[last] === undefined) {
      target[last] = value;
    } else {
      // fallback to replace
      target[last] = value;
    }
    return;
  }
  if (operation === 'remove') {
    if (Array.isArray(target)) {
      const idx = parseInt(last, 10);
      if (Number.isFinite(idx) && idx >= 0) (target as any[]).splice(idx, 1);
      else delete (target as any)[last];
    } else {
      delete target[last];
    }
    return;
  }
  throw new Error('Unsupported op');
}

async function ensureLogRoomId(db: D1Database): Promise<number | null> {
  const row: any = await db.prepare("SELECT id FROM rooms WHERE mode = 'log' ORDER BY id ASC LIMIT 1").first();
  return row?.id ? Number(row.id) : null;
}

async function getNextSpeaker(db: D1Database, roomId: number): Promise<number | null> {
  const membersRes = await db.prepare(
    "SELECT char_id, order_index FROM room_members WHERE room_id = ? AND is_active = 1 ORDER BY order_index ASC, id ASC"
  ).bind(roomId).all();
  const members: Array<{ char_id: number; order_index: number }> = (membersRes?.results || []) as any;
  if (!members.length) return null;

  const lastTurn: any = await db.prepare(
    "SELECT speaker_char_id, turn_index FROM room_turns WHERE room_id = ? ORDER BY turn_index DESC LIMIT 1"
  ).bind(roomId).first();

  const lastSpeaker = lastTurn?.speaker_char_id ? Number(lastTurn.speaker_char_id) : null;
  if (!lastSpeaker) return members[0].char_id;

  const idx = members.findIndex(m => m.char_id === lastSpeaker);
  const next = idx >= 0 ? members[(idx + 1) % members.length] : members[0];
  return next.char_id;
}

async function resolveAgentConfig(db: D1Database, roomId: number, charId: number, fallbackPresetId?: number, fallbackModelId?: string) {
  const cfg: any = await db.prepare(
    "SELECT api_preset_id, model_id, temperature, max_output_tokens, tool_policy_json FROM room_agent_config WHERE room_id = ? AND char_id = ? LIMIT 1"
  ).bind(roomId, charId).first();

  const apiPresetId = cfg?.api_preset_id ? Number(cfg.api_preset_id) : (fallbackPresetId || undefined);
  const modelId = (cfg?.model_id as string) || (fallbackModelId || '');
  const temperature = cfg?.temperature !== undefined && cfg?.temperature !== null ? Number(cfg.temperature) : undefined;
  const maxOutputTokens = cfg?.max_output_tokens !== undefined && cfg?.max_output_tokens !== null ? Number(cfg.max_output_tokens) : undefined;

  if (!apiPresetId) throw new Error('Missing api_preset_id (agent config or fallback)');
  if (!modelId) throw new Error('Missing model_id (agent config or fallback)');

  const preset: any = await db.prepare("SELECT * FROM api_presets WHERE id = ? LIMIT 1").bind(apiPresetId).first();
  if (!preset?.api_base) throw new Error('Invalid api_preset_id');

  const apiMode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';
  return {
    apiBase: String(preset.api_base),
    apiKey: String(preset.api_key || ''),
    apiMode,
    modelId: String(modelId),
    temperature,
    maxOutputTokens,
    toolPolicyJson: typeof cfg?.tool_policy_json === 'string' ? String(cfg.tool_policy_json) : null,
  };
}

async function resolveDirectorConfig(db: D1Database, roomId: number, fallbackPresetId?: number, fallbackModelId?: string) {
  const cfg: any = await db.prepare(
    "SELECT api_preset_id, model_id, temperature, max_output_tokens FROM room_director_config WHERE room_id = ? LIMIT 1"
  ).bind(roomId).first();

  const apiPresetId = cfg?.api_preset_id ? Number(cfg.api_preset_id) : (fallbackPresetId || undefined);
  const modelId = (cfg?.model_id as string) || (fallbackModelId || '');
  const temperature = cfg?.temperature !== undefined && cfg?.temperature !== null ? Number(cfg.temperature) : undefined;
  const maxOutputTokens = cfg?.max_output_tokens !== undefined && cfg?.max_output_tokens !== null ? Number(cfg.max_output_tokens) : undefined;

  if (!apiPresetId) throw new Error('Missing api_preset_id (director config or fallback)');
  if (!modelId) throw new Error('Missing model_id (director config or fallback)');

  const preset: any = await db.prepare("SELECT * FROM api_presets WHERE id = ? LIMIT 1").bind(apiPresetId).first();
  if (!preset?.api_base) throw new Error('Invalid director api_preset_id');
  const apiMode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';
  return {
    apiBase: String(preset.api_base),
    apiKey: String(preset.api_key || ''),
    apiMode,
    modelId: String(modelId),
    temperature,
    maxOutputTokens,
  };
}

async function callChatOnce(cfg: { apiBase: string; apiKey: string; apiMode: string; modelId: string; temperature?: number; maxOutputTokens?: number; }, systemContent: string, chatMessages: any[]) {
  if (cfg.apiMode === 'responses') {
    const res = await callProvider(cfg.apiBase, cfg.apiKey, '/responses', {
      model: cfg.modelId,
      input: [
        { role: 'system', content: systemContent },
        ...chatMessages,
      ],
      temperature: cfg.temperature ?? 0.8,
      max_output_tokens: cfg.maxOutputTokens,
      stream: false,
    });
    const data: any = await res.json();
    return extractResponsesText(data) || '';
  }
  const res = await callProvider(cfg.apiBase, cfg.apiKey, '/chat/completions', {
    model: cfg.modelId,
    messages: [{ role: 'system', content: systemContent }, ...chatMessages],
    temperature: cfg.temperature ?? 0.8,
    max_tokens: cfg.maxOutputTokens,
    stream: false,
  });
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as RoomChatBody;
    const roomId = Number(body.room_id);
    const userInput = String(body.user_input || '').trim();
    if (!roomId) return new Response('Missing room_id', { status: 400 });
    if (!userInput) return new Response('Missing user_input', { status: 400 });

    const room: any = await context.env.DB.prepare("SELECT * FROM rooms WHERE id = ? LIMIT 1").bind(roomId).first();
    if (!room) return new Response('Room not found', { status: 404 });

    // Phase A: insert user message
    await insertRoomMessage(context.env.DB, roomId, 'user', 'user', userInput, null, { room_mode: room.mode });

    // Turn index
    const lastTurn: any = await context.env.DB.prepare(
      "SELECT turn_index FROM room_turns WHERE room_id = ? ORDER BY turn_index DESC LIMIT 1"
    ).bind(roomId).first();
    const nextTurnIndex = (lastTurn?.turn_index ? Number(lastTurn.turn_index) : 0) + 1;

    // Load room summary + world state (sandbox)
    const summaryRow: any = await context.env.DB.prepare("SELECT summary FROM room_summaries WHERE room_id = ? ORDER BY updated_at DESC LIMIT 1").bind(roomId).first();
    const roomSummary = typeof summaryRow?.summary === 'string' ? summaryRow.summary : '';
    const worldRow: any = await context.env.DB.prepare("SELECT state_json FROM world_state WHERE id = 1").first();
    const globalStateJson = typeof worldRow?.state_json === 'string' ? worldRow.state_json : '{}';
    const roomStateJson = typeof room?.state_json === 'string' ? room.state_json : '{}';

    // History (last 30)
    const { results: historyRows } = await context.env.DB.prepare(
      "SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 30"
    ).bind(roomId).all();
    const history = (historyRows || []).slice().reverse();

    const rules = String(room.rules || '');
    const description = String(room.description || '');
    const roomMode = String(room.mode || 'agents');
    const stopMarker = '惟';

    const allowedTools = getAllowedToolNames(roomMode);
    const maxSpeakers = Math.max(1, Math.min(Number(body.max_speakers || 1), 3));

    // Determine speakers:
    // - manual override -> single speaker
    // - agents mode -> round_robin single speaker
    // - sandbox mode -> director plan (can be 1..maxSpeakers)
    const forcedSpeaker = body.speaker_char_id ? Number(body.speaker_char_id) : null;

    let directorPlan: any = null;
    let speakers: number[] = [];

    if (forcedSpeaker) {
      speakers = [forcedSpeaker];
      directorPlan = { strategy: 'manual', speakers: [{ char_id: forcedSpeaker }] };
    } else if (roomMode !== 'sandbox') {
      const s = await getNextSpeaker(context.env.DB, roomId);
      if (!s) return new Response('No active room members', { status: 400 });
      speakers = [s];
      directorPlan = { strategy: 'round_robin', speakers: [{ char_id: s }] };
    } else {
      // Director plan using LLM
      const membersRes = await context.env.DB.prepare(
        "SELECT char_id, order_index FROM room_members WHERE room_id = ? AND is_active = 1 ORDER BY order_index ASC, id ASC"
      ).bind(roomId).all();
      const members: Array<{ char_id: number }> = (membersRes?.results || []) as any;
      const memberIds = members.map(m => Number((m as any).char_id)).filter(Boolean);
      if (!memberIds.length) return new Response('No active room members', { status: 400 });

      const directorCfg = await resolveDirectorConfig(context.env.DB, roomId, body.fallback_preset_id, body.fallback_model_id);
      const planSystem = [
        `你是“导演/调度器(Director)”，负责选择本回合发言的角色。`,
        `输出必须是严格 JSON，放在 [PLAN]...[/PLAN] 内，除此之外不要输出任何内容。`,
        `JSON 结构：{"policy":{"max_speakers":number},"speakers":[{"char_id":number,"goal":string}]}。`,
        `speakers 数量 1..${maxSpeakers}，char_id 必须来自列表：${memberIds.join(',')}`,
      ].join('\n');

      const planContext: any[] = [];
      if (description) planContext.push({ role: 'user', content: `场景描述：${description}` });
      if (rules) planContext.push({ role: 'user', content: `规则：${rules}` });
      planContext.push({ role: 'user', content: `玩家输入：${userInput}` });

      const rawPlan = await callChatOnce(directorCfg as any, planSystem, planContext);
      directorPlan = extractTaggedJson(rawPlan, 'PLAN') || safeJsonParse(String(rawPlan).trim(), null);

      const planned = Array.isArray(directorPlan?.speakers) ? directorPlan.speakers : [];
      speakers = planned.map((x: any) => Number(x?.char_id)).filter((n: any) => Number.isFinite(n) && memberIds.includes(n));
      if (!speakers.length) {
        // fallback to round robin if director plan fails
        const s = await getNextSpeaker(context.env.DB, roomId);
        if (!s) return new Response('No active room members', { status: 400 });
        speakers = [s];
        directorPlan = { strategy: 'fallback_round_robin', speakers: [{ char_id: s }], raw: String(rawPlan || '').slice(0, 800) };
      }

      await insertRoomMessage(context.env.DB, roomId, 'director', 'system', `【导演计划】本回合发言：${speakers.join(', ')}`, null, { director_plan: directorPlan });
    }

    // Name cache for headers
    const charactersNameCache = new Map<number, string>();
    for (const id of speakers) {
      const c: any = await context.env.DB.prepare("SELECT name FROM characters WHERE id = ? LIMIT 1").bind(id).first();
      if (c?.name) charactersNameCache.set(id, String(c.name));
    }

    // Build shared chatMessages from history
    const chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    for (const m of history) {
      const senderType = String((m as any).sender_type || '');
      const role = String((m as any).role || '');
      const content = String((m as any).content || '');
      const mCharId = (m as any).char_id ? Number((m as any).char_id) : null;
      if (!content) continue;
      if (senderType === 'user' || role === 'user') {
        chatMessages.push({ role: 'user', content });
        continue;
      }
      let name = 'System';
      if (mCharId) {
        if (!charactersNameCache.has(mCharId)) {
          const c: any = await context.env.DB.prepare("SELECT name FROM characters WHERE id = ? LIMIT 1").bind(mCharId).first();
          if (c?.name) charactersNameCache.set(mCharId, String(c.name));
        }
        name = charactersNameCache.get(mCharId) || `#${mCharId}`;
      } else if (senderType === 'director') name = 'Director';
      else if (senderType === 'tool') name = 'Tool';

      chatMessages.push({ role: 'user', content: `(Log: ${name}) -> ${content}` });
    }

    // Execute speakers sequentially
    const outputs: any[] = [];
    const logRoomId = await ensureLogRoomId(context.env.DB);
    let lastInserted: any = null;

    for (const speakerCharId of speakers) {
      const char: any = await context.env.DB.prepare("SELECT * FROM characters WHERE id = ? LIMIT 1").bind(speakerCharId).first();
      if (!char) continue;

      const systemParts: string[] = [];
      systemParts.push(`【房间模式】${roomMode}`);
      if (description) systemParts.push(`【场景描述】\n${description}`);
      if (rules) systemParts.push(`【规则】\n${rules}`);
      if (roomMode === 'sandbox') {
        systemParts.push(`【全局世界状态(JSON)】\n${globalStateJson}`);
        systemParts.push(`【本房间世界状态(JSON)】\n${roomStateJson}`);
      }
      if (roomSummary) systemParts.push(`【本房间长期记忆】\n${roomSummary}`);
      systemParts.push(`【可用工具】${allowedTools.join(', ')}`);
      systemParts.push(
        `如果你需要使用工具，请在回复末尾附加一个 [TOOLS] JSON [/TOOLS] 块，格式：{"tool_calls":[{"name":"...","args":{...}}]}。工具块之外仍需给出正常的角色回复内容。`
      );
      systemParts.push(
        [
          `【工具参数约定(JSON)】`,
          `- update_state: {"target":"room"|"global","patch":[{"op":"set"|"replace"|"add"|"remove","path":"/a/b","value":any}]}`,
          `- send_dispatch: {"to_room_id":number,"abstract":string,"payload":any?}`,
          `- query_world: {"kind":"room_state"|"global_state"|"recent_messages"|"members"|"rooms"|"summary"|"pending_dispatches","limit":number?}`,
          `- commit_memory: {"text":string}`,
          `- write_log: {"text":string}`,
          `- roll_dice: {"sides":number,"reason":string?}`,
          `- request_image: {"prompt":string,"params":object?,"action":"txt2img"|"img2img"?}`,
        ].join('\n')
      );
      systemParts.push(`【你的身份】你是角色「${String(char.name || '')}」。必须以 "${stopMarker}" 结束回复。`);
      const systemContent = systemParts.join('\n\n');

      const cfg = await resolveAgentConfig(
        context.env.DB,
        roomId,
        speakerCharId,
        body.fallback_preset_id,
        body.fallback_model_id,
      );

      const raw = await callChatOnce(cfg as any, systemContent, chatMessages);
      let assistantContent = String(raw || '');
      const toolsObj = extractTaggedJson(assistantContent, 'TOOLS');
      assistantContent = stripTaggedBlocks(assistantContent).replaceAll(stopMarker, '').trim();

      lastInserted = await insertRoomMessage(context.env.DB, roomId, 'agent', 'assistant', assistantContent, speakerCharId, {
        model: cfg.modelId,
        api_mode: cfg.apiMode,
        turn_index: nextTurnIndex,
      });
      outputs.push({ char_id: speakerCharId, content: assistantContent, tool_calls: toolsObj?.tool_calls || [] });

      // Tool proposals execution (Phase C/D, limited)
      const toolCalls: any[] = Array.isArray(toolsObj?.tool_calls) ? toolsObj.tool_calls : [];
      const toolPolicy = mergeToolPolicy(roomMode, (cfg as any)?.toolPolicyJson);
      for (const tc of toolCalls) {
        const name = String(tc?.name || '').trim();
        const args = tc?.args || {};
        if (!allowedTools.includes(name)) continue;
        if (toolPolicy[name] === 'deny') continue;

        if (name === 'send_dispatch') {
          const toRoomId = Number(args?.to_room_id);
          const abstract = String(args?.abstract || '').trim();
          const payloadJson = args?.payload ? JSON.stringify(args.payload) : '';
          if (!toRoomId || !abstract) continue;
          await context.env.DB.prepare(
            "INSERT INTO dispatches (from_room_id, to_room_id, abstract, payload_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind(roomId, toRoomId, abstract, payloadJson, 'pending', Date.now()).run();
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已提交公文】→ room ${toRoomId}: ${abstract}`, null, { tool: 'send_dispatch' });
        }

        if (name === 'commit_memory') {
          const text = String(args?.text || '').trim();
          if (!text) continue;
          await context.env.DB.prepare(
            "INSERT INTO room_summaries (room_id, summary, source, updated_at) VALUES (?, ?, ?, ?)"
          ).bind(roomId, text, 'tool', Date.now()).run();
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已刻印记忆】${text}`, null, { tool: 'commit_memory' });
        }

        if (name === 'write_log' && logRoomId) {
          const text = String(args?.text || '').trim();
          if (!text) continue;
          await insertRoomMessage(context.env.DB, logRoomId, 'tool', 'system', text, null, { tool: 'write_log', from_room_id: roomId });
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已写入世界日志】${text}`, null, { tool: 'write_log' });
        }

        if (name === 'update_state' && roomMode === 'sandbox') {
          const target = String(args?.target || 'room'); // room | global
          const patch = Array.isArray(args?.patch) ? args.patch : [];

          if (!Array.isArray(patch) || patch.length === 0 || patch.length > 50) continue;
          if (target !== 'room' && target !== 'global') continue;

          // Default: dispatch/HITL. Can be overridden to 'allow' per-agent.
          const mode = toolPolicy.update_state || (roomMode === 'sandbox' ? 'dispatch' : 'deny');
          if (mode !== 'allow') {
            const abstract = `状态更新申请 target=${target} op=${patch.length}`;
            const payloadJson = JSON.stringify({ tool: 'update_state', target, patch });
            await context.env.DB.prepare(
              "INSERT INTO dispatches (from_room_id, to_room_id, abstract, payload_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(roomId, roomId, abstract, payloadJson, 'pending', Date.now()).run();
            await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已提交状态更新公文】${abstract}`, null, { tool: 'update_state', target, patch, hitl: true });
            continue;
          }

          // allow: apply directly
          const before = safeJsonParse(target === 'global' ? globalStateJson : roomStateJson, {});
          const next = before;
          for (const op of patch) applyPatchOp(next, op);
          const nextJson = JSON.stringify(next);
          if (target === 'global') {
            await context.env.DB.prepare("UPDATE world_state SET state_json = ?, updated_at = ? WHERE id = 1").bind(nextJson, Date.now()).run();
          } else {
            await context.env.DB.prepare("UPDATE rooms SET state_json = ?, updated_at = ? WHERE id = ?").bind(nextJson, Date.now(), roomId).run();
            await context.env.DB.prepare(
              "INSERT INTO room_state_snapshots (room_id, turn_id, state_json, created_at) VALUES (?, ?, ?, ?)"
            ).bind(roomId, null, nextJson, Date.now()).run();
          }
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【状态已更新】target=${target}`, null, { tool: 'update_state', patch, hitl: false });
        }

        if (name === 'query_world') {
          const kind = String(args?.kind || 'room_state').trim();
          const limit = Math.max(1, Math.min(Number(args?.limit || 10), 50));

          let result: any = null;
          if (kind === 'global_state') result = safeJsonParse(globalStateJson, {});
          else if (kind === 'room_state') result = safeJsonParse(roomStateJson, {});
          else if (kind === 'summary') result = { summary: roomSummary || '' };
          else if (kind === 'rooms') {
            const { results } = await context.env.DB.prepare("SELECT id, name, mode FROM rooms ORDER BY id ASC LIMIT 200").all();
            result = (results || []).map((r: any) => ({ id: Number(r.id), name: String(r.name || ''), mode: String(r.mode || '') }));
          } else if (kind === 'members') {
            const { results } = await context.env.DB.prepare(
              "SELECT rm.char_id, rm.role, rm.order_index, rm.is_active, c.name FROM room_members rm LEFT JOIN characters c ON c.id = rm.char_id WHERE rm.room_id = ? ORDER BY rm.order_index ASC, rm.id ASC"
            ).bind(roomId).all();
            result = (results || []).map((r: any) => ({
              char_id: Number(r.char_id),
              name: String(r.name || ''),
              role: String(r.role || ''),
              order_index: Number(r.order_index || 0),
              is_active: Number(r.is_active || 0),
            }));
          } else if (kind === 'recent_messages') {
            const { results } = await context.env.DB.prepare(
              "SELECT id, sender_type, role, char_id, content, timestamp FROM room_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT ?"
            ).bind(roomId, limit).all();
            result = (results || []).slice().reverse().map((r: any) => ({
              id: Number(r.id),
              sender_type: String(r.sender_type || ''),
              role: String(r.role || ''),
              char_id: r.char_id ? Number(r.char_id) : null,
              content: String(r.content || ''),
              timestamp: Number(r.timestamp || 0),
            }));
          } else if (kind === 'pending_dispatches') {
            const { results } = await context.env.DB.prepare(
              "SELECT id, from_room_id, to_room_id, abstract, status, created_at FROM dispatches WHERE status = 'pending' AND (from_room_id = ? OR to_room_id = ?) ORDER BY created_at DESC LIMIT 50"
            ).bind(roomId, roomId).all();
            result = (results || []).map((r: any) => ({
              id: Number(r.id),
              from_room_id: r.from_room_id ? Number(r.from_room_id) : null,
              to_room_id: r.to_room_id ? Number(r.to_room_id) : null,
              abstract: String(r.abstract || ''),
              status: String(r.status || ''),
              created_at: Number(r.created_at || 0),
            }));
          } else {
            result = { error: `Unsupported kind: ${kind}` };
          }

          const text = JSON.stringify({ kind, result }).slice(0, 4000);
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【query_world】${text}`, null, { tool: 'query_world', kind, limit });
        }

        if (name === 'roll_dice') {
          const sides = Math.max(2, Math.min(Number(args?.sides || 20), 1000));
          const reason = String(args?.reason || '').trim();
          const buf = new Uint32Array(1);
          crypto.getRandomValues(buf);
          const value = (buf[0] % sides) + 1;
          const text = JSON.stringify({ sides, value, reason });
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【roll_dice】${text}`, null, { tool: 'roll_dice', sides, value, reason });
        }

        if (name === 'request_image') {
          const prompt = String(args?.prompt || '').trim();
          const action = String(args?.action || 'txt2img').trim();
          const params = args?.params && typeof args.params === 'object' ? args.params : {};
          if (!prompt) continue;
          const abstract = `图片请求 action=${action}: ${prompt.slice(0, 50)}`;
          const payloadJson = JSON.stringify({ tool: 'request_image', action, prompt, params });
          await context.env.DB.prepare(
            "INSERT INTO dispatches (from_room_id, to_room_id, abstract, payload_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind(roomId, roomId, abstract, payloadJson, 'pending', Date.now()).run();
          await insertRoomMessage(context.env.DB, roomId, 'tool', 'system', `【已提交图片请求公文】${abstract}`, null, { tool: 'request_image', action, prompt, hitl: true });
        }
      }
    }

    await context.env.DB.prepare(
      "INSERT INTO room_turns (room_id, turn_index, speaker_char_id, director_plan_json, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(roomId, nextTurnIndex, speakers[0] || null, JSON.stringify(directorPlan || {}), Date.now()).run();

    return Response.json({
      room_id: roomId,
      turn_index: nextTurnIndex,
      speaker_char_ids: speakers,
      outputs,
      last_message_id: lastInserted?.id,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'room_chat error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
