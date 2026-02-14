
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ideas table
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_dump TEXT NOT NULL DEFAULT '',
  processed_summary TEXT DEFAULT '',
  category TEXT DEFAULT 'Uncategorized',
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ideas" ON public.ideas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ideas" ON public.ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ideas" ON public.ideas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ideas" ON public.ideas FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Brainstorms table
CREATE TABLE public.brainstorms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Brainstorm',
  compiled_description TEXT DEFAULT '',
  bullet_breakdown TEXT DEFAULT '',
  chat_history JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brainstorms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brainstorms" ON public.brainstorms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brainstorms" ON public.brainstorms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brainstorms" ON public.brainstorms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brainstorms" ON public.brainstorms FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_brainstorms_updated_at
  BEFORE UPDATE ON public.brainstorms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Brainstorm references table
CREATE TABLE public.brainstorm_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brainstorm_id UUID NOT NULL REFERENCES public.brainstorms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL DEFAULT '',
  url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brainstorm_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own refs" ON public.brainstorm_references FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own refs" ON public.brainstorm_references FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own refs" ON public.brainstorm_references FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own refs" ON public.brainstorm_references FOR DELETE USING (auth.uid() = user_id);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brainstorm_id UUID REFERENCES public.brainstorms(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  status TEXT NOT NULL DEFAULT 'planning',
  github_repo_url TEXT DEFAULT '',
  general_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project assets table
CREATE TABLE public.project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  storage_path TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets" ON public.project_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON public.project_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON public.project_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON public.project_assets FOR DELETE USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('project-assets', 'project-assets', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('brainstorm-references', 'brainstorm-references', false);

-- Storage policies for project-assets
CREATE POLICY "Users can upload own project assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own project assets" ON storage.objects FOR SELECT USING (bucket_id = 'project-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own project assets" ON storage.objects FOR DELETE USING (bucket_id = 'project-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for brainstorm-references
CREATE POLICY "Users can upload own brainstorm refs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brainstorm-references' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own brainstorm refs" ON storage.objects FOR SELECT USING (bucket_id = 'brainstorm-references' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own brainstorm refs" ON storage.objects FOR DELETE USING (bucket_id = 'brainstorm-references' AND auth.uid()::text = (storage.foldername(name))[1]);

-- User roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
