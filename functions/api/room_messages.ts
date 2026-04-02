interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const roomId = url.searchParams.get('room_id');
  if (!roomId) return Response.json([]);
  const { results } = await context.env.DB.prepare(
    "SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp ASC"
  ).bind(roomId).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare(
      "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      body.room_id,
      body.char_id || null,
      body.sender_type || '',
      body.role || '',
      body.content || '',
      body.image || '',
      body.meta_json || '',
      body.timestamp || Date.now(),
    ).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  const roomId = url.searchParams.get('room_id');
  if (id) {
    await context.env.DB.prepare("DELETE FROM room_messages WHERE id = ?").bind(id).run();
    return new Response('Deleted');
  }
  if (roomId) {
    await context.env.DB.prepare("DELETE FROM room_messages WHERE room_id = ?").bind(roomId).run();
    return new Response('Cleared');
  }
  return new Response('Missing Parameters', { status: 400 });
};

