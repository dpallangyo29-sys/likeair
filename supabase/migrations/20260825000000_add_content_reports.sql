-- User reports for scam, abuse, spam, and content-quality issues.

CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  moderator_note TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT content_reports_target_type_check
    CHECK (target_type IN ('product', 'gig', 'ad', 'profile')),
  CONSTRAINT content_reports_reason_check
    CHECK (reason IN ('scam', 'fake', 'spam', 'duplicate', 'wrong_category', 'inappropriate', 'other')),
  CONSTRAINT content_reports_status_check
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX content_reports_status_idx ON public.content_reports(status, created_at DESC);
CREATE INDEX content_reports_target_idx ON public.content_reports(target_type, target_id);

GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT UPDATE ON public.content_reports TO authenticated;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reporters can read own reports" ON public.content_reports
FOR SELECT TO authenticated USING (reporter_id = auth.uid());

CREATE POLICY "staff can read all reports" ON public.content_reports
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "authenticated users can report content" ON public.content_reports
FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "staff can update reports" ON public.content_reports
FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_content_report_target()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.target_type = 'product' AND NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.target_id) THEN
    RAISE EXCEPTION 'Report target product not found' USING ERRCODE = 'foreign_key_violation';
  ELSIF NEW.target_type = 'gig' AND NOT EXISTS (SELECT 1 FROM public.gigs WHERE id = NEW.target_id) THEN
    RAISE EXCEPTION 'Report target gig not found' USING ERRCODE = 'foreign_key_violation';
  ELSIF NEW.target_type = 'ad' AND NOT EXISTS (SELECT 1 FROM public.ads WHERE id = NEW.target_id) THEN
    RAISE EXCEPTION 'Report target ad not found' USING ERRCODE = 'foreign_key_violation';
  ELSIF NEW.target_type = 'profile' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.target_id) THEN
    RAISE EXCEPTION 'Report target profile not found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_content_report_target
BEFORE INSERT ON public.content_reports
FOR EACH ROW EXECUTE FUNCTION public.validate_content_report_target();

CREATE OR REPLACE FUNCTION public.set_content_report_resolution()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('resolved', 'dismissed') AND OLD.status NOT IN ('resolved', 'dismissed') THEN
    NEW.resolved_by := auth.uid();
    NEW.resolved_at := now();
  ELSIF NEW.status IN ('open', 'reviewing') THEN
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_content_report_resolution
BEFORE UPDATE ON public.content_reports
FOR EACH ROW EXECUTE FUNCTION public.set_content_report_resolution();
