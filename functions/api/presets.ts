interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare("SELECT * FROM api_presets ORDER BY id ASC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { meta } = await context.env.DB.prepare("INSERT INTO api_presets (name, api_base, api_key) VALUES (?, ?, ?)")
    .bind(body.name, body.api_base, body.api_key).run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (id) await context.env.DB.prepare("DELETE FROM api_presets WHERE id = ?").bind(id).run();
  return new Response("Deleted");
};