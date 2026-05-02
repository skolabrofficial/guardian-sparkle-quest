
CREATE TABLE public.changelog_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'normal',
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers manage changelog"
  ON public.changelog_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Staff and lektor read changelog"
  ON public.changelog_entries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'developer'::app_role)
    OR public.has_role(auth.uid(), 'dohledci'::app_role)
    OR public.has_role(auth.uid(), 'lektor'::app_role)
  );

CREATE TRIGGER trg_changelog_entries_updated_at
  BEFORE UPDATE ON public.changelog_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_changelog_entries_created_at ON public.changelog_entries(created_at DESC);
