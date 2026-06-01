import { createAsyncJob } from '../../server/async-jobs';
import type { ThoughtRequestBody } from '../../server/variable-thought';

interface Env {
  DB: D1Database;
  ASYNC_JOBS_QUEUE: Queue;
}

type VariableThoughtQueueMessage = {
  type: 'variable_thought';
  jobId: string;
  payload: ThoughtRequestBody;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as ThoughtRequestBody & { defer?: boolean };

    const jobId = await createAsyncJob(context.env, {
      jobType: 'variable_thought',
      status: 'queued',
      charId: body.char_id,
      roomId: body.room_id,
      request: {
        char_id: body.char_id,
        room_id: body.room_id,
        history_count: body.history?.length || 0,
        user_input: body.user_input || '',
        preset_id: body.preset_id,
        model: body.model,
      },
    });

    const message: VariableThoughtQueueMessage = {
      type: 'variable_thought',
      jobId,
      payload: {
        char_id: body.char_id,
        room_id: body.room_id,
        history: body.history,
        user_input: body.user_input,
        preset_id: body.preset_id,
        model: body.model,
        thought_prompt: body.thought_prompt,
      },
    };

    await context.env.ASYNC_JOBS_QUEUE.send(message);

    return Response.json({
      accepted: true,
      deferred: true,
      job_id: jobId,
      status: 'queued',
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
