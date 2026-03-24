
-- Add deleted_by to posts and stories
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deleted_by text DEFAULT NULL;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS deleted_by text DEFAULT NULL;

-- Drop ALL existing permissive policies
DROP POLICY IF EXISTS "Allow public delete on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow public insert on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow public read on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow public update on posts" ON public.posts;

DROP POLICY IF EXISTS "Allow public delete on stories" ON public.stories;
DROP POLICY IF EXISTS "Allow public insert on stories" ON public.stories;
DROP POLICY IF EXISTS "Allow public read on stories" ON public.stories;
DROP POLICY IF EXISTS "Allow public update on stories" ON public.stories;

DROP POLICY IF EXISTS "Allow all on email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Allow all on person_emails" ON public.person_emails;

-- Authenticated-only policies for posts
CREATE POLICY "auth_select_posts" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_posts" ON public.posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_posts" ON public.posts FOR DELETE TO authenticated USING (true);

-- Authenticated-only policies for stories
CREATE POLICY "auth_select_stories" ON public.stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_stories" ON public.stories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_stories" ON public.stories FOR DELETE TO authenticated USING (true);

-- Authenticated-only policies for email_logs
CREATE POLICY "auth_select_email_logs" ON public.email_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_email_logs" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_email_logs" ON public.email_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_email_logs" ON public.email_logs FOR DELETE TO authenticated USING (true);

-- Authenticated-only policies for person_emails
CREATE POLICY "auth_select_person_emails" ON public.person_emails FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_person_emails" ON public.person_emails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_person_emails" ON public.person_emails FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_person_emails" ON public.person_emails FOR DELETE TO authenticated USING (true);
