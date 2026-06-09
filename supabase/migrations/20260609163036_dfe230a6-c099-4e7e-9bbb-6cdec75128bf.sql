ALTER TABLE public.mediations_v2
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0;

UPDATE public.mediations_v2
SET status = 'requested'
WHERE status = 'open'
  AND NOT EXISTS (
    SELECT 1 FROM public.mediation_messages_v2 mm
    WHERE mm.mediation_id = mediations_v2.id
  );

UPDATE public.mediations_v2 m
SET
  message_count = COALESCE(s.cnt, 0),
  last_message_at = s.last_at
FROM (
  SELECT mediation_id, count(*)::integer AS cnt, max(created_at) AS last_at
  FROM public.mediation_messages_v2
  GROUP BY mediation_id
) s
WHERE s.mediation_id = m.id;

CREATE OR REPLACE FUNCTION public.bump_mediation_v2_message_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mediations_v2
  SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    status = CASE WHEN status = 'requested' THEN 'open' ELSE status END,
    updated_at = now()
  WHERE id = NEW.mediation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bump_mediation_v2_message_stats ON public.mediation_messages_v2;
CREATE TRIGGER bump_mediation_v2_message_stats
  AFTER INSERT ON public.mediation_messages_v2
  FOR EACH ROW EXECUTE FUNCTION public.bump_mediation_v2_message_stats();

DROP POLICY IF EXISTS "add mediation message" ON public.mediation_messages_v2;
CREATE POLICY "add mediation message" ON public.mediation_messages_v2
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mediations_v2 m
      WHERE m.id = mediation_id
      AND m.status = 'open'
      AND (
        m.subject_user_id = auth.uid()
        OR m.opened_by = auth.uid()
        OR public.has_role(auth.uid(), 'rektor'::app_role)
        OR public.has_role(auth.uid(), 'spravce'::app_role)
      )
    )
  );