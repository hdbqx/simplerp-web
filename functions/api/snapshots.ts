import { D1Database } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

function safeParse(val: any) {
  if (val == null) return null;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch {
    return val;
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    const roomId = url.searchParams.get('room_id');
    const id = url.searchParams.get('id');

    if (id) {
      const snapshot: any = await context.env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(Number(id)).first();
      if (!snapshot) return new Response('Not found', { status: 404 });
      
      let messages: any[] = [];
      // 【优化】通过 max_message_id 指针动态从源消息表组装还原历史线，不作冗余复制
      if (snapshot.max_message_id) {
        if (snapshot.char_id) {
          const { results } = await context.env.DB.prepare(
            'SELECT * FROM messages WHERE char_id = ? AND id <= ? ORDER BY timestamp ASC'
          ).bind(snapshot.char_id, snapshot.max_message_id).all();
          messages = results || [];
        } else if (snapshot.room_id) {
          const { results } = await context.env.DB.prepare(
            'SELECT * FROM room_messages WHERE room_id = ? AND id <= ? ORDER BY timestamp ASC'
          ).bind(snapshot.room_id, snapshot.max_message_id).all();
          messages = results || [];
        }
      } else {
        // 向后兼容旧版本全量存储的快照
        const { results } = await context.env.DB.prepare(
          'SELECT * FROM snapshot_messages WHERE snapshot_id = ? ORDER BY order_index ASC'
        ).bind(Number(id)).all();
        messages = results || [];
      }

      const { results: variables } = await context.env.DB.prepare(
        'SELECT id, snapshot_id, variable_id, key, value, type FROM snapshot_variables WHERE snapshot_id = ?'
      ).bind(Number(id)).all();
      
      const parsedVariables = (variables || []).map((v: any) => ({
        ...v,
        value: safeParse(v.value)
      }));

      return Response.json({ snapshot, messages, variables: parsedVariables });
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

    // 手动创建快照逻辑也升级为增量存储指针模式
    const maxOrderRes = await context.env.DB.prepare(
      'SELECT COALESCE(MAX(snapshot_order), 0) as max_order FROM snapshots WHERE (char_id = ? OR ? IS NULL) AND (room_id = ? OR ? IS NULL)'
    ).bind(body.char_id || null, body.char_id || null, body.room_id || null, body.room_id || null).first();
    const snapshotOrder = ((maxOrderRes?.max_order as number) || 0) + 1;

    let messageCount = 0;
    let maxMessageId: number | null = null;
    
    if (body.char_id) {
      const countRes = await context.env.DB.prepare('SELECT COUNT(*) as count, MAX(id) as max_id FROM messages WHERE char_id = ?').bind(body.char_id).first();
      messageCount = (countRes?.count as number) || 0;
      maxMessageId = (countRes?.max_id as number) || null;
    } else if (body.room_id) {
      const countRes = await context.env.DB.prepare('SELECT COUNT(*) as count, MAX(id) as max_id FROM room_messages WHERE room_id = ?').bind(body.room_id).first();
      messageCount = (countRes?.count as number) || 0;
      maxMessageId = (countRes?.max_id as number) || null;
    }

    const { meta } = await context.env.DB.prepare(
      `INSERT INTO snapshots (char_id, room_id, name, description, snapshot_order, snapshot_type, user_message, ai_response, message_count, max_message_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.char_id || null,
      body.room_id || null,
      body.name,
      body.description || null,
      snapshotOrder,
      body.snapshot_type || 'manual',
      body.user_message || null,
      body.ai_response || null,
      messageCount,
      maxMessageId,
      now
    ).run();
    
    const snapshotId = meta.last_row_id as number;
    await populateSnapshotVariables(context, snapshotId, body.char_id, body.room_id, now);

    return Response.json({ id: snapshotId });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

async function createAutoSnapshot(context: any, body: any, now: number) {
  const { char_id, room_id, user_message, ai_response } = body;
  
  // 1. 获取系统配置来验证触发间隔策略
  const settingsRow: any = await context.env.DB.prepare("SELECT config FROM settings WHERE id = 1").first();
  const settingsConfig = settingsRow?.config ? JSON.parse(settingsRow.config) : {};
  const triggerInterval = settingsConfig.snapshot_trigger_interval ?? 5;
  const maxKeepCount = settingsConfig.snapshot_max_keep_count ?? 20;

  let messageCount = 0;
  let maxMessageId: number | null = null;
  
  if (char_id) {
    const countRes = await context.env.DB.prepare('SELECT COUNT(*) as count, MAX(id) as max_id FROM messages WHERE char_id = ?').bind(char_id).first();
    messageCount = (countRes?.count as number) || 0;
    maxMessageId = (countRes?.max_id as number) || null;
  } else if (room_id) {
    const countRes = await context.env.DB.prepare('SELECT COUNT(*) as count, MAX(id) as max_id FROM room_messages WHERE room_id = ?').bind(room_id).first();
    messageCount = (countRes?.count as number) || 0;
    maxMessageId = (countRes?.max_id as number) || null;
  }

  // 2. 将消息折算成对话轮数 (1个Round = 1用户 + 1AI = 2条消息)
  const currentRounds = Math.floor(messageCount / 2);
  if (currentRounds === 0 || currentRounds % triggerInterval !== 0) {
    // 未达到设定的存储间隔数，跳过轻量化写入
    return Response.json({ id: null, skipped: true });
  }

  const maxOrderRes = await context.env.DB.prepare(
    'SELECT COALESCE(MAX(snapshot_order), 0) as max_order FROM snapshots WHERE (char_id = ? OR ? IS NULL) AND (room_id = ? OR ? IS NULL)'
  ).bind(char_id || null, char_id || null, room_id || null, room_id || null).first();
  const snapshotOrder = ((maxOrderRes?.max_order as number) || 0) + 1;

  const name = `自动快照 第 ${snapshotOrder} 轮 - ${new Date().toLocaleTimeString()}`;

  const { meta } = await context.env.DB.prepare(
    `INSERT INTO snapshots (char_id, room_id, name, snapshot_order, snapshot_type, user_message, ai_response, message_count, max_message_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(char_id || null, room_id || null, name, snapshotOrder, 'auto', user_message, ai_response, messageCount, maxMessageId, now).run();
  
  const snapshotId = meta.last_row_id as number;
  await populateSnapshotVariables(context, snapshotId, char_id, room_id, now);

  // 3. 超载检查：如果快照数溢出，自动级联删除最早的陈旧数据
  const { results: allSnaps } = await context.env.DB.prepare(
    'SELECT id FROM snapshots WHERE (char_id = ? OR ? IS NULL) AND (room_id = ? OR ? IS NULL) ORDER BY snapshot_order ASC'
  ).bind(char_id || null, char_id || null, room_id || null, room_id || null).all();

  if (allSnaps && allSnaps.length > maxKeepCount) {
    const oldestSnapId = (allSnaps[0] as any).id;
    await context.env.DB.prepare('DELETE FROM snapshot_messages WHERE snapshot_id = ?').bind(oldestSnapId).run();
    await context.env.DB.prepare('DELETE FROM snapshot_variables WHERE snapshot_id = ?').bind(oldestSnapId).run();
    await context.env.DB.prepare('DELETE FROM snapshots WHERE id = ?').bind(oldestSnapId).run();
  }

  return Response.json({ id: snapshotId, snapshot_order: snapshotOrder });
}

// 【轻量化重构】彻底移除对大表全量副本的 populate 拷贝，仅冷冻变量值
async function populateSnapshotVariables(context: any, snapshotId: number, charId: number | undefined, roomId: number | undefined, now: number) {
  const statements: any[] = [];

  if (charId) {
    const { results: vars } = await context.env.DB.prepare('SELECT * FROM variables WHERE char_id = ?').bind(charId).all();
    (vars || []).forEach((v: any) => {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO snapshot_variables (snapshot_id, variable_id, key, value, type) VALUES (?, ?, ?, ?, ?)`
        ).bind(snapshotId, v.id || null, v.key || '', typeof v.value === 'object' ? JSON.stringify(v.value) : String(v.value ?? ''), v.type || 'string')
      );
    });
  } else if (roomId) {
    const { results: vars } = await context.env.DB.prepare('SELECT * FROM variables WHERE room_id = ?').bind(roomId).all();
    (vars || []).forEach((v: any) => {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO snapshot_variables (snapshot_id, variable_id, key, value, type) VALUES (?, ?, ?, ?, ?)`
        ).bind(snapshotId, v.id || null, v.key || '', typeof v.value === 'object' ? JSON.stringify(v.value) : String(v.value ?? ''), v.type || 'string')
      );
    });
  }

  if (statements.length > 0) await context.env.DB.batch(statements);
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { id, snapshot_variables, ...updates } = body;
    
    if (!id) return new Response('Missing id', { status: 400 });

    // 处理快照中冷冻变量的即时单例修改
    if (snapshot_variables && Array.isArray(snapshot_variables)) {
      const varStatements = snapshot_variables.map((sv: any) => {
        const serializedValue = typeof sv.value === 'object' ? JSON.stringify(sv.value) : String(sv.value ?? '');
        return context.env.DB.prepare('UPDATE snapshot_variables SET value = ? WHERE id = ?').bind(serializedValue, sv.id);
      });
      if (varStatements.length > 0) await context.env.DB.batch(varStatements);
    }

    const setFields: string[] = [];
    const params: any[] = [];

    const editableFields = ['name', 'description', 'user_message', 'ai_response'];
    for (const f of editableFields) {
      if (updates[f] !== undefined) { setFields.push(`${f} = ?`); params.push(updates[f]); }
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
