
-- Fix audit log insert policy to require user_id = auth.uid()
DROP POLICY IF EXISTS "Authenticated inserts audit" ON public.audit_log;
CREATE POLICY "Authenticated inserts own audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
