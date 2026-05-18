interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');

    if (id) {
      const result = await context.env.DB.prepare('SELECT * FROM variables WHERE id = ?').bind(Number(id)).first();
      if (!result) return new Response('Not found', { status: 404 });
      return Response.json({ ...result, value: result.value ? JSON.parse(result.value) : null });
    }

    let query = 'SELECT * FROM variables WHERE 1=1';
    const params: any[] = [];
    if (charId) { query += ' AND char_id = ?'; params.push(Number(charId)); }
    if (roomId) { query += ' AND room_id = ?'; params.push(Number(roomId)); }
    if (!charId && !roomId) { query += ' AND char_id IS NULL AND room_id IS NULL'; }
    query += ' ORDER BY created_at DESC';

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results?.map(r => ({ ...r, value: r.value ? JSON.parse(r.value) : null })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');

    if (action === 'bulk') {
      const { updates } = await context.request.json();
      for (const update of updates) {
        await context.env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
          .bind(JSON.stringify(update.value), Date.now(), update.id).run();
      }
      return new Response('OK');
    }

    const body: any = await context.request.json();
    const now = Date.now();
    const { meta } = await context.env.DB.prepare(
      'INSERT INTO variables (char_id, room_id, name, key, type, value, min_value, max_value, step, is_persistent, is_visible, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.name,
      body.key,
      body.type,
      body.value !== undefined ? JSON.stringify(body.value) : null,
      body.min_value || null,
      body.max_value || null,
      body.step || null,
      body.is_persistent !== false ? 1 : 0,
      body.is_visible !== false ? 1 : 0,
      body.description || null,
      now,
      now
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
    if (updates.key !== undefined) { setFields.push('key = ?'); params.push(updates.key); }
    if (updates.type !== undefined) { setFields.push('type = ?'); params.push(updates.type); }
    if (updates.value !== undefined) { setFields.push('value = ?'); params.push(JSON.stringify(updates.value)); }
    if (updates.min_value !== undefined) { setFields.push('min_value = ?'); params.push(updates.min_value); }
    if (updates.max_value !== undefined) { setFields.push('max_value = ?'); params.push(updates.max_value); }
    if (updates.step !== undefined) { setFields.push('step = ?'); params.push(updates.step); }
    if (updates.is_persistent !== undefined) { setFields.push('is_persistent = ?'); params.push(updates.is_persistent ? 1 : 0); }
    if (updates.is_visible !== undefined) { setFields.push('is_visible = ?'); params.push(updates.is_visible ? 1 : 0); }
    if (updates.description !== undefined) { setFields.push('description = ?'); params.push(updates.description); }

    setFields.push('updated_at = ?');
    params.push(Date.now());

    params.push(id);

    await context.env.DB.prepare(`UPDATE variables SET ${setFields.join(', ')} WHERE id = ?`).bind(...params).run();
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

    await context.env.DB.prepare('DELETE FROM variable_stages WHERE variable_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM variables WHERE id = ?').bind(Number(id)).run();
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
