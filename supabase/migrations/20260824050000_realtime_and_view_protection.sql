-- Realtime counter updates for the public feed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'gigs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gigs;
  END IF;
END;
$$;

-- Repeated views are ignored within a short window, and abusive event bursts
-- are ignored per user/session. Likes are unaffected by these view safeguards.
CREATE OR REPLACE FUNCTION public.normalize_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_events INTEGER;
  duplicate_view BOOLEAN;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  IF NEW.event NOT IN ('view', 'tap', 'click', 'whatsapp', 'save', 'search', 'category') THEN
    RAISE EXCEPTION 'Unsupported interaction event: %', NEW.event USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.event = 'view' AND NEW.item_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.interactions i
      WHERE i.item_type = NEW.item_type
        AND i.item_id = NEW.item_id
        AND i.event = 'view'
        AND i.created_at > now() - interval '10 minutes'
        AND (
          (NEW.user_id IS NOT NULL AND i.user_id = NEW.user_id)
          OR (NEW.user_id IS NULL AND NEW.session_id IS NOT NULL AND i.session_id = NEW.session_id)
        )
    ) INTO duplicate_view;
    IF duplicate_view THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT COUNT(*)
    INTO recent_events
  FROM public.interactions i
  WHERE i.created_at > now() - interval '5 minutes'
    AND (
      (NEW.user_id IS NOT NULL AND i.user_id = NEW.user_id)
      OR (NEW.user_id IS NULL AND NEW.session_id IS NOT NULL AND i.session_id = NEW.session_id)
    );

  IF recent_events >= 120 THEN
    RETURN NULL;
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

ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.gigs REPLICA IDENTITY FULL;
NOTIFY pgrst, 'reload schema';
