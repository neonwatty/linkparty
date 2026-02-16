-- Migration: Add index on parties.expires_at for cron cleanup performance
CREATE INDEX IF NOT EXISTS idx_parties_expires_at ON parties (expires_at);
