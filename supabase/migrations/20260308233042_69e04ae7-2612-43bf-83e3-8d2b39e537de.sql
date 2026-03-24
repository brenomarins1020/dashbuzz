
-- Composite partial indexes for main tables (filtered on non-deleted rows)
CREATE INDEX IF NOT EXISTS idx_posts_ws_date ON public.posts(workspace_id, data_postagem) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_ws_trashed ON public.posts(workspace_id, deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stories_ws_date ON public.stories(workspace_id, date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stories_ws_trashed ON public.stories(workspace_id, deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_ws_date ON public.appointments(workspace_id, date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_ws_trashed ON public.appointments(workspace_id, deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_ws ON public.team_members(workspace_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_ws_created ON public.audit_logs(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id, workspace_id);
