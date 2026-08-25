-- Final production-hardening layer: validate polymorphic engagement targets and
-- constrain machine-generated event types/targets so client requests cannot
-- create dangling or nonsensical records.

ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_item_type_check;
ALTER TABLE public.likes ADD CONSTRAINT likes_item_type_check
  CHECK (item_type IN ('product', 'gig', 'ad'));

CREATE OR REPLACE FUNCTION public.validate_like_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.item_type = 'product' AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = NEW.item_id
  ) THEN
    RAISE EXCEPTION 'Like target product not found' USING ERRCODE = 'foreign_key_violation';
  ELSIF NEW.item_type = 'gig' AND NOT EXISTS (
    SELECT 1 FROM public.gigs WHERE id = NEW.item_id
  ) THEN
    RAISE EXCEPTION 'Like target gig not found' USING ERRCODE = 'foreign_key_violation';
  ELSIF NEW.item_type = 'ad' AND NOT EXISTS (
    SELECT 1 FROM public.ads WHERE id = NEW.item_id
  ) THEN
    RAISE EXCEPTION 'Like target ad not found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_like_target ON public.likes;
CREATE TRIGGER trg_validate_like_target
BEFORE INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.validate_like_target();

CREATE OR REPLACE FUNCTION public.validate_save_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.item_type = 'product' AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = NEW.item_id
  ) THEN
    RAISE EXCEPTION 'Save target product not found' USING ERRCODE = 'foreign_key_violation';
  ELSIF NEW.item_type = 'gig' AND NOT EXISTS (
    SELECT 1 FROM public.gigs WHERE id = NEW.item_id
  ) THEN
    RAISE EXCEPTION 'Save target gig not found' USING ERRCODE = 'foreign_key_violation';
  ELSIF NEW.item_type = 'ad' AND NOT EXISTS (
    SELECT 1 FROM public.ads WHERE id = NEW.item_id
  ) THEN
    RAISE EXCEPTION 'Save target ad not found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_save_target ON public.saves;
CREATE TRIGGER trg_validate_save_target
BEFORE INSERT ON public.saves
FOR EACH ROW EXECUTE FUNCTION public.validate_save_target();

ALTER TABLE public.interactions DROP CONSTRAINT IF EXISTS interactions_item_type_check;
ALTER TABLE public.interactions ADD CONSTRAINT interactions_item_type_check
  CHECK (item_type IN ('product', 'gig', 'ad', 'search'));

CREATE OR REPLACE FUNCTION public.validate_interaction_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.item_type = 'search' THEN
    RETURN NEW;
  ELSIF NEW.item_type = 'product' AND NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.item_id) THEN
    RAISE EXCEPTION 'Interaction product target not found' USING ERRCODE = 'foreign_key_violation';
  ELSIF NEW.item_type = 'gig' AND NOT EXISTS (SELECT 1 FROM public.gigs WHERE id = NEW.item_id) THEN
    RAISE EXCEPTION 'Interaction gig target not found' USING ERRCODE = 'foreign_key_violation';
  ELSIF NEW.item_type = 'ad' AND NOT EXISTS (SELECT 1 FROM public.ads WHERE id = NEW.item_id) THEN
    RAISE EXCEPTION 'Interaction ad target not found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_interaction_target ON public.interactions;
CREATE TRIGGER trg_validate_interaction_target
BEFORE INSERT ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.validate_interaction_target();

-- Prevent unauthenticated clients from selecting/modifying arbitrary rows in
-- saved content; the existing ownership RLS remains the authority.
COMMENT ON TABLE public.saves IS 'Authenticated user saves; polymorphic targets validated by trigger.';
COMMENT ON TABLE public.likes IS 'Like events; polymorphic targets validated by trigger.';
