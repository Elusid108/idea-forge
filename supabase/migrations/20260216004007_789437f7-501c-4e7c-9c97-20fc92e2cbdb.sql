
CREATE TABLE public.gotchas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  symptom text NOT NULL DEFAULT '',
  root_cause text,
  status text NOT NULL DEFAULT 'active',
  chat_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gotchas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gotchas"
  ON public.gotchas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gotchas"
  ON public.gotchas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gotchas"
  ON public.gotchas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gotchas"
  ON public.gotchas FOR DELETE
  USING (auth.uid() = user_id);
