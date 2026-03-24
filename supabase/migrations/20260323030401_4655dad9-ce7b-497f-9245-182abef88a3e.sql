
CREATE OR REPLACE FUNCTION public.update_member_role(p_workspace_id uuid, p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_creator UUID;
BEGIN
  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT created_by INTO v_creator
  FROM public.workspaces
  WHERE id = p_workspace_id;

  IF p_user_id = v_creator THEN
    RAISE EXCEPTION 'Cannot change role of workspace creator';
  END IF;

  IF p_role = 'member' AND p_user_id = auth.uid() THEN
    IF (
      SELECT COUNT(*) FROM public.memberships
      WHERE workspace_id = p_workspace_id AND role = 'admin'
    ) <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the only admin';
    END IF;
  END IF;

  UPDATE public.memberships
  SET role = p_role
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_creator_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator UUID;
BEGIN
  SELECT created_by INTO v_creator
  FROM public.workspaces
  WHERE id = NEW.workspace_id;

  IF NEW.user_id = v_creator AND NEW.role != 'admin' THEN
    NEW.role := 'admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_creator_admin_trigger ON public.memberships;

CREATE TRIGGER enforce_creator_admin_trigger
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_creator_admin();
