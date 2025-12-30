interface Env { DB: D1Database; }

/**
 * GET: 获取消息列表
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const charId = url.searchParams.get('char_id');
  const groupId = url.searchParams.get('group_id');

  // 如果提供了 group_id，获取该剧场/群聊的所有消息
  if (groupId && groupId !== 'undefined' && groupId !== 'null') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC"
    ).bind(groupId).all();
    return Response.json(results);
  } 
  
  // 如果提供了 char_id，获取该角色的私聊消息（排除属于任何剧场的消息）
  if (charId && charId !== 'undefined' && charId !== 'null') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE char_id = ? AND group_id IS NULL ORDER BY timestamp ASC"
    ).bind(charId).all();
    return Response.json(results);
  }

  return Response.json([]);
};

/**
 * POST: 新增消息
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare(
      "INSERT INTO messages (char_id, group_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      body.char_id || null, 
      body.group_id || null, 
      body.role, 
      body.content, 
      body.image || "", 
      body.timestamp
    ).run();

    // 返回新插入记录的 ID，供前端同步状态
    return Response.json({ id: meta.last_row_id });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

/**
 * PUT: 更新消息（编辑内容）
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    if (!body.id) return new Response("Missing ID", { status: 400 });

    await context.env.DB.prepare(
      "UPDATE messages SET content = ? WHERE id = ?"
    ).bind(body.content, body.id).run();

    return new Response("Updated");
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

/**
 * DELETE: 删除消息
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const charId = url.searchParams.get('char_id');
    const groupId = url.searchParams.get('group_id');
    const type = url.searchParams.get('type');

    // 1. 特殊操作：清理所有包含生成图片的记录
    if (type === 'all_images') {
      await context.env.DB.prepare(
        "DELETE FROM messages WHERE image IS NOT NULL AND image != ''"
      ).run();
      return new Response("All Images Cleared");
    }

    // 2. 删除单条指定 ID 的消息
    if (id && id !== 'undefined' && id !== 'null') {
      await context.env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
      return new Response("Single Message Deleted");
    }

    // 3. 清空整个剧场（群聊）的消息
    if (groupId && groupId !== 'undefined' && groupId !== 'null') {
      await context.env.DB.prepare("DELETE FROM messages WHERE group_id = ?").bind(groupId).run();
      return new Response("Group Messages Cleared");
    }

    // 4. 清空特定角色的私聊消息
    if (charId && charId !== 'undefined' && charId !== 'null') {
      await context.env.DB.prepare(
        "DELETE FROM messages WHERE char_id = ? AND group_id IS NULL"
      ).bind(charId).run();
      return new Response("Character Messages Cleared");
    }

    return new Response("Missing Parameters", { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};