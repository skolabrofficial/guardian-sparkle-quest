-- 1) Add username slug to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Helper to slugify Czech text
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  s := lower(coalesce(input, ''));
  -- transliterate common czech diacritics
  s := translate(s,
    'áäčďéěëíňóöřšťúůüýžÁÄČĎÉĚËÍŇÓÖŘŠŤÚŮÜÝŽ',
    'aacdeeeinoorstuuuyzaacdeeeinoorstuuuyz');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  IF s = '' THEN s := 'user'; END IF;
  RETURN s;
END;
$$;

-- Generate unique slugs for existing rows
DO $$
DECLARE
  r RECORD;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, display_name FROM public.profiles WHERE username IS NULL LOOP
    base := public.slugify(r.display_name);
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n::text;
    END LOOP;
    UPDATE public.profiles SET username = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles(username);

-- Update handle_new_user to set username automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
  display text;
BEGIN
  display := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email);
  base := public.slugify(display);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;

  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (NEW.id, display, candidate);

  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'developer');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  END IF;
  RETURN NEW;
END;
$$;

-- 2) user_notes
CREATE TABLE IF NOT EXISTS public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  author_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  public_description text,
  private_description text,
  punishment text,
  block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_notes_target_idx ON public.user_notes(target_user_id);
CREATE INDEX IF NOT EXISTS user_notes_occurred_idx ON public.user_notes(occurred_at DESC);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developer manages all notes"
  ON public.user_notes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'developer'))
  WITH CHECK (public.has_role(auth.uid(), 'developer'));

CREATE POLICY "Dohledci view notes with public description"
  ON public.user_notes
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'dohledci')
    AND public_description IS NOT NULL
    AND length(trim(public_description)) > 0
  );

CREATE POLICY "Dohledci create notes"
  ON public.user_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'dohledci')
    AND author_id = auth.uid()
  );

CREATE TRIGGER user_notes_updated
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) user_ip_log
CREATE TABLE IF NOT EXISTS public.user_ip_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_ip_log_user_idx ON public.user_ip_log(user_id, created_at DESC);

ALTER TABLE public.user_ip_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developer views ip log"
  ON public.user_ip_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'developer'));
