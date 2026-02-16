-- Migration: Tighten RLS policies — remove anonymous bypass
-- The OR auth.uid() IS NULL clauses allowed any unauthenticated request to
-- read/write party data. This tightens policies to require either
-- authenticated user or valid session ID from request headers.

-- 1. party_members: Tighten UPDATE policy
DROP POLICY IF EXISTS "Members can update own record" ON party_members;
CREATE POLICY "Members can update own record" ON party_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND session_id IS NOT NULL
      AND session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );

-- 2. party_members: Tighten DELETE policy
DROP POLICY IF EXISTS "Members can leave party" ON party_members;
CREATE POLICY "Members can leave party" ON party_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND session_id IS NOT NULL
      AND session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );

-- 3. queue_items: Tighten SELECT policy
DROP POLICY IF EXISTS "Members can view queue items" ON queue_items;
CREATE POLICY "Members can view queue items" ON queue_items
  FOR SELECT USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );

-- 4. queue_items: Tighten UPDATE policy
DROP POLICY IF EXISTS "Members can update queue items" ON queue_items;
CREATE POLICY "Members can update queue items" ON queue_items
  FOR UPDATE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );

-- 5. queue_items: Tighten DELETE policy
DROP POLICY IF EXISTS "Members can delete queue items" ON queue_items;
CREATE POLICY "Members can delete queue items" ON queue_items
  FOR DELETE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );
