interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const groupId = url.searchParams.get('group_id');

  if (type === 'members' && groupId) {
    const { results } = await context.env.DB.prepare("SELECT char_id FROM group_members WHERE group_id = ?").bind(groupId).all();
    return Response.json(results.map((r: any) => r.char_id));
  }
  const { results } = await context.env.DB.prepare("SELECT * FROM groups ORDER BY id DESC").all();
  return Response.json(results);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { id, name, description, memberIds } = body;

  await context.env.DB.prepare("UPDATE groups SET name = ?, description = ? WHERE id = ?").bind(name, description, id).run();

  if (memberIds && Array.isArray(memberIds)) {
    await context.env.DB.prepare("DELETE FROM group_members WHERE group_id = ?").bind(id).run();
    for (const cid of memberIds) {
      await context.env.DB.prepare("INSERT INTO group_members (group_id, char_id) VALUES (?, ?)").bind(id, cid).run();
    }
  }
  return new Response("Updated");
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { meta } = await context.env.DB.prepare("INSERT INTO groups (name, description, created_at) VALUES (?, ?, ?)")
    .bind(body.name, body.description || "", Date.now()).run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (id) {
    await context.env.DB.prepare("DELETE FROM groups WHERE id = ?").bind(id).run();
    await context.env.DB.prepare("DELETE FROM group_members WHERE group_id = ?").bind(id).run();
  }
  return new Response("Deleted");
};