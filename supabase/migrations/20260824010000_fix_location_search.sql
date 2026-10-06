-- Preserve campus filtering when a custom campus name is used.
-- A NULL campus ID must not mean "all campuses" when a campus name exists.

CREATE OR REPLACE FUNCTION public.search_products(
  search_query TEXT,
  p_campus_id TEXT DEFAULT NULL,
  p_campus_name TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.products
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.products p
  WHERE p.status = 'active'
    AND (
      (p_campus_id IS NULL AND p_campus_name IS NULL)
      OR (p_campus_id IS NOT NULL AND p.campus_id = p_campus_id)
      OR (p_campus_name IS NOT NULL AND p.campus_name = p_campus_name)
    )
    AND (p_region IS NULL OR p.region = p_region)
    AND (p_category IS NULL OR p_category = 'featured' OR p.category = p_category)
    AND (
      NULLIF(trim(search_query), '') IS NULL
      OR p.title ILIKE '%' || trim(search_query) || '%'
      OR COALESCE(p.description, '') ILIKE '%' || trim(search_query) || '%'
      OR p.category ILIKE '%' || trim(search_query) || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset);
$$;

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
