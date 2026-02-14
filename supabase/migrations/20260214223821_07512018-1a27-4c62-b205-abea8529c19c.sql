
-- Create brainstorm_history table for persistent undo/redo
CREATE TABLE public.brainstorm_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brainstorm_id uuid NOT NULL REFERENCES public.brainstorms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  position integer NOT NULL DEFAULT 0
);

-- Index for fast lookup by brainstorm
CREATE INDEX idx_brainstorm_history_brainstorm ON public.brainstorm_history(brainstorm_id, position DESC);

-- Enable RLS
ALTER TABLE public.brainstorm_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history"
ON public.brainstorm_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
ON public.brainstorm_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own history"
ON public.brainstorm_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
ON public.brainstorm_history FOR DELETE
USING (auth.uid() = user_id);
