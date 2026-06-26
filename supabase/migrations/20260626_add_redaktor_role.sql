
-- Add 'redaktor' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'redaktor';

-- Update get_user_role function to include redaktor
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

-- Update has_role (not strictly necessary, but for completeness)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
