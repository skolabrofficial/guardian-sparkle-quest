
-- Add dean_id to faculties
ALTER TABLE public.faculties ADD COLUMN IF NOT EXISTS dean_id uuid;

-- Add visibility to tutoring_answers (public_all or private_asker)
ALTER TABLE public.tutoring_answers ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public_all';

-- Create forum_posts table
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  parent_id uuid REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  label text,
  moved_from_course_id uuid REFERENCES public.courses(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read non-deleted posts
CREATE POLICY "Forum posts viewable" ON public.forum_posts
  FOR SELECT TO authenticated
  USING (is_deleted = false OR author_id = auth.uid() OR has_role(auth.uid(), 'dohledci') OR has_role(auth.uid(), 'developer'));

-- Users create own posts
CREATE POLICY "Users create forum posts" ON public.forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Lektor+ can update label/pin (marking)
CREATE POLICY "Staff update forum posts" ON public.forum_posts
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid() 
    OR has_role(auth.uid(), 'lektor') 
    OR has_role(auth.uid(), 'dohledci') 
    OR has_role(auth.uid(), 'developer')
  );

-- Dohledci+ can delete (soft) 
CREATE POLICY "Staff delete forum posts" ON public.forum_posts
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'dohledci') OR has_role(auth.uid(), 'developer'));

-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  blocked_by uuid NOT NULL,
  reason text NOT NULL,
  details text,
  block_type text NOT NULL DEFAULT 'full',
  severity text NOT NULL DEFAULT 'standard',
  is_active boolean NOT NULL DEFAULT true,
  is_permanent boolean DEFAULT false,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  appeal_text text,
  appeal_submitted_at timestamptz,
  appeal_status text DEFAULT 'none',
  appeal_reviewed_by uuid,
  appeal_reviewed_at timestamptz,
  appeal_response text,
  unblocked_at timestamptz,
  unblocked_by uuid,
  unblock_reason text,
  block_count integer DEFAULT 1,
  ip_note text,
  affected_areas text[] DEFAULT '{}',
  internal_notes text,
  evidence_urls text[] DEFAULT '{}',
  notification_sent boolean DEFAULT false,
  last_warning_at timestamptz,
  warning_count integer DEFAULT 0,
  escalated boolean DEFAULT false,
  escalated_to uuid,
  review_scheduled_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Users see their own blocks
CREATE POLICY "Users see own blocks" ON public.user_blocks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'developer') OR has_role(auth.uid(), 'dohledci'));

-- Only developer can manage blocks
CREATE POLICY "Developer manages blocks" ON public.user_blocks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'developer'));

-- Users can submit appeals (update appeal_text etc)
CREATE POLICY "Users appeal own blocks" ON public.user_blocks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND is_active = true);

-- Trigger for updated_at on forum_posts
CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
