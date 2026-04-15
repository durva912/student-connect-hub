-- Run once if you already have student_connect (adds profile storage).
-- psql -U postgres -d student_connect -f database/profiles.sql

CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    display_email VARCHAR(255) NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    major VARCHAR(255) NOT NULL DEFAULT '',
    year VARCHAR(100) NOT NULL DEFAULT '',
    interests JSONB NOT NULL DEFAULT '[]'::jsonb,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    avatar TEXT NOT NULL DEFAULT '',
    linkedin VARCHAR(512) NOT NULL DEFAULT '',
    github VARCHAR(512) NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_display_email ON profiles (display_email);
