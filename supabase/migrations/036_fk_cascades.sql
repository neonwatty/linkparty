-- NOTE: Migration 0170_recreate_updated_at_function.sql uses non-standard numbering
-- but sorts correctly between 017 and 018. Do not create migrations named 0171-0179.

-- push_tokens: orphaned rows when user deleted
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_fkey;
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- invite_tokens: blocks user deletion
ALTER TABLE invite_tokens DROP CONSTRAINT IF EXISTS invite_tokens_claimed_by_fkey;
ALTER TABLE invite_tokens ADD CONSTRAINT invite_tokens_claimed_by_fkey
  FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
