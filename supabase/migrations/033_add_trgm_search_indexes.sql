-- Migration 033: Trigram indexes for ILIKE substring search
--
-- searchProfiles() and searchUsers() use ILIKE '%term%' on username and
-- display_name. B-tree indexes cannot accelerate leading-wildcard patterns,
-- so every search was a sequential scan. GIN trigram indexes fix this.

-- Enable the pg_trgm extension (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for ILIKE substring search
CREATE INDEX IF NOT EXISTS idx_user_profiles_username_trgm
  ON user_profiles USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name_trgm
  ON user_profiles USING gin (display_name gin_trgm_ops);
