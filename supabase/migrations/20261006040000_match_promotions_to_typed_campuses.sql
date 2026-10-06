-- Match typed promotion locations case-insensitively. When selecting a campus,
-- feed discovery passes that campus name; region mode passes the region name.

DROP FUNCTION IF EXISTS public.get_eligible_promotions(TEXT, TEXT, INTEGER);
CREATE FUNCTION public.get_eligible_promotions(
  p_location TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  image_url TEXT,
  location TEXT,
  category TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible AS (
    SELECT DISTINCT ON (p.business_id)
      p.id, p.title, p.message, p.image_url, p.location, p.category
    FROM public.promotions p
    WHERE p.status = 'running'
      AND (p.end_time IS NULL OR p.end_time > now())
      AND (
        p_location IS NULL
        OR lower(trim(p.location)) = lower(trim(p_location))
        OR lower(trim(p.location)) = 'tanzania'
      )
      AND (
        p_category IS NULL
        OR lower(trim(p.category)) = lower(trim(p_category))
        OR lower(trim(p.category)) = 'all'
      )
    ORDER BY p.business_id, random()
  )
  SELECT eligible.id, eligible.title, eligible.message, eligible.image_url,
    eligible.location, eligible.category
  FROM eligible
  ORDER BY random()
  LIMIT GREATEST(1, LEAST(p_limit, 5));
$$;

REVOKE EXECUTE ON FUNCTION public.get_eligible_promotions(TEXT, TEXT, INTEGER)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_eligible_promotions(TEXT, TEXT, INTEGER)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
