-- Manual account verification and moderation controls.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "staff can update profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_set_user_verification(
  target_user_id UUID,
  should_verify BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can verify accounts' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET verified = should_verify
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_ban(
  target_user_id UUID,
  should_ban BOOLEAN,
  reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can ban accounts' USING ERRCODE = '42501';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Staff cannot ban their own account' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.profiles
  SET banned_at = CASE WHEN should_ban THEN now() ELSE NULL END,
      ban_reason = CASE WHEN should_ban THEN NULLIF(trim(reason), '') ELSE NULL END,
      banned_by = CASE WHEN should_ban THEN auth.uid() ELSE NULL END
  WHERE id = target_user_id;

  IF should_ban THEN
    UPDATE public.products
    SET status = 'suspended'
    WHERE seller_id = target_user_id AND status = 'active';

    UPDATE public.gigs
    SET status = 'suspended'
    WHERE poster_id = target_user_id AND status IN ('active', 'hiring');

    UPDATE public.ads
    SET status = 'suspended'
    WHERE poster_id = target_user_id AND status = 'active';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_verification(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_ban(UUID, BOOLEAN, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
