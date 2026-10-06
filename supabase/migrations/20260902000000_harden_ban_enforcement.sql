-- Harden account bans with database-level enforcement.
-- This prevents banned users from performing their own profile/content writes.

CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.banned_at IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_ban_on_profile_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_user_banned(auth.uid()) THEN
    RAISE EXCEPTION 'Your account is banned and cannot update profile information.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ban_on_profile_write ON public.profiles;
CREATE TRIGGER trg_enforce_ban_on_profile_write
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_ban_on_profile_write();

CREATE OR REPLACE FUNCTION public.enforce_ban_on_content_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_user_banned(auth.uid()) THEN
    RAISE EXCEPTION 'Your account is banned and cannot create or update content.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ban_on_products ON public.products;
CREATE TRIGGER trg_enforce_ban_on_products
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.enforce_ban_on_content_write();

DROP TRIGGER IF EXISTS trg_enforce_ban_on_gigs ON public.gigs;
CREATE TRIGGER trg_enforce_ban_on_gigs
BEFORE INSERT OR UPDATE ON public.gigs
FOR EACH ROW EXECUTE FUNCTION public.enforce_ban_on_content_write();

DROP TRIGGER IF EXISTS trg_enforce_ban_on_ads ON public.ads;
CREATE TRIGGER trg_enforce_ban_on_ads
BEFORE INSERT OR UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.enforce_ban_on_content_write();

-- Optional: keep the account banned state from being cleared by the user themselves.
CREATE OR REPLACE FUNCTION public.protect_ban_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_user_banned(auth.uid()) THEN
    RAISE EXCEPTION 'Your account is banned. This information cannot be altered.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.banned_at IS DISTINCT FROM OLD.banned_at
       OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason
       OR NEW.banned_by IS DISTINCT FROM OLD.banned_by THEN
      IF NOT public.is_staff(auth.uid()) THEN
        RAISE EXCEPTION 'Only staff can change ban status.' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_ban_fields ON public.profiles;
CREATE TRIGGER trg_protect_ban_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_ban_fields();

NOTIFY pgrst, 'reload schema';
