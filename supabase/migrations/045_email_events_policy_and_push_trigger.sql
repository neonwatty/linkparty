-- Migration 045: Add service_role policy for email_events and
-- fix push_tokens.updated_at trigger.

-- email_events: explicit service_role policy
-- The webhook handler uses the service role key; this policy makes that explicit.
CREATE POLICY "Service role full access"
  ON email_events
  TO service_role
  USING (true)
  WITH CHECK (true);

-- push_tokens: add missing updated_at trigger
-- The update_updated_at_column() function already exists from migration 008/042.
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
