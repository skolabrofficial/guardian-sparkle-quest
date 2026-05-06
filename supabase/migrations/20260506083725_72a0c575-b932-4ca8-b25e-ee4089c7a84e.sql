
ALTER TABLE public.user_blocks
  ADD COLUMN IF NOT EXISTS banned_ips text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ip_ban_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS offense_category text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS visible_to_user boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS assigned_to uuid;

CREATE INDEX IF NOT EXISTS idx_user_blocks_banned_ips ON public.user_blocks USING GIN (banned_ips);

CREATE TABLE IF NOT EXISTS public.block_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.user_blocks(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.block_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff views block actions"
  ON public.block_actions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'rektor'::app_role) OR has_role(auth.uid(), 'spravce'::app_role));

CREATE POLICY "User views public actions on own block"
  ON public.block_actions FOR SELECT TO authenticated
  USING (is_public = true AND EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE ub.id = block_actions.block_id AND ub.user_id = auth.uid()
  ));

CREATE POLICY "Staff inserts block actions"
  ON public.block_actions FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid() AND
    (has_role(auth.uid(), 'rektor'::app_role) OR has_role(auth.uid(), 'spravce'::app_role))
  );

CREATE INDEX IF NOT EXISTS idx_block_actions_block_id ON public.block_actions(block_id);
