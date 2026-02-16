-- Invite tokens for tracking email invitations and enabling auto-friendship on sign-up
CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  party_code TEXT,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

-- Index for looking up unclaimed tokens by email
CREATE INDEX idx_invite_tokens_email ON invite_tokens (invitee_email) WHERE claimed = FALSE;

-- RLS
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Inviter can read their own tokens
CREATE POLICY "Users can read own invite tokens"
  ON invite_tokens FOR SELECT
  USING (inviter_id = auth.uid());

-- Service role handles inserts and updates (via API routes)
-- No direct user insert/update policies needed
