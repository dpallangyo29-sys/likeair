-- Staff campus directory management.

CREATE POLICY "staff can manage campuses" ON public.campuses
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff can manage campus suggestions" ON public.campus_suggestions
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));
