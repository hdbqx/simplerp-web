import { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const id = body.id;
    if (!id) return new Response('Missing snapshot id', { status: 400 });

    // 1. 获取快照元数据
    const snapshot: any = await context.env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(Number(id)).first();
    if (!snapshot) return new Response('Snapshot not found', { status: 404 });

    // 单人角色存档回滚
    if (snapshot.char_id) {
      // (1) 清空当前角色主聊天记录 (不影响群聊记录)
      await context.env.DB.prepare('DELETE FROM messages WHERE char_id = ? AND group_id IS NULL').bind(snapshot.char_id).run();
      
      // (2) 恢复聊天记录
      const { results: msgs } = await context.env.DB.prepare('SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC').bind(Number(id)).all();
      for (const m of msgs || []) {
        const msg: any = m;
        await context.env.DB.prepare(
          'INSERT INTO messages (char_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          snapshot.char_id, 
          msg.role || 'user', 
          msg.content || '', 
          msg.image || null, // 强制防 undefined 崩溃
          msg.timestamp || Date.now()
        ).run();
      }

      // (3) 恢复变量状态
      const { results: vars } = await context.env.DB.prepare('SELECT * FROM snapshot_variables WHERE snapshot_id = ?').bind(Number(id)).all();
      for (const v of vars || []) {
        const sv: any = v;
        if (sv.variable_id) {
            // 直接更新回原变量 ID
            await context.env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
                .bind(sv.value ?? null, Date.now(), sv.variable_id).run();
        }
      }
    } 
    // 群聊房间存档回滚
    else if (snapshot.room_id) {
      // (1) 清空当前群聊主聊天记录
      await context.env.DB.prepare('DELETE FROM room_messages WHERE room_id = ?').bind(snapshot.room_id).run();
      
      // (2) 恢复群聊记录
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
          msg.image || null, // 强制防 undefined 崩溃
          msg.timestamp || Date.now()
        ).run();
      }
    }

    return Response.json({ success: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};