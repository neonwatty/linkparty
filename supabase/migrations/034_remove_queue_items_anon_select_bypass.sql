-- S2 fix: Remove anon SELECT bypass from queue_items
-- The OR auth.uid() IS NULL fallback allowed unauthenticated callers
-- (using just the public anon key) to read ALL queue items across ALL parties.
-- All legitimate users have JWTs, so auth.uid() is always set for them.

DROP POLICY IF EXISTS "Members can view queue items" ON queue_items;

CREATE POLICY "Members can view queue items" ON queue_items
  FOR SELECT USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
         OR pm.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
  );
