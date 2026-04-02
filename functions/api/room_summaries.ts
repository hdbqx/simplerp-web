interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const roomId = url.searchParams.get('room_id');
  if (!roomId) return Response.json([]);
  const { results } = await context.env.DB.prepare(
    "SELECT * FROM room_summaries WHERE room_id = ? ORDER BY updated_at DESC LIMIT 50"
  ).bind(roomId).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const roomId = toInt(body?.room_id);
    const summary = String(body?.summary || '');
    const source = String(body?.source || 'system');
    if (!roomId) return new Response('Missing room_id', { status: 400 });
    const now = Date.now();
    const { meta } = await context.env.DB.prepare(
      "INSERT INTO room_summaries (room_id, summary, source, updated_at) VALUES (?, ?, ?, ?)"
    ).bind(roomId, summary, source, now).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

