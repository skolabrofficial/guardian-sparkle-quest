-- Fix: Allow users to request mediation about themselves OR allow staff to open mediation about anyone

-- Drop the overly restrictive policy
DROP POLICY "users request own mediation" ON public.mediations;

-- New policy: Students can request mediation about themselves
CREATE POLICY "users request own mediation" ON public.mediations
  FOR INSERT TO authenticated 
  WITH CHECK (
    opened_by = auth.uid() 
    AND subject_user_id = auth.uid() 
    AND status = 'requested'
  );

-- Existing policy for staff (already in migration, but ensuring it's there)
-- This allows staff to create mediation about any user
CREATE POLICY "staff opens mediation student" ON public.mediations
  FOR INSERT TO authenticated 
  WITH CHECK (
    opened_by = auth.uid() 
    AND (
      public.has_role(auth.uid(), 'rektor'::app_role) 
      OR public.has_role(auth.uid(), 'spravce'::app_role)
    )
    AND status IN ('requested', 'approved')
  );
