ALTER TABLE public.brainstorms ADD COLUMN category text DEFAULT NULL;
ALTER TABLE public.brainstorms ADD COLUMN tags text[] DEFAULT NULL;