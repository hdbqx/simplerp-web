interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function insertRoomMessage(db: D1Database, roomId: number, content: string, meta?: any) {
  const metaJson = meta ? JSON.stringify(meta) : '';
  await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(roomId, null, 'tool', 'system', content || '', '', metaJson, Date.now()).run();
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const roomId = toInt(url.searchParams.get('room_id'));
  if (!roomId) return new Response('Missing room_id', { status: 400 });

  const { results } = await context.env.DB.prepare(
    "SELECT id, room_id, turn_id, created_at FROM room_state_snapshots WHERE room_id = ? ORDER BY created_at DESC LIMIT 100"
  ).bind(roomId).all();
  return Response.json(results || []);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const id = toInt(body?.id);
    if (!id) return new Response('Missing id', { status: 400 });

    const row: any = await context.env.DB.prepare("SELECT * FROM room_state_snapshots WHERE id = ? LIMIT 1").bind(id).first();
    if (!row) return new Response('Not found', { status: 404 });

    const roomId = toInt(row.room_id);
    const stateJson = typeof row.state_json === 'string' ? String(row.state_json) : '{}';
    if (!roomId) return new Response('Invalid snapshot', { status: 400 });

    await context.env.DB.prepare("UPDATE rooms SET state_json = ?, updated_at = ? WHERE id = ?").bind(stateJson, Date.now(), roomId).run();
    await context.env.DB.prepare(
      "INSERT INTO room_state_snapshots (room_id, turn_id, state_json, created_at) VALUES (?, ?, ?, ?)"
    ).bind(roomId, null, stateJson, Date.now()).run();
    await insertRoomMessage(context.env.DB, roomId, `【已回滚房间状态】snapshot_id=${id}`, { tool: 'restore_snapshot', snapshot_id: id });

    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

