
-- 1. Create workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('atletica', 'ej')),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- 2. Create memberships table
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- 3. Add workspace_id to posts and stories (nullable first for migration)
ALTER TABLE public.posts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.stories ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 4. Create a legacy workspace for existing data
INSERT INTO public.workspaces (id, type, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'ej', 'Legacy Workspace');

-- 5. Assign existing data to legacy workspace
UPDATE public.posts SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.stories SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 6. Make workspace_id NOT NULL
ALTER TABLE public.posts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.stories ALTER COLUMN workspace_id SET NOT NULL;

-- 7. Add indexes
CREATE INDEX idx_posts_workspace ON public.posts(workspace_id);
CREATE INDEX idx_stories_workspace ON public.stories(workspace_id);
CREATE INDEX idx_memberships_user ON public.memberships(user_id);

-- 8. Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 9. Security definer function to check membership
CREATE OR REPLACE FUNCTION public.user_workspace_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.memberships WHERE user_id = _user_id;
$$;

-- 10. RLS for workspaces
CREATE POLICY "Users can see their workspaces"
  ON public.workspaces FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Authenticated can create workspace"
  ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin can update workspace"
  ON public.workspaces FOR UPDATE TO authenticated
  USING (id IN (SELECT public.user_workspace_ids(auth.uid())));

-- 11. RLS for memberships
CREATE POLICY "Users can see own memberships"
  ON public.memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can create own membership"
  ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 12. Drop old permissive policies on posts
DROP POLICY IF EXISTS "auth_select_posts" ON public.posts;
DROP POLICY IF EXISTS "auth_insert_posts" ON public.posts;
DROP POLICY IF EXISTS "auth_update_posts" ON public.posts;
DROP POLICY IF EXISTS "auth_delete_posts" ON public.posts;

-- 13. New workspace-scoped RLS for posts
CREATE POLICY "ws_select_posts" ON public.posts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_posts" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_posts" ON public.posts FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_posts" ON public.posts FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

-- 14. Drop old permissive policies on stories
DROP POLICY IF EXISTS "auth_select_stories" ON public.stories;
DROP POLICY IF EXISTS "auth_insert_stories" ON public.stories;
DROP POLICY IF EXISTS "auth_update_stories" ON public.stories;
DROP POLICY IF EXISTS "auth_delete_stories" ON public.stories;

-- 15. New workspace-scoped RLS for stories
CREATE POLICY "ws_select_stories" ON public.stories FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_stories" ON public.stories FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_stories" ON public.stories FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_stories" ON public.stories FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
