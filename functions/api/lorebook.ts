interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const url = new URL(context.request.url);
        const charId = url.searchParams.get('char_id');
        if(!charId) return Response.json([]);

        const { results } = await context.env.DB.prepare("SELECT * FROM lorebook WHERE char_id = ?").bind(charId).all();
        // 增加空值安全检查
        const safeResults = Array.isArray(results) ? results : [];
        return Response.json(safeResults.map((r: any) => ({ ...r, isActive: r.is_active === 1 })));
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const body: any = await context.request.json();
        // 插入时提供默认值，防止 undefined 报错
        const { meta } = await context.env.DB.prepare("INSERT INTO lorebook (char_id, keywords, content, is_active) VALUES (?, ?, ?, ?)")
            .bind(body.char_id, body.keywords || "", body.content || "", body.isActive ? 1 : 0).run();
        return Response.json({ id: meta.last_row_id });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

// 【核心修复】PUT 方法改为动态构建 SQL
export const onRequestPut: PagesFunction<Env> = async (context) => {
    try {
        const body: any = await context.request.json();
        const { id, ...updates } = body;
        
        if (!id) return new Response("Missing ID", { status: 400 });

        // 1. 映射前端字段到数据库字段
        const dbUpdates: Record<string, any> = {};
        
        // 只有当前端传了这个值时（不为 undefined），才加入更新列表
        if (updates.keywords !== undefined) dbUpdates.keywords = updates.keywords;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        // 特殊处理 isActive (boolean) -> is_active (int)
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive ? 1 : 0;

        const keys = Object.keys(dbUpdates);
        
        // 如果没有有效字段需要更新，直接返回成功
        if (keys.length === 0) return new Response("No updates", { status: 200 });

        // 2. 动态构建 SQL 语句: "UPDATE lorebook SET keywords = ?, content = ? WHERE id = ?"
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const sql = `UPDATE lorebook SET ${setClause} WHERE id = ?`;
        
        // 3. 准备参数数组，最后加上 id
        const values = [...Object.values(dbUpdates), id];

        await context.env.DB.prepare(sql).bind(...values).run();
        
        return new Response("Updated");
    } catch (e: any) {
        // 返回具体错误信息以便调试
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json'} });
    }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if(id) await context.env.DB.prepare("DELETE FROM lorebook WHERE id = ?").bind(id).run();
        return new Response("Deleted");
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};