-- Allow search interactions to be stored without an item UUID.
ALTER TABLE public.interactions
  ALTER COLUMN item_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS interactions_search_idx
  ON public.interactions(event, created_at DESC)
  WHERE event = 'search';

NOTIFY pgrst, 'reload schema';
