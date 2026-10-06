-- Ensure the live API schema includes video ads support.
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Refresh PostgREST's schema cache after the additive column change.
NOTIFY pgrst, 'reload schema';
