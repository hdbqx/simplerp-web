CREATE TABLE IF NOT EXISTS async_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    char_id INTEGER,
    room_id INTEGER,
    request_json TEXT,
    result_json TEXT,
    error TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_async_jobs_status ON async_jobs(status);
CREATE INDEX IF NOT EXISTS idx_async_jobs_char_id ON async_jobs(char_id);
CREATE INDEX IF NOT EXISTS idx_async_jobs_room_id ON async_jobs(room_id);
