
-- Add last_seen to profiles for online status tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();

-- Expand staff_page_settings with many new fields
ALTER TABLE public.staff_page_settings 
  ADD COLUMN IF NOT EXISTS specialization text DEFAULT '',
  ADD COLUMN IF NOT EXISTS motto text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_hours text DEFAULT '',
  ADD COLUMN IF NOT EXISTS favorite_subject text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fun_fact text DEFAULT '',
  ADD COLUMN IF NOT EXISTS languages text DEFAULT 'čeština',
  ADD COLUMN IF NOT EXISTS joined_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accepting_questions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS response_style text DEFAULT '',
  ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS hobbies text DEFAULT '',
  ADD COLUMN IF NOT EXISTS achievements text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_contact text DEFAULT 'dopis',
  ADD COLUMN IF NOT EXISTS max_questions_daily integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS education text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_link text DEFAULT '',
  ADD COLUMN IF NOT EXISTS working_days text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio_short text DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_color text DEFAULT '';
