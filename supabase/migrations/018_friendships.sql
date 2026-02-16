-- Friendships table (directed-pair model)
-- Two rows per friendship: (A->B) + (B->A) when accepted.
-- Send request: INSERT (user_id=A, friend_id=B, status='pending')
-- Accept request: UPDATE to 'accepted' + INSERT (user_id=B, friend_id=A, status='accepted')
-- Unfriend: DELETE both rows

CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id != friend_id),
  CHECK (status IN ('pending', 'accepted'))
);

-- Indexes for efficient lookup by user or friend filtered by status
CREATE INDEX idx_friendships_user ON friendships (user_id, status);
CREATE INDEX idx_friendships_friend ON friendships (friend_id, status);

-- RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: users can view rows where they are either side of the friendship
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- INSERT: users can only send friend requests (user_id = self, status must be 'pending')
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- UPDATE: only the recipient (friend_id) can accept a request
CREATE POLICY "Recipients can accept friend requests"
  ON friendships FOR UPDATE
  TO authenticated
  USING (friend_id = auth.uid())
  WITH CHECK (friend_id = auth.uid());

-- DELETE: either side can unfriend
CREATE POLICY "Users can remove friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Auto-update updated_at (reuses function from migration 008)
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
