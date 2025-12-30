// functions/api/messages.ts 完整覆盖

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const charId = url.searchParams.get('char_id');
  const groupId = url.searchParams.get('group_id');

  if (groupId && groupId !== 'undefined') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC"
    ).bind(groupId).all();
    return Response.json(results);
  } else if (charId && charId !== 'undefined') {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM messages WHERE char_id = ? AND group_id IS NULL ORDER BY timestamp ASC"
    ).bind(charId).all();
    return Response.json(results);
  }
  return Response.json([]);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO messages (char_id, group_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(body.char_id || null, body.group_id || null, body.role, body.content, body.image || "", body.timestamp).run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const body: any = await context.request.json();
    await context.env.DB.prepare("UPDATE messages SET content = ? WHERE id = ?").bind(body.content, body.id).run();
    return new Response("Updated");
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const charId = url.searchParams.get('char_id');
    const groupId = url.searchParams.get('group_id');
    const type = url.searchParams.get('type');

    if (type === 'all_images') {
        await context.env.DB.prepare("DELETE FROM messages WHERE image IS NOT NULL AND image != ''").run();
        return new Response("Images Cleared");
    } 
    
    if (id && id !== 'undefined') {
        await context.env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
        return new Response("Deleted Single");
    }

    // 修复全量删除：根据传入的参数决定删除哪个范围
    if (groupId && groupId !== 'undefined') {
        await context.env.DB.prepare("DELETE FROM messages WHERE group_id = ?").bind(groupId).run();
        return new Response("Group Cleared");
    } 
    
    if (charId && charId !== 'undefined') {
        await context.env.DB.prepare("DELETE FROM messages WHERE char_id = ? AND group_id IS NULL").bind(charId).run();
        return new Response("Char Cleared");
    }

    return new Response("No Action", { status: 400 });
};