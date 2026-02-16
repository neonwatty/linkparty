-- Add visibility toggle for friends to see active parties on home page
ALTER TABLE parties ADD COLUMN visible_to_friends BOOLEAN NOT NULL DEFAULT false;
