-- Migration 035: Lock down batch_reorder_queue_items RPC
--
-- The function is SECURITY DEFINER (runs as postgres, bypasses RLS) but had no
-- authorization check inside and was callable by any authenticated user via
-- PostgREST. This allowed any authenticated user to reorder queue items in
-- any party, even if they weren't a member.
--
-- Fix:
-- 1. Revoke EXECUTE from anon and authenticated roles — only service_role can call it
-- 2. Recreate with schema-qualified table names and restricted search_path

-- Revoke direct access from client-facing roles.
-- API routes use the service role key which bypasses these grants.
REVOKE EXECUTE ON FUNCTION batch_reorder_queue_items(UUID, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION batch_reorder_queue_items(UUID, JSONB) FROM authenticated;

-- Recreate function with schema-qualified references and empty search_path
CREATE OR REPLACE FUNCTION batch_reorder_queue_items(
  p_party_id UUID,
  p_updates JSONB
) RETURNS void AS $$
BEGIN
  UPDATE public.queue_items
  SET position = (u->>'position')::int
  FROM jsonb_array_elements(p_updates) AS u
  WHERE public.queue_items.id = (u->>'id')::uuid
    AND public.queue_items.party_id = p_party_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
