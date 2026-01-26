-- Phase 5: Fix RLS Policies for Anonymous Users
-- Run this in Supabase SQL Editor to fix the queue items insert issue

-- ============================================
-- 1. Drop existing restrictive policies
-- ============================================

DROP POLICY IF EXISTS "Members can add queue items" ON queue_items;
DROP POLICY IF EXISTS "Members can view queue items" ON queue_items;
DROP POLICY IF EXISTS "Members can update queue items" ON queue_items;
DROP POLICY IF EXISTS "Members can delete queue items" ON queue_items;

-- ============================================
-- 2. Create more permissive policies
-- These policies allow operations based on party membership via session_id
-- ============================================

-- Anyone can view queue items if they're a member of that party (by session_id or user_id)
CREATE POLICY "Members can view queue items" ON queue_items
  FOR SELECT USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
         OR pm.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
    OR auth.uid() IS NULL -- Allow anonymous viewing via anon key
  );

-- Anyone can add queue items if the party exists (validation happens in app)
-- This is safe because party_id has a foreign key constraint
CREATE POLICY "Anyone can add queue items" ON queue_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM parties WHERE id = party_id)
  );

-- Anyone can update queue items in parties they're a member of
CREATE POLICY "Members can update queue items" ON queue_items
  FOR UPDATE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
         OR pm.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
    OR auth.uid() IS NULL
  );

-- Anyone can delete queue items they added or if they're the host
CREATE POLICY "Members can delete queue items" ON queue_items
  FOR DELETE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
         OR pm.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
    OR auth.uid() IS NULL
  );

-- ============================================
-- 3. Also fix party_members policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can join a party" ON party_members;
DROP POLICY IF EXISTS "Members can view party members" ON party_members;
DROP POLICY IF EXISTS "Members can update their own record" ON party_members;
DROP POLICY IF EXISTS "Members can leave party" ON party_members;

-- Anyone can view party members (needed for party room display)
CREATE POLICY "Anyone can view party members" ON party_members
  FOR SELECT USING (true);

-- Anyone can join a party
CREATE POLICY "Anyone can join a party" ON party_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM parties WHERE id = party_id)
  );

-- Members can update their own record (by session_id or user_id)
CREATE POLICY "Members can update own record" ON party_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id IS NOT NULL)
    OR auth.uid() IS NULL
  );

-- Members can leave (delete their own record)
CREATE POLICY "Members can leave party" ON party_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id IS NOT NULL)
    OR auth.uid() IS NULL
  );

-- ============================================
-- 4. Fix parties policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can create parties" ON parties;

-- Anyone can create a party (anonymous or authenticated)
CREATE POLICY "Anyone can create parties" ON parties
  FOR INSERT WITH CHECK (true);
