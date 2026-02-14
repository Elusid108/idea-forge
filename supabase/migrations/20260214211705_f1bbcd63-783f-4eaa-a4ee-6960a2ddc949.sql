ALTER TABLE public.ideas ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.brainstorms ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN deleted_at timestamptz DEFAULT NULL;