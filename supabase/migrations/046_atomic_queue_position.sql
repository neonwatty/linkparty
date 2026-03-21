-- Migration 046: Atomic next queue position function
--
-- Prevents race conditions when multiple users add items simultaneously.
-- Uses advisory lock to serialize position computation per party.

CREATE OR REPLACE FUNCTION next_queue_position(p_party_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_next_pos INTEGER;
BEGIN
  -- Advisory lock keyed on party_id to serialize concurrent inserts
  PERFORM pg_advisory_xact_lock(hashtext(p_party_id::text));

  SELECT COALESCE(MAX(position), -1) + 1
  INTO v_next_pos
  FROM public.queue_items
  WHERE party_id = p_party_id;

  RETURN v_next_pos;
END;
$$;
