-- Add optional password protection for parties
-- password_hash is nullable — not all parties need passwords
ALTER TABLE parties ADD COLUMN IF NOT EXISTS password_hash TEXT;
