-- Private applicant interest records for gig hiring workflows.

CREATE TABLE public.gig_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'interested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gig_id, user_id),
  CONSTRAINT gig_interests_status_check
    CHECK (status IN ('interested', 'contacted', 'shortlisted', 'selected', 'completed', 'declined'))
);

CREATE INDEX gig_interests_gig_idx ON public.gig_interests(gig_id, created_at DESC);
CREATE INDEX gig_interests_user_idx ON public.gig_interests(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.gig_interests TO authenticated;
GRANT UPDATE ON public.gig_interests TO authenticated;
ALTER TABLE public.gig_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applicants can read own interest" ON public.gig_interests
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "gig owners can read interests" ON public.gig_interests
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    WHERE public.gigs.id = public.gig_interests.gig_id
      AND public.gigs.poster_id = auth.uid()
  )
);

CREATE POLICY "users can express interest" ON public.gig_interests
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.gigs
    WHERE public.gigs.id = public.gig_interests.gig_id
      AND public.gigs.poster_id <> auth.uid()
      AND public.gigs.status IN ('active', 'hiring')
  )
);

CREATE POLICY "applicants can update own message" ON public.gig_interests
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "gig owners can update status" ON public.gig_interests
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    WHERE public.gigs.id = public.gig_interests.gig_id
      AND public.gigs.poster_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    WHERE public.gigs.id = public.gig_interests.gig_id
      AND public.gigs.poster_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.set_gig_interest_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.gig_id <> OLD.gig_id OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'Interest ownership cannot change' USING ERRCODE = 'check_violation';
  END IF;
  IF auth.uid() = OLD.user_id THEN
    NEW.status := OLD.status;
  ELSE
    NEW.message := OLD.message;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gig_interests_updated
BEFORE UPDATE ON public.gig_interests
FOR EACH ROW EXECUTE FUNCTION public.set_gig_interest_updated_at();
