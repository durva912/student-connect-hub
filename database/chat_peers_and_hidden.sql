-- Keeps chat partners visible after clearing history; per-user message hide.
-- psql -U postgres -d student_connect -f database/chat_peers_and_hidden.sql

CREATE TABLE IF NOT EXISTS chat_known_peers (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    peer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, peer_user_id),
    CONSTRAINT chat_known_peers_no_self CHECK (user_id <> peer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_known_peers_user ON chat_known_peers (user_id);

CREATE TABLE IF NOT EXISTS chat_message_hidden (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_hidden_user ON chat_message_hidden (user_id);
