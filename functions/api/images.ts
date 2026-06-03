import { createAsyncJob } from '../../server/async-jobs';
import { runImageGeneration, type ImageProxyBody } from '../../server/image-generation';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  ASYNC_JOBS_QUEUE: Queue;
}

type ImageQueueMessage = {
  type: 'image_generation';
  jobId: string;
  payload: ImageProxyBody;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const key = url.searchParams.get('key');
  const charId = url.searchParams.get('char_id');
  const roomId = url.searchParams.get('room_id');

  if (key) {
    try {
      const object = await context.env.IMAGES_BUCKET.get(key);
      if (!object) {
        return new Response('Image not found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000');
      headers.set('ETag', object.httpEtag);

      return new Response(object.body, { headers });
    } catch (e: any) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  }

  if (charId || roomId) {
    const query = roomId
      ? 'SELECT * FROM images WHERE room_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM images WHERE char_id = ? ORDER BY created_at DESC';
    const bindId = roomId || charId;

    const { results } = await context.env.DB.prepare(query).bind(bindId).all();
    return Response.json(results);
  }

  const { results } = await context.env.DB.prepare('SELECT * FROM images ORDER BY created_at DESC LIMIT 100').all();
  return Response.json(results);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const key = url.searchParams.get('key');
  const imageId = url.searchParams.get('id');
  const charId = url.searchParams.get('char_id');
  const roomId = url.searchParams.get('room_id');

  try {
    if (imageId) {
      const { results } = await context.env.DB.prepare('SELECT r2_key FROM images WHERE id = ?').bind(imageId).all();
      if (results.length > 0) {
        const r2Key = (results[0] as any).r2_key;
        await context.env.IMAGES_BUCKET.delete(r2Key);
        await context.env.DB.prepare('DELETE FROM images WHERE id = ?').bind(imageId).run();
      }
      return new Response('Deleted');
    }

    if (key) {
      await context.env.IMAGES_BUCKET.delete(key);
      await context.env.DB.prepare('DELETE FROM images WHERE r2_key = ?').bind(key).run();
      return new Response('Deleted');
    }

    if (charId) {
      const { results } = await context.env.DB.prepare('SELECT r2_key FROM images WHERE char_id = ?').bind(charId).all();
      for (const row of results as any[]) {
        await context.env.IMAGES_BUCKET.delete(row.r2_key);
      }
      await context.env.DB.prepare('DELETE FROM images WHERE char_id = ?').bind(charId).run();
      return new Response('Deleted all images for character');
    }

    if (roomId) {
      const { results } = await context.env.DB.prepare('SELECT r2_key FROM images WHERE room_id = ?').bind(roomId).all();
      for (const row of results as any[]) {
        await context.env.IMAGES_BUCKET.delete(row.r2_key);
      }
      await context.env.DB.prepare('DELETE FROM images WHERE room_id = ?').bind(roomId).run();
      return new Response('Deleted all images for room');
    }

    return new Response('Missing parameters', { status: 400 });
  } catch (e: any) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as ImageProxyBody & { defer?: boolean };
    const rawPrompt = body.payload?.prompt || body.prompt || '';
    const prompt = typeof rawPrompt === 'string' ? rawPrompt : '';
    if (!prompt) return new Response('Missing prompt', { status: 400 });

    const defer = body.defer === true;

    if (!defer) {
      const result = await runImageGeneration(context.env, body);
      return Response.json({
        deferred: false,
        status: 'completed',
        result,
        ...result,
      });
    }

    const jobId = await createAsyncJob(context.env, {
      jobType: 'image_generation',
      status: 'queued',
      charId: body.char_id,
      roomId: body.room_id,
      request: {
        backend: body.backend,
        model: body.model,
        char_id: body.char_id,
        room_id: body.room_id,
        prompt,
      },
    });

    const message: ImageQueueMessage = {
      type: 'image_generation',
      jobId,
      payload: body,
    };

    await context.env.ASYNC_JOBS_QUEUE.send(message);

    return Response.json({
      accepted: true,
      deferred: true,
      job_id: jobId,
      status: 'queued',
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
