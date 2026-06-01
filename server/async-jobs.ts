export type AsyncJobType = 'variable_thought' | 'image_generation';
export type AsyncJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface AsyncJobsDbEnv {
  DB: D1Database;
}

export interface AsyncJobRecord {
  id: string;
  job_type: AsyncJobType;
  status: AsyncJobStatus;
  char_id?: number | null;
  room_id?: number | null;
  request_json?: string | null;
  result_json?: string | null;
  error?: string | null;
  created_at?: number;
  updated_at?: number;
}

export interface AsyncJobResultPayload {
  [key: string]: unknown;
}

export function createAsyncJobId() {
  return crypto.randomUUID();
}

export async function createAsyncJob(
  env: AsyncJobsDbEnv,
  input: {
    id?: string;
    jobType: AsyncJobType;
    status?: AsyncJobStatus;
    charId?: number;
    roomId?: number;
    request?: unknown;
    result?: AsyncJobResultPayload;
    error?: string | null;
  },
) {
  const now = Date.now();
  const id = input.id || createAsyncJobId();
  await env.DB.prepare(
    `INSERT INTO async_jobs (
      id, job_type, status, char_id, room_id, request_json, result_json, error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.jobType,
      input.status || 'queued',
      input.charId ?? null,
      input.roomId ?? null,
      input.request ? JSON.stringify(input.request) : null,
      input.result ? JSON.stringify(input.result) : null,
      input.error ?? null,
      now,
      now,
    )
    .run();
  return id;
}

export async function updateAsyncJob(
  env: AsyncJobsDbEnv,
  id: string,
  updates: {
    status?: AsyncJobStatus;
    result?: AsyncJobResultPayload;
    error?: string | null;
    request?: unknown;
  },
) {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    params.push(updates.status);
  }
  if (updates.result !== undefined) {
    fields.push('result_json = ?');
    params.push(JSON.stringify(updates.result));
  }
  if (updates.error !== undefined) {
    fields.push('error = ?');
    params.push(updates.error);
  }
  if (updates.request !== undefined) {
    fields.push('request_json = ?');
    params.push(JSON.stringify(updates.request));
  }

  fields.push('updated_at = ?');
  params.push(Date.now(), id);

  await env.DB.prepare(`UPDATE async_jobs SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function getAsyncJob(env: AsyncJobsDbEnv, id: string) {
  const row = await env.DB.prepare('SELECT * FROM async_jobs WHERE id = ?').bind(id).first<AsyncJobRecord>();
  if (!row) return null;

  return {
    ...row,
    request_json: row.request_json || null,
    result_json: row.result_json || null,
    error: row.error || null,
    request: row.request_json ? safeParseJson(row.request_json) : null,
    result: row.result_json ? safeParseJson(row.result_json) : null,
  };
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
