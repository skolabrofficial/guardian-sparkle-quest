-- ============================================================
-- KROK A: DROP všech RLS policies závislých na app_role
-- ============================================================
DROP POLICY IF EXISTS "Announcements viewable" ON public.announcements;
DROP POLICY IF EXISTS "Staff creates announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff deletes announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff manages announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated inserts own audit" ON public.audit_log;
DROP POLICY IF EXISTS "Staff views audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Staff creates block messages" ON public.block_messages;
DROP POLICY IF EXISTS "Staff updates block messages" ON public.block_messages;
DROP POLICY IF EXISTS "Staff views block messages" ON public.block_messages;
DROP POLICY IF EXISTS "Developers manage changelog" ON public.changelog_entries;
DROP POLICY IF EXISTS "Staff and lektor read changelog" ON public.changelog_entries;
DROP POLICY IF EXISTS "Everyone views active content blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Staff manages content blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Courses viewable by all" ON public.courses;
DROP POLICY IF EXISTS "Lektor manages own courses" ON public.courses;
DROP POLICY IF EXISTS "Staff manages courses" ON public.courses;
DROP POLICY IF EXISTS "Students enroll themselves" ON public.enrollments;
DROP POLICY IF EXISTS "Students unenroll themselves" ON public.enrollments;
DROP POLICY IF EXISTS "Users see own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Authenticated insert history" ON public.entity_history;
DROP POLICY IF EXISTS "Authors and staff view history" ON public.entity_history;
DROP POLICY IF EXISTS "Faculties viewable by all" ON public.faculties;
DROP POLICY IF EXISTS "Staff manages faculties" ON public.faculties;
DROP POLICY IF EXISTS "Forum posts viewable" ON public.forum_posts;
DROP POLICY IF EXISTS "Staff delete forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Staff update forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Users create forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Staff creates notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Everyone views active page styles" ON public.page_styles;
DROP POLICY IF EXISTS "Staff manages page styles" ON public.page_styles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff manages reports" ON public.reports;
DROP POLICY IF EXISTS "Users create reports" ON public.reports;
DROP POLICY IF EXISTS "Users see own reports" ON public.reports;
DROP POLICY IF EXISTS "Schedule viewable by all" ON public.schedule_items;
DROP POLICY IF EXISTS "Staff manages schedule" ON public.schedule_items;
DROP POLICY IF EXISTS "Developer manages staff settings" ON public.staff_page_settings;
DROP POLICY IF EXISTS "Everyone views staff settings" ON public.staff_page_settings;
DROP POLICY IF EXISTS "Notes viewable" ON public.study_notes;
DROP POLICY IF EXISTS "Users create notes" ON public.study_notes;
DROP POLICY IF EXISTS "Users delete notes" ON public.study_notes;
DROP POLICY IF EXISTS "Users update notes" ON public.study_notes;
DROP POLICY IF EXISTS "Users create plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users delete plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users see own plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users update plans" ON public.study_plans;
DROP POLICY IF EXISTS "All authenticated read profanity settings" ON public.system_settings;
DROP POLICY IF EXISTS "Developer manages settings" ON public.system_settings;
DROP POLICY IF EXISTS "Staff views settings" ON public.system_settings;
DROP POLICY IF EXISTS "Answers viewable by all" ON public.tutoring_answers;
DROP POLICY IF EXISTS "Mentors create answers" ON public.tutoring_answers;
DROP POLICY IF EXISTS "Staff deletes answers" ON public.tutoring_answers;
DROP POLICY IF EXISTS "Questions viewable by all" ON public.tutoring_questions;
DROP POLICY IF EXISTS "Staff updates questions" ON public.tutoring_questions;
DROP POLICY IF EXISTS "Users create own questions" ON public.tutoring_questions;
DROP POLICY IF EXISTS "Users delete own questions" ON public.tutoring_questions;
DROP POLICY IF EXISTS "Staff deletes images" ON public.uploaded_images;
DROP POLICY IF EXISTS "Staff reviews images" ON public.uploaded_images;
DROP POLICY IF EXISTS "Users see own images" ON public.uploaded_images;
DROP POLICY IF EXISTS "Users upload images" ON public.uploaded_images;
DROP POLICY IF EXISTS "Developer manages blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users appeal own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users see own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Developer views ip log" ON public.user_ip_log;
DROP POLICY IF EXISTS "Developer manages all notes" ON public.user_notes;
DROP POLICY IF EXISTS "Dohledci create notes" ON public.user_notes;
DROP POLICY IF EXISTS "Dohledci view notes with public description" ON public.user_notes;
DROP POLICY IF EXISTS "Developer manages all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Dohledci assigns lower roles" ON public.user_roles;
DROP POLICY IF EXISTS "Roles viewable by authenticated" ON public.user_roles;

-- ============================================================
-- KROK B: Drop functions závislé na typu
-- ============================================================
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- ============================================================
-- KROK C: Vyměníme enum typ
-- ============================================================
CREATE TYPE public.app_role_new AS ENUM ('rektor', 'spravce', 'lektor', 'student');

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role_new
  USING (
    CASE role::text
      WHEN 'developer' THEN 'rektor'::public.app_role_new
      WHEN 'dohledci'  THEN 'spravce'::public.app_role_new
      WHEN 'lektor'    THEN 'lektor'::public.app_role_new
      WHEN 'student'   THEN 'student'::public.app_role_new
    END
  );

ALTER TABLE public.announcements
  ALTER COLUMN target_role TYPE public.app_role_new
  USING (
    CASE target_role::text
      WHEN 'developer' THEN 'rektor'::public.app_role_new
      WHEN 'dohledci'  THEN 'spravce'::public.app_role_new
      WHEN 'lektor'    THEN 'lektor'::public.app_role_new
      WHEN 'student'   THEN 'student'::public.app_role_new
      ELSE NULL
    END
  );

DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- ============================================================
-- KROK D: Znovu vytvoříme funkce
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'rektor'  THEN 1
    WHEN 'spravce' THEN 2
    WHEN 'lektor'  THEN 3
    WHEN 'student' THEN 4
  END LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE base text; candidate text; n int := 1; display text;
BEGIN
  display := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email);
  base := public.slugify(display);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1; candidate := base || '-' || n::text;
  END LOOP;
  INSERT INTO public.profiles (user_id, display_name, username) VALUES (NEW.id, display, candidate);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rektor');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- KROK E: Znovu vytvoříme všechny policies
-- ============================================================

-- announcements
CREATE POLICY "Announcements viewable" ON public.announcements FOR SELECT TO authenticated
  USING (target_role IS NULL OR has_role(auth.uid(), target_role) OR has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));
CREATE POLICY "Staff creates announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));
CREATE POLICY "Staff updates announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));
CREATE POLICY "Staff deletes announcements" ON public.announcements FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- audit_log
CREATE POLICY "Authenticated inserts own audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff views audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- block_messages
CREATE POLICY "Staff creates block messages" ON public.block_messages FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));
CREATE POLICY "Staff updates block messages" ON public.block_messages FOR UPDATE TO authenticated USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));
CREATE POLICY "Staff views block messages" ON public.block_messages FOR SELECT TO authenticated USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- changelog_entries
CREATE POLICY "Rektor manages changelog" ON public.changelog_entries FOR ALL TO authenticated
  USING (has_role(auth.uid(),'rektor')) WITH CHECK (has_role(auth.uid(),'rektor'));
CREATE POLICY "Staff and lektor read changelog" ON public.changelog_entries FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'lektor'));

-- content_blocks
CREATE POLICY "Everyone views active content blocks" ON public.content_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manages content blocks" ON public.content_blocks FOR ALL TO authenticated
  USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- courses
CREATE POLICY "Courses viewable by all" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lektor manages own courses" ON public.courses FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'lektor') AND lektor_id = auth.uid());
CREATE POLICY "Staff manages courses" ON public.courses FOR ALL TO authenticated
  USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- enrollments
CREATE POLICY "Students enroll themselves" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students unenroll themselves" ON public.enrollments FOR DELETE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Users see own enrollments" ON public.enrollments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR has_role(auth.uid(),'lektor') OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));

-- entity_history
CREATE POLICY "Authenticated insert history" ON public.entity_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authors and staff view history" ON public.entity_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));

-- faculties
CREATE POLICY "Faculties viewable by all" ON public.faculties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manages faculties" ON public.faculties FOR ALL TO authenticated USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- forum_posts
CREATE POLICY "Forum posts viewable" ON public.forum_posts FOR SELECT TO authenticated
  USING (is_deleted = false OR author_id = auth.uid() OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));
CREATE POLICY "Users create forum posts" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Staff update forum posts" ON public.forum_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR has_role(auth.uid(),'lektor') OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));
CREATE POLICY "Staff delete forum posts" ON public.forum_posts FOR DELETE TO authenticated USING (has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));

-- notifications
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff creates notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'lektor'));

-- page_styles
CREATE POLICY "Everyone views active page styles" ON public.page_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manages page styles" ON public.page_styles FOR ALL TO authenticated USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- profiles
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- reports
CREATE POLICY "Users create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users see own reports" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));
CREATE POLICY "Staff manages reports" ON public.reports FOR UPDATE TO authenticated USING (has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));

-- schedule_items
CREATE POLICY "Schedule viewable by all" ON public.schedule_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manages schedule" ON public.schedule_items FOR ALL TO authenticated USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- staff_page_settings
CREATE POLICY "Everyone views staff settings" ON public.staff_page_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Rektor manages staff settings" ON public.staff_page_settings FOR ALL TO authenticated USING (has_role(auth.uid(),'rektor'));

-- study_notes
CREATE POLICY "Notes viewable" ON public.study_notes FOR SELECT TO authenticated
  USING (is_public = true OR user_id = auth.uid() OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));
CREATE POLICY "Users create notes" ON public.study_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update notes" ON public.study_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete notes" ON public.study_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- study_plans
CREATE POLICY "Users see own plans" ON public.study_plans FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));
CREATE POLICY "Users create plans" ON public.study_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update plans" ON public.study_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete plans" ON public.study_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- system_settings
CREATE POLICY "All authenticated read profanity settings" ON public.system_settings FOR SELECT TO authenticated
  USING (key = ANY (ARRAY['profanity_words'::text, 'profanity_autoblock'::text]));
CREATE POLICY "Rektor manages settings" ON public.system_settings FOR ALL TO authenticated USING (has_role(auth.uid(),'rektor'));
CREATE POLICY "Staff views settings" ON public.system_settings FOR SELECT TO authenticated USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- tutoring_answers
CREATE POLICY "Answers viewable by all" ON public.tutoring_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mentors create answers" ON public.tutoring_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = mentor_id AND (has_role(auth.uid(),'lektor') OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor')));
CREATE POLICY "Staff deletes answers" ON public.tutoring_answers FOR DELETE TO authenticated USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- tutoring_questions
CREATE POLICY "Questions viewable by all" ON public.tutoring_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own questions" ON public.tutoring_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff updates questions" ON public.tutoring_questions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'lektor') OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));
CREATE POLICY "Users delete own questions" ON public.tutoring_questions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));

-- uploaded_images
CREATE POLICY "Users upload images" ON public.uploaded_images FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users see own images" ON public.uploaded_images FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'lektor'));
CREATE POLICY "Staff reviews images" ON public.uploaded_images FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'lektor'));
CREATE POLICY "Staff deletes images" ON public.uploaded_images FOR DELETE TO authenticated USING (has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'rektor'));

-- user_blocks
CREATE POLICY "Rektor manages blocks" ON public.user_blocks FOR ALL TO authenticated USING (has_role(auth.uid(),'rektor'));
CREATE POLICY "Users see own blocks" ON public.user_blocks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce'));
CREATE POLICY "Users appeal own blocks" ON public.user_blocks FOR UPDATE TO authenticated USING (user_id = auth.uid() AND is_active = true);

-- user_ip_log
CREATE POLICY "Rektor views ip log" ON public.user_ip_log FOR SELECT TO authenticated USING (has_role(auth.uid(),'rektor'));

-- user_notes (správce/lektor nesmí vidět poznámky o sobě)
CREATE POLICY "Rektor manages all notes" ON public.user_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(),'rektor')) WITH CHECK (has_role(auth.uid(),'rektor'));
CREATE POLICY "Spravce create notes" ON public.user_notes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'spravce') AND author_id = auth.uid() AND target_user_id <> auth.uid());
CREATE POLICY "Spravce view notes about others" ON public.user_notes FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'spravce')
    AND public_description IS NOT NULL
    AND length(trim(public_description)) > 0
    AND target_user_id <> auth.uid()
  );

-- user_roles
CREATE POLICY "Roles viewable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Rektor manages all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(),'rektor'));
CREATE POLICY "Spravce assigns lower roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'spravce') AND role = ANY (ARRAY['lektor'::app_role,'student'::app_role]));

-- ============================================================
-- KROK F: Tabulka kódů protokolu
-- ============================================================
CREATE TABLE public.protokol_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_protokol_codes_source ON public.protokol_codes(source_table, source_id);
ALTER TABLE public.protokol_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff views protokol codes" ON public.protokol_codes FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'lektor'));
CREATE POLICY "Staff creates protokol codes" ON public.protokol_codes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'rektor') OR has_role(auth.uid(),'spravce') OR has_role(auth.uid(),'lektor'));

-- ============================================================
-- KROK G: GDPR souhlasy
-- ============================================================
CREATE TABLE public.gdpr_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  consent_type text NOT NULL,
  accepted boolean NOT NULL DEFAULT true,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gdpr_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own consents" ON public.gdpr_consents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'rektor'));
CREATE POLICY "Anyone records consent" ON public.gdpr_consents FOR INSERT TO authenticated, anon WITH CHECK (true);
