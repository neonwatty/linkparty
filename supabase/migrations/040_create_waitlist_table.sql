-- Waitlist for beta signup lead capture
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  source VARCHAR(50) NOT NULL DEFAULT 'landing_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

CREATE INDEX waitlist_created_at_idx ON public.waitlist (created_at DESC);

-- RLS: only service_role can read/write (no public access)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.waitlist
  FOR ALL USING (auth.role() = 'service_role');
