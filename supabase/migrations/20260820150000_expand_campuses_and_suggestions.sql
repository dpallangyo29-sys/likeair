-- Expand the initial campus directory and collect user-entered campus names.
INSERT INTO public.campuses (id, name, short, lat, lng) VALUES
  ('aru', 'Ardhi University', 'ARU', -6.7924, 39.2083),
  ('ifm', 'Institute of Finance Management', 'IFM', -6.8147, 39.2888),
  ('dit', 'Dar es Salaam Institute of Technology', 'DIT', -6.8167, 39.2833),
  ('mzumbe', 'Mzumbe University', 'MU', -6.7808, 37.6603),
  ('saut', 'St. Augustine University of Tanzania', 'SAUT', -2.5164, 32.9001),
  ('suza', 'State University of Zanzibar', 'SUZA', -6.1659, 39.1989)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS campus_name TEXT;
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS campus_name TEXT;

CREATE TABLE IF NOT EXISTS public.campus_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  region TEXT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  use_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.campus_suggestions TO anon, authenticated;
GRANT INSERT ON public.campus_suggestions TO authenticated;
GRANT ALL ON public.campus_suggestions TO service_role;
ALTER TABLE public.campus_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campus suggestions public read" ON public.campus_suggestions
  FOR SELECT TO anon, authenticated USING (status = 'approved' OR use_count >= 3 OR submitted_by = auth.uid());
CREATE POLICY "campus suggestions own insert" ON public.campus_suggestions
  FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());

CREATE INDEX IF NOT EXISTS campus_suggestions_status_idx
  ON public.campus_suggestions(status, use_count DESC);
CREATE INDEX IF NOT EXISTS products_campus_name_idx ON public.products(campus_name);
CREATE INDEX IF NOT EXISTS gigs_campus_name_idx ON public.gigs(campus_name);

CREATE OR REPLACE FUNCTION public.submit_campus_suggestion(
  suggestion_name TEXT,
  suggestion_region TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_name TEXT := regexp_replace(trim(suggestion_name), '\s+', ' ', 'g');
  clean_normalized TEXT := lower(regexp_replace(trim(suggestion_name), '\s+', ' ', 'g'));
BEGIN
  IF length(clean_name) < 2 OR length(clean_name) > 120 THEN RETURN; END IF;
  INSERT INTO public.campus_suggestions (name, normalized_name, region, submitted_by)
  VALUES (clean_name, clean_normalized, suggestion_region, auth.uid())
  ON CONFLICT (normalized_name) DO UPDATE
    SET use_count = public.campus_suggestions.use_count + 1, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_campus_suggestion(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
