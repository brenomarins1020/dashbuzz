
-- =============================================
-- Audit logs table
-- =============================================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL, -- insert, update, delete
  entity_type text NOT NULL, -- posts, stories, appointments, team_members
  entity_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only workspace members can read audit logs
CREATE POLICY "ws_select_audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Insert allowed for workspace members (triggered by app or triggers)
CREATE POLICY "ws_insert_audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Index for efficient querying
CREATE INDEX idx_audit_logs_ws_created ON public.audit_logs (workspace_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

-- =============================================
-- Audit trigger function (fires on main tables)
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _entity_id uuid;
  _workspace_id uuid;
  _user_id uuid;
  _meta jsonb;
BEGIN
  _user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    _action := 'insert';
    _entity_id := NEW.id;
    _workspace_id := NEW.workspace_id;
    _meta := jsonb_build_object('title', COALESCE(NEW.title, (NEW::jsonb)->>'conteudo', (NEW::jsonb)->>'nome', ''));
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _entity_id := NEW.id;
    _workspace_id := NEW.workspace_id;
    -- Detect soft delete
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
      _action := 'soft_delete';
    ELSIF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
      _action := 'restore';
    END IF;
    _meta := jsonb_build_object('title', COALESCE(NEW.title, (NEW::jsonb)->>'conteudo', (NEW::jsonb)->>'nome', ''));
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'permanent_delete';
    _entity_id := OLD.id;
    _workspace_id := OLD.workspace_id;
    _meta := jsonb_build_object('title', COALESCE(OLD.title, (OLD::jsonb)->>'conteudo', (OLD::jsonb)->>'nome', ''));
  END IF;

  INSERT INTO public.audit_logs (workspace_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, _user_id, _action, TG_TABLE_NAME, _entity_id, _meta);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers to main tables
CREATE TRIGGER trg_audit_posts
  AFTER INSERT OR UPDATE OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_stories
  AFTER INSERT OR UPDATE OR DELETE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_appointments
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_team_members
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
