-- Migration 012: Drop unused indexes and fix generate_party_code lint warning
--
-- Index cleanup:
--   7 indexes dropped — either redundant (covered by composite indexes)
--   or never queried by app code.
--
-- Function fix:
--   Remove explicit DECLARE of loop variable `i` which shadows
--   the implicit FOR loop variable (plpgsql lint warning).

-- ============================================
-- 1. Drop redundant indexes
-- ============================================

-- Redundant: covered by composite idx_queue_items_position(party_id, position)
DROP INDEX IF EXISTS idx_queue_items_party_id;

-- Redundant: covered by composite idx_party_members_unique(party_id, session_id)
DROP INDEX IF EXISTS idx_party_members_party_id;

-- ============================================
-- 2. Drop unused indexes (no app queries use these columns as filters)
-- ============================================

-- No queries filter by is_completed (checkbox toggle uses UPDATE by id)
DROP INDEX IF EXISTS idx_queue_items_is_completed;

-- No queries filter by due_date range
DROP INDEX IF EXISTS idx_queue_items_due_date;

-- status is only used as secondary .neq() filter after party_id; never primary lookup
DROP INDEX IF EXISTS idx_queue_items_status;

-- notification_logs only receives INSERTs; no SELECT queries use these
DROP INDEX IF EXISTS idx_notification_logs_party_id;
DROP INDEX IF EXISTS idx_notification_logs_status;

-- ============================================
-- 3. Fix generate_party_code shadowed variable
-- ============================================

-- Remove explicit DECLARE of `i` — the FOR loop creates its own implicit variable.
-- This fixes: "auto variable 'i' shadows a previously defined variable"
-- and "unused variable 'i'" lint warnings.
CREATE OR REPLACE FUNCTION generate_party_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
