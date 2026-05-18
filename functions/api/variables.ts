import { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

// 安全解析函数，防止单一数据格式错误导致整个列表崩溃
function safeParse(val: any) {
  if (val == null) return null;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch {
    return val; // 如果解析失败，直接原样返回
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');

    // 获取单条详情
    if (id) {
      const result = await context.env.DB.prepare('SELECT * FROM variables WHERE id = ?').bind(Number(id)).first();
      if (!result) return new Response('Not found', { status: 404 });
      return Response.json({ ...result, value: safeParse(result.value) });
    }

    // 获取列表
    let query = 'SELECT * FROM variables WHERE 1=1';
    const params: any[] = [];
    
    // 过滤可能传过来的字符串 "undefined" 或 "null"
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
    return Response.json(results?.map(r => ({ ...r, value: safeParse(r.value) })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const now = Date.now();
    
    // 确保 value 在入库前转换为合适的字符串
    const valStr = typeof body.value === 'object' ? JSON.stringify(body.value) : String(body.value ?? '');

    const { meta } = await context.env.DB.prepare(
      `INSERT INTO variables (char_id, room_id, name, key, type, value, is_persistent, is_visible, step, min_value, max_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.name || '新变量',
      body.key || 'new_var',
      body.type || 'number', // 默认设为数字型
      valStr,
      body.is_persistent !== false ? 1 : 0,
      body.is_visible !== false ? 1 : 0,
      body.step ?? null,
      body.min_value ?? null,
      body.max_value ?? null,
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
    
    if (!id) return new Response('Missing id', { status: 400 });

    const updates: string[] = [];
    const params: any[] = [];

    const fields = ['name', 'key', 'type', 'is_persistent', 'is_visible', 'step', 'min_value', 'max_value'];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(typeof body[f] === 'boolean' ? (body[f] ? 1 : 0) : body[f]);
      }
    }

    if (body.value !== undefined) {
      updates.push(`value = ?`);
      params.push(typeof body.value === 'object' ? JSON.stringify(body.value) : String(body.value));
    }

    if (updates.length === 0) return Response.json({ success: true });

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(Number(id)); // WHERE id = ?

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
    
    // 级联删除相关的阶段(Stages)配置
    await context.env.DB.prepare('DELETE FROM variable_stages WHERE variable_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM variables WHERE id = ?').bind(Number(id)).run();
    
    return Response.json({ success: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};