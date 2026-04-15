-- Optional migration: run if chat_blocks is missing (symmetric block row = one-way "A blocked B").
CREATE TABLE IF NOT EXISTS chat_blocks (
    blocker_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_user_id, blocked_user_id),
    CONSTRAINT chat_blocks_no_self CHECK (blocker_user_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocked ON chat_blocks (blocked_user_id);
