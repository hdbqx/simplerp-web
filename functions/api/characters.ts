interface Env { DB: D1Database; }
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare("SELECT * FROM characters ORDER BY id ASC").all();
  return Response.json(results);
};
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO characters (name, description, first_message, summary, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(body.name, body.description, body.first_message, body.summary, Date.now()).run();
  return Response.json({ id: meta.last_row_id });
};
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if(id) {
        await context.env.DB.prepare("DELETE FROM characters WHERE id = ?").bind(id).run();
        await context.env.DB.prepare("DELETE FROM messages WHERE char_id = ?").bind(id).run();
        await context.env.DB.prepare("DELETE FROM lorebook WHERE char_id = ?").bind(id).run();
    }
    return new Response("Deleted");
};
// Update logic
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { id, ...updates } = body;
  const keys = Object.keys(updates);
  if (keys.length === 0) return new Response("No updates", { status: 400 });
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  await context.env.DB.prepare(`UPDATE characters SET ${setClause} WHERE id = ?`).bind(...Object.values(updates), id).run();
  return new Response("Updated");
};