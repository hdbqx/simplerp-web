import { D1Database } from '@cloudflare/workers-types';

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
    query += ' ORDER BY priority DESC, sort_order ASC, created_at DESC';

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results?.map(r => ({
      ...r,
      is_active: r.is_active === 1,
      use_once: r.use_once === 1,
      is_constant: r.is_constant === 1
    })) || []);
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
          'INSERT INTO lorebook_v2 (char_id, name, keywords, content, priority, position, probability, use_once, cooldown_messages, is_active, trigger_mode, match_logic, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
          'keyword',
          'any',
          Date.now(),
          Date.now()
        ).run();
      }
      return new Response('Migrated');
    }

    if (action === 'bulk') {
      const body: any = await context.request.json();
      const updates = body.updates as Array<{ id: number; [key: string]: any }>;
      const now = Date.now();
      
      for (const u of updates) {
        const { id, ...fields } = u;
        const setFields: string[] = [];
        const params: any[] = [];
        
        for (const [key, val] of Object.entries(fields)) {
          if (key === 'is_active' || key === 'use_once' || key === 'is_constant') {
            setFields.push(`${key} = ?`);
            params.push(val ? 1 : 0);
          } else if (val !== undefined) {
            setFields.push(`${key} = ?`);
            params.push(val);
          }
        }
        
        if (setFields.length > 0) {
          setFields.push('updated_at = ?');
          params.push(now);
          params.push(id);
          await context.env.DB.prepare(`UPDATE lorebook_v2 SET ${setFields.join(', ')} WHERE id = ?`).bind(...params).run();
        }
      }
      
      return Response.json({ success: true, count: updates.length });
    }

    const body: any = await context.request.json();
    const now = Date.now();
    const { meta } = await context.env.DB.prepare(
      'INSERT INTO lorebook_v2 (char_id, room_id, name, trigger_mode, keywords, regex_pattern, match_logic, match_expression, content, trigger_condition, priority, group_name, category, position, insertion_depth, parent_id, probability, use_once, cooldown_messages, trigger_count, scan_depth, is_active, is_constant, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.name,
      body.trigger_mode || 'keyword',
      body.keywords || null,
      body.regex_pattern || null,
      body.match_logic || 'any',
      body.match_expression || null,
      body.content,
      body.trigger_condition || null,
      body.priority || 0,
      body.group_name || null,
      body.category || null,
      body.position || 'before_system',
      body.insertion_depth || null,
      body.parent_id || null,
      body.probability ?? 1.0,
      body.use_once ? 1 : 0,
      body.cooldown_messages || 0,
      body.trigger_count ?? -1,
      body.scan_depth ?? 2,
      body.is_active !== false ? 1 : 0,
      body.is_constant ? 1 : 0,
      body.sort_order || 0,
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

    const stringFields = ['name', 'keywords', 'regex_pattern', 'match_logic', 'match_expression', 'content', 'trigger_condition', 'group_name', 'category', 'position'];
    for (const f of stringFields) {
      if (updates[f] !== undefined) { setFields.push(`${f} = ?`); params.push(updates[f]); }
    }
    
    const numberFields = ['priority', 'insertion_depth', 'parent_id', 'probability', 'cooldown_messages', 'trigger_count', 'scan_depth', 'sort_order'];
    for (const f of numberFields) {
      if (updates[f] !== undefined) { setFields.push(`${f} = ?`); params.push(updates[f]); }
    }
    
    if (updates.trigger_mode !== undefined) { setFields.push('trigger_mode = ?'); params.push(updates.trigger_mode); }
    if (updates.use_once !== undefined) { setFields.push('use_once = ?'); params.push(updates.use_once ? 1 : 0); }
    if (updates.is_active !== undefined) { setFields.push('is_active = ?'); params.push(updates.is_active ? 1 : 0); }
    if (updates.is_constant !== undefined) { setFields.push('is_constant = ?'); params.push(updates.is_constant ? 1 : 0); }
    if (updates.last_triggered_at !== undefined) { setFields.push('last_triggered_at = ?'); params.push(updates.last_triggered_at); }

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
