interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const type = url.searchParams.get('type');
    const groupId = url.searchParams.get('group_id');

    if (type === 'members' && groupId) {
        const { results } = await context.env.DB.prepare(
            "SELECT c.* FROM characters c JOIN group_members gm ON c.id = gm.char_id WHERE gm.group_id = ?"
        ).bind(groupId).all();
        return Response.json(results);
    }

    const { results } = await context.env.DB.prepare("SELECT * FROM groups ORDER BY id DESC").all();
    return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const body: any = await context.request.json();
    const { meta } = await context.env.DB.prepare(
        "INSERT INTO groups (name, description, created_at) VALUES (?, ?, ?)"
    ).bind(body.name, body.description, Date.now()).run();
    
    const gid = meta.last_row_id;
    if (body.memberIds && Array.isArray(body.memberIds)) {
        for (const cid of body.memberIds) {
            await context.env.DB.prepare("INSERT INTO group_members (group_id, char_id) VALUES (?, ?)").bind(gid, cid).run();
        }
    }
    return Response.json({ id: gid });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (id) {
        await context.env.DB.prepare("DELETE FROM groups WHERE id = ?").bind(id).run();
        await context.env.DB.prepare("DELETE FROM group_members WHERE group_id = ?").bind(id).run();
        await context.env.DB.prepare("DELETE FROM messages WHERE group_id = ?").bind(id).run();
    }
    return new Response("Deleted");
};