interface Env { DB: D1Database; }

let apiModeEnsured = false;

async function ensureApiModeColumn(db: D1Database) {
  if (apiModeEnsured) return;
  try {
    await db.prepare("ALTER TABLE api_presets ADD COLUMN api_mode TEXT DEFAULT 'chat_completions'").run();
  } catch {
    // Ignore when column already exists.
  }
  apiModeEnsured = true;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  await ensureApiModeColumn(context.env.DB);
  const { results } = await context.env.DB.prepare(
    "SELECT id, name, api_base, api_key, COALESCE(api_mode, 'chat_completions') AS api_mode FROM api_presets ORDER BY id ASC"
  ).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  await ensureApiModeColumn(context.env.DB);
  const body: any = await context.request.json();
  const mode = body.api_mode === 'responses' ? 'responses' : 'chat_completions';
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO api_presets (name, api_base, api_key, api_mode) VALUES (?, ?, ?, ?)"
  ).bind(body.name || "新预设", body.api_base || "", body.api_key || "", mode).run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  await ensureApiModeColumn(context.env.DB);
  const body: any = await context.request.json();
  const mode = body.api_mode === 'responses' ? 'responses' : 'chat_completions';
  await context.env.DB.prepare(
    "UPDATE api_presets SET name = ?, api_base = ?, api_key = ?, api_mode = ? WHERE id = ?"
  ).bind(body.name, body.api_base, body.api_key, mode, body.id).run();
  return new Response("Updated");
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (id) await context.env.DB.prepare("DELETE FROM api_presets WHERE id = ?").bind(id).run();
  return new Response("Deleted");
};
