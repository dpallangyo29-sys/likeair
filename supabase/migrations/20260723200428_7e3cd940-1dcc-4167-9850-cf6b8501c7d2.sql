
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Campuses
CREATE TABLE public.campuses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campuses TO anon, authenticated;
GRANT ALL ON public.campuses TO service_role;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campuses public read" ON public.campuses FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.campuses (id, name, short, lat, lng) VALUES
  ('uoa', 'University of Arusha', 'UoA', -3.3869, 36.6830),
  ('udsm', 'UDSM Main Campus', 'UDSM', -6.7796, 39.2078),
  ('must', 'Mbeya University of Science & Tech', 'MUST', -8.9094, 33.4608),
  ('sua', 'Sokoine University of Agriculture', 'SUA', -6.8484, 37.6559);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  nida_number TEXT,
  campus_id TEXT REFERENCES public.campuses(id),
  avatar_url TEXT,
  bio TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Public seller view (safe subset for showing on listings without exposing NIDA/phone)
CREATE VIEW public.seller_profiles AS
SELECT id, full_name, avatar_url, campus_id, verified, created_at FROM public.profiles;
GRANT SELECT ON public.seller_profiles TO anon, authenticated;

-- Auto-create profile + default role on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  campus_id TEXT REFERENCES public.campuses(id),
  image_url TEXT,
  whatsapp TEXT,
  hot BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read active" ON public.products FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "own products all" ON public.products FOR ALL TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE INDEX products_category_idx ON public.products(category);
CREATE INDEX products_campus_idx ON public.products(campus_id);
CREATE INDEX products_created_idx ON public.products(created_at DESC);

-- Gigs
CREATE TABLE public.gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  budget TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  campus_id TEXT REFERENCES public.campuses(id),
  whatsapp TEXT,
  urgent BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gigs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gigs TO authenticated;
GRANT ALL ON public.gigs TO service_role;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gigs public read active" ON public.gigs FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "own gigs all" ON public.gigs FOR ALL TO authenticated USING (poster_id = auth.uid()) WITH CHECK (poster_id = auth.uid());
CREATE INDEX gigs_campus_idx ON public.gigs(campus_id);
CREATE INDEX gigs_created_idx ON public.gigs(created_at DESC);

-- Ads (monetization scaffolding)
CREATE TABLE public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  cta_url TEXT,
  campus_id TEXT REFERENCES public.campuses(id),
  budget_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressions_left INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads public read active" ON public.ads FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "own ads all" ON public.ads FOR ALL TO authenticated USING (poster_id = auth.uid()) WITH CHECK (poster_id = auth.uid());

-- Interactions (for interest algorithm)
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  event TEXT NOT NULL,
  category TEXT,
  weight REAL NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.interactions TO anon, authenticated;
GRANT SELECT ON public.interactions TO authenticated;
GRANT ALL ON public.interactions TO service_role;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interactions insert anyone" ON public.interactions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "own interactions read" ON public.interactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX interactions_user_idx ON public.interactions(user_id, created_at DESC);
CREATE INDEX interactions_session_idx ON public.interactions(session_id, created_at DESC);
CREATE INDEX interactions_category_idx ON public.interactions(category);

-- Saves
CREATE TABLE public.saves (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_type, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.saves TO authenticated;
GRANT ALL ON public.saves TO service_role;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saves all" ON public.saves FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Wallets (HIDDEN monetization)
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TZS',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet read" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  ref TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger read" ON public.wallet_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_gigs_updated BEFORE UPDATE ON public.gigs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
