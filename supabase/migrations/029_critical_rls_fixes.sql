-- Migration 029: Critical RLS security fixes
--
-- C1: Lock down push_tokens — remove anon bypass on all policies
-- C2: Lock down notification_logs SELECT — remove anon bypass
-- C3: Hide password_hash from parties — revoke column-level SELECT + add has_password column
--
-- All push_tokens and notification_logs operations go through API routes using
-- the service role key, so strict auth-required policies are safe.

-- ============================================
-- C1: push_tokens — strict ownership policies
-- ============================================

-- Drop all existing permissive push_tokens policies
DROP POLICY IF EXISTS "Users can view their own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON push_tokens;

-- Recreate with strict user ownership (no anon bypass)
CREATE POLICY "Users can view own push tokens" ON push_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own push tokens" ON push_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push tokens" ON push_tokens
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens" ON push_tokens
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- C2: notification_logs SELECT — remove anon bypass
-- ============================================

-- The existing policy allows OR auth.uid() IS NULL which lets anyone read all logs.
-- notification_logs are only read through API routes using service role key.
DROP POLICY IF EXISTS "Users can view their notification logs" ON notification_logs;

CREATE POLICY "Users can view own notification logs" ON notification_logs
  FOR SELECT USING (
    recipient_session_id IN (
      SELECT session_id FROM party_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- C3: parties password_hash — column-level security
-- ============================================

-- Add a safe boolean column so clients can check password status without seeing the hash
ALTER TABLE parties ADD COLUMN IF NOT EXISTS has_password BOOLEAN
  GENERATED ALWAYS AS (password_hash IS NOT NULL) STORED;

-- Revoke direct SELECT on password_hash from client-facing roles.
-- API routes use the service role key which bypasses these grants.
-- This prevents SELECT * or explicit password_hash requests via anon/authenticated keys.
REVOKE SELECT (password_hash) ON parties FROM anon;
REVOKE SELECT (password_hash) ON parties FROM authenticated;

-- NOTE on queue_items SELECT anon bypass (migration 027):
-- The OR auth.uid() IS NULL on queue_items SELECT cannot be removed yet because:
-- 1. The browser Supabase client uses the anon key (no auth.uid())
-- 2. Realtime subscriptions don't support custom headers for RLS evaluation
-- 3. Removing it would break the party room for all anonymous users
-- Long-term fix: Enable Supabase anonymous auth so every session gets a JWT,
-- or move all reads to server-side API routes using the service role key.
