-- Migration 044: Drop unused SECURITY DEFINER functions and redundant indexes,
-- add missing host_session_id index.
--
-- These functions are unused, increase attack surface, and have restrictive search_path.

-- Drop dead functions
DROP FUNCTION IF EXISTS link_user_to_party_member();
DROP FUNCTION IF EXISTS link_user_to_push_token();
DROP FUNCTION IF EXISTS generate_party_code();

-- Drop redundant indexes
-- idx_parties_code is redundant with the UNIQUE constraint on parties.code
DROP INDEX IF EXISTS idx_parties_code;
-- idx_queue_items_source_url is unused (no queries filter by source_url)
DROP INDEX IF EXISTS idx_queue_items_source_url;

-- Add missing index for host_session_id lookups (used in party create rate limiting)
CREATE INDEX IF NOT EXISTS idx_parties_host_session_id ON parties (host_session_id);
