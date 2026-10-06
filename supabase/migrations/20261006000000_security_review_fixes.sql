-- Mock checkout cannot be used to assert real payments. Keep payment status
-- changes restricted to trusted provider integrations and staff workflows.
REVOKE EXECUTE ON FUNCTION public.complete_mock_business_payment(UUID)
  FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.complete_mock_business_payment(UUID);

-- Public promotion discovery is served through a narrow projection below.
-- Direct table reads remain available to authenticated owners and staff only.
DROP POLICY IF EXISTS "public read running promotions" ON public.promotions;
REVOKE SELECT ON public.promotions FROM anon, authenticated;
GRANT SELECT ON public.promotions TO authenticated;

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
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.title, p.message, p.image_url, p.location, p.category
  FROM public.promotions p
  WHERE p.status IN ('approved', 'running')
    AND p.remaining_balance > 0
    AND (p.end_time IS NULL OR p.end_time > now())
    AND (p_location IS NULL OR p.location = p_location OR p.location = 'Tanzania')
    AND (p_category IS NULL OR p.category = p_category OR p.category = 'all')
  ORDER BY p.promotion_score DESC, p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

REVOKE EXECUTE ON FUNCTION public.get_eligible_promotions(TEXT, TEXT, INTEGER)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_eligible_promotions(TEXT, TEXT, INTEGER)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
