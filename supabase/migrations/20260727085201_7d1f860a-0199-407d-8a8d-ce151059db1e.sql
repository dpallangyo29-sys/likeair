-- profile: student ID + region
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_id text,
  ADD COLUMN IF NOT EXISTS region text;

-- products/gigs: region tag
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS region text;

-- Admin-wide read/manage policies (gated by has_role)
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins read all wallets" ON public.wallets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins read all ledger" ON public.wallet_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins read all interactions" ON public.interactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage all products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage all gigs" ON public.gigs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage all ads" ON public.ads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins read all user_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));