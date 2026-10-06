-- Promotions are free and automatically published while no payment provider
-- is connected. Keep the legacy RPC signature so older deployed clients work,
-- but ignore all budget and strength inputs.

ALTER TABLE public.promotions
  DROP CONSTRAINT IF EXISTS promotions_budget_amount_check;
ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_budget_amount_check CHECK (budget_amount >= 0);

UPDATE public.business_payments
SET status = 'cancelled', updated_at = now()
WHERE (status IN ('pending', 'processing') AND promotion_id IS NOT NULL)
   OR provider = 'mock';

UPDATE public.promotions p
SET status = 'draft', updated_at = now()
WHERE p.status = 'waiting_for_payment'
   OR EXISTS (
     SELECT 1
     FROM public.business_payments payment
     WHERE payment.id = p.payment_id AND payment.provider = 'mock'
   );

CREATE OR REPLACE FUNCTION public.create_business_promotion(
  p_content_type TEXT,
  p_content_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_image_url TEXT,
  p_video_url TEXT,
  p_location TEXT,
  p_category TEXT,
  p_budget_amount NUMERIC,
  p_duration_hours NUMERIC,
  p_promotion_strength TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_business_id
  FROM public.business_profiles
  WHERE user_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Approved LikeAir Business access required' USING ERRCODE = '42501';
  END IF;

  IF p_duration_hours NOT IN (24, 72, 168) THEN
    RAISE EXCEPTION 'Promotion duration must be 1, 3, or 7 days' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(trim(p_title), '') IS NULL
     OR NULLIF(trim(p_location), '') IS NULL
     OR NULLIF(trim(p_category), '') IS NULL THEN
    RAISE EXCEPTION 'Promotion title, location, and category are required'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.promotions (
    business_id,
    content_type,
    content_id,
    title,
    message,
    image_url,
    video_url,
    location,
    category,
    budget_amount,
    remaining_balance,
    spent_amount,
    duration_hours,
    promotion_strength,
    promotion_score,
    status,
    start_time,
    end_time,
    payment_id
  )
  VALUES (
    v_business_id,
    p_content_type,
    p_content_id,
    trim(p_title),
    NULLIF(trim(p_message), ''),
    p_image_url,
    p_video_url,
    trim(p_location),
    trim(p_category),
    0,
    0,
    0,
    p_duration_hours,
    'Free',
    1,
    'running',
    now(),
    now() + make_interval(secs => p_duration_hours * 3600),
    NULL
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_promotion(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT
) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_business_promotion(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT
) FROM PUBLIC, anon;

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
      AND (p_location IS NULL OR p.location = p_location OR p.location = 'Tanzania')
      AND (p_category IS NULL OR p.category = p_category OR p.category = 'all')
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

CREATE OR REPLACE FUNCTION public.finish_expired_promotions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_finished INTEGER;
BEGIN
  UPDATE public.promotions
  SET status = 'finished', updated_at = now()
  WHERE status IN ('approved', 'running')
    AND end_time IS NOT NULL
    AND end_time <= now();

  GET DIAGNOSTICS v_finished = ROW_COUNT;
  RETURN v_finished;
END;
$$;

-- The same selection remains read-only, but never ranks a campaign by a budget.
CREATE OR REPLACE FUNCTION public.activate_paid_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'successful' AND NEW.promotion_id IS NOT NULL THEN
    v_start_time := COALESCE(NEW.paid_at, now());
    UPDATE public.promotions
    SET status = 'running',
        start_time = COALESCE(start_time, v_start_time),
        end_time = COALESCE(
          end_time,
          v_start_time + make_interval(secs => duration_hours * 3600)
        ),
        promotion_score = 1,
        updated_at = now()
    WHERE id = NEW.promotion_id
      AND status IN ('waiting_for_payment', 'paid', 'approved', 'draft');
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
