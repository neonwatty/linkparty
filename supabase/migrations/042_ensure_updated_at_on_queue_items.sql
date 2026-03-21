-- Migration 042: Ensure updated_at column and trigger exist on queue_items
--
-- Problem: Migration 008 defines the column + trigger but they may be missing
-- from production. Conflict detection in conflictResolver.ts is silently broken.

-- Add the column if it doesn't exist (idempotent)
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Recreate the trigger function (idempotent via CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (drop first to ensure clean state)
DROP TRIGGER IF EXISTS update_queue_items_updated_at ON queue_items;
CREATE TRIGGER update_queue_items_updated_at
    BEFORE UPDATE ON queue_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Backfill any rows missing updated_at
UPDATE queue_items SET updated_at = created_at WHERE updated_at IS NULL;
