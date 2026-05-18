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
      const snapshot = await context.env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(Number(id)).first();
      if (!snapshot) return new Response('Not found', { status: 404 });

      const { results: messages } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
      const { results: variables } = await context.env.DB.prepare('SELECT * FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).all();

      return Response.json({
        snapshot: { ...snapshot, snapshot_type: snapshot.snapshot_type || 'manual' },
        messages: messages || [],
        variables: variables || []
      });
    }

    let query = 'SELECT * FROM snapshots WHERE 1=1';
    const params: any[] = [];
    if (charId) { query += ' AND char_id = ?'; params.push(Number(charId)); }
    if (roomId) { query += ' AND room_id = ?'; params.push(Number(roomId)); }
    query += ' ORDER BY created_at DESC';

    const { results } = await context.env.DB.prepare(query).bind(...params).all();
    return Response.json(results?.map(r => ({ ...r, snapshot_type: r.snapshot_type || 'manual' })) || []);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { char_id, room_id, name, description } = body;
    const now = Date.now();

    const { meta } = await context.env.DB.prepare(
      'INSERT INTO snapshots (char_id, room_id, name, description, snapshot_type, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(char_id || null, room_id || null, name, description || null, 'manual', now).run();
    const snapshotId = meta.last_row_id!;

    let messageCount = 0;
    if (char_id) {
      const { results } = await context.env.DB.prepare('SELECT * FROM messages WHERE char_id = ? AND group_id IS NULL ORDER BY timestamp ASC').bind(Number(char_id)).all();
      for (const [i, msg] of (results || []).entries()) {
        await context.env.DB.prepare(
          'INSERT INTO snapshot_messages (snapshot_id, original_message_id, char_id, role, content, image, timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(snapshotId, msg.id, char_id, msg.role, msg.content, msg.image, msg.timestamp, i).run();
        messageCount++;
      }

      const { results: variables } = await context.env.DB.prepare('SELECT * FROM variables WHERE char_id = ?').bind(Number(char_id)).all();
      for (const v of variables || []) {
        await context.env.DB.prepare(
          'INSERT INTO snapshot_variables (snapshot_id, variable_id, key, value, type) VALUES (?, ?, ?, ?, ?)'
        ).bind(snapshotId, v.id, v.key, v.value, v.type).run();
      }
    }

    if (room_id) {
      const { results } = await context.env.DB.prepare('SELECT * FROM room_messages WHERE room_id = ? ORDER BY timestamp ASC').bind(Number(room_id)).all();
      for (const [i, msg] of (results || []).entries()) {
        await context.env.DB.prepare(
          'INSERT INTO snapshot_messages (snapshot_id, original_message_id, room_id, char_id, role, content, image, timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(snapshotId, msg.id, room_id, msg.char_id || null, msg.role, msg.content, msg.image, msg.timestamp, i).run();
        messageCount++;
      }

      const { results: variables } = await context.env.DB.prepare('SELECT * FROM variables WHERE room_id = ?').bind(Number(room_id)).all();
      for (const v of variables || []) {
        await context.env.DB.prepare(
          'INSERT INTO snapshot_variables (snapshot_id, variable_id, key, value, type) VALUES (?, ?, ?, ?, ?)'
        ).bind(snapshotId, v.id, v.key, v.value, v.type).run();
      }
    }

    await context.env.DB.prepare('UPDATE snapshots SET message_count = ? WHERE id = ?').bind(messageCount, snapshotId).run();
    return Response.json({ id: snapshotId });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    await context.env.DB.prepare('DELETE FROM snapshot_messages WHERE snapshot_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).run();
    await context.env.DB.prepare('DELETE FROM snapshots WHERE id = ?').bind(Number(id)).run();
    return new Response('Deleted');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
