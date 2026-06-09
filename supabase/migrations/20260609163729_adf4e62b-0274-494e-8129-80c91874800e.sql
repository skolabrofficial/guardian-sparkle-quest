DROP POLICY IF EXISTS "create mediation" ON public.mediations_v2;

CREATE POLICY "create own mediation request" ON public.mediations_v2
  FOR INSERT TO authenticated
  WITH CHECK (
    opened_by = auth.uid()
    AND (
      (subject_user_id = auth.uid() AND status = 'requested')
      OR (
        status IN ('requested', 'open')
        AND (
          public.has_role(auth.uid(), 'rektor'::app_role)
          OR public.has_role(auth.uid(), 'spravce'::app_role)
        )
      )
    )
  );