-- Campus submissions are proposals only; only staff approval makes them public.
DROP POLICY IF EXISTS "campus suggestions public read" ON public.campus_suggestions;
CREATE POLICY "campus suggestions public read" ON public.campus_suggestions
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR submitted_by = auth.uid());

DROP POLICY IF EXISTS "campus suggestions own insert" ON public.campus_suggestions;
CREATE POLICY "campus suggestions own insert" ON public.campus_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND status = 'pending'
    AND use_count = 1
  );

REVOKE INSERT ON public.campus_suggestions FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_campus_suggestion(TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_campus_suggestion(TEXT, TEXT)
  TO authenticated;

-- Expose only directory fields; keep private business ownership and review
-- metadata behind the base-table permissions.
CREATE OR REPLACE VIEW public.public_business_directory
WITH (security_invoker = off) AS
SELECT
  id,
  business_name,
  category,
  location,
  phone,
  offer,
  description,
  logo_url,
  verified_at
FROM public.business_profiles
WHERE verified_at IS NOT NULL;

GRANT SELECT ON public.public_business_directory TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_campus_suggestion(
  suggestion_name TEXT,
  suggestion_region TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_name TEXT := regexp_replace(trim(suggestion_name), '\s+', ' ', 'g');
  clean_normalized TEXT := lower(regexp_replace(trim(suggestion_name), '\s+', ' ', 'g'));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF length(clean_name) < 2 OR length(clean_name) > 120 THEN RETURN; END IF;

  INSERT INTO public.campus_suggestions (name, normalized_name, region, submitted_by)
  VALUES (clean_name, clean_normalized, suggestion_region, auth.uid())
  ON CONFLICT (normalized_name) DO UPDATE
    SET use_count = public.campus_suggestions.use_count + 1, updated_at = now();
END;
$$;

-- System-controlled trust and engagement fields must not be supplied by owners
-- when creating rows. Preserve the existing protection for subsequent updates.
CREATE OR REPLACE FUNCTION public.protect_profile_trust_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.verified := false;
      NEW.nida_number := NULL;
    ELSE
      NEW.verified := OLD.verified;
      NEW.nida_number := OLD.nida_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_trust_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_trust_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_trust_fields();

CREATE OR REPLACE FUNCTION public.protect_product_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.hot := false;
      NEW.featured := false;
      NEW.view_count := 0;
      NEW.like_count := 0;
      NEW.boost_count := 0;
      NEW.promoted_until := NULL;
    ELSE
      NEW.hot := OLD.hot;
      NEW.featured := OLD.featured;
      NEW.view_count := OLD.view_count;
      NEW.like_count := OLD.like_count;
      NEW.boost_count := OLD.boost_count;
      NEW.promoted_until := OLD.promoted_until;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_product_system_fields ON public.products;
CREATE TRIGGER trg_protect_product_system_fields
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.protect_product_system_fields();

CREATE OR REPLACE FUNCTION public.protect_gig_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.featured := false;
      NEW.view_count := 0;
      NEW.like_count := 0;
      NEW.boost_count := 0;
      NEW.promoted_until := NULL;
    ELSE
      NEW.featured := OLD.featured;
      NEW.view_count := OLD.view_count;
      NEW.like_count := OLD.like_count;
      NEW.boost_count := OLD.boost_count;
      NEW.promoted_until := OLD.promoted_until;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_gig_system_fields ON public.gigs;
CREATE TRIGGER trg_protect_gig_system_fields
BEFORE INSERT OR UPDATE ON public.gigs
FOR EACH ROW EXECUTE FUNCTION public.protect_gig_system_fields();

CREATE OR REPLACE FUNCTION public.protect_ad_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.impressions_left := 1000;
      NEW.like_count := 0;
      NEW.view_count := 0;
    ELSE
      NEW.impressions_left := OLD.impressions_left;
      NEW.like_count := OLD.like_count;
      NEW.view_count := OLD.view_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_ad_system_fields ON public.ads;
CREATE TRIGGER trg_protect_ad_system_fields
BEFORE INSERT OR UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.protect_ad_system_fields();

NOTIFY pgrst, 'reload schema';
