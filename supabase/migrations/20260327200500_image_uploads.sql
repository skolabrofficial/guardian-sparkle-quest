CREATE TABLE public.uploaded_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text,
  author_name text DEFAULT '',
  source_url text DEFAULT '',
  license_type text NOT NULL DEFAULT 'personal',
  status text NOT NULL DEFAULT 'pending',
  embed_code text,
  rejection_reason text,
  rejection_details text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  google_match_found boolean DEFAULT false,
  google_match_url text,
  is_avatar boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.uploaded_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own images" ON public.uploaded_images FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'dohledci') OR has_role(auth.uid(), 'developer') OR has_role(auth.uid(), 'lektor'));
CREATE POLICY "Users upload images" ON public.uploaded_images FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff reviews images" ON public.uploaded_images FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'dohledci') OR has_role(auth.uid(), 'developer') OR has_role(auth.uid(), 'lektor'));
CREATE POLICY "Staff deletes images" ON public.uploaded_images FOR DELETE TO authenticated USING (has_role(auth.uid(), 'dohledci') OR has_role(auth.uid(), 'developer'));
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Anyone can view uploads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'uploads');
CREATE POLICY "Users upload files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Staff deletes uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'uploads' AND (has_role(auth.uid(), 'dohledci') OR has_role(auth.uid(), 'developer')));
ALTER PUBLICATION supabase_realtime ADD TABLE public.uploaded_images;
