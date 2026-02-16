CREATE TABLE public.campaign_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  category text DEFAULT 'General',
  date date DEFAULT CURRENT_DATE,
  vendor text DEFAULT '',
  receipt_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign expenses" ON public.campaign_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaign expenses" ON public.campaign_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaign expenses" ON public.campaign_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaign expenses" ON public.campaign_expenses FOR DELETE USING (auth.uid() = user_id);