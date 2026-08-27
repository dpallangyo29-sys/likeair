-- Sensitive promotion lifecycle changes must go through controlled RPCs.

DROP POLICY IF EXISTS "staff manage promotions" ON public.promotions;
CREATE POLICY "staff read promotions" ON public.promotions
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_set_promotion_status(
  p_promotion_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_promotion public.promotions;
  v_payment_status TEXT;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only LikeAir staff can manage promotions' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('approved', 'running', 'rejected', 'paused', 'stopped', 'finished') THEN
    RAISE EXCEPTION 'Invalid promotion status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_promotion FROM public.promotions WHERE id = p_promotion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found' USING ERRCODE = 'P0002'; END IF;

  IF p_status IN ('approved', 'running') THEN
    SELECT status INTO v_payment_status
    FROM public.business_payments
    WHERE id = v_promotion.payment_id;
    IF v_payment_status IS DISTINCT FROM 'successful' THEN
      RAISE EXCEPTION 'Promotion payment is not successful' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF p_status = 'approved' THEN
    UPDATE public.promotions
    SET status = 'approved',
        promotion_score = GREATEST(1, LN(budget_amount + 1)),
        updated_at = now()
    WHERE id = p_promotion_id;
  ELSIF p_status = 'running' THEN
    UPDATE public.promotions
    SET status = 'running',
        start_time = COALESCE(start_time, now()),
        end_time = COALESCE(end_time, now() + make_interval(secs => duration_hours * 3600)),
        updated_at = now()
    WHERE id = p_promotion_id;
  ELSE
    UPDATE public.promotions SET status = p_status, updated_at = now() WHERE id = p_promotion_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_promotion_status(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_promotion_status(UUID, TEXT) FROM PUBLIC, anon;

-- Add reviewed business identity fields to the existing public seller view.
DROP VIEW IF EXISTS public.seller_profiles;
CREATE VIEW public.seller_profiles
WITH (security_invoker = off) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.campus_id,
  p.region,
  p.verified,
  p.bio,
  p.store_name,
  p.store_slug,
  p.store_bio,
  b.business_name,
  (b.id IS NOT NULL) AS business_verified
FROM public.profiles p
LEFT JOIN public.business_profiles b ON b.user_id = p.id;

GRANT SELECT ON public.seller_profiles TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';