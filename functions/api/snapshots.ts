import { D1Database } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');
    const id = url.searchParams.get('id');

    if (id) {
      const snapshot = await context.env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(Number(id)).first();
      if (!snapshot) return new Response('Not found', { status: 404 });
      const { results: messages } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
      const { results: variables } = await context.env.DB.prepare('SELECT * FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).all();
      return Response.json({ snapshot, messages, variables });
    }

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
    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');
    const body: any = await context.request.json();
    const now = Date.now();

    if (action === 'auto') {
      return await createAutoSnapshot(context, body, now);
    }

    const maxOrderRes = await context.env.DB.prepare(
      'SELECT COALESCE(MAX(snapshot_order), 0) as max_order FROM snapshots WHERE (char_id = ? OR ? IS NULL) AND (room_id = ? OR ? IS NULL)'
    ).bind(body.char_id || null, body.char_id || null, body.room_id || null, body.room_id || null).first();
    const snapshotOrder = ((maxOrderRes?.max_order as number) || 0) + 1;

    const { meta } = await context.env.DB.prepare(
      `INSERT INTO snapshots (char_id, room_id, name, description, snapshot_order, snapshot_type, user_message, ai_response, message_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.char_id || null, 
      body.room_id || null, 
      body.name, 
      body.description || null, 
      snapshotOrder,
      body.snapshot_type || 'manual',
      body.user_message || null,
      body.ai_response || null,
      0,
      now
    ).run();
    
    const snapshotId = meta.last_row_id as number;
    await populateSnapshotData(context, snapshotId, body.char_id, body.room_id, now);

    return Response.json({ id: snapshotId });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

async function createAutoSnapshot(context: any, body: any, now: number) {
  const { char_id, room_id, user_message, ai_response } = body;
  
  const maxOrderRes = await context.env.DB.prepare(
    'SELECT COALESCE(MAX(snapshot_order), 0) as max_order FROM snapshots WHERE (char_id = ? OR ? IS NULL) AND (room_id = ? OR ? IS NULL)'
  ).bind(char_id || null, char_id || null, room_id || null, room_id || null).first();
  const snapshotOrder = ((maxOrderRes?.max_order as number) || 0) + 1;

  const name = `第 ${snapshotOrder} 轮 - ${new Date().toLocaleTimeString()}`;
  
  let messageCount = 0;
  if (char_id) {
    const countRes = await context.env.DB.prepare('SELECT COUNT(*) as count FROM messages WHERE char_id = ?').bind(char_id).first();
    messageCount = (countRes?.count as number) || 0;
  } else if (room_id) {
    const countRes = await context.env.DB.prepare('SELECT COUNT(*) as count FROM room_messages WHERE room_id = ?').bind(room_id).first();
    messageCount = (countRes?.count as number) || 0;
  }

  const { meta } = await context.env.DB.prepare(
    `INSERT INTO snapshots (char_id, room_id, name, snapshot_order, snapshot_type, user_message, ai_response, message_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(char_id || null, room_id || null, name, snapshotOrder, 'auto', user_message, ai_response, messageCount, now).run();
  
  const snapshotId = meta.last_row_id as number;
  await populateSnapshotData(context, snapshotId, char_id, room_id, now);

  return Response.json({ id: snapshotId, snapshot_order: snapshotOrder });
}

async function populateSnapshotData(context: any, snapshotId: number, charId: number | undefined, roomId: number | undefined, now: number) {
  if (charId) {
    const { results: msgs } = await context.env.DB.prepare('SELECT * FROM messages WHERE char_id = ? ORDER BY timestamp ASC').bind(charId).all();
    for (let i = 0; i < (msgs?.length || 0); i++) {
      const m: any = msgs[i];
      await context.env.DB.prepare(
        `INSERT INTO snapshot_messages (snapshot_id, original_message_id, char_id, role, content, image, timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(snapshotId, m.id || null, charId, m.role || 'user', m.content || '', m.image || null, m.timestamp || now, i).run();
    }
    
    const { results: vars } = await context.env.DB.prepare('SELECT * FROM variables WHERE char_id = ?').bind(charId).all();
    for (const v of vars || []) {
      await context.env.DB.prepare(
        `INSERT INTO snapshot_variables (snapshot_id, variable_id, key, value, type) VALUES (?, ?, ?, ?, ?)`
      ).bind(snapshotId, (v as any).id || null, (v as any).key || '', (v as any).value ?? null, (v as any).type || 'string').run();
    }
  } else if (roomId) {
    const { results: msgs } = await context.env.DB.prepare('SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp ASC').bind(roomId).all();
    for (let i = 0; i < (msgs?.length || 0); i++) {
      const m: any = msgs[i];
      await context.env.DB.prepare(
        `INSERT INTO snapshot_messages (snapshot_id, original_message_id, room_id, char_id, role, content, image, timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(snapshotId, m.id || null, roomId, m.char_id || null, m.role || 'user', m.content || '', m.image || null, m.timestamp || now, i).run();
    }
    
    const { results: vars } = await context.env.DB.prepare('SELECT * FROM variables WHERE room_id = ?').bind(roomId).all();
    for (const v of vars || []) {
      await context.env.DB.prepare(
        `INSERT INTO snapshot_variables (snapshot_id, variable_id, key, value, type) VALUES (?, ?, ?, ?, ?)`
      ).bind(snapshotId, (v as any).id || null, (v as any).key || '', (v as any).value ?? null, (v as any).type || 'string').run();
    }
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { id, ...updates } = body;
    
    if (!id) return new Response('Missing id', { status: 400 });

    const setFields: string[] = [];
    const params: any[] = [];

    const editableFields = ['name', 'description', 'user_message', 'ai_response'];
    for (const f of editableFields) {
      if (updates[f] !== undefined) {
        setFields.push(`${f} = ?`);
        params.push(updates[f]);
      }
    }

    if (setFields.length === 0) return Response.json({ success: true });

    setFields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    await context.env.DB.prepare(`UPDATE snapshots SET ${setFields.join(', ')} WHERE id = ?`).bind(...params).run();
    return Response.json({ success: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    
    await context.env.DB.prepare('DELETE FROM snapshot_messages WHERE snapshot_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM snapshots WHERE id = ?').bind(Number(id)).run();
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
