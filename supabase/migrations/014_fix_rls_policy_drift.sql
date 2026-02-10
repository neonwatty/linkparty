-- Migration 014: Fix RLS policy drift from production audit
--
-- Production audit on 2026-02-10 found 7 policies that drifted from their
-- intended state (migrations 003/005 were recorded as applied but actual
-- policies didn't match). These fixes were applied directly to production;
-- this migration captures the correct state for local dev and future deployments.

-- ============================================
-- 1. party_members: Fix SELECT policy name drift
-- ============================================
-- Production had "Allow anyone to view party members" instead of "Anyone can view party members"

DROP POLICY IF EXISTS "Allow anyone to view party members" ON party_members;
DROP POLICY IF EXISTS "Anyone can view party members" ON party_members;
CREATE POLICY "Anyone can view party members" ON party_members
  FOR SELECT USING (true);

-- ============================================
-- 2. party_members: Fix INSERT to check party existence
-- ============================================
-- Production had WITH CHECK (true) instead of party-existence check

DROP POLICY IF EXISTS "Anyone can join a party" ON party_members;
CREATE POLICY "Anyone can join a party" ON party_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM parties WHERE id = party_id)
  );

-- ============================================
-- 3. party_members: Fix UPDATE — remove session_id = session_id tautology
-- ============================================
-- Production had: user_id = auth.uid() OR (user_id IS NULL AND session_id = session_id)
-- The tautology meant any authenticated user could update any anonymous member's record

DROP POLICY IF EXISTS "Members can update their own record" ON party_members;
DROP POLICY IF EXISTS "Members can update own record" ON party_members;
CREATE POLICY "Members can update own record" ON party_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id IS NOT NULL)
    OR auth.uid() IS NULL
  );

-- ============================================
-- 4. party_members: Fix DELETE — remove session_id = session_id tautology
-- ============================================
-- Same tautology issue as UPDATE — any authenticated user could delete any anonymous member

DROP POLICY IF EXISTS "Members can leave party" ON party_members;
CREATE POLICY "Members can leave party" ON party_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id IS NOT NULL)
    OR auth.uid() IS NULL
  );

-- ============================================
-- 5. queue_items: Fix SELECT to require party membership
-- ============================================
-- Production had USING (true) — anyone could read all queue items from any party

DROP POLICY IF EXISTS "Members can view queue items" ON queue_items;
CREATE POLICY "Members can view queue items" ON queue_items
  FOR SELECT USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
    OR auth.uid() IS NULL
  );

-- ============================================
-- 6. queue_items: Fix UPDATE to require party membership
-- ============================================
-- Production had USING (true) — anyone could modify any queue item

DROP POLICY IF EXISTS "Members can update queue items" ON queue_items;
CREATE POLICY "Members can update queue items" ON queue_items
  FOR UPDATE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
    OR auth.uid() IS NULL
  );

-- ============================================
-- 7. queue_items: Fix DELETE to require party membership
-- ============================================
-- Production had USING (true) — anyone could delete any queue item

DROP POLICY IF EXISTS "Members can delete queue items" ON queue_items;
CREATE POLICY "Members can delete queue items" ON queue_items
  FOR DELETE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
    OR auth.uid() IS NULL
  );
