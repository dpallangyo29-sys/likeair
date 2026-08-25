-- LikeAir product polish: fast saved-content retrieval and valid save targets.

CREATE INDEX IF NOT EXISTS saves_user_created_idx
  ON public.saves(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS products_status_created_idx
  ON public.products(status, created_at DESC);

CREATE INDEX IF NOT EXISTS gigs_status_created_idx
  ON public.gigs(status, created_at DESC);

ALTER TABLE public.saves DROP CONSTRAINT IF EXISTS saves_item_type_check;
ALTER TABLE public.saves ADD CONSTRAINT saves_item_type_check
  CHECK (item_type IN ('product', 'gig', 'ad'));

-- Keep the public feed biased toward live content without requiring client-side filtering.
CREATE INDEX IF NOT EXISTS products_active_campus_created_idx
  ON public.products(campus_id, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS gigs_active_campus_created_idx
  ON public.gigs(campus_id, created_at DESC)
  WHERE status = 'active';

NOTIFY pgrst, 'reload schema';
