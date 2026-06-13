
-- ENUM: stav článku
DO $$ BEGIN
  CREATE TYPE public.article_status AS ENUM (
    'draft_author','awaiting_review','returned_to_author','in_editing',
    'polishing','ready_to_publish','scheduled','published',
    'rejected','flagged_stolen','deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TÉMATA
CREATE TABLE public.article_topics(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  symbol text DEFAULT '📰',
  color text DEFAULT '#4a5c8a',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_topics TO authenticated;
GRANT ALL ON public.article_topics TO service_role;
ALTER TABLE public.article_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_read_all" ON public.article_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "topics_rektor_manage" ON public.article_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'rektor'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'rektor'::public.app_role));
CREATE TRIGGER trg_topics_updated BEFORE UPDATE ON public.article_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REDAKTOŘI (lektoři s redaktorováním schváleným rektorem)
CREATE TABLE public.article_editors(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.article_topics(id) ON DELETE CASCADE, -- NULL = všechna témata
  granted_by uuid REFERENCES auth.users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, topic_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_editors TO authenticated;
GRANT ALL ON public.article_editors TO service_role;
ALTER TABLE public.article_editors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editors_read_auth" ON public.article_editors FOR SELECT TO authenticated USING (true);
CREATE POLICY "editors_rektor_manage" ON public.article_editors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'rektor'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'rektor'::public.app_role));

-- ČLÁNKY
CREATE TABLE public.articles(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  title text NOT NULL DEFAULT 'Bez názvu',
  perex text,
  content text DEFAULT '',
  cover_image text,
  topic_id uuid REFERENCES public.article_topics(id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_override text, -- ručně vepsaný text místo autora
  status public.article_status NOT NULL DEFAULT 'draft_author',
  status_note text,
  rejection_reason text,
  deleted_reason text,
  flagged_source text, -- u "stolen"
  scheduled_for timestamptz,
  published_at timestamptz,
  originality_score numeric,
  originality_notes text,
  originality_checked_at timestamptz,
  word_count int DEFAULT 0,
  view_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: má uživatel redakční přístup k článku?
CREATE OR REPLACE FUNCTION public.is_article_editor(_uid uuid, _article_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.articles a
    LEFT JOIN public.article_editors e ON e.user_id = _uid AND (e.topic_id IS NULL OR e.topic_id = a.topic_id)
    WHERE a.id = _article_id AND (
      public.has_role(_uid,'rektor'::app_role)
      OR e.id IS NOT NULL
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_article(_uid uuid, _article_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.articles a
    WHERE a.id = _article_id AND (
      a.status = 'published'
      OR a.author_id = _uid
      OR public.is_article_editor(_uid, _article_id)
    )
  )
$$;

CREATE POLICY "articles_select" ON public.articles FOR SELECT TO authenticated USING (
  status = 'published'
  OR author_id = auth.uid()
  OR public.has_role(auth.uid(),'rektor'::app_role)
  OR EXISTS(SELECT 1 FROM public.article_editors e WHERE e.user_id = auth.uid() AND (e.topic_id IS NULL OR e.topic_id = articles.topic_id))
);
CREATE POLICY "articles_insert_self" ON public.articles FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(),'rektor'::app_role));
CREATE POLICY "articles_update_author_or_editor" ON public.articles FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.has_role(auth.uid(),'rektor'::app_role)
    OR EXISTS(SELECT 1 FROM public.article_editors e WHERE e.user_id = auth.uid() AND (e.topic_id IS NULL OR e.topic_id = articles.topic_id))
  );
CREATE POLICY "articles_delete_rektor" ON public.articles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'rektor'::app_role));

-- REVIZE (diff)
CREATE TABLE public.article_revisions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  editor_id uuid REFERENCES auth.users(id),
  field text NOT NULL,
  old_value text,
  new_value text,
  diff_before text, -- pár slov před změnou
  diff_old text,    -- původní změněná část
  diff_new text,    -- nová změněná část
  diff_after text,  -- pár slov za změnou
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.article_revisions TO authenticated;
GRANT ALL ON public.article_revisions TO service_role;
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revisions_select" ON public.article_revisions FOR SELECT TO authenticated USING (
  public.can_view_article(auth.uid(), article_id)
);
CREATE POLICY "revisions_insert_editors" ON public.article_revisions FOR INSERT TO authenticated WITH CHECK (
  editor_id = auth.uid() AND (
    EXISTS(SELECT 1 FROM public.articles a WHERE a.id=article_id AND a.author_id=auth.uid())
    OR public.is_article_editor(auth.uid(), article_id)
  )
);

-- STATUS LOG
CREATE TABLE public.article_status_log(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  from_status public.article_status,
  to_status public.article_status NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.article_status_log TO authenticated;
GRANT ALL ON public.article_status_log TO service_role;
ALTER TABLE public.article_status_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_log_select" ON public.article_status_log FOR SELECT TO authenticated USING (
  public.can_view_article(auth.uid(), article_id)
);
CREATE POLICY "status_log_insert" ON public.article_status_log FOR INSERT TO authenticated WITH CHECK (
  actor_id = auth.uid() AND (
    EXISTS(SELECT 1 FROM public.articles a WHERE a.id=article_id AND a.author_id=auth.uid())
    OR public.is_article_editor(auth.uid(), article_id)
  )
);

-- KVALITÁRKA
CREATE TABLE public.article_kvalitarka(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.article_kvalitarka(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_kvalitarka TO authenticated;
GRANT ALL ON public.article_kvalitarka TO service_role;
ALTER TABLE public.article_kvalitarka ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kval_select" ON public.article_kvalitarka FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.articles a WHERE a.id=article_id AND (
    a.author_id = auth.uid() OR public.is_article_editor(auth.uid(), a.id)
  ))
);
CREATE POLICY "kval_insert" ON public.article_kvalitarka FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND EXISTS(SELECT 1 FROM public.articles a WHERE a.id=article_id AND (
    a.author_id = auth.uid() OR public.is_article_editor(auth.uid(), a.id)
  ))
);
CREATE POLICY "kval_update_own_or_rektor" ON public.article_kvalitarka FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'rektor'::app_role));
CREATE POLICY "kval_delete_own_or_rektor" ON public.article_kvalitarka FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'rektor'::app_role));

-- KONTROLY ORIGINALITY
CREATE TABLE public.article_originality_checks(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  checked_by uuid REFERENCES auth.users(id),
  score numeric,
  verdict text, -- 'ok' | 'suspicious' | 'stolen'
  sources jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.article_originality_checks TO authenticated;
GRANT ALL ON public.article_originality_checks TO service_role;
ALTER TABLE public.article_originality_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orig_select" ON public.article_originality_checks FOR SELECT TO authenticated USING (
  public.can_view_article(auth.uid(), article_id)
);
CREATE POLICY "orig_insert_editor" ON public.article_originality_checks FOR INSERT TO authenticated WITH CHECK (
  checked_by = auth.uid() AND public.is_article_editor(auth.uid(), article_id)
);

-- Pár výchozích témat
INSERT INTO public.article_topics(slug, name, symbol, color, description) VALUES
  ('veda','Věda','🔬','#3b6bd6','Přírodní vědy, technika, výzkum'),
  ('historie','Historie','📜','#8a5a2b','Dějiny, archeologie, kulturní dějiny'),
  ('umeni','Umění','🎨','#b3477a','Literatura, výtvarné umění, hudba, film'),
  ('spolecnost','Společnost','🌍','#2b8a6a','Politika, ekonomie, sociologie'),
  ('zivot','Život na škole','🎓','#d6993b','Reportáže, rozhovory, akce')
ON CONFLICT (slug) DO NOTHING;
