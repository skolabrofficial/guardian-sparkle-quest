
-- First, add new values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'spravce';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rektor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'redaktor';

-- Add new columns to content_blocks
ALTER TABLE public.content_blocks 
  ADD COLUMN IF NOT EXISTS target_role public.app_role DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_from TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_until TIMESTAMPTZ DEFAULT NULL;

-- Update has_role function (not strictly necessary, but for completeness)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update get_user_role function with new priorities
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'developer' THEN 1
    WHEN 'rektor' THEN 2
    WHEN 'dohledci' THEN 3
    WHEN 'spravce' THEN 4
    WHEN 'lektor' THEN 5
    WHEN 'redaktor' THEN 6
    WHEN 'student' THEN 7
  END
  LIMIT 1
$$;

-- Drop existing policies before recreating them
DROP POLICY IF EXISTS "Everyone views active content blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Staff manages content blocks" ON public.content_blocks;

-- Recreate policies with new roles and visibility rules
CREATE POLICY "Everyone views active content blocks"
  ON public.content_blocks FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    (show_from IS NULL OR show_from <= NOW()) AND
    (show_until IS NULL OR show_until >= NOW()) AND
    (target_role IS NULL OR public.has_role(auth.uid(), target_role))
  );

CREATE POLICY "Staff manages content blocks"
  ON public.content_blocks FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'developer'::app_role) OR
    public.has_role(auth.uid(), 'rektor'::app_role) OR
    public.has_role(auth.uid(), 'dohledci'::app_role) OR
    public.has_role(auth.uid(), 'spravce'::app_role) OR
    public.has_role(auth.uid(), 'redaktor'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'developer'::app_role) OR
    public.has_role(auth.uid(), 'rektor'::app_role) OR
    public.has_role(auth.uid(), 'dohledci'::app_role) OR
    public.has_role(auth.uid(), 'spravce'::app_role) OR
    public.has_role(auth.uid(), 'redaktor'::app_role)
  );
