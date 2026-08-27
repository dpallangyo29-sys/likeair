-- Keep media buckets present and publicly readable for feed and profile images.
-- RLS policies control writes; public visibility controls anonymous image reads.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('listings', 'listings', TRUE),
  ('avatars', 'avatars', TRUE),
  ('ads', 'ads', TRUE)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;
