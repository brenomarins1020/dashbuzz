
-- Drop all RESTRICTIVE policies on workspaces and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can see their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Authenticated can create workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Admin can update workspace" ON public.workspaces;

CREATE POLICY "Users can see their workspaces" ON public.workspaces
  FOR SELECT TO authenticated
  USING (id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Authenticated can create workspace" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin can update workspace" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (id IN (SELECT user_workspace_ids(auth.uid())));

-- Drop all RESTRICTIVE policies on memberships and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can see own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Authenticated can create own membership" ON public.memberships;

CREATE POLICY "Users can see own memberships" ON public.memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can create own membership" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Drop all RESTRICTIVE policies on posts and recreate as PERMISSIVE
DROP POLICY IF EXISTS "ws_select_posts" ON public.posts;
DROP POLICY IF EXISTS "ws_insert_posts" ON public.posts;
DROP POLICY IF EXISTS "ws_update_posts" ON public.posts;
DROP POLICY IF EXISTS "ws_delete_posts" ON public.posts;

CREATE POLICY "ws_select_posts" ON public.posts
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_insert_posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_update_posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_delete_posts" ON public.posts
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Drop all RESTRICTIVE policies on stories and recreate as PERMISSIVE
DROP POLICY IF EXISTS "ws_select_stories" ON public.stories;
DROP POLICY IF EXISTS "ws_insert_stories" ON public.stories;
DROP POLICY IF EXISTS "ws_update_stories" ON public.stories;
DROP POLICY IF EXISTS "ws_delete_stories" ON public.stories;

CREATE POLICY "ws_select_stories" ON public.stories
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_insert_stories" ON public.stories
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_update_stories" ON public.stories
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_delete_stories" ON public.stories
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
