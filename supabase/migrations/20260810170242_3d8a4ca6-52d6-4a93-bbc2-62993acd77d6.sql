GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_name text,
  ADD COLUMN IF NOT EXISTS store_slug text,
  ADD COLUMN IF NOT EXISTS store_bio text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_store_slug_uniq ON public.profiles (lower(store_slug)) WHERE store_slug IS NOT NULL;

DROP VIEW IF EXISTS public.seller_profiles;
CREATE VIEW public.seller_profiles
WITH (security_invoker = off) AS
  SELECT id, full_name, avatar_url, campus_id, region, verified, bio, store_name, store_slug, store_bio
  FROM public.profiles;

GRANT SELECT ON public.seller_profiles TO anon, authenticated, service_role;