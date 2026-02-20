-- Migration 032: Batch reorder RPC function
--
-- Replaces N individual UPDATE queries with a single atomic database call
-- when reordering queue items via drag-and-drop. A 10-item drag now does
-- 1 round trip instead of 10.

CREATE OR REPLACE FUNCTION batch_reorder_queue_items(
  p_party_id UUID,
  p_updates JSONB
) RETURNS void AS $$
BEGIN
  UPDATE queue_items
  SET position = (u->>'position')::int
  FROM jsonb_array_elements(p_updates) AS u
  WHERE queue_items.id = (u->>'id')::uuid
    AND queue_items.party_id = p_party_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
