-- Fix Supabase Realtime: Add REPLICA IDENTITY FULL
-- Without this, Postgres cannot serialize UPDATE/DELETE change events
-- to realtime subscribers, causing WebSocket subscriptions to silently
-- fail to deliver updates.
--
-- Tables were added to supabase_realtime publication in 001_initial_schema.sql
-- but never given REPLICA IDENTITY FULL.

ALTER TABLE parties REPLICA IDENTITY FULL;
ALTER TABLE party_members REPLICA IDENTITY FULL;
ALTER TABLE queue_items REPLICA IDENTITY FULL;
