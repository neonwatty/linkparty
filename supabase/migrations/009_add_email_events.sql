-- Migration: Add email_events table for Resend webhook tracking
-- This table stores email delivery events for analytics and debugging

CREATE TABLE IF NOT EXISTS email_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  email_id text NOT NULL,
  recipient text NOT NULL,
  subject text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by recipient (e.g., to check bounce status)
CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON email_events(recipient);

-- Index for querying by event type
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);

-- Index for querying by email_id (to track specific email lifecycle)
CREATE INDEX IF NOT EXISTS idx_email_events_email_id ON email_events(email_id);

-- RLS: Only service role can insert (from edge function)
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- No public access - only service role via edge function
-- Admins can query via Supabase dashboard
