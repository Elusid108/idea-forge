ALTER TABLE public.project_tasks
  ADD COLUMN parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE;