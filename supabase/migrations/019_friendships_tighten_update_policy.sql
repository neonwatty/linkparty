-- Tighten friendships UPDATE policy to only allow pending -> accepted transitions
-- Also add REPLICA IDENTITY FULL for Supabase Realtime support

-- Drop and recreate the UPDATE policy with status transition check
DROP POLICY "Recipients can accept friend requests" ON friendships;

CREATE POLICY "Recipients can accept friend requests"
  ON friendships FOR UPDATE
  TO authenticated
  USING (friend_id = auth.uid() AND status = 'pending')
  WITH CHECK (friend_id = auth.uid() AND status = 'accepted');

-- Enable Realtime support for UPDATE/DELETE events
ALTER TABLE friendships REPLICA IDENTITY FULL;
