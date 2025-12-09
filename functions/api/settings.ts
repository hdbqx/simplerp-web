interface Env { DB: D1Database; }
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const item: any = await context.env.DB.prepare("SELECT * FROM settings LIMIT 1").first();
  const config = item?.config ? JSON.parse(item.config) : {};
  return Response.json({ ...config, id: item?.id });
};
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json();
  const { id, ...config } = body; 
  await context.env.DB.prepare("UPDATE settings SET config = ? WHERE id = (SELECT id FROM settings LIMIT 1)").bind(JSON.stringify(config)).run();
  return new Response("Updated");
};