-- Add updated_at column for conflict detection
-- This enables detecting when items have been modified by other users

-- Add updated_at column to queue_items
ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger function to auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger on queue_items
DROP TRIGGER IF EXISTS update_queue_items_updated_at ON queue_items;
CREATE TRIGGER update_queue_items_updated_at
    BEFORE UPDATE ON queue_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Backfill existing rows with created_at value
UPDATE queue_items SET updated_at = created_at WHERE updated_at IS NULL;
