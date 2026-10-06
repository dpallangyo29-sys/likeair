-- Add optional images to gig posts.
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS image_url TEXT;
