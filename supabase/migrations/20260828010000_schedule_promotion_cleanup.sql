-- Keep promotion lifecycle state aligned with feed eligibility.
-- The job runs in the database; browsers cannot invoke it or change balances.

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
    AND (remaining_balance <= 0 OR (end_time IS NOT NULL AND end_time <= now()));

  GET DIAGNOSTICS v_finished = ROW_COUNT;
  RETURN v_finished;
END;
$$;

REVOKE ALL ON FUNCTION public.finish_expired_promotions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_expired_promotions() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('likeair-finish-expired-promotions')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'likeair-finish-expired-promotions'
);

SELECT cron.schedule(
  'likeair-finish-expired-promotions',
  '*/5 * * * *',
  $$SELECT public.finish_expired_promotions();$$
);
