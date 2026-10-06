-- LikeAir Business access, promotion lifecycle, and payment records.
-- Business access is additive: a person keeps their normal LikeAir account.

CREATE TABLE public.business_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT NOT NULL,
  offer TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_applications_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'more_information'))
);

CREATE UNIQUE INDEX business_applications_one_open_idx
  ON public.business_applications(user_id)
  WHERE status IN ('pending', 'more_information');
CREATE INDEX business_applications_status_idx
  ON public.business_applications(status, created_at DESC);
CREATE INDEX business_applications_user_idx
  ON public.business_applications(user_id, created_at DESC);

CREATE TABLE public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL UNIQUE REFERENCES public.business_applications(id) ON DELETE RESTRICT,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT NOT NULL,
  offer TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX business_profiles_category_idx ON public.business_profiles(category);
CREATE INDEX business_profiles_location_idx ON public.business_profiles(location);

CREATE TABLE public.business_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  promotion_id UUID,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'TZS' CHECK (currency = 'TZS'),
  provider TEXT,
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  receipt_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_payments_status_check
    CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'cancelled'))
);

CREATE INDEX business_payments_business_idx
  ON public.business_payments(business_id, created_at DESC);
CREATE INDEX business_payments_status_idx
  ON public.business_payments(status, created_at DESC);

CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  image_url TEXT,
  video_url TEXT,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  budget_amount NUMERIC(14,2) NOT NULL CHECK (budget_amount >= 100),
  remaining_balance NUMERIC(14,2) NOT NULL,
  spent_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  duration_hours NUMERIC(12,2) NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  promotion_strength TEXT NOT NULL,
  promotion_score NUMERIC(18,6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_id UUID REFERENCES public.business_payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promotions_content_type_check
    CHECK (content_type IN ('product', 'service', 'business', 'special_offer', 'gig', 'custom')),
  CONSTRAINT promotions_status_check
    CHECK (status IN ('draft', 'waiting_for_payment', 'paid', 'waiting_for_review', 'approved', 'running', 'finished', 'rejected', 'paused', 'stopped')),
  CONSTRAINT promotions_balance_check
    CHECK (remaining_balance >= 0 AND spent_amount >= 0 AND remaining_balance + spent_amount <= budget_amount),
  CONSTRAINT promotions_duration_check CHECK (duration_hours > 0)
);

CREATE INDEX promotions_business_idx ON public.promotions(business_id, created_at DESC);
CREATE INDEX promotions_discovery_idx
  ON public.promotions(status, location, category, end_time, promotion_score DESC);

ALTER TABLE public.business_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.business_applications TO authenticated;
GRANT SELECT ON public.business_profiles TO anon, authenticated;
GRANT SELECT ON public.business_payments TO authenticated;
GRANT SELECT ON public.promotions TO authenticated;
GRANT SELECT ON public.promotions TO anon;

CREATE POLICY "applicants read own business applications" ON public.business_applications
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users submit own business applications" ON public.business_applications
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "staff read business applications" ON public.business_applications
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff manage business applications" ON public.business_applications
FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "business identities public read" ON public.business_profiles
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "business owners read own identity" ON public.business_profiles
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff manage business identities" ON public.business_profiles
FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "business owners read payments" ON public.business_payments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = business_id AND b.user_id = auth.uid()));
CREATE POLICY "staff read business payments" ON public.business_payments
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "business owners read promotions" ON public.promotions
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = business_id AND b.user_id = auth.uid()));
CREATE POLICY "public read running promotions" ON public.promotions
FOR SELECT TO anon, authenticated
USING (status = 'running' AND remaining_balance > 0 AND (end_time IS NULL OR end_time > now()));
CREATE POLICY "staff manage promotions" ON public.promotions
FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.business_profiles WHERE user_id = _user_id); $$;

GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_business_application(
  p_business_name TEXT,
  p_category TEXT,
  p_location TEXT,
  p_phone TEXT,
  p_offer TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.business_profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Business access already approved' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.business_applications (user_id, business_name, category, location, phone, offer, description)
  VALUES (auth.uid(), trim(p_business_name), trim(p_category), trim(p_location), trim(p_phone), trim(p_offer), NULLIF(trim(p_description), ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_business_application(
  p_application_id UUID,
  p_status TEXT,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_application public.business_applications;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only LikeAir staff can review business applications' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('approved', 'rejected', 'more_information', 'pending') THEN
    RAISE EXCEPTION 'Invalid business application status' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_application FROM public.business_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business application not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.business_applications
  SET status = p_status, admin_note = NULLIF(trim(p_admin_note), ''),
      reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_application_id;

  IF p_status = 'approved' THEN
    INSERT INTO public.business_profiles
      (user_id, application_id, business_name, category, location, phone, offer, description, verified_by)
    VALUES
      (v_application.user_id, v_application.id, v_application.business_name, v_application.category,
       v_application.location, v_application.phone, v_application.offer, v_application.description, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET
      application_id = EXCLUDED.application_id, business_name = EXCLUDED.business_name,
      category = EXCLUDED.category, location = EXCLUDED.location, phone = EXCLUDED.phone,
      offer = EXCLUDED.offer, description = EXCLUDED.description, verified_by = auth.uid(),
      verified_at = now(), updated_at = now();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_business_application(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_business_application(UUID, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_business_application(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_business_application(UUID, TEXT, TEXT) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.create_business_promotion(
  p_content_type TEXT,
  p_content_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_image_url TEXT,
  p_video_url TEXT,
  p_location TEXT,
  p_category TEXT,
  p_budget_amount NUMERIC,
  p_duration_hours NUMERIC,
  p_promotion_strength TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_id UUID;
  v_payment_id UUID;
  v_duration_hours NUMERIC;
  v_strength TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_business_id FROM public.business_profiles WHERE user_id = auth.uid();
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Approved LikeAir Business access required' USING ERRCODE = '42501'; END IF;
  IF p_budget_amount < 100 THEN RAISE EXCEPTION 'Promotion budget must be at least TZS 100' USING ERRCODE = '22023'; END IF;

  v_duration_hours := (p_budget_amount / 2000.0) * 72.0;
  v_strength := CASE
    WHEN p_budget_amount < 5000 THEN 'Standard'
    WHEN p_budget_amount < 20000 THEN 'Strong'
    ELSE 'Very Strong'
  END;

  INSERT INTO public.business_payments (business_id, amount, status)
  VALUES (v_business_id, p_budget_amount, 'pending') RETURNING id INTO v_payment_id;

  INSERT INTO public.promotions
    (business_id, content_type, content_id, title, message, image_url, video_url, location, category,
     budget_amount, remaining_balance, duration_hours, promotion_strength, status, payment_id)
  VALUES
    (v_business_id, p_content_type, p_content_id, trim(p_title), NULLIF(trim(p_message), ''), p_image_url,
     p_video_url, trim(p_location), trim(p_category), p_budget_amount, p_budget_amount,
     v_duration_hours, v_strength, 'waiting_for_payment', v_payment_id)
  RETURNING id INTO v_id;

  UPDATE public.business_payments SET promotion_id = v_id WHERE id = v_payment_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_promotion(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_business_promotion(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_eligible_promotions(
  p_location TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF public.promotions
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.*
  FROM public.promotions p
  WHERE p.status IN ('approved', 'running')
    AND p.remaining_balance > 0
    AND (p.end_time IS NULL OR p.end_time > now())
    AND (p_location IS NULL OR p.location = p_location OR p.location = 'Tanzania')
    AND (p_category IS NULL OR p.category = p_category OR p.category = 'all')
  ORDER BY p.promotion_score DESC, p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_eligible_promotions(TEXT, TEXT, INTEGER) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_business_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_business_applications_updated BEFORE UPDATE ON public.business_applications
FOR EACH ROW EXECUTE FUNCTION public.set_business_updated_at();
CREATE TRIGGER trg_business_profiles_updated BEFORE UPDATE ON public.business_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_business_updated_at();
CREATE TRIGGER trg_business_payments_updated BEFORE UPDATE ON public.business_payments
FOR EACH ROW EXECUTE FUNCTION public.set_business_updated_at();
CREATE TRIGGER trg_promotions_updated BEFORE UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.set_business_updated_at();

NOTIFY pgrst, 'reload schema';