import { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

function safeParse(val: any) {
  if (val == null) return null;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch {
    return val;
  }
}

function serializeValue(val: any): string {
  if (val == null) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
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
      return Response.json({ ...result, value: safeParse(result.value), default_value: safeParse(result.default_value) });
    }

    let query = 'SELECT * FROM variables WHERE 1=1';
    const params: any[] = [];
    
    if (charId && charId !== 'undefined' && charId !== 'null') { 
      query += ' AND char_id = ?'; 
      params.push(Number(charId)); 
    }
    if (roomId && roomId !== 'undefined' && roomId !== 'null') { 
      query += ' AND room_id = ?'; 
      params.push(Number(roomId)); 
    }
    
    query += ' ORDER BY created_at DESC';

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results?.map(r => ({ ...r, value: safeParse(r.value), default_value: safeParse(r.default_value) })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');
    const body: any = await context.request.json();
    const now = Date.now();

    if (action === 'bulk') {
      const updates = body.updates as Array<{ id: number; value: any }>;
      for (const u of updates) {
        await context.env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
          .bind(serializeValue(u.value), now, u.id).run();
      }
      return Response.json({ success: true, count: updates.length });
    }

    if (action === 'reset') {
      const id = url.searchParams.get('id');
      if (!id) return new Response('Missing id', { status: 400 });
      
      const variable = await context.env.DB.prepare('SELECT default_value, type FROM variables WHERE id = ?').bind(Number(id)).first();
      if (!variable) return new Response('Not found', { status: 404 });
      
      const defaultValue = safeParse((variable as any).default_value);
      let resetValue = defaultValue;
      
      if (defaultValue === null || defaultValue === undefined) {
        const type = (variable as any).type || 'number';
        switch (type) {
          case 'number':
          case 'range':
            resetValue = 0;
            break;
          case 'boolean':
            resetValue = false;
            break;
          case 'string':
            resetValue = '';
            break;
          case 'dict':
            resetValue = {};
            break;
          case 'list':
            resetValue = [];
            break;
          default:
            resetValue = null;
        }
      }
      
      await context.env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
        .bind(serializeValue(resetValue), now, Number(id)).run();
      
      return Response.json({ success: true, value: resetValue });
    }

    const valStr = serializeValue(body.value);
    const defaultValStr = serializeValue(body.default_value);

    const { meta } = await context.env.DB.prepare(
      `INSERT INTO variables (char_id, room_id, name, key, type, value, default_value, is_persistent, is_visible, step, min_value, max_value, description, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.name || '新变量',
      body.key || 'new_var',
      body.type || 'number',
      valStr,
      defaultValStr || null,
      body.is_persistent !== false ? 1 : 0,
      body.is_visible !== false ? 1 : 0,
      body.step ?? null,
      body.min_value ?? null,
      body.max_value ?? null,
      body.description ?? null,
      body.tags ?? null,
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
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    
    if (!id && !body.id) return new Response('Missing id', { status: 400 });
    const targetId = id ? Number(id) : body.id;

    const updates: string[] = [];
    const params: any[] = [];

    const fields = ['name', 'key', 'type', 'is_persistent', 'is_visible', 'step', 'min_value', 'max_value', 'description', 'tags'];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(typeof body[f] === 'boolean' ? (body[f] ? 1 : 0) : body[f]);
      }
    }

    if (body.value !== undefined) {
      updates.push(`value = ?`);
      params.push(serializeValue(body.value));
    }

    if (body.default_value !== undefined) {
      updates.push(`default_value = ?`);
      params.push(serializeValue(body.default_value));
    }

    if (updates.length === 0) return Response.json({ success: true });

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(targetId);

    await context.env.DB.prepare(`UPDATE variables SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    return Response.json({ success: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    
    await context.env.DB.prepare('DELETE FROM variable_stages WHERE variable_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM variables WHERE id = ?').bind(Number(id)).run();
    
    return Response.json({ success: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
