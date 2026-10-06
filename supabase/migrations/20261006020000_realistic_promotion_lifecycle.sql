-- Keep promotion activation realistic: no mock pay flow, and any future successful
-- payment should auto-start the campaign without admin approval.

DROP FUNCTION IF EXISTS public.complete_mock_business_payment(UUID);

CREATE OR REPLACE FUNCTION public.activate_paid_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'successful' AND NEW.promotion_id IS NOT NULL THEN
    UPDATE public.promotions
    SET status = 'running',
        start_time = COALESCE(start_time, NEW.paid_at),
        end_time = COALESCE(end_time, NEW.paid_at + make_interval(secs => duration_hours * 3600)),
        promotion_score = GREATEST(COALESCE(promotion_score, 0), GREATEST(1, LN(budget_amount + 1))),
        updated_at = now()
    WHERE id = NEW.promotion_id
      AND status IN ('waiting_for_payment', 'paid', 'approved', 'draft');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_payments_activate_promotion ON public.business_payments;
CREATE TRIGGER trg_business_payments_activate_promotion
AFTER UPDATE OF status ON public.business_payments
FOR EACH ROW
WHEN (NEW.status = 'successful' AND NEW.promotion_id IS NOT NULL)
EXECUTE FUNCTION public.activate_paid_promotion();

GRANT EXECUTE ON FUNCTION public.activate_paid_promotion() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_paid_promotion() FROM PUBLIC, anon;

NOTIFY pgrst, 'reload schema';
