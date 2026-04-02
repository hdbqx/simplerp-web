interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const item: any = await context.env.DB.prepare("SELECT * FROM world_state WHERE id = 1").first();
  const state_json = item?.state_json ? String(item.state_json) : '{}';
  return Response.json({ id: 1, state_json, updated_at: item?.updated_at });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const state_json = typeof body?.state_json === 'string' ? body.state_json : JSON.stringify(body?.state || {});
    const now = Date.now();
    await context.env.DB.prepare("UPDATE world_state SET state_json = ?, updated_at = ? WHERE id = 1").bind(state_json, now).run();
    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

