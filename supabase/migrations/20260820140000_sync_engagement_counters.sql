-- Keep public engagement counters synchronized with the event tables.

CREATE OR REPLACE FUNCTION public.sync_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta INTEGER := CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END;
  affected_item_id UUID := CASE WHEN TG_OP = 'INSERT' THEN NEW.item_id ELSE OLD.item_id END;
  affected_item_type TEXT := CASE WHEN TG_OP = 'INSERT' THEN NEW.item_type ELSE OLD.item_type END;
BEGIN
  IF affected_item_type = 'product' THEN
      UPDATE public.products
      SET like_count = GREATEST(0, like_count + delta)
      WHERE id = affected_item_id;
  ELSIF affected_item_type = 'gig' THEN
      UPDATE public.gigs
      SET like_count = GREATEST(0, like_count + delta)
      WHERE id = affected_item_id;
  ELSIF affected_item_type = 'ad' THEN
      UPDATE public.ads
      SET like_count = GREATEST(0, like_count + delta)
      WHERE id = affected_item_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_like_count ON public.likes;
CREATE TRIGGER trg_sync_like_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.sync_like_count();

CREATE OR REPLACE FUNCTION public.sync_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event = 'view' THEN
    IF NEW.item_type = 'product' THEN
      UPDATE public.products SET view_count = view_count + 1 WHERE id = NEW.item_id;
    ELSIF NEW.item_type = 'gig' THEN
      UPDATE public.gigs SET view_count = view_count + 1 WHERE id = NEW.item_id;
    ELSIF NEW.item_type = 'ad' THEN
      UPDATE public.ads SET view_count = view_count + 1 WHERE id = NEW.item_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_view_count ON public.interactions;
CREATE TRIGGER trg_sync_view_count
AFTER INSERT ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.sync_view_count();

-- Rebuild counters for events that existed before these triggers were installed.
UPDATE public.products p
SET like_count = (SELECT COUNT(*) FROM public.likes l WHERE l.item_type = 'product' AND l.item_id = p.id),
    view_count = (SELECT COUNT(*) FROM public.interactions i WHERE i.item_type = 'product' AND i.item_id = p.id AND i.event = 'view');

UPDATE public.gigs g
SET like_count = (SELECT COUNT(*) FROM public.likes l WHERE l.item_type = 'gig' AND l.item_id = g.id),
    view_count = (SELECT COUNT(*) FROM public.interactions i WHERE i.item_type = 'gig' AND i.item_id = g.id AND i.event = 'view');

UPDATE public.ads a
SET like_count = (SELECT COUNT(*) FROM public.likes l WHERE l.item_type = 'ad' AND l.item_id = a.id),
    view_count = (SELECT COUNT(*) FROM public.interactions i WHERE i.item_type = 'ad' AND i.item_id = a.id AND i.event = 'view');

-- Keep the API schema cache aware of the trigger-backed columns.
NOTIFY pgrst, 'reload schema';
