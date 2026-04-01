
-- Entity history table for tracking all changes
CREATE TABLE public.entity_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_history ENABLE ROW LEVEL SECURITY;

-- Authors see their own entity history, staff sees all
CREATE POLICY "Authors and staff view history"
ON public.entity_history FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'dohledci'::app_role)
  OR has_role(auth.uid(), 'developer'::app_role)
);

CREATE POLICY "Authenticated insert history"
ON public.entity_history FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Page styles table for custom CSS per page
CREATE TABLE public.page_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL UNIQUE,
  css_content TEXT NOT NULL DEFAULT '',
  class_name TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.page_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone views active page styles"
ON public.page_styles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff manages page styles"
ON public.page_styles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'dohledci'::app_role));

-- Allow deleting tutoring questions by author and staff
CREATE POLICY "Users delete own questions"
ON public.tutoring_questions FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'developer'::app_role)
  OR has_role(auth.uid(), 'dohledci'::app_role)
);

-- Allow deleting tutoring answers by staff
CREATE POLICY "Staff deletes answers"
ON public.tutoring_answers FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'developer'::app_role)
  OR has_role(auth.uid(), 'dohledci'::app_role)
);
