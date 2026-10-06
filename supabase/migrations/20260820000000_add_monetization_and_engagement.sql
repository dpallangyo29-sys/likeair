-- Add likes tracking (for products and gigs)
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For guest likes (when user_id is null)
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT likes_owner_check CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);
GRANT SELECT, INSERT, DELETE ON public.likes TO anon, authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own likes all" ON public.likes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "guest likes insert" ON public.likes FOR INSERT TO anon WITH CHECK (session_id IS NOT NULL);
CREATE POLICY "guest likes delete" ON public.likes FOR DELETE TO anon USING (session_id IS NOT NULL);
CREATE POLICY "guest likes read" ON public.likes FOR SELECT TO anon USING (true);
CREATE UNIQUE INDEX likes_owner_item_idx ON public.likes (COALESCE(user_id::text, session_id), item_type, item_id);
CREATE INDEX likes_item_idx ON public.likes(item_type, item_id);
CREATE INDEX likes_user_idx ON public.likes(user_id);

-- Add like_count to products and gigs
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0;

-- Add boost/promotion columns (for paid promotion feature)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS boost_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promoted_until TIMESTAMPTZ;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS boost_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS promoted_until TIMESTAMPTZ;

ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS video_url TEXT; -- For video ads (optional, alongside image_url)
CREATE TABLE public.ads_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.ads_views TO anon, authenticated;
GRANT SELECT ON public.ads_views TO authenticated, service_role;
GRANT ALL ON public.ads_views TO service_role;
ALTER TABLE public.ads_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_views insert anyone" ON public.ads_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX ads_views_ad_idx ON public.ads_views(ad_id);
CREATE INDEX ads_views_user_idx ON public.ads_views(user_id);
CREATE INDEX ads_views_created_idx ON public.ads_views(created_at DESC);

-- Track user interests (derived from interactions) for ads targeting
CREATE TABLE public.user_interests (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);
GRANT SELECT ON public.user_interests TO authenticated;
GRANT ALL ON public.user_interests TO service_role;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interests read" ON public.user_interests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX user_interests_user_idx ON public.user_interests(user_id);
CREATE INDEX user_interests_score_idx ON public.user_interests(score DESC);

-- User subscriptions (track upgrade status - NOT ENFORCED YET, for future payment integration)
CREATE TABLE public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free', -- free, premium, etc
  is_active BOOLEAN NOT NULL DEFAULT false,
  product_limit INT NOT NULL DEFAULT 5,
  gig_limit INT NOT NULL DEFAULT 2,
  ads_limit INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  renews_at TIMESTAMPTZ
);
GRANT SELECT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription read" ON public.user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own subscription update" ON public.user_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Auto-create subscription on profile creation (free plan with standard limits)
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_type, is_active, product_limit, gig_limit, ads_limit)
  VALUES (NEW.id, 'free', true, 5, 2, 2)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_subscription ON public.profiles;
CREATE TRIGGER trg_create_subscription AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- Track onboarding date (to determine first 50 users with unlimited posts)
CREATE TABLE public.onboarding_queue (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_early_user BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT ON public.onboarding_queue TO authenticated;
GRANT ALL ON public.onboarding_queue TO service_role;
ALTER TABLE public.onboarding_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own onboarding read" ON public.onboarding_queue FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX onboarding_queue_onboarded_idx ON public.onboarding_queue(onboarded_at ASC);

-- Auto-create onboarding entry on profile creation
CREATE OR REPLACE FUNCTION public.track_onboarding()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.onboarding_queue (user_id, is_early_user)
  VALUES (
    NEW.id,
    (SELECT COUNT(*) FROM public.onboarding_queue) < 50
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_onboarding ON public.profiles;
CREATE TRIGGER trg_track_onboarding AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.track_onboarding();

-- Track boosts (paid promotion)
CREATE TABLE public.product_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boost_level INT NOT NULL DEFAULT 1, -- 1=basic, 2=popular, 3=featured
  duration_days INT NOT NULL DEFAULT 7,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.product_boosts TO authenticated;
GRANT ALL ON public.product_boosts TO service_role;
ALTER TABLE public.product_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own boosts all" ON public.product_boosts FOR ALL TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE INDEX product_boosts_product_idx ON public.product_boosts(product_id);
CREATE INDEX product_boosts_expires_idx ON public.product_boosts(expires_at);

CREATE TABLE public.gig_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  poster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boost_level INT NOT NULL DEFAULT 1,
  duration_days INT NOT NULL DEFAULT 7,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.gig_boosts TO authenticated;
GRANT ALL ON public.gig_boosts TO service_role;
ALTER TABLE public.gig_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gig boosts all" ON public.gig_boosts FOR ALL TO authenticated USING (poster_id = auth.uid()) WITH CHECK (poster_id = auth.uid());
CREATE INDEX gig_boosts_gig_idx ON public.gig_boosts(gig_id);
CREATE INDEX gig_boosts_expires_idx ON public.gig_boosts(expires_at);

-- Update timestamps trigger for subscriptions
CREATE TRIGGER trg_user_subscriptions_updated BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Grant necessary permissions for Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_views TO anon;
GRANT SELECT ON public.user_interests TO anon;
GRANT SELECT ON public.user_subscriptions TO anon;
GRANT SELECT ON public.onboarding_queue TO anon;
GRANT SELECT ON public.product_boosts TO anon;
GRANT SELECT ON public.gig_boosts TO anon;
