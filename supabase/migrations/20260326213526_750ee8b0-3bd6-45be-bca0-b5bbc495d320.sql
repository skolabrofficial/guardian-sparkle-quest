-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to avatars
CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Add block_messages table for generated block reports sent to Alík admins
CREATE TABLE public.block_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL,
  generated_by UUID,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_to_alik BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ
);

ALTER TABLE public.block_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff views block messages" ON public.block_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'dohledci'::app_role));

CREATE POLICY "Staff creates block messages" ON public.block_messages FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'dohledci'::app_role));

CREATE POLICY "Staff updates block messages" ON public.block_messages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'dohledci'::app_role));