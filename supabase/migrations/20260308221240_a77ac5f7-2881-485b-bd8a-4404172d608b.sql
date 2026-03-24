
-- 1) Publishing profiles
CREATE TABLE public.publishing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text DEFAULT 'Outro',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.publishing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select_publishing_profiles" ON public.publishing_profiles FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_publishing_profiles" ON public.publishing_profiles FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_publishing_profiles" ON public.publishing_profiles FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_publishing_profiles" ON public.publishing_profiles FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- 2) Content categories
CREATE TABLE public.content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select_content_categories" ON public.content_categories FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_content_categories" ON public.content_categories FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_content_categories" ON public.content_categories FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_content_categories" ON public.content_categories FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- 3) Workflow statuses
CREATE TABLE public.workflow_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select_workflow_statuses" ON public.workflow_statuses FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_workflow_statuses" ON public.workflow_statuses FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_workflow_statuses" ON public.workflow_statuses FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_workflow_statuses" ON public.workflow_statuses FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- 4) Team roles
CREATE TABLE public.team_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select_team_roles" ON public.team_roles FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_team_roles" ON public.team_roles FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_team_roles" ON public.team_roles FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_team_roles" ON public.team_roles FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
