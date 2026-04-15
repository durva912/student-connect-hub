-- Read receipts for chat (run on existing DB).
-- psql -U postgres -d student_connect -f database/chat_read_receipts.sql

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
