-- Allow workspace members to see all memberships in their workspace
CREATE POLICY "Members can see workspace memberships"
ON public.memberships
FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));