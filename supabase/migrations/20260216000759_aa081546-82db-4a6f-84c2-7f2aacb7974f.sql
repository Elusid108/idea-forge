
CREATE TABLE public.campaign_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'note',
  title text NOT NULL DEFAULT '',
  url text DEFAULT '',
  description text DEFAULT '',
  thumbnail_url text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaign_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign refs" ON public.campaign_references FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaign refs" ON public.campaign_references FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaign refs" ON public.campaign_references FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaign refs" ON public.campaign_references FOR DELETE USING (auth.uid() = user_id);
