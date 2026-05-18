import { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
}

export interface SnapshotData {
  id?: number;
  char_id?: number;
  room_id?: number;
  name: string;
  description?: string;
  snapshot_order?: number;
  user_message?: string;
  ai_response?: string;
  created_at?: number;
}

export interface SnapshotMessageData {
  snapshot_id: number;
  char_id?: number;
  room_id?: number;
  role: string;
  content: string;
  image?: string;
  timestamp?: number;
  order_index: number;
}

export interface SnapshotVariableData {
  snapshot_id: number;
  variable_id?: number;
  key: string;
  value: string;
  type?: string;
}

export async function listSnapshots(db: D1Database, charId?: number, roomId?: number) {
  let query = 'SELECT * FROM snapshots WHERE 1=1';
  const params: any[] = [];
  
  if (charId) {
    query += ' AND char_id = ?';
    params.push(charId);
  }
  if (roomId) {
    query += ' AND room_id = ?';
    params.push(roomId);
  }
  
  query += ' ORDER BY snapshot_order ASC';
  
  const { results } = await db.prepare(query).bind(...params).all();
  return results;
}

export async function getSnapshot(db: D1Database, id: number) {
  const { results } = await db.prepare('SELECT * FROM snapshots WHERE id = ?').bind(id).all();
  return results[0] || null;
}

export async function createSnapshot(db: D1Database, data: SnapshotData) {
  const now = Date.now();
  
  const maxOrderResult = await db.prepare(
    'SELECT COALESCE(MAX(snapshot_order), 0) as max_order FROM snapshots WHERE char_id = ?'
  ).bind(data.char_id).first();
  
  const snapshotOrder = (maxOrderResult?.max_order || 0) + 1;
  
  const { results } = await db.prepare(`
    INSERT INTO snapshots (char_id, room_id, name, description, snapshot_order, user_message, ai_response, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.char_id,
    data.room_id,
    data.name,
    data.description,
    snapshotOrder,
    data.user_message,
    data.ai_response,
    now
  ).run();
  
  return { id: results.lastInsertRowid, ...data, snapshot_order: snapshotOrder, created_at: now };
}

export async function updateSnapshot(db: D1Database, id: number, updates: Partial<SnapshotData>) {
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  
  await db.prepare(`UPDATE snapshots SET ${setClause} WHERE id = ?`)
    .bind(...values, id).run();
  
  return getSnapshot(db, id);
}

export async function deleteSnapshot(db: D1Database, id: number) {
  const snapshot = await getSnapshot(db, id);
  if (!snapshot) return false;
  
  await db.transaction(async (tx) => {
    await tx.prepare('DELETE FROM snapshot_messages WHERE snapshot_id = ?').bind(id).run();
    await tx.prepare('DELETE FROM snapshot_variables WHERE snapshot_id = ?').bind(id).run();
    
    const { results } = await tx.prepare(
      'SELECT snapshot_order FROM snapshots WHERE id = ?'
    ).bind(id).first();
    
    const orderToDelete = results?.snapshot_order;
    
    await tx.prepare('DELETE FROM snapshots WHERE id = ?').bind(id).run();
    
    if (orderToDelete !== undefined) {
      await tx.prepare(
        'UPDATE snapshots SET snapshot_order = snapshot_order - 1 WHERE snapshot_order > ?'
      ).bind(orderToDelete).run();
    }
  });
  
  return true;
}

export async function restoreSnapshot(db: D1Database, id: number) {
  const snapshot = await getSnapshot(db, id);
  if (!snapshot) return false;
  
  const charId = snapshot.char_id;
  
  await db.transaction(async (tx) => {
    await tx.prepare('DELETE FROM messages WHERE char_id = ?').bind(charId).run();
    
    const { results: messages } = await tx.prepare(
      'SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC'
    ).bind(id).all();
    
    for (const msg of messages) {
      await tx.prepare(`
        INSERT INTO messages (char_id, role, content, image, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).bind(charId, msg.role, msg.content, msg.image, msg.timestamp).run();
    }
    
    await tx.prepare('DELETE FROM variables WHERE char_id = ?').bind(charId).run();
    
    const { results: variables } = await tx.prepare(
      'SELECT * FROM snapshot_variables WHERE snapshot_id = ?'
    ).bind(id).all();
    
    for (const v of variables) {
      await tx.prepare(`
        INSERT INTO variables (char_id, name, key, type, value)
        VALUES (?, ?, ?, ?, ?)
      `).bind(charId, v.key, v.key, v.type, v.value).run();
    }
    
    const orderToRestore = snapshot.snapshot_order;
    await tx.prepare(
      'DELETE FROM snapshots WHERE char_id = ? AND snapshot_order > ?'
    ).bind(charId, orderToRestore).run();
  });
  
  return true;
}

export async function addSnapshotMessages(db: D1Database, messages: SnapshotMessageData[]) {
  for (const msg of messages) {
    await db.prepare(`
      INSERT INTO snapshot_messages (snapshot_id, char_id, room_id, role, content, image, timestamp, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      msg.snapshot_id,
      msg.char_id,
      msg.room_id,
      msg.role,
      msg.content,
      msg.image,
      msg.timestamp,
      msg.order_index
    ).run();
  }
}

export async function addSnapshotVariables(db: D1Database, variables: SnapshotVariableData[]) {
  for (const v of variables) {
    await db.prepare(`
      INSERT INTO snapshot_variables (snapshot_id, variable_id, key, value, type)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      v.snapshot_id,
      v.variable_id,
      v.key,
      v.value,
      v.type
    ).run();
  }
}

export async function getSnapshotMessages(db: D1Database, snapshotId: number) {
  const { results } = await db.prepare(
    'SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC'
  ).bind(snapshotId).all();
  return results;
}

export async function getSnapshotVariables(db: D1Database, snapshotId: number) {
  const { results } = await db.prepare(
    'SELECT * FROM snapshot_variables WHERE snapshot_id = ?'
  ).bind(snapshotId).all();
  return results;
}
