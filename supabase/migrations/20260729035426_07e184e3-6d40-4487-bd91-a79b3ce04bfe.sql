
-- Grant Data API access to every public table (they had none, causing "permission denied")
DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.relname);
  END LOOP;
END $$;

-- Public read tables also need anon SELECT (feed works when signed out)
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.gigs TO anon;
GRANT SELECT ON public.ads TO anon;
GRANT SELECT ON public.campuses TO anon;

-- Ads: give sane defaults so posting an ad without billing works
ALTER TABLE public.ads ALTER COLUMN budget_amount SET DEFAULT 0;
ALTER TABLE public.ads ALTER COLUMN impressions_left SET DEFAULT 1000;

-- Terms acceptance
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
