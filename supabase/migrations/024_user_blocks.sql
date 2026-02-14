-- User blocks table: allows users to block other users
-- Blocking prevents friend requests, party invites, and hides the blocker from search

CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Index for looking up blocks by either user
CREATE INDEX idx_user_blocks_blocker ON user_blocks (blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks (blocked_id);

-- RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

-- Users can block others
CREATE POLICY "Users can block others"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- Users can unblock
CREATE POLICY "Users can unblock"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());
