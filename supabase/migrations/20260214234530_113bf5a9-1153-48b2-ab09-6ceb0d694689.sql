
-- Add columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bullet_breakdown text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS compiled_description text;

-- Create project_references table
CREATE TABLE IF NOT EXISTS public.project_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'note',
  title text NOT NULL DEFAULT '',
  url text DEFAULT '',
  description text DEFAULT '',
  thumbnail_url text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project refs"
ON public.project_references FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project refs"
ON public.project_references FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project refs"
ON public.project_references FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project refs"
ON public.project_references FOR DELETE TO authenticated
USING (auth.uid() = user_id);
