
-- Fix email_logs and person_emails: replace permissive true policies with auth-only
DROP POLICY IF EXISTS "auth_delete_email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "auth_insert_email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "auth_select_email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "auth_update_email_logs" ON public.email_logs;

CREATE POLICY "ws_select_email_logs" ON public.email_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "ws_insert_email_logs" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ws_update_email_logs" ON public.email_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ws_delete_email_logs" ON public.email_logs FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_delete_person_emails" ON public.person_emails;
DROP POLICY IF EXISTS "auth_insert_person_emails" ON public.person_emails;
DROP POLICY IF EXISTS "auth_select_person_emails" ON public.person_emails;
DROP POLICY IF EXISTS "auth_update_person_emails" ON public.person_emails;

CREATE POLICY "ws_select_person_emails" ON public.person_emails FOR SELECT TO authenticated USING (true);
CREATE POLICY "ws_insert_person_emails" ON public.person_emails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ws_update_person_emails" ON public.person_emails FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ws_delete_person_emails" ON public.person_emails FOR DELETE TO authenticated USING (true);
