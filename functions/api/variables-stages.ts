interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const variableId = url.searchParams.get('variable_id');

    if (!variableId) return new Response('Missing variable_id', { status: 400 });

    const { results } = await context.env.DB.prepare('SELECT * FROM variable_stages WHERE variable_id = ? ORDER BY priority DESC').bind(Number(variableId)).all();
    return Response.json(results?.map(r => ({ ...r, is_active: r.is_active === 1 })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare(
      'INSERT INTO variable_stages (variable_id, name, condition, priority, stage_prompt, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.variable_id,
      body.name,
      body.condition,
      body.priority || 0,
      body.stage_prompt || null,
      body.is_active !== false ? 1 : 0,
      Date.now()
    ).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { id, ...updates } = body;

    if (!id) return new Response('Missing id', { status: 400 });

    const setFields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) { setFields.push('name = ?'); params.push(updates.name); }
    if (updates.condition !== undefined) { setFields.push('condition = ?'); params.push(updates.condition); }
    if (updates.priority !== undefined) { setFields.push('priority = ?'); params.push(updates.priority); }
    if (updates.stage_prompt !== undefined) { setFields.push('stage_prompt = ?'); params.push(updates.stage_prompt); }
    if (updates.is_active !== undefined) { setFields.push('is_active = ?'); params.push(updates.is_active ? 1 : 0); }

    params.push(id);

    await context.env.DB.prepare(`UPDATE variable_stages SET ${setFields.join(', ')} WHERE id = ?`).bind(...params).run();
    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    await context.env.DB.prepare('DELETE FROM variable_stages WHERE id = ?').bind(Number(id)).run();
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
