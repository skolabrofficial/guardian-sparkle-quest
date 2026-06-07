-- REDESIGN: Drop old mediations tables and create new simplified structure

-- Drop old tables (cascade deletes dependent data)
DROP TABLE IF EXISTS public.mediation_messages CASCADE;
DROP TABLE IF EXISTS public.mediations CASCADE;

-- New simple design: mediations_v2
CREATE TABLE public.mediations_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open', -- 'open', 'closed', 'archived'
  request_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mediations_v2_subject ON public.mediations_v2(subject_user_id);
CREATE INDEX idx_mediations_v2_opened_by ON public.mediations_v2(opened_by);
CREATE INDEX idx_mediations_v2_created ON public.mediations_v2(created_at DESC);

-- Messages table
CREATE TABLE public.mediation_messages_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mediation_id uuid NOT NULL REFERENCES public.mediations_v2(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mediation_messages_v2_mediation ON public.mediation_messages_v2(mediation_id);
CREATE INDEX idx_mediation_messages_v2_author ON public.mediation_messages_v2(author_id);

-- Enable RLS
ALTER TABLE public.mediations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mediation_messages_v2 ENABLE ROW LEVEL SECURITY;

-- Simple RLS: Anyone can see their own mediations (as subject or opener)
CREATE POLICY "see own mediations" ON public.mediations_v2
  FOR SELECT TO authenticated
  USING (subject_user_id = auth.uid() OR opened_by = auth.uid() OR public.has_role(auth.uid(), 'rektor'::app_role) OR public.has_role(auth.uid(), 'spravce'::app_role));

-- Anyone authenticated can create a mediation
CREATE POLICY "create mediation" ON public.mediations_v2
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Staff can update (close/archive)
CREATE POLICY "staff update mediation" ON public.mediations_v2
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'rektor'::app_role) OR public.has_role(auth.uid(), 'spravce'::app_role));

-- See messages in accessible mediations
CREATE POLICY "see mediation messages" ON public.mediation_messages_v2
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mediations_v2 m
      WHERE m.id = mediation_id
      AND (m.subject_user_id = auth.uid() OR m.opened_by = auth.uid() OR public.has_role(auth.uid(), 'rektor'::app_role) OR public.has_role(auth.uid(), 'spravce'::app_role))
    )
  );

-- Anyone can add messages to accessible mediations
CREATE POLICY "add mediation message" ON public.mediation_messages_v2
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mediations_v2 m
      WHERE m.id = mediation_id
      AND (m.subject_user_id = auth.uid() OR m.opened_by = auth.uid() OR public.has_role(auth.uid(), 'rektor'::app_role) OR public.has_role(auth.uid(), 'spravce'::app_role))
    )
  );

-- Triggers
CREATE TRIGGER update_mediations_v2_updated_at
  BEFORE UPDATE ON public.mediations_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.mediations_v2 TO authenticated;
GRANT SELECT, INSERT ON public.mediation_messages_v2 TO authenticated;
GRANT ALL ON public.mediations_v2, public.mediation_messages_v2 TO service_role;
