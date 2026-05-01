interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const roomId = url.searchParams.get('room_id');
  
  // 获取房间成员
  if (type === 'members' && roomId) {
    const { results } = await context.env.DB.prepare(
      "SELECT char_id FROM room_members WHERE room_id = ?"
    ).bind(roomId).all();
    return Response.json(results);
  }

  // 获取房间列表
  const { results } = await context.env.DB.prepare("SELECT * FROM rooms ORDER BY id DESC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json().catch(() => ({}));

  const name = String(body?.name || 'New Room');
  const description = String(body?.description || '');
  const summary = String(body?.summary || '');
  const now = Date.now();
  
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO rooms (name, description, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(name, description, summary, now, now).run();
  
  return Response.json({ id: meta.last_row_id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const body: any = await context.request.json();
  const now = Date.now();

  // 更新房间成员
  if (type === 'members') {
    const roomId = toInt(body?.room_id);
    const members = Array.isArray(body?.members) ? body.members : [];
    if (!roomId) return new Response('Missing room_id', { status: 400 });

    // 先清空，再插入
    await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(roomId).run();

    for (const m of members) {
      const charId = toInt(m?.char_id);
      if (!charId) continue;
      await context.env.DB.prepare(
        "INSERT INTO room_members (room_id, char_id) VALUES (?, ?)"
      ).bind(roomId, charId).run();
    }
    return new Response('Updated');
  }

  // 更新房间基础信息（包含记忆 summary）
  const id = toInt(body?.id);
  if (!id) return new Response('Missing id', { status: 400 });

  const name = body?.name !== undefined ? String(body.name) : undefined;
  const description = body?.description !== undefined ? String(body.description) : undefined;
  const summary = body?.summary !== undefined ? String(body.summary) : undefined;

  await context.env.DB.prepare(
    "UPDATE rooms SET name = COALESCE(?, name), description = COALESCE(?, description), summary = COALESCE(?, summary), updated_at = ? WHERE id = ?"
  ).bind(name ?? null, description ?? null, summary ?? null, now, id).run();

  return new Response('Updated');
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  // 极简模式下，只需级联删除成员和消息记录，不牵扯废弃表
  await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_messages WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM rooms WHERE id = ?").bind(id).run();

  return new Response('Deleted');
};