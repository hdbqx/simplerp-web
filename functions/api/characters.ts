// functions/api/characters.ts

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare("SELECT * FROM characters ORDER BY id ASC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const action = url.searchParams.get('action');

  // 【新增】复制功能：Deep Copy Character & Lorebook
  if (action === 'duplicate') {
      try {
          const body: any = await context.request.json();
          const { source_id, new_name } = body;
          
          if (!source_id || !new_name) return new Response("Missing params", { status: 400 });

          // 1. 复制角色本体 (复制 名字、描述、开场白、Summary)，生成新的 created_at
          const { meta } = await context.env.DB.prepare(
              `INSERT INTO characters (name, description, first_message, summary, hidden_message_count, context_cutoff_message_id, created_at) 
               SELECT ?, description, first_message, summary, hidden_message_count, NULL, ? 
               FROM characters WHERE id = ?`
          ).bind(new_name, Date.now(), source_id).run();

          const newCharId = meta.last_row_id;

          // 2. 复制关联的世界书
          await context.env.DB.prepare(
              `INSERT INTO lorebook (char_id, keywords, content, is_active) 
               SELECT ?, keywords, content, is_active 
               FROM lorebook WHERE char_id = ?`
          ).bind(newCharId, source_id).run();

          return Response.json({ id: newCharId, message: "Duplicated successfully" });
      } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
  }

  // 普通新建逻辑
  const body: any = await context.request.json();
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO characters (name, description, first_message, summary, hidden_message_count, context_cutoff_message_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    body.name,
    body.description,
    body.first_message,
    body.summary,
    body.hidden_message_count ?? 0,
    body.context_cutoff_message_id ?? null,
    Date.now(),
  ).run();
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

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json();
  const { id, ...updates } = body;
  const keys = Object.keys(updates);
  if (keys.length === 0) return new Response("No updates", { status: 400 });
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  await context.env.DB.prepare(`UPDATE characters SET ${setClause} WHERE id = ?`).bind(...Object.values(updates), id).run();
  return new Response("Updated");
};
