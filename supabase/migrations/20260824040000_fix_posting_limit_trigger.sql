-- Fix the shared posting-limit trigger: NEW is a generic record, so direct
-- references to fields that do not exist on every table can raise 42703.

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

  SELECT CASE TG_TABLE_NAME
    WHEN 'products' THEN product_limit
    WHEN 'gigs' THEN gig_limit
    WHEN 'ads' THEN ads_limit
  END
  INTO allowed_limit
  FROM public.user_subscriptions
  WHERE user_id = owner_id;

  allowed_limit := COALESCE(allowed_limit,
    CASE TG_TABLE_NAME
      WHEN 'products' THEN 5
      WHEN 'gigs' THEN 2
      WHEN 'ads' THEN 2
    END);

  IF TG_TABLE_NAME = 'products' THEN
    SELECT COUNT(*) INTO active_count
    FROM public.products
    WHERE seller_id = owner_id AND status = 'active';
  ELSIF TG_TABLE_NAME = 'gigs' THEN
    SELECT COUNT(*) INTO active_count
    FROM public.gigs
    WHERE poster_id = owner_id AND status = 'active';
  ELSE
    SELECT COUNT(*) INTO active_count
    FROM public.ads
    WHERE poster_id = owner_id AND status = 'active';
  END IF;

  IF active_count >= allowed_limit THEN
    RAISE EXCEPTION 'Posting limit reached for %', TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
