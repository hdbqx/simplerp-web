interface Env { DB: D1Database; }

interface RoomChatBody {
  room_id: number;
  user_input?: string; // 玩家发言（可选）
  speaker_char_id: number; // 指定谁来回答
  fallback_preset_id?: number;
  fallback_model_id?: string;
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

async function callProvider(base: string, key: string, path: string, payload?: unknown, method = 'POST') {
  const url = `${normalizeBase(base)}${path}`;
  const trimmedKey = (key || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

  const res = await fetch(url, { method, headers, body: payload ? JSON.stringify(payload) : undefined });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Provider request failed (${res.status}): ${text || res.statusText}`);
  }
  return res;
}

async function insertRoomMessage(db: D1Database, roomId: number, senderType: string, role: string, content: string, charId?: number | null) {
  const ts = Date.now();
  const { meta } = await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(roomId, charId || null, senderType, role, content || '', ts).run();
  return { id: meta.last_row_id as number, timestamp: ts };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as RoomChatBody;
    const roomId = Number(body.room_id);
    const speakerCharId = Number(body.speaker_char_id);
    const userInput = String(body.user_input || '').trim();

    if (!roomId) return new Response('Missing room_id', { status: 400 });
    if (!speakerCharId) return new Response('Missing speaker_char_id', { status: 400 });

    // 1. 获取房间和角色信息
    const room: any = await context.env.DB.prepare("SELECT * FROM rooms WHERE id = ? LIMIT 1").bind(roomId).first();
    if (!room) return new Response('Room not found', { status: 404 });

    const char: any = await context.env.DB.prepare("SELECT * FROM characters WHERE id = ? LIMIT 1").bind(speakerCharId).first();
    if (!char) return new Response('Character not found', { status: 404 });

    // 2. 如果玩家有输入，先存入数据库
    if (userInput) {
      await insertRoomMessage(context.env.DB, roomId, 'user', 'user', userInput);
    }

    // 3. 获取 API 配置 (直接使用全局 fallback)
    if (!body.fallback_preset_id || !body.fallback_model_id) {
      throw new Error('请在页面顶部选择 API 预设和模型');
    }
    const preset: any = await context.env.DB.prepare("SELECT * FROM api_presets WHERE id = ? LIMIT 1").bind(body.fallback_preset_id).first();
    const apiMode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';

    // 4. 获取历史记录并构建上下文
    const { results: historyRows } = await context.env.DB.prepare(
      "SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 30"
    ).bind(roomId).all();
    const history = (historyRows || []).slice().reverse();

    // 缓存角色名字用于构建 Log
    const nameCache = new Map<number, string>();
    nameCache.set(speakerCharId, String(char.name));

    const chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    for (const m of history) {
      const senderType = String((m as any).sender_type || '');
      const role = String((m as any).role || '');
      const content = String((m as any).content || '');
      const mCharId = (m as any).char_id ? Number((m as any).char_id) : null;
      
      if (!content) continue;
      if (senderType === 'user' || role === 'user') {
        chatMessages.push({ role: 'user', content: `(Log: 朕) -> ${content}` }); // 强制玩家名为 朕
        continue;
      }
      
      let name = 'AI';
      if (mCharId) {
        if (!nameCache.has(mCharId)) {
          const c: any = await context.env.DB.prepare("SELECT name FROM characters WHERE id = ? LIMIT 1").bind(mCharId).first();
          if (c?.name) nameCache.set(mCharId, String(c.name));
        }
        name = nameCache.get(mCharId) || `#${mCharId}`;
      }
      chatMessages.push({ role: 'user', content: `(Log: ${name}) -> ${content}` });
    }

    // 5. 构建三段式防串戏 System Prompt
    const systemParts = [
      `【当前场景】\n${room.description || '无'}`,
      `【全局记忆】\n${room.summary || '无'}`,
      `【你的身份】\n姓名：${char.name}\n设定：${char.description}\n${char.summary ? `你的个人记忆：${char.summary}` : ''}`,
      `【规则】`,
      `1. 你现在扮演且仅扮演「${char.name}」。`,
      `2. 聊天记录中的格式为 (Log: 角色名) -> 内容。你绝不能扮演别人，只能以「${char.name}」的口吻和视角回应。`,
      `3. 玩家的身份是皇帝（朕），你需要符合你的臣子/妃子身份。`
    ];
    const systemContent = systemParts.join('\n\n');

    // 6. 调用 LLM
    let assistantContent = '';
    if (apiMode === 'responses') {
      const res = await callProvider(String(preset.api_base), String(preset.api_key), '/responses', {
        model: body.fallback_model_id,
        input: [{ role: 'system', content: systemContent }, ...chatMessages],
        temperature: 0.8
      });
      const data: any = await res.json();
      assistantContent = data?.output_text || data?.output?.[0]?.content?.[0]?.text || '';
    } else {
      const res = await callProvider(String(preset.api_base), String(preset.api_key), '/chat/completions', {
        model: body.fallback_model_id,
        messages: [{ role: 'system', content: systemContent }, ...chatMessages],
        temperature: 0.8
      });
      const data: any = await res.json();
      assistantContent = data?.choices?.[0]?.message?.content || '';
    }

    // 7. 保存 AI 回复
    const lastInserted = await insertRoomMessage(context.env.DB, roomId, 'agent', 'assistant', assistantContent, speakerCharId);

    return Response.json({
      room_id: roomId,
      content: assistantContent,
      last_message_id: lastInserted?.id,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'room_chat error' }), { status: 500 });
  }
};