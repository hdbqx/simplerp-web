import { getAsyncJob } from '../../server/async-jobs';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response('Missing id', { status: 400 });
    }

    const job = await getAsyncJob(context.env, id);
    if (!job) {
      return new Response('Not found', { status: 404 });
    }

    return Response.json(job);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
