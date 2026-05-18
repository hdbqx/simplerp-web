import { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const id = body.id;
    if (!id) return new Response('Missing snapshot id', { status: 400 });

    const snapshot: any = await context.env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(Number(id)).first();
    if (!snapshot) return new Response('Snapshot not found', { status: 404 });

    await deleteLaterSnapshots(context, snapshot);

    if (snapshot.char_id) {
      await context.env.DB.prepare('DELETE FROM messages WHERE char_id = ?').bind(snapshot.char_id).run();
      
      const { results: msgs } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
      for (const m of msgs || []) {
        const msg: any = m;
        await context.env.DB.prepare(
          'INSERT INTO messages (char_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          snapshot.char_id, 
          msg.role || 'user', 
          msg.content || '', 
          msg.image || null,
          msg.timestamp || Date.now()
        ).run();
      }

      const { results: vars } = await context.env.DB.prepare('SELECT * FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).all();
      for (const v of vars || []) {
        const sv: any = v;
        if (sv.variable_id) {
          await context.env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
            .bind(sv.value ?? null, Date.now(), sv.variable_id).run();
        }
      }
    } 
    else if (snapshot.room_id) {
      await context.env.DB.prepare('DELETE FROM room_messages WHERE room_id = ?').bind(snapshot.room_id).run();
      
      const { results: msgs } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
      for (const m of msgs || []) {
        const msg: any = m;
        await context.env.DB.prepare(
          'INSERT INTO room_messages (room_id, char_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          snapshot.room_id, 
          msg.char_id || null, 
          msg.role || 'user', 
          msg.content || '', 
          msg.image || null,
          msg.timestamp || Date.now()
        ).run();
      }
    }

    return Response.json({ success: true, deleted_after: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

async function deleteLaterSnapshots(context: any, snapshot: any) {
  const { results: laterSnapshots } = await context.env.DB.prepare(
    'SELECT id FROM snapshots WHERE (char_id = ? OR room_id = ?) AND snapshot_order > ?'
  ).bind(snapshot.char_id || null, snapshot.room_id || null, snapshot.snapshot_order || 0).all();

  for (const later of laterSnapshots || []) {
    const laterId = (later as any).id;
    await context.env.DB.prepare('DELETE FROM snapshot_messages WHERE snapshot_id = ?').bind(laterId).run();
    await context.env.DB.prepare('DELETE FROM snapshot_variables WHERE snapshot_id = ?').bind(laterId).run();
    await context.env.DB.prepare('DELETE FROM snapshots WHERE id = ?').bind(laterId).run();
  }
}
