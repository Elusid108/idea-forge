
-- Add new columns to campaigns table
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS interview_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS chat_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS playbook text DEFAULT ''::text;

-- Create campaign_tasks table
CREATE TABLE public.campaign_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  status_column text NOT NULL DEFAULT 'asset_creation',
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own campaign tasks" ON public.campaign_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaign tasks" ON public.campaign_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaign tasks" ON public.campaign_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaign tasks" ON public.campaign_tasks FOR DELETE USING (auth.uid() = user_id);
