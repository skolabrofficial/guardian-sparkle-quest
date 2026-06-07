
-- 1) mediations
CREATE TABLE public.mediations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  request_reason text,
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  closed_at timestamptz,
  closed_by uuid,
  invited_lektors uuid[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mediations TO authenticated;
GRANT ALL ON public.mediations TO service_role;
ALTER TABLE public.mediations ENABLE ROW LEVEL SECURITY;

-- security definer helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.can_access_mediation(_med_id uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mediations m
    WHERE m.id = _med_id
      AND (
        public.has_role(_uid, 'rektor'::app_role)
        OR public.has_role(_uid, 'spravce'::app_role)
        OR (_uid = m.subject_user_id AND m.status IN ('approved','open','closed'))
        OR (public.has_role(_uid, 'lektor'::app_role) AND _uid = ANY(m.invited_lektors))
      )
  );
$$;

CREATE POLICY "users request own mediation" ON public.mediations
  FOR INSERT TO authenticated WITH CHECK (opened_by = auth.uid() AND subject_user_id = auth.uid() AND status = 'requested');

CREATE POLICY "staff opens mediation" ON public.mediations
  FOR INSERT TO authenticated WITH CHECK (
    opened_by = auth.uid() AND (
      public.has_role(auth.uid(), 'rektor'::app_role) OR public.has_role(auth.uid(), 'spravce'::app_role)
    )
  );

CREATE POLICY "view mediation" ON public.mediations
  FOR SELECT TO authenticated USING (public.can_access_mediation(id, auth.uid()));

CREATE POLICY "staff manages mediation" ON public.mediations
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'rektor'::app_role) OR public.has_role(auth.uid(), 'spravce'::app_role)
  );

-- 2) mediation_messages
CREATE TABLE public.mediation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mediation_id uuid NOT NULL REFERENCES public.mediations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mediation_messages TO authenticated;
GRANT ALL ON public.mediation_messages TO service_role;
ALTER TABLE public.mediation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view messages if access" ON public.mediation_messages
  FOR SELECT TO authenticated USING (public.can_access_mediation(mediation_id, auth.uid()));

CREATE POLICY "send messages if access" ON public.mediation_messages
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND public.can_access_mediation(mediation_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.mediations m WHERE m.id = mediation_id AND m.status IN ('approved','open'))
  );

CREATE TRIGGER mediations_updated BEFORE UPDATE ON public.mediations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
