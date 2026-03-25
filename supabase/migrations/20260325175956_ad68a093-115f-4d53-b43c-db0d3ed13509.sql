
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('developer', 'dohledci', 'lektor', 'student');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table as required)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'developer' THEN 1
    WHEN 'dohledci' THEN 2
    WHEN 'lektor' THEN 3
    WHEN 'student' THEN 4
  END
  LIMIT 1
$$;

-- Faculties
CREATE TABLE public.faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#4f7dff',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'beginner',
  day_of_week TEXT,
  time_slot TEXT,
  lektor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_students INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Course enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'active',
  UNIQUE(course_id, student_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Schedule items
CREATE TABLE public.schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

-- Tutoring questions (doučování)
CREATE TABLE public.tutoring_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  context TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tutoring_questions ENABLE ROW LEVEL SECURITY;

-- Tutoring answers
CREATE TABLE public.tutoring_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.tutoring_questions(id) ON DELETE CASCADE NOT NULL,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  is_best BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tutoring_answers ENABLE ROW LEVEL SECURITY;

-- Study notes (výpisky)
CREATE TABLE public.study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

-- Study plans (studium)
CREATE TABLE public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  is_completed BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  priority TEXT DEFAULT 'normal',
  target_role app_role,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- System settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ========== RLS POLICIES ==========

-- Profiles
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles
CREATE POLICY "Roles viewable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Developer manages all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'developer'));
CREATE POLICY "Dohledci assigns lower roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dohledci') AND role IN ('lektor', 'student'));

-- Faculties
CREATE POLICY "Faculties viewable by all" ON public.faculties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manages faculties" ON public.faculties FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci'));

-- Courses
CREATE POLICY "Courses viewable by all" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manages courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci'));
CREATE POLICY "Lektor manages own courses" ON public.courses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'lektor') AND lektor_id = auth.uid());

-- Enrollments
CREATE POLICY "Users see own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'lektor') OR public.has_role(auth.uid(), 'dohledci') OR public.has_role(auth.uid(), 'developer'));
CREATE POLICY "Students enroll themselves" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students unenroll themselves" ON public.enrollments FOR DELETE TO authenticated USING (student_id = auth.uid());

-- Schedule
CREATE POLICY "Schedule viewable by all" ON public.schedule_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manages schedule" ON public.schedule_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci'));

-- Tutoring questions
CREATE POLICY "Questions viewable by all" ON public.tutoring_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own questions" ON public.tutoring_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff updates questions" ON public.tutoring_questions FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'lektor') OR public.has_role(auth.uid(), 'dohledci') OR public.has_role(auth.uid(), 'developer'));

-- Tutoring answers
CREATE POLICY "Answers viewable by all" ON public.tutoring_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mentors create answers" ON public.tutoring_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentor_id AND (public.has_role(auth.uid(), 'lektor') OR public.has_role(auth.uid(), 'dohledci') OR public.has_role(auth.uid(), 'developer')));

-- Study notes
CREATE POLICY "Notes viewable" ON public.study_notes FOR SELECT TO authenticated USING (is_public = true OR user_id = auth.uid() OR public.has_role(auth.uid(), 'dohledci') OR public.has_role(auth.uid(), 'developer'));
CREATE POLICY "Users create notes" ON public.study_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update notes" ON public.study_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete notes" ON public.study_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Study plans
CREATE POLICY "Users see own plans" ON public.study_plans FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'dohledci') OR public.has_role(auth.uid(), 'developer'));
CREATE POLICY "Users create plans" ON public.study_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update plans" ON public.study_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete plans" ON public.study_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Announcements
CREATE POLICY "Announcements viewable" ON public.announcements FOR SELECT TO authenticated USING (target_role IS NULL OR public.has_role(auth.uid(), target_role) OR public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci'));
CREATE POLICY "Staff creates announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci'));
CREATE POLICY "Staff manages announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci'));
CREATE POLICY "Staff deletes announcements" ON public.announcements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci'));

-- Audit log
CREATE POLICY "Staff views audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci'));
CREATE POLICY "Authenticated inserts audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- System settings
CREATE POLICY "Staff views settings" ON public.system_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci'));
CREATE POLICY "Developer manages settings" ON public.system_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'developer'));

-- Notifications
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff creates notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'dohledci') OR public.has_role(auth.uid(), 'lektor'));

-- Reports
CREATE POLICY "Users see own reports" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'dohledci') OR public.has_role(auth.uid(), 'developer'));
CREATE POLICY "Users create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Staff manages reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dohledci') OR public.has_role(auth.uid(), 'developer'));

-- ========== TRIGGERS ==========

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_faculties_updated_at BEFORE UPDATE ON public.faculties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tutoring_questions_updated_at BEFORE UPDATE ON public.tutoring_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_notes_updated_at BEFORE UPDATE ON public.study_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  -- First user gets developer role, rest get student
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'developer');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
