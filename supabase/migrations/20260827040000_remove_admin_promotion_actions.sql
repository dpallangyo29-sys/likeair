-- Promotions are activated automatically after successful payment.
-- Remove the legacy manual promotion action endpoint as well as its UI.

REVOKE EXECUTE ON FUNCTION public.admin_set_promotion_status(UUID, TEXT) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.admin_set_promotion_status(UUID, TEXT);

NOTIFY pgrst, 'reload schema';