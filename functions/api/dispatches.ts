interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeJsonParse(input: string, fallback: any = null) {
  try { return JSON.parse(input); } catch { return fallback; }
}

function applyPatchOp(state: any, op: any) {
  const operation = String(op?.op || '').toLowerCase();
  const path = String(op?.path || '').trim();
  const value = op?.value;
  if (!path.startsWith('/')) throw new Error('Invalid path');

  const keys = path.split('/').slice(1).map(decodeURIComponent).filter(Boolean);
  let target = state;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (target[k] === undefined || target[k] === null || typeof target[k] !== 'object') target[k] = {};
    target = target[k];
  }
  const last = keys[keys.length - 1];
  if (!last) throw new Error('Invalid path');

  if (operation === 'replace' || operation === 'set') {
    target[last] = value;
    return;
  }
  if (operation === 'add') {
    if (Array.isArray(target[last])) (target[last] as any[]).push(value);
    else if (target[last] === undefined) target[last] = value;
    else target[last] = value;
    return;
  }
  if (operation === 'remove') {
    if (Array.isArray(target)) {
      const idx = parseInt(last, 10);
      if (Number.isFinite(idx) && idx >= 0) (target as any[]).splice(idx, 1);
      else delete (target as any)[last];
    } else {
      delete target[last];
    }
    return;
  }
  throw new Error('Unsupported op');
}

async function insertRoomMessage(db: D1Database, roomId: number, senderType: string, role: string, content: string, meta?: any) {
  const metaJson = meta ? JSON.stringify(meta) : '';
  const ts = Date.now();
  await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(roomId, null, senderType, role, content || '', '', metaJson, ts).run();
  return ts;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const status = url.searchParams.get('status') || '';
  const roomId = url.searchParams.get('room_id');

  if (roomId) {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM dispatches WHERE (from_room_id = ? OR to_room_id = ?) ORDER BY created_at DESC LIMIT 200"
    ).bind(roomId, roomId).all();
    return Response.json(results);
  }

  if (status) {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM dispatches WHERE status = ? ORDER BY created_at DESC LIMIT 200"
    ).bind(status).all();
    return Response.json(results);
  }

  const { results } = await context.env.DB.prepare("SELECT * FROM dispatches ORDER BY created_at DESC LIMIT 200").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const fromRoomId = toInt(body?.from_room_id);
    const toRoomId = toInt(body?.to_room_id);
    const abstract = String(body?.abstract || '').trim();
    const payloadJson = body?.payload_json ? String(body.payload_json) : (body?.payload ? JSON.stringify(body.payload) : '');
    if (!toRoomId) return new Response('Missing to_room_id', { status: 400 });
    if (!abstract) return new Response('Missing abstract', { status: 400 });

    const now = Date.now();
    const { meta } = await context.env.DB.prepare(
      "INSERT INTO dispatches (from_room_id, to_room_id, abstract, payload_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(fromRoomId || null, toRoomId, abstract, payloadJson, 'pending', now).run();
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const id = toInt(body?.id);
    const action = String(body?.action || '').trim(); // approve | reject | rewrite
    const resolvedBy = String(body?.resolved_by || 'user');
    if (!id) return new Response('Missing id', { status: 400 });
    if (!action) return new Response('Missing action', { status: 400 });

    const row: any = await context.env.DB.prepare("SELECT * FROM dispatches WHERE id = ? LIMIT 1").bind(id).first();
    if (!row) return new Response('Not found', { status: 404 });

    const now = Date.now();
    let nextStatus = row.status;
    if (action === 'approve') nextStatus = 'approved';
    else if (action === 'reject') nextStatus = 'rejected';
    else if (action === 'rewrite') nextStatus = 'rewrite_requested';
    else return new Response('Invalid action', { status: 400 });

    await context.env.DB.prepare(
      "UPDATE dispatches SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?"
    ).bind(nextStatus, now, resolvedBy, id).run();

    if (nextStatus !== 'approved') return new Response('Updated');

    const toRoomId = toInt(row.to_room_id);
    if (!toRoomId) return new Response('Updated');

    const payloadText = typeof row.payload_json === 'string' ? String(row.payload_json) : '';
    const payload = payloadText ? safeJsonParse(payloadText, null) : null;

    // Tool-like dispatch payloads: execute + log
    if (payload?.tool === 'update_state') {
      const target = String(payload?.target || 'room');
      const patch = Array.isArray(payload?.patch) ? payload.patch : [];
      const meta = { dispatch_id: id, from_room_id: row.from_room_id || null, tool: 'update_state', target, patch };

      if ((target !== 'room' && target !== 'global') || patch.length === 0 || patch.length > 50) {
        await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', '【公文执行失败】无效的 update_state payload', { ...meta, payload_json: payloadText });
        return new Response('Updated');
      }

      if (target === 'global') {
        const worldRow: any = await context.env.DB.prepare("SELECT state_json FROM world_state WHERE id = 1").first();
        const before = safeJsonParse(String(worldRow?.state_json || '{}'), {});
        const next = before;
        for (const op of patch) applyPatchOp(next, op);
        const nextJson = JSON.stringify(next);
        await context.env.DB.prepare("UPDATE world_state SET state_json = ?, updated_at = ? WHERE id = 1").bind(nextJson, Date.now()).run();
        await context.env.DB.prepare("INSERT INTO world_state_snapshots (state_json, created_at) VALUES (?, ?)").bind(nextJson, Date.now()).run();
        await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', `【已执行状态更新公文】target=global op=${patch.length}`, meta);
        return new Response('Updated');
      }

      // target === 'room'
      const roomRow: any = await context.env.DB.prepare("SELECT state_json FROM rooms WHERE id = ? LIMIT 1").bind(toRoomId).first();
      const before = safeJsonParse(String(roomRow?.state_json || '{}'), {});
      const next = before;
      for (const op of patch) applyPatchOp(next, op);
      const nextJson = JSON.stringify(next);
      await context.env.DB.prepare("UPDATE rooms SET state_json = ?, updated_at = ? WHERE id = ?").bind(nextJson, Date.now(), toRoomId).run();
      await context.env.DB.prepare(
        "INSERT INTO room_state_snapshots (room_id, turn_id, state_json, created_at) VALUES (?, ?, ?, ?)"
      ).bind(toRoomId, null, nextJson, Date.now()).run();
      await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', `【已执行状态更新公文】target=room op=${patch.length}`, meta);
      return new Response('Updated');
    }

    if (payload?.tool === 'request_image') {
      const actionName = String(payload?.action || 'txt2img');
      const prompt = String(payload?.prompt || '').trim();
      const params = payload?.params && typeof payload.params === 'object' ? payload.params : {};
      await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', `【已批准图片请求】action=${actionName} prompt=${prompt}`, {
        dispatch_id: id,
        from_room_id: row.from_room_id || null,
        tool: 'request_image',
        action: actionName,
        prompt,
        params,
      });
      return new Response('Updated');
    }

    // Default: simple inbox message
    await insertRoomMessage(context.env.DB, toRoomId, 'tool', 'system', `【收到公文】${String(row.abstract || '')}`, {
      dispatch_id: id,
      from_room_id: row.from_room_id || null,
      payload_json: payloadText,
    });
    return new Response('Updated');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

