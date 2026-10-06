-- Business profile contact details are private to the business owner and staff.
-- Public discovery uses the limited seller_profiles view instead.

REVOKE SELECT ON public.business_profiles FROM anon;
DROP POLICY IF EXISTS "business identities public read" ON public.business_profiles;

NOTIFY pgrst, 'reload schema';