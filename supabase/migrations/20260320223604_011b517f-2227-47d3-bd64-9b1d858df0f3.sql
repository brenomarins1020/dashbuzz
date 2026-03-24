
CREATE POLICY "anon_can_read_workspace_by_invite_token"
ON public.workspaces
FOR SELECT
TO anon
USING (true);
