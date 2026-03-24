
-- 1. Add workspace_id to person_emails
ALTER TABLE public.person_emails ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 2. Add workspace_id to email_logs  
ALTER TABLE public.email_logs ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 3. Create indices on workspace_id for all tables missing them
CREATE INDEX IF NOT EXISTS idx_appointments_workspace ON public.appointments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_members_workspace ON public.team_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_categories_workspace ON public.content_categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_statuses_workspace ON public.workflow_statuses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_roles_workspace ON public.team_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_person_emails_workspace ON public.person_emails(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_workspace ON public.email_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_publishing_profiles_workspace ON public.publishing_profiles(workspace_id);

-- 4. Replace RLS policies on person_emails (from true to workspace-scoped)
DROP POLICY IF EXISTS ws_select_person_emails ON public.person_emails;
DROP POLICY IF EXISTS ws_insert_person_emails ON public.person_emails;
DROP POLICY IF EXISTS ws_update_person_emails ON public.person_emails;
DROP POLICY IF EXISTS ws_delete_person_emails ON public.person_emails;

CREATE POLICY "ws_select_person_emails" ON public.person_emails FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_person_emails" ON public.person_emails FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_person_emails" ON public.person_emails FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_person_emails" ON public.person_emails FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- 5. Replace RLS policies on email_logs
DROP POLICY IF EXISTS ws_select_email_logs ON public.email_logs;
DROP POLICY IF EXISTS ws_insert_email_logs ON public.email_logs;
DROP POLICY IF EXISTS ws_update_email_logs ON public.email_logs;
DROP POLICY IF EXISTS ws_delete_email_logs ON public.email_logs;

CREATE POLICY "ws_select_email_logs" ON public.email_logs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_email_logs" ON public.email_logs FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_email_logs" ON public.email_logs FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_email_logs" ON public.email_logs FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
