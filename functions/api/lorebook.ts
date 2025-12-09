interface Env { DB: D1Database; }
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const charId = url.searchParams.get('char_id');
    if(!charId) return Response.json([]);
    const { results } = await context.env.DB.prepare("SELECT * FROM lorebook WHERE char_id = ?").bind(charId).all();
    return Response.json(results.map((r: any) => ({ ...r, isActive: r.is_active === 1 })));
};
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare("INSERT INTO lorebook (char_id, keywords, content, is_active) VALUES (?, ?, ?, ?)")
        .bind(body.char_id, body.keywords, body.content, body.isActive ? 1 : 0).run();
    return Response.json({ id: meta.last_row_id });
};
export const onRequestPut: PagesFunction<Env> = async (context) => {
    const body: any = await context.request.json();
    await context.env.DB.prepare("UPDATE lorebook SET keywords = ?, content = ?, is_active = ? WHERE id = ?")
        .bind(body.keywords, body.content, body.isActive ? 1 : 0, body.id).run();
    return new Response("Updated");
};
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if(id) await context.env.DB.prepare("DELETE FROM lorebook WHERE id = ?").bind(id).run();
    return new Response("Deleted");
};