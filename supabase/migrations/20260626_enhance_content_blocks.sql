
-- Add role visibility and scheduling to content_blocks
ALTER TABLE public.content_blocks 
  ADD COLUMN IF NOT EXISTS target_role public.app_role DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_from TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_until TIMESTAMPTZ DEFAULT NULL;

-- Update RLS policy to include redaktor role
DROP POLICY IF EXISTS "Staff manages content blocks" ON public.content_blocks;
CREATE POLICY "Staff manages content blocks"
  ON public.content_blocks FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'developer'::app_role) OR 
    has_role(auth.uid(), 'dohledci'::app_role) OR 
    has_role(auth.uid(), 'spravce'::app_role) OR 
    has_role(auth.uid(), 'rektor'::app_role) OR 
    has_role(auth.uid(), 'redaktor'::app_role)
  );

-- Also update the select policy to respect show_from/show_until and target_role
DROP POLICY IF EXISTS "Everyone views active content blocks" ON public.content_blocks;
CREATE POLICY "Everyone views active content blocks"
  ON public.content_blocks FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    (show_from IS NULL OR show_from <= NOW()) AND
    (show_until IS NULL OR show_until >= NOW()) AND
    (target_role IS NULL OR has_role(auth.uid(), target_role))
  );
