interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    "SELECT id, created_at FROM world_state_snapshots ORDER BY created_at DESC LIMIT 200"
  ).all();
  return Response.json(results || []);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const id = typeof body?.id === 'number' ? body.id : parseInt(String(body?.id || ''), 10);
    if (!Number.isFinite(id) || !id) return new Response('Missing id', { status: 400 });

    const row: any = await context.env.DB.prepare("SELECT * FROM world_state_snapshots WHERE id = ? LIMIT 1").bind(id).first();
    if (!row) return new Response('Not found', { status: 404 });

    const stateJson = typeof row.state_json === 'string' ? String(row.state_json) : '{}';
    await context.env.DB.prepare("UPDATE world_state SET state_json = ?, updated_at = ? WHERE id = 1").bind(stateJson, Date.now()).run();
    await context.env.DB.prepare("INSERT INTO world_state_snapshots (state_json, created_at) VALUES (?, ?)").bind(stateJson, Date.now()).run();

    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

