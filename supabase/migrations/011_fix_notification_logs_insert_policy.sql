-- Fix notification_logs: Add missing INSERT RLS policy
-- Migration 004 enabled RLS on notification_logs but only defined a SELECT policy.
-- All INSERT operations were denied (403 Forbidden), causing console errors
-- on every queue item addition.

CREATE POLICY "Members can insert notification logs" ON notification_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM parties WHERE id = party_id)
  );
