-- Add optional gig deadlines and keep expired opportunities out of discovery.

ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS gigs_active_deadline_idx
  ON public.gigs(status, deadline_at, created_at DESC)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.search_gigs(
  search_query TEXT,
  p_campus_id TEXT DEFAULT NULL,
  p_campus_name TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.gigs
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT g.*
  FROM public.gigs g
  WHERE g.status = 'active'
    AND (g.deadline_at IS NULL OR g.deadline_at >= now())
    AND (
      (p_campus_id IS NULL AND p_campus_name IS NULL)
      OR (p_campus_id IS NOT NULL AND g.campus_id = p_campus_id)
      OR (p_campus_name IS NOT NULL AND g.campus_name = p_campus_name)
    )
    AND (p_region IS NULL OR g.region = p_region)
    AND (p_category IS NULL OR p_category = 'paid' OR p_category = ANY(g.categories))
    AND (
      NULLIF(trim(search_query), '') IS NULL
      OR g.title ILIKE '%' || trim(search_query) || '%'
      OR COALESCE(g.description, '') ILIKE '%' || trim(search_query) || '%'
      OR array_to_string(g.tags, ' ') ILIKE '%' || trim(search_query) || '%'
      OR array_to_string(g.categories, ' ') ILIKE '%' || trim(search_query) || '%'
    )
  ORDER BY g.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset);
$$;

NOTIFY pgrst, 'reload schema';
