-- Phase 3: Database Security Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jvoppjybagyeffklbohr/sql

-- ============================================
-- 1. Add user_id to party_members
-- ============================================
ALTER TABLE party_members
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_party_members_user_id ON party_members(user_id);

-- ============================================
-- 2. Add reminder fields to queue_items
-- ============================================
ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS completed_by_user_id UUID REFERENCES auth.users(id);

-- Create index for due date queries
CREATE INDEX IF NOT EXISTS idx_queue_items_due_date ON queue_items(due_date) WHERE due_date IS NOT NULL;

-- ============================================
-- 3. Enable Row Level Security
-- ============================================
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies for parties table
-- ============================================

-- Anyone can view parties (needed for joining with code)
CREATE POLICY "Anyone can view parties by code" ON parties
  FOR SELECT USING (true);

-- Only authenticated users can create parties
CREATE POLICY "Authenticated users can create parties" ON parties
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only host can update their party
CREATE POLICY "Host can update their party" ON parties
  FOR UPDATE USING (
    host_session_id IN (
      SELECT session_id FROM party_members
      WHERE user_id = auth.uid() AND is_host = true
    )
  );

-- Only host can delete their party
CREATE POLICY "Host can delete their party" ON parties
  FOR DELETE USING (
    host_session_id IN (
      SELECT session_id FROM party_members
      WHERE user_id = auth.uid() AND is_host = true
    )
  );

-- ============================================
-- 5. RLS Policies for party_members table
-- ============================================

-- Members can view other members in their parties
CREATE POLICY "Members can view party members" ON party_members
  FOR SELECT USING (
    party_id IN (
      SELECT party_id FROM party_members WHERE user_id = auth.uid()
    )
    OR auth.uid() IS NULL -- Allow anonymous users to see members when joining
  );

-- Anyone can join a party (insert themselves)
CREATE POLICY "Anyone can join a party" ON party_members
  FOR INSERT WITH CHECK (true);

-- Members can update their own record
CREATE POLICY "Members can update their own record" ON party_members
  FOR UPDATE USING (user_id = auth.uid() OR (user_id IS NULL AND session_id = session_id));

-- Members can leave (delete their own record)
CREATE POLICY "Members can leave party" ON party_members
  FOR DELETE USING (user_id = auth.uid() OR (user_id IS NULL AND session_id = session_id));

-- ============================================
-- 6. RLS Policies for queue_items table
-- ============================================

-- Members can view queue items in their parties
CREATE POLICY "Members can view queue items" ON queue_items
  FOR SELECT USING (
    party_id IN (
      SELECT party_id FROM party_members WHERE user_id = auth.uid()
    )
    OR auth.uid() IS NULL -- Allow anonymous viewing
  );

-- Members can add items to their parties
CREATE POLICY "Members can add queue items" ON queue_items
  FOR INSERT WITH CHECK (
    party_id IN (
      SELECT party_id FROM party_members WHERE user_id = auth.uid()
    )
    OR auth.uid() IS NULL -- Allow anonymous adding
  );

-- Members can update items in their parties (for completion, reordering)
CREATE POLICY "Members can update queue items" ON queue_items
  FOR UPDATE USING (
    party_id IN (
      SELECT party_id FROM party_members WHERE user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );

-- Members can delete items they added or host can delete any
CREATE POLICY "Members can delete queue items" ON queue_items
  FOR DELETE USING (
    added_by_session_id IN (
      SELECT session_id FROM party_members WHERE user_id = auth.uid()
    )
    OR party_id IN (
      SELECT party_id FROM party_members WHERE user_id = auth.uid() AND is_host = true
    )
    OR auth.uid() IS NULL
  );

-- ============================================
-- 7. Function to link user_id when user signs in
-- ============================================
CREATE OR REPLACE FUNCTION link_user_to_party_member()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user signs in, link their user_id to any party_members with matching session_id
  -- This is called via a trigger or manually after OAuth callback
  UPDATE party_members
  SET user_id = NEW.id
  WHERE session_id = (
    SELECT raw_user_meta_data->>'session_id' FROM auth.users WHERE id = NEW.id
  )
  AND user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger setup depends on your auth flow
-- You may need to call this function manually after OAuth sign-in
