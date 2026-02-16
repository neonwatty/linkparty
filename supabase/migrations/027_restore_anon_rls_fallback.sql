-- Migration: Restore anonymous RLS fallback removed by 025
--
-- Migration 025 removed the `OR auth.uid() IS NULL` clause from several
-- policies. This broke the browser client which uses the Supabase anon key
-- (no authenticated user) and directly queries/mutates queue_items and
-- party_members.
--
-- The browser client (useParty hook) performs:
--   - queue_items SELECT  (fetchData)
--   - queue_items UPDATE  (moveItem, advanceQueue, toggleComplete)
--   - queue_items DELETE  (deleteItem)
--   - party_members DELETE (leaveParty)
--
-- All of these need anonymous access because the browser uses the anon key.
-- True security tightening requires moving all writes to API routes that
-- use the service role key — a larger refactor for a future milestone.

-- 1. queue_items: Restore anonymous SELECT
DROP POLICY IF EXISTS "Members can view queue items" ON queue_items;
CREATE POLICY "Members can view queue items" ON queue_items
  FOR SELECT USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
         OR pm.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
    OR auth.uid() IS NULL
  );

-- 2. queue_items: Restore anonymous UPDATE
DROP POLICY IF EXISTS "Members can update queue items" ON queue_items;
CREATE POLICY "Members can update queue items" ON queue_items
  FOR UPDATE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
         OR pm.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
    OR auth.uid() IS NULL
  );

-- 3. queue_items: Restore anonymous DELETE
DROP POLICY IF EXISTS "Members can delete queue items" ON queue_items;
CREATE POLICY "Members can delete queue items" ON queue_items
  FOR DELETE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
         OR pm.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
    OR auth.uid() IS NULL
  );

-- 4. party_members: Restore anonymous DELETE (leaveParty uses browser client)
DROP POLICY IF EXISTS "Members can leave party" ON party_members;
CREATE POLICY "Members can leave party" ON party_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id IS NOT NULL)
    OR auth.uid() IS NULL
  );

-- Note: party_members UPDATE tightening from 025 is kept because
-- the browser client does not directly update party_members rows.
-- The join/upsert goes through /api/parties/join which uses the service role key.
