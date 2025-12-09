interface Env { DB: D1Database; }
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const charId = url.searchParams.get('char_id');
  if (!charId) return Response.json([]);
  const { results } = await context.env.DB.prepare("SELECT * FROM messages WHERE char_id = ? ORDER BY timestamp ASC").bind(charId).all();
  return Response.json(results);
};
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO messages (char_id, role, content, image, timestamp) VALUES (?, ?, ?, ?, ?)"
  ).bind(body.char_id, body.role, body.content, body.image || "", body.timestamp).run();
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
    if (id) await context.env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
    else if (charId) await context.env.DB.prepare("DELETE FROM messages WHERE char_id = ?").bind(charId).run();
    return new Response("Deleted");
};