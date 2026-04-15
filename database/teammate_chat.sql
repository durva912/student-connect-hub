-- Teammate requests + chat (run if DB already exists).
-- psql -U postgres -d student_connect -f database/teammate_chat.sql

CREATE TABLE IF NOT EXISTS teammate_requests (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    CONSTRAINT teammate_no_self CHECK (from_user_id <> to_user_id),
    CONSTRAINT teammate_unique_pair UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_teammate_to_user ON teammate_requests (to_user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    teammate_request_id INTEGER REFERENCES teammate_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_from_to_time ON chat_messages (from_user_id, to_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_to_from_time ON chat_messages (to_user_id, from_user_id, created_at);
