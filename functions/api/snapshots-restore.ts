interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { id } = body;

    if (!id) return new Response('Missing id', { status: 400 });

    const snapshot = await context.env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(Number(id)).first();
    if (!snapshot) return new Response('Snapshot not found', { status: 404 });

    const { results: messages } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
    const { results: variables } = await context.env.DB.prepare('SELECT * FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).all();

    if (snapshot.char_id) {
      await context.env.DB.prepare('DELETE FROM messages WHERE char_id = ? AND group_id IS NULL').bind(Number(snapshot.char_id)).run();
      for (const msg of messages || []) {
        await context.env.DB.prepare(
          'INSERT INTO messages (char_id, role, content, image, timestamp, snapshot_id) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(snapshot.char_id, msg.role, msg.content, msg.image, msg.timestamp, id).run();
      }

      for (const v of variables || []) {
        if (v.variable_id) {
          await context.env.DB.prepare('UPDATE variables SET value = ? WHERE id = ?').bind(v.value, v.variable_id).run();
        }
      }
    }

    if (snapshot.room_id) {
      await context.env.DB.prepare('DELETE FROM room_messages WHERE room_id = ?').bind(Number(snapshot.room_id)).run();
      for (const msg of messages || []) {
        await context.env.DB.prepare(
          'INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, timestamp, snapshot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(snapshot.room_id, msg.char_id || null, msg.char_id ? 'agent' : 'user', msg.role, msg.content, msg.image, msg.timestamp, id).run();
      }

      for (const v of variables || []) {
        if (v.variable_id) {
          await context.env.DB.prepare('UPDATE variables SET value = ? WHERE id = ?').bind(v.value, v.variable_id).run();
        }
      }
    }

    return new Response('Restored');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
