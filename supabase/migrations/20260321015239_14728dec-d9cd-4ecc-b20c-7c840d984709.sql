CREATE OR REPLACE FUNCTION public.remove_workspace_member(p_workspace_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Prevent removing yourself if you're the only admin
  IF p_user_id = auth.uid() THEN
    IF (SELECT COUNT(*) FROM public.memberships WHERE workspace_id = p_workspace_id AND role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the only admin';
    END IF;
  END IF;

  -- Delete membership (triggers realtime → user gets signed out)
  DELETE FROM public.memberships WHERE workspace_id = p_workspace_id AND user_id = p_user_id;

  -- Soft-delete team member
  UPDATE public.team_members SET deleted_at = now() WHERE workspace_id = p_workspace_id AND user_id = p_user_id;

  -- Reset join request so they need to re-request
  UPDATE public.workspace_join_requests SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
END;
$$;