-- Migration: Add image support to queue_items
-- This adds support for image uploads as a new content type

-- Update type constraint to include 'image'
ALTER TABLE queue_items DROP CONSTRAINT IF EXISTS queue_items_type_check;
ALTER TABLE queue_items ADD CONSTRAINT queue_items_type_check
  CHECK (type IN ('youtube', 'tweet', 'reddit', 'note', 'image'));

-- Add image-specific columns
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS image_name TEXT;
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS image_storage_path TEXT;
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS image_caption TEXT;
