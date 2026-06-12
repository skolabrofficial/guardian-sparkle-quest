CREATE TABLE public.staff_page_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  symbol text DEFAULT '✦',
  color text DEFAULT '#6366f1',
  member_ids uuid[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 100,
  is_visible boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_page_boxes TO authenticated;
GRANT SELECT ON public.staff_page_boxes TO anon;
GRANT ALL ON public.staff_page_boxes TO service_role;
ALTER TABLE public.staff_page_boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads visible boxes" ON public.staff_page_boxes FOR SELECT TO anon, authenticated USING (is_visible OR public.has_role(auth.uid(),'rektor'::app_role));
CREATE POLICY "rektor manages boxes" ON public.staff_page_boxes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'rektor'::app_role)) WITH CHECK (public.has_role(auth.uid(),'rektor'::app_role));
CREATE TRIGGER trg_staff_page_boxes_updated BEFORE UPDATE ON public.staff_page_boxes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();