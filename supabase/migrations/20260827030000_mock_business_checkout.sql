-- Temporary checkout for development/testing until a trusted mobile-money
-- provider callback is connected. The browser cannot choose the amount or
-- mark another business owner's payment as successful.

CREATE OR REPLACE FUNCTION public.complete_mock_business_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_promotion_id UUID;
  v_amount NUMERIC;
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  SELECT p.business_id, p.id, p.amount, p.status
    INTO v_business_id, v_promotion_id, v_amount, v_status
  FROM public.business_payments p
  JOIN public.business_profiles b ON b.id = p.business_id
  WHERE p.id = p_payment_id AND b.user_id = auth.uid()
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status = 'successful' THEN RETURN; END IF;
  IF v_status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'This payment cannot be completed' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.business_payments
  SET status = 'successful', provider = 'mock',
      provider_reference = 'MOCK-' || replace(gen_random_uuid()::TEXT, '-', ''),
      paid_at = now(), updated_at = now()
  WHERE id = p_payment_id;

  UPDATE public.promotions
  SET status = 'running', start_time = now(),
      end_time = now() + make_interval(secs => duration_hours * 3600),
      promotion_score = GREATEST(1, LN(budget_amount + 1)), updated_at = now()
  WHERE id = v_promotion_id AND status = 'waiting_for_payment';
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_mock_business_payment(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_mock_business_payment(UUID) FROM PUBLIC, anon;
NOTIFY pgrst, 'reload schema';