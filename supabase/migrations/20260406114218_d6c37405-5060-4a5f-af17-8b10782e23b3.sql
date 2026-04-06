
-- Allow all authenticated users to read profanity filter settings
CREATE POLICY "All authenticated read profanity settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (key IN ('profanity_words', 'profanity_autoblock'));

-- Create staff_page_settings table for per-user staff page config
CREATE TABLE public.staff_page_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alik_username text DEFAULT '',
  show_mail_link boolean DEFAULT true,
  show_profile_link boolean DEFAULT true,
  show_answers_link boolean DEFAULT true,
  custom_note text DEFAULT '',
  is_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_page_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view staff page settings
CREATE POLICY "Everyone views staff settings"
ON public.staff_page_settings FOR SELECT TO authenticated
USING (true);

-- Developers manage all staff settings
CREATE POLICY "Developer manages staff settings"
ON public.staff_page_settings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'developer'::app_role));
