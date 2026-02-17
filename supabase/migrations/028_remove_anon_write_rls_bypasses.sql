-- Migration 028: Remove anonymous write RLS bypasses
-- Now that all browser writes go through server-side API routes using the service role key,
-- we can remove the OR auth.uid() IS NULL bypasses from write policies.
-- SELECT policies keep the anonymous bypass for browser reads + Realtime subscriptions.

-- queue_items UPDATE: remove anonymous bypass
DROP POLICY IF EXISTS "Members can update queue items" ON queue_items;
CREATE POLICY "Members can update queue items" ON queue_items
  FOR UPDATE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
         OR pm.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

-- queue_items DELETE: remove anonymous bypass
DROP POLICY IF EXISTS "Members can delete queue items" ON queue_items;
CREATE POLICY "Members can delete queue items" ON queue_items
  FOR DELETE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
         OR pm.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

-- party_members DELETE: remove anonymous bypass
DROP POLICY IF EXISTS "Members can leave party" ON party_members;
CREATE POLICY "Members can leave party" ON party_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id IS NOT NULL)
  );

-- NOTE: queue_items SELECT keeps OR auth.uid() IS NULL for browser reads + Realtime
-- NOTE: queue_items INSERT policy is not changed (already behind API route)
