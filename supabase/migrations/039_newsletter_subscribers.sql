-- Newsletter subscribers for lead capture
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'landing_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email)
);

-- RLS: only service_role can read/write (no public access)
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated and anonymous users via API route (server-side)
CREATE POLICY "service_role_full_access" ON newsletter_subscribers
  FOR ALL USING (auth.role() = 'service_role');
