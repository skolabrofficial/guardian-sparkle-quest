
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS taken_by uuid,
  ADD COLUMN IF NOT EXISTS taken_at timestamptz,
  ADD COLUMN IF NOT EXISTS theft_source text,
  ADD COLUMN IF NOT EXISTS rating smallint;

ALTER TABLE public.article_revisions ADD COLUMN IF NOT EXISTS save_group uuid;

CREATE TABLE IF NOT EXISTS public.article_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_points TO authenticated;
GRANT ALL ON public.article_points TO service_role;
ALTER TABLE public.article_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "points_select_auth" ON public.article_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "points_insert_editor" ON public.article_points FOR INSERT TO authenticated
  WITH CHECK (public.is_article_editor(auth.uid(), article_id) AND granted_by = auth.uid());
CREATE POLICY "points_delete_editor" ON public.article_points FOR DELETE TO authenticated
  USING (public.is_article_editor(auth.uid(), article_id));

CREATE OR REPLACE FUNCTION public.publish_due_articles()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; r record;
BEGIN
  FOR r IN SELECT id FROM public.articles WHERE status = 'scheduled' AND scheduled_for IS NOT NULL AND scheduled_for <= now() LOOP
    UPDATE public.articles SET status='published', published_at=COALESCE(published_at, now()), updated_at=now() WHERE id = r.id;
    INSERT INTO public.article_status_log(article_id, actor_id, from_status, to_status, reason)
      VALUES(r.id, NULL, 'scheduled', 'published', 'Automatické vydání naplánovaného článku');
    n := n + 1;
  END LOOP;
  UPDATE public.articles SET is_featured=false, featured_until=NULL WHERE is_featured=true AND featured_until IS NOT NULL AND featured_until <= now();
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.publish_due_articles() TO authenticated, anon;

ALTER TABLE public.article_status_log DROP CONSTRAINT IF EXISTS article_status_log_actor_id_fkey;
ALTER TABLE public.article_status_log ALTER COLUMN actor_id DROP NOT NULL;
DROP POLICY IF EXISTS status_log_insert ON public.article_status_log;
CREATE POLICY "status_log_insert" ON public.article_status_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND (a.author_id = auth.uid() OR public.is_article_editor(auth.uid(), article_id))));

CREATE OR REPLACE FUNCTION public.take_article(_article_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_article_editor(auth.uid(), _article_id) THEN RAISE EXCEPTION 'Pouze redakce'; END IF;
  UPDATE public.articles SET taken_by = auth.uid(), taken_at = now() WHERE id = _article_id;
END $$;

CREATE OR REPLACE FUNCTION public.release_article(_article_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_article_editor(auth.uid(), _article_id) THEN RAISE EXCEPTION 'Pouze redakce'; END IF;
  UPDATE public.articles SET taken_by = NULL, taken_at = NULL WHERE id = _article_id;
END $$;
