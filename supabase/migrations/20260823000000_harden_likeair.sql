-- LikeAir production hardening + scalable search helpers.
-- This migration closes client-side trust gaps while preserving the existing product UX.

-- -----------------------------------------------------------------------------
-- 1) Safer public state: users cannot promote/verify/content-moderate themselves.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'moderator');
$$;

GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_trust_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    NEW.verified := OLD.verified;
    NEW.nida_number := OLD.nida_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_trust_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_trust_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_trust_fields();

CREATE OR REPLACE FUNCTION public.protect_product_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    NEW.hot := OLD.hot;
    NEW.featured := OLD.featured;
    NEW.view_count := OLD.view_count;
    NEW.like_count := OLD.like_count;
    NEW.boost_count := OLD.boost_count;
    NEW.promoted_until := OLD.promoted_until;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_product_system_fields ON public.products;
CREATE TRIGGER trg_protect_product_system_fields
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.protect_product_system_fields();

CREATE OR REPLACE FUNCTION public.protect_gig_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    NEW.featured := OLD.featured;
    NEW.view_count := OLD.view_count;
    NEW.like_count := OLD.like_count;
    NEW.boost_count := OLD.boost_count;
    NEW.promoted_until := OLD.promoted_until;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_gig_system_fields ON public.gigs;
CREATE TRIGGER trg_protect_gig_system_fields
BEFORE UPDATE ON public.gigs
FOR EACH ROW EXECUTE FUNCTION public.protect_gig_system_fields();

CREATE OR REPLACE FUNCTION public.protect_ad_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    NEW.impressions_left := OLD.impressions_left;
    NEW.like_count := OLD.like_count;
    NEW.view_count := OLD.view_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_ad_system_fields ON public.ads;
CREATE TRIGGER trg_protect_ad_system_fields
BEFORE UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.protect_ad_system_fields();

-- -----------------------------------------------------------------------------
-- 2) Server-side posting limits. Client checks remain UX only.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_posting_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  current_status TEXT;
  active_count INTEGER;
  allowed_limit INTEGER;
  early_user BOOLEAN := FALSE;
BEGIN
  current_status := to_jsonb(NEW)->>'status';
  IF TG_OP <> 'INSERT' OR current_status <> 'active' THEN
    RETURN NEW;
  END IF;

  owner_id := CASE TG_TABLE_NAME
    WHEN 'products' THEN (to_jsonb(NEW)->>'seller_id')::UUID
    WHEN 'gigs' THEN (to_jsonb(NEW)->>'poster_id')::UUID
    WHEN 'ads' THEN (to_jsonb(NEW)->>'poster_id')::UUID
  END;

  IF public.is_staff(owner_id) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(is_early_user, FALSE)
    INTO early_user
  FROM public.onboarding_queue
  WHERE user_id = owner_id;

  IF early_user THEN
    RETURN NEW;
  END IF;

  SELECT
    CASE
      WHEN TG_TABLE_NAME = 'products' THEN product_limit
      WHEN TG_TABLE_NAME = 'gigs' THEN gig_limit
      ELSE ads_limit
    END
  INTO allowed_limit
  FROM public.user_subscriptions
  WHERE user_id = owner_id;

  allowed_limit := COALESCE(allowed_limit,
    CASE WHEN TG_TABLE_NAME = 'products' THEN 5
         WHEN TG_TABLE_NAME = 'gigs' THEN 2
         ELSE 2 END);

  IF TG_TABLE_NAME = 'products' THEN
    SELECT COUNT(*) INTO active_count FROM public.products WHERE seller_id = owner_id AND status = 'active';
  ELSIF TG_TABLE_NAME = 'gigs' THEN
    SELECT COUNT(*) INTO active_count FROM public.gigs WHERE poster_id = owner_id AND status = 'active';
  ELSE
    SELECT COUNT(*) INTO active_count FROM public.ads WHERE poster_id = owner_id AND status = 'active';
  END IF;

  IF active_count >= allowed_limit THEN
    RAISE EXCEPTION 'Posting limit reached for %', TG_TABLE_NAME USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_product_limit ON public.products;
CREATE TRIGGER trg_enforce_product_limit
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.enforce_posting_limit();

DROP TRIGGER IF EXISTS trg_enforce_gig_limit ON public.gigs;
CREATE TRIGGER trg_enforce_gig_limit
BEFORE INSERT ON public.gigs
FOR EACH ROW EXECUTE FUNCTION public.enforce_posting_limit();

DROP TRIGGER IF EXISTS trg_enforce_ad_limit ON public.ads;
CREATE TRIGGER trg_enforce_ad_limit
BEFORE INSERT ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.enforce_posting_limit();

-- -----------------------------------------------------------------------------
-- 3) Subscription state is read-only from the client.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "own subscription update" ON public.user_subscriptions;
REVOKE UPDATE ON public.user_subscriptions FROM authenticated, anon;

-- -----------------------------------------------------------------------------
-- 4) Interaction events: no user impersonation and no client-supplied weights.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "interactions insert anyone" ON public.interactions;
CREATE POLICY "interactions insert own session" ON public.interactions
FOR INSERT TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.normalize_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  IF NEW.event NOT IN ('view', 'tap', 'click', 'whatsapp', 'save', 'search', 'category') THEN
    RAISE EXCEPTION 'Unsupported interaction event: %', NEW.event USING ERRCODE = 'check_violation';
  END IF;

  NEW.weight := CASE NEW.event
    WHEN 'view' THEN 1
    WHEN 'tap' THEN 3
    WHEN 'click' THEN 3
    WHEN 'whatsapp' THEN 8
    WHEN 'save' THEN 6
    WHEN 'search' THEN 2
    WHEN 'category' THEN 1
    ELSE 1
  END;

  NEW.created_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_interaction ON public.interactions;
CREATE TRIGGER trg_normalize_interaction
BEFORE INSERT ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.normalize_interaction();

-- Automatically keep interest scores warm instead of asking the browser to write
-- directly to user_interests.
CREATE OR REPLACE FUNCTION public.sync_user_interest()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.category IS NOT NULL AND length(trim(NEW.category)) > 0 THEN
    INSERT INTO public.user_interests (user_id, category, score, updated_at)
    VALUES (NEW.user_id, NEW.category, LEAST(100, NEW.weight), now())
    ON CONFLICT (user_id, category) DO UPDATE
      SET score = LEAST(100, public.user_interests.score + EXCLUDED.score),
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_interest ON public.interactions;
CREATE TRIGGER trg_sync_user_interest
AFTER INSERT ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.sync_user_interest();

-- -----------------------------------------------------------------------------
-- 5) Ad impressions must identify the authenticated user correctly when present.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_ad_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_ad_view ON public.ads_views;
CREATE TRIGGER trg_normalize_ad_view
BEFORE INSERT ON public.ads_views
FOR EACH ROW EXECUTE FUNCTION public.normalize_ad_view();

-- -----------------------------------------------------------------------------
-- 6) Safer boost creation: users request boosts, payment/settlement can be
--    handled later by trusted server code.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "own boosts all" ON public.product_boosts;
DROP POLICY IF EXISTS "own gig boosts all" ON public.gig_boosts;
REVOKE INSERT, UPDATE ON public.product_boosts FROM authenticated, anon;
REVOKE INSERT, UPDATE ON public.gig_boosts FROM authenticated, anon;

CREATE POLICY "own product boosts read" ON public.product_boosts
FOR SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "own gig boosts read" ON public.gig_boosts
FOR SELECT TO authenticated USING (poster_id = auth.uid());

CREATE OR REPLACE FUNCTION public.request_product_boost(
  p_product_id UUID,
  p_boost_level INTEGER DEFAULT 1,
  p_duration_days INTEGER DEFAULT 7
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_cost NUMERIC(12,2);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND seller_id = auth.uid()) THEN
    RAISE EXCEPTION 'Product not owned by current user' USING ERRCODE = '42501';
  END IF;

  IF p_boost_level NOT BETWEEN 1 AND 3 OR p_duration_days NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'Invalid boost parameters' USING ERRCODE = '22023';
  END IF;

  v_cost := CASE p_boost_level WHEN 1 THEN 10000 WHEN 2 THEN 25000 ELSE 50000 END;

  INSERT INTO public.product_boosts (product_id, seller_id, boost_level, duration_days, expires_at, cost, payment_status)
  VALUES (p_product_id, auth.uid(), p_boost_level, p_duration_days,
          now() + make_interval(days => p_duration_days), v_cost, 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_gig_boost(
  p_gig_id UUID,
  p_boost_level INTEGER DEFAULT 1,
  p_duration_days INTEGER DEFAULT 7
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_cost NUMERIC(12,2);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.gigs WHERE id = p_gig_id AND poster_id = auth.uid()) THEN
    RAISE EXCEPTION 'Gig not owned by current user' USING ERRCODE = '42501';
  END IF;

  IF p_boost_level NOT BETWEEN 1 AND 3 OR p_duration_days NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'Invalid boost parameters' USING ERRCODE = '22023';
  END IF;

  v_cost := CASE p_boost_level WHEN 1 THEN 5000 WHEN 2 THEN 12000 ELSE 25000 END;

  INSERT INTO public.gig_boosts (gig_id, poster_id, boost_level, duration_days, expires_at, cost, payment_status)
  VALUES (p_gig_id, auth.uid(), p_boost_level, p_duration_days,
          now() + make_interval(days => p_duration_days), v_cost, 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_product_boost(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_gig_boost(UUID, INTEGER, INTEGER) TO authenticated;

-- Staff moderation access is explicit; normal users keep their own-data policies.
CREATE POLICY "staff can read profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff can read interactions" ON public.interactions
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff can moderate products" ON public.products
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff can moderate gigs" ON public.gigs
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff can moderate ads" ON public.ads
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- -----------------------------------------------------------------------------
-- 7) Lifecycle checks keep accidental status values out of the core entities.
-- -----------------------------------------------------------------------------

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check
CHECK (status IN ('draft', 'active', 'sold', 'expired', 'archived', 'rejected', 'suspended'));

ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS gigs_status_check;
ALTER TABLE public.gigs ADD CONSTRAINT gigs_status_check
CHECK (status IN ('draft', 'active', 'hiring', 'filled', 'expired', 'closed', 'archived', 'rejected', 'suspended'));

ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS ads_status_check;
ALTER TABLE public.ads ADD CONSTRAINT ads_status_check
CHECK (status IN ('draft', 'active', 'paused', 'expired', 'rejected', 'suspended'));

-- -----------------------------------------------------------------------------
-- 8) Server-side search helpers. The client can keep fuzzy scoring for typo
--    tolerance, but Supabase now does the large-set filtering/pagination.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_products(
  search_query TEXT,
  p_campus_id TEXT DEFAULT NULL,
  p_campus_name TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.products
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.products p
  WHERE p.status = 'active'
    AND (p_campus_id IS NULL OR p.campus_id = p_campus_id OR (p_campus_name IS NOT NULL AND p.campus_name = p_campus_name))
    AND (p_region IS NULL OR p.region = p_region)
    AND (p_category IS NULL OR p_category = 'featured' OR p.category = p_category)
    AND (
      NULLIF(trim(search_query), '') IS NULL
      OR p.title ILIKE '%' || trim(search_query) || '%'
      OR COALESCE(p.description, '') ILIKE '%' || trim(search_query) || '%'
      OR p.category ILIKE '%' || trim(search_query) || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset);
$$;

CREATE OR REPLACE FUNCTION public.search_gigs(
  search_query TEXT,
  p_campus_id TEXT DEFAULT NULL,
  p_campus_name TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.gigs
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT g.*
  FROM public.gigs g
  WHERE g.status = 'active'
    AND (p_campus_id IS NULL OR g.campus_id = p_campus_id OR g.campus_name = p_campus_name)
    AND (p_region IS NULL OR g.region = p_region)
    AND (p_category IS NULL OR p_category = 'paid' OR p_category = ANY(g.categories))
    AND (
      NULLIF(trim(search_query), '') IS NULL
      OR g.title ILIKE '%' || trim(search_query) || '%'
      OR COALESCE(g.description, '') ILIKE '%' || trim(search_query) || '%'
      OR array_to_string(g.tags, ' ') ILIKE '%' || trim(search_query) || '%'
      OR array_to_string(g.categories, ' ') ILIKE '%' || trim(search_query) || '%'
    )
  ORDER BY g.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset);
$$;

GRANT EXECUTE ON FUNCTION public.search_products(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_gigs(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
