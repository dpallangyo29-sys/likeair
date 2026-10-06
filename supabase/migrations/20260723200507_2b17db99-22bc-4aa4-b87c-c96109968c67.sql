
-- Fix security definer view warning
ALTER VIEW public.seller_profiles SET (security_invoker = true);

-- Revoke public execute on helper functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Storage policies: public read for listings/avatars/ads, users write only in their own folder (uid/*)
CREATE POLICY "public read listings" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'listings');
CREATE POLICY "public read avatars" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "public read ads" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'ads');

CREATE POLICY "auth upload own listings" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth update own listings" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth delete own listings" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "auth upload own avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth update own avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth delete own avatars" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "auth upload own ads" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth update own ads" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth delete own ads" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ads' AND (storage.foldername(name))[1] = auth.uid()::text);
