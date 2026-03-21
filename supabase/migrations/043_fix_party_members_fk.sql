-- Migration 043: Fix foreign keys to allow user account deletion
--
-- Problem: party_members_user_id_fkey uses ON DELETE NO ACTION,
-- which blocks user account deletion. Same for queue_items.completed_by_user_id_fkey.

-- party_members.user_id → SET NULL on delete
ALTER TABLE party_members DROP CONSTRAINT IF EXISTS party_members_user_id_fkey;
ALTER TABLE party_members ADD CONSTRAINT party_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- queue_items.completed_by_user_id → SET NULL on delete
ALTER TABLE queue_items DROP CONSTRAINT IF EXISTS queue_items_completed_by_user_id_fkey;
ALTER TABLE queue_items ADD CONSTRAINT queue_items_completed_by_user_id_fkey
  FOREIGN KEY (completed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
