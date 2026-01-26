-- Phase 6: Add missing due_date column to queue_items
-- Run this in Supabase SQL Editor if queue items fail to insert

-- Add the due_date column that was missing from the original schema
-- This column stores optional due dates/reminders for queue items
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
