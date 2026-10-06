-- Provide only the public business-directory fields needed for promotion
-- click-through details and direct contact.

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
  category TEXT,
  business_name TEXT,
  business_phone TEXT,
  business_logo_url TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible AS (
    SELECT DISTINCT ON (p.business_id)
      p.id,
      p.title,
      p.message,
      p.image_url,
      p.location,
      p.category,
      b.business_name,
      b.phone AS business_phone,
      b.logo_url AS business_logo_url
    FROM public.promotions p
    JOIN public.business_profiles b ON b.id = p.business_id
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
  SELECT eligible.id,
    eligible.title,
    eligible.message,
    eligible.image_url,
    eligible.location,
    eligible.category,
    eligible.business_name,
    eligible.business_phone,
    eligible.business_logo_url
  FROM eligible
  ORDER BY random()
  LIMIT GREATEST(1, LEAST(p_limit, 5));
$$;

REVOKE EXECUTE ON FUNCTION public.get_eligible_promotions(TEXT, TEXT, INTEGER)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_eligible_promotions(TEXT, TEXT, INTEGER)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
