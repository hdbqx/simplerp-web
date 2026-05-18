interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');

    let query = 'SELECT * FROM variable_thought_config WHERE 1=1';
    const params: any[] = [];
    if (charId) { query += ' AND char_id = ?'; params.push(Number(charId)); }
    if (roomId) { query += ' AND room_id = ?'; params.push(Number(roomId)); }

    const result = await context.env.DB.prepare(query).bind(...params).first();
    if (!result) return Response.json(null);
    return Response.json({ ...result, is_auto_update: result.is_auto_update === 1 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();

    await context.env.DB.prepare('DELETE FROM variable_thought_config WHERE char_id = ? OR room_id = ?').bind(body.char_id || null, body.room_id || null).run();

    const { meta } = await context.env.DB.prepare(
      'INSERT INTO variable_thought_config (char_id, room_id, preset_id, model, thought_prompt, update_condition, update_interval, is_auto_update, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.preset_id || null,
      body.model || null,
      body.thought_prompt || null,
      body.update_condition || null,
      body.update_interval || null,
      body.is_auto_update ? 1 : 0,
      Date.now()
    ).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
