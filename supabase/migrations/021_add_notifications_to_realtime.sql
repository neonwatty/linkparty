-- Add notifications table to Realtime publication
-- Required for useNotifications hook to receive INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
