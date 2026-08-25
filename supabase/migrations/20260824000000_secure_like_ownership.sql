-- Guest likes cannot be securely owned because the browser-supplied session_id
-- is not an authenticated database identity. Require authenticated ownership.

DROP POLICY IF EXISTS "guest likes insert" ON public.likes;
DROP POLICY IF EXISTS "guest likes delete" ON public.likes;
DROP POLICY IF EXISTS "guest likes read" ON public.likes;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.likes FROM anon;

DROP POLICY IF EXISTS "own likes all" ON public.likes;
CREATE POLICY "own likes all" ON public.likes
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
