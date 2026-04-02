interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const roomId = url.searchParams.get('room_id');
  if (!roomId) return Response.json(null);
  const row: any = await context.env.DB.prepare(
    "SELECT * FROM room_director_config WHERE room_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(roomId).first();
  return Response.json(row || null);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const roomId = toInt(body?.room_id);
    if (!roomId) return new Response('Missing room_id', { status: 400 });

    const apiPresetId = body?.api_preset_id !== undefined && body?.api_preset_id !== null ? toInt(body.api_preset_id) : null;
    const modelId = body?.model_id !== undefined ? String(body.model_id || '') : null;
    const temperature = body?.temperature !== undefined && body?.temperature !== null ? Number(body.temperature) : null;
    const maxOutputTokens = body?.max_output_tokens !== undefined && body?.max_output_tokens !== null ? toInt(body.max_output_tokens) : null;

    const row: any = await context.env.DB.prepare(
      "SELECT id FROM room_director_config WHERE room_id = ? LIMIT 1"
    ).bind(roomId).first();

    if (row?.id) {
      await context.env.DB.prepare(
        "UPDATE room_director_config SET api_preset_id = ?, model_id = ?, temperature = ?, max_output_tokens = ? WHERE id = ?"
      ).bind(apiPresetId, modelId, temperature, maxOutputTokens, row.id).run();
      return new Response('Updated');
    }

    await context.env.DB.prepare(
      "INSERT INTO room_director_config (room_id, api_preset_id, model_id, temperature, max_output_tokens) VALUES (?, ?, ?, ?, ?)"
    ).bind(roomId, apiPresetId, modelId, temperature, maxOutputTokens).run();

    return new Response('Created');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

