
-- =============================================
-- PARTE 3: Indexes for scalability
-- =============================================

-- posts: composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_posts_ws_date ON public.posts (workspace_id, data_postagem);
CREATE INDEX IF NOT EXISTS idx_posts_ws_deleted ON public.posts (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_posts_ws_status ON public.posts (workspace_id, status);

-- stories: composite indexes
CREATE INDEX IF NOT EXISTS idx_stories_ws_date ON public.stories (workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_stories_ws_deleted ON public.stories (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_stories_ws_status ON public.stories (workspace_id, status);

-- appointments: composite indexes
CREATE INDEX IF NOT EXISTS idx_appointments_ws_date ON public.appointments (workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_ws_deleted ON public.appointments (workspace_id, deleted_at);

-- team_members: composite indexes
CREATE INDEX IF NOT EXISTS idx_team_members_ws ON public.team_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_members_ws_deleted ON public.team_members (workspace_id, deleted_at);

-- appointment_overrides: composite index
CREATE INDEX IF NOT EXISTS idx_appointment_overrides_ws_appt_date ON public.appointment_overrides (workspace_id, appointment_id, occurrence_date);

-- config tables: workspace + is_active
CREATE INDEX IF NOT EXISTS idx_content_categories_ws_active ON public.content_categories (workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_statuses_ws_active ON public.workflow_statuses (workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_team_roles_ws_active ON public.team_roles (workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_publishing_profiles_ws_active ON public.publishing_profiles (workspace_id, is_active);

-- person_emails & email_logs: workspace index
CREATE INDEX IF NOT EXISTS idx_person_emails_ws ON public.person_emails (workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_ws ON public.email_logs (workspace_id);

-- memberships: user_id for RLS function lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships (user_id);
