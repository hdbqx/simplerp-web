interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { snapshot_id, name } = body;
    const branchId = `branch_${snapshot_id}_${Date.now()}`;

    return Response.json({ branch_id: branchId });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
