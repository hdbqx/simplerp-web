// 覆盖替换：functions/api/snapshots.ts
import { D1Database } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');
    const id = url.searchParams.get('id');

    // 详情查询（回滚时调用）
    if (id) {
      const snapshot = await context.env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(Number(id)).first();
      const { results: messages } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
      const { results: variables } = await context.env.DB.prepare('SELECT * FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).all();
      return Response.json({ snapshot, messages, variables });
    }

    // 列表查询
    let query = 'SELECT * FROM snapshots WHERE 1=1';
    const params: any[] = [];
    if (charId && charId !== 'undefined' && charId !== 'null') { query += ' AND char_id = ?'; params.push(Number(charId)); }
    if (roomId && roomId !== 'undefined' && roomId !== 'null') { query += ' AND room_id = ?'; params.push(Number(roomId)); }
    query += ' ORDER BY snapshot_order ASC';

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const now = Date.now();

    // 1. 创建快照基础记录
    const maxOrderRes = await context.env.DB.prepare('SELECT COALESCE(MAX(snapshot_order), 0) as max_order FROM snapshots WHERE char_id = ? OR room_id = ?')
      .bind(body.char_id || null, body.room_id || null).first();
    const snapshotOrder = ((maxOrderRes?.max_order as number) || 0) + 1;

    const { meta } = await context.env.DB.prepare(
      `INSERT INTO snapshots (char_id, room_id, name, description, snapshot_order, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(body.char_id || null, body.room_id || null, body.name, body.description || null, snapshotOrder, now).run();
    
    const snapshotId = meta.last_row_id as number;

    // 2. 深度拷贝聊天记录和变量 (D1要求必须处理 undefined 为 null)
    if (body.char_id) {
      const { results: msgs } = await context.env.DB.prepare('SELECT * FROM messages WHERE char_id = ? AND group_id IS NULL ORDER BY timestamp ASC').bind(body.char_id).all();
      for (let i = 0; i < (msgs?.length || 0); i++) {
        const m: any = msgs[i];
        await context.env.DB.prepare(
          `INSERT INTO snapshot_messages (snapshot_id, char_id, role, content, image, timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(snapshotId, body.char_id, m.role || 'user', m.content || '', m.image || null, m.timestamp || now, i).run();
      }
      
      const { results: vars } = await context.env.DB.prepare('SELECT * FROM variables WHERE char_id = ?').bind(body.char_id).all();
      for (const v of vars || []) {
        await context.env.DB.prepare(
          `INSERT INTO snapshot_variables (snapshot_id, variable_id, key, value, type) VALUES (?, ?, ?, ?, ?)`
        ).bind(snapshotId, (v as any).id || null, (v as any).key || '', (v as any).value ?? null, (v as any).type || 'string').run();
      }
    } else if (body.room_id) {
      // 兼容群聊记录
      const { results: msgs } = await context.env.DB.prepare('SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp ASC').bind(body.room_id).all();
      for (let i = 0; i < (msgs?.length || 0); i++) {
        const m: any = msgs[i];
        await context.env.DB.prepare(
          `INSERT INTO snapshot_messages (snapshot_id, room_id, char_id, role, content, image, timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(snapshotId, body.room_id, m.char_id || null, m.role || 'user', m.content || '', m.image || null, m.timestamp || now, i).run();
      }
    }

    return Response.json({ id: snapshotId });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });
  await context.env.DB.prepare('DELETE FROM snapshot_messages WHERE snapshot_id = ?').bind(Number(id)).run();
  await context.env.DB.prepare('DELETE FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).run();
  await context.env.DB.prepare('DELETE FROM snapshots WHERE id = ?').bind(Number(id)).run();
  return new Response('Deleted');
};