
DROP POLICY IF EXISTS "interactions insert anyone" ON public.interactions;
CREATE POLICY "interactions insert guest" ON public.interactions FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
CREATE POLICY "interactions insert self" ON public.interactions FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
