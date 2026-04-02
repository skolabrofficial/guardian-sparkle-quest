
CREATE TABLE public.content_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  style_preset TEXT NOT NULL DEFAULT 'announcement',
  custom_css TEXT DEFAULT '',
  position TEXT NOT NULL DEFAULT 'top',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  link_url TEXT DEFAULT NULL,
  link_text TEXT DEFAULT NULL,
  image_url TEXT DEFAULT NULL,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone views active content blocks"
  ON public.content_blocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff manages content blocks"
  ON public.content_blocks FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'dohledci'::app_role));
