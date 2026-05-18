interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');

    let query = 'SELECT * FROM lorebook_v2 WHERE 1=1';
    const params: any[] = [];
    if (charId) { query += ' AND char_id = ?'; params.push(Number(charId)); }
    if (roomId) { query += ' AND room_id = ?'; params.push(Number(roomId)); }
    query += ' ORDER BY priority DESC, created_at DESC';

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results?.map(r => ({ ...r, is_active: r.is_active === 1, use_once: r.use_once === 1 })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');
    const charId = url.searchParams.get('char_id');

    if (action === 'migrate' && charId) {
      const { results } = await context.env.DB.prepare('SELECT * FROM lorebook WHERE char_id = ?').bind(Number(charId)).all();
      for (const entry of results || []) {
        await context.env.DB.prepare(
          'INSERT INTO lorebook_v2 (char_id, name, keywords, content, priority, position, probability, use_once, cooldown_messages, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          Number(charId),
          entry.keywords?.substring(0, 50) || '未命名条目',
          entry.keywords,
          entry.content,
          0,
          'before_system',
          1.0,
          0,
          0,
          entry.is_active,
          Date.now(),
          Date.now()
        ).run();
      }
      return new Response('Migrated');
    }

    const body: any = await context.request.json();
    const now = Date.now();
    const { meta } = await context.env.DB.prepare(
      'INSERT INTO lorebook_v2 (char_id, room_id, name, keywords, regex_pattern, content, trigger_condition, priority, category, position, insertion_depth, parent_id, probability, use_once, cooldown_messages, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.name,
      body.keywords || null,
      body.regex_pattern || null,
      body.content,
      body.trigger_condition || null,
      body.priority || 0,
      body.category || null,
      body.position || 'before_system',
      body.insertion_depth || null,
      body.parent_id || null,
      body.probability ?? 1.0,
      body.use_once ? 1 : 0,
      body.cooldown_messages || 0,
      body.is_active !== false ? 1 : 0,
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
    if (updates.keywords !== undefined) { setFields.push('keywords = ?'); params.push(updates.keywords); }
    if (updates.regex_pattern !== undefined) { setFields.push('regex_pattern = ?'); params.push(updates.regex_pattern); }
    if (updates.content !== undefined) { setFields.push('content = ?'); params.push(updates.content); }
    if (updates.trigger_condition !== undefined) { setFields.push('trigger_condition = ?'); params.push(updates.trigger_condition); }
    if (updates.priority !== undefined) { setFields.push('priority = ?'); params.push(updates.priority); }
    if (updates.category !== undefined) { setFields.push('category = ?'); params.push(updates.category); }
    if (updates.position !== undefined) { setFields.push('position = ?'); params.push(updates.position); }
    if (updates.insertion_depth !== undefined) { setFields.push('insertion_depth = ?'); params.push(updates.insertion_depth); }
    if (updates.parent_id !== undefined) { setFields.push('parent_id = ?'); params.push(updates.parent_id); }
    if (updates.probability !== undefined) { setFields.push('probability = ?'); params.push(updates.probability); }
    if (updates.use_once !== undefined) { setFields.push('use_once = ?'); params.push(updates.use_once ? 1 : 0); }
    if (updates.cooldown_messages !== undefined) { setFields.push('cooldown_messages = ?'); params.push(updates.cooldown_messages); }
    if (updates.last_triggered_at !== undefined) { setFields.push('last_triggered_at = ?'); params.push(updates.last_triggered_at); }
    if (updates.is_active !== undefined) { setFields.push('is_active = ?'); params.push(updates.is_active ? 1 : 0); }

    setFields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    await context.env.DB.prepare(`UPDATE lorebook_v2 SET ${setFields.join(', ')} WHERE id = ?`).bind(...params).run();
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
    await context.env.DB.prepare('DELETE FROM lorebook_v2 WHERE id = ?').bind(Number(id)).run();
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
