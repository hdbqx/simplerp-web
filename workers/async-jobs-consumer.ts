import { updateAsyncJob } from '../server/async-jobs';
import { runImageGeneration, type ImageProxyBody } from '../server/image-generation';
import { runVariableThought, type ThoughtRequestBody } from '../server/variable-thought';

interface Env {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
}

type VariableThoughtQueueMessage = {
  type: 'variable_thought';
  jobId: string;
  payload: ThoughtRequestBody;
};

type ImageQueueMessage = {
  type: 'image_generation';
  jobId: string;
  payload: ImageProxyBody;
};

type AsyncQueueMessage = VariableThoughtQueueMessage | ImageQueueMessage;

export default {
  async queue(batch: MessageBatch<AsyncQueueMessage>, env: Env) {
    for (const message of batch.messages) {
      const body = message.body;
      try {
        await updateAsyncJob(env, body.jobId, { status: 'processing', error: null });

        if (body.type === 'variable_thought') {
          const result = await runVariableThought(env, body.payload);
          await updateAsyncJob(env, body.jobId, {
            status: 'completed',
            result,
            error: null,
          });
        } else if (body.type === 'image_generation') {
          const result = await runImageGeneration(env, body.payload);
          await updateAsyncJob(env, body.jobId, {
            status: 'completed',
            result,
            error: null,
          });
        } else {
          throw new Error(`Unsupported async job type: ${(body as any).type}`);
        }

        message.ack();
      } catch (error: any) {
        await updateAsyncJob(env, body.jobId, {
          status: 'failed',
          error: error?.message || String(error),
        });
        message.ack();
      }
    }
  },
};
