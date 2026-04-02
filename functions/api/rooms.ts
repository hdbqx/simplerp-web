interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const roomId = url.searchParams.get('room_id');
  if (type === 'members' && roomId) {
    const { results } = await context.env.DB.prepare(
      "SELECT char_id, role, order_index, is_active FROM room_members WHERE room_id = ? ORDER BY order_index ASC, id ASC"
    ).bind(roomId).all();
    return Response.json(results);
  }

  // Ensure a global log room exists (mode=log)
  const logRoom: any = await context.env.DB.prepare("SELECT id FROM rooms WHERE mode = 'log' LIMIT 1").first();
  if (!logRoom?.id) {
    const now = Date.now();
    await context.env.DB.prepare(
      "INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind('世界日志', 'log', 'system', '全局事件日志', '', '', now, now).run();
  }

  const { results } = await context.env.DB.prepare("SELECT * FROM rooms ORDER BY id DESC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const name = String(body?.name || 'New Room');
  const mode = String(body?.mode || 'agents');
  const category = String(body?.category || '');
  const description = String(body?.description || '');
  const rules = String(body?.rules || '');
  const stateJson = typeof body?.state_json === 'string' ? body.state_json : '';
  const now = Date.now();
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(name, mode, category, description, rules, stateJson, now, now).run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const body: any = await context.request.json();
  const now = Date.now();

  if (type === 'members') {
    const roomId = toInt(body?.room_id);
    const members = Array.isArray(body?.members) ? body.members : [];
    if (!roomId) return new Response('Missing room_id', { status: 400 });

    await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(roomId).run();

    let idx = 0;
    for (const m of members) {
      const charId = toInt(m?.char_id);
      if (!charId) continue;
      const role = String(m?.role || 'agent');
      const orderIndex = toInt(m?.order_index, idx) ?? idx;
      const isActive = m?.is_active === 0 || m?.is_active === false ? 0 : 1;
      await context.env.DB.prepare(
        "INSERT INTO room_members (room_id, char_id, role, order_index, is_active) VALUES (?, ?, ?, ?, ?)"
      ).bind(roomId, charId, role, orderIndex, isActive).run();
      idx++;
    }
    return new Response('Updated');
  }

  const id = toInt(body?.id);
  if (!id) return new Response('Missing id', { status: 400 });

  const name = body?.name !== undefined ? String(body.name) : undefined;
  const mode = body?.mode !== undefined ? String(body.mode) : undefined;
  const category = body?.category !== undefined ? String(body.category) : undefined;
  const description = body?.description !== undefined ? String(body.description) : undefined;
  const rules = body?.rules !== undefined ? String(body.rules) : undefined;
  const stateJson = body?.state_json !== undefined ? String(body.state_json) : undefined;

  await context.env.DB.prepare(
    "UPDATE rooms SET name = COALESCE(?, name), mode = COALESCE(?, mode), category = COALESCE(?, category), description = COALESCE(?, description), rules = COALESCE(?, rules), state_json = COALESCE(?, state_json), updated_at = ? WHERE id = ?"
  ).bind(name ?? null, mode ?? null, category ?? null, description ?? null, rules ?? null, stateJson ?? null, now, id).run();

  return new Response('Updated');
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_agent_config WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_turns WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_messages WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_summaries WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM rooms WHERE id = ?").bind(id).run();

  return new Response('Deleted');
};
