-- Migration 030: High-priority RLS policy fixes
--
-- H2: Fix party_members DELETE — require session ownership, not just IS NOT NULL
-- H4: Tighten notification_logs INSERT + party_members INSERT policies
--
-- All write operations go through API routes using the service role key,
-- so these tighter policies are defense-in-depth and won't break functionality.

-- ============================================
-- H2: party_members DELETE — require session match
-- ============================================

-- The old policy allowed deleting ANY anonymous member's row:
--   user_id = auth.uid() OR (user_id IS NULL AND session_id IS NOT NULL)
-- Fix: require the session_id to match the requester's header
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

-- ============================================
-- H4: notification_logs INSERT — require membership
-- ============================================

-- The old policy only checked that the party exists:
--   EXISTS (SELECT 1 FROM parties WHERE id = party_id)
-- Fix: require the inserter to be a party member (authenticated or session-based)
DROP POLICY IF EXISTS "Members can insert notification logs" ON notification_logs;
CREATE POLICY "Members can insert notification logs" ON notification_logs
  FOR INSERT WITH CHECK (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );

-- ============================================
-- H4: party_members INSERT — require valid party + prevent impersonation
-- ============================================

-- The old policy only checked that the party exists:
--   EXISTS (SELECT 1 FROM parties WHERE id = party_id)
-- Fix: additionally require that the inserter's session_id matches their header,
-- preventing one user from creating member records with another user's session_id
DROP POLICY IF EXISTS "Anyone can join a party" ON party_members;
CREATE POLICY "Members can join a party" ON party_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM parties WHERE id = party_id)
    AND (
      -- Authenticated user: user_id must match their auth
      (user_id IS NOT NULL AND user_id = auth.uid())
      -- Anonymous user: session_id must match their header
      OR (user_id IS NULL AND session_id = (current_setting('request.headers', true)::json->>'x-session-id'))
      -- Service role key bypasses RLS entirely, so API route joins still work
    )
  );
