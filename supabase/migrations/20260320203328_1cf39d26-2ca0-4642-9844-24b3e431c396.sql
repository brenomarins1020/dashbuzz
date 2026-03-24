
-- Update request_workspace_access to return already_member as success (not error)
CREATE OR REPLACE FUNCTION public.request_workspace_access(
  p_invite_token UUID,
  p_requester_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workspace_id UUID;
  v_ws_name TEXT;
  v_ws_type TEXT;
  v_email TEXT;
BEGIN
  SELECT id, name, type INTO v_workspace_id, v_ws_name, v_ws_type
  FROM public.workspaces
  WHERE invite_token = p_invite_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  -- If already a member, return success with workspace_id so they can enter directly
  IF EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = v_workspace_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('status', 'already_member',
      'workspace_id', v_workspace_id,
      'workspace_name', v_ws_name,
      'workspace_type', v_ws_type);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_join_requests
    WHERE workspace_id = v_workspace_id
      AND user_id = auth.uid()
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('status', 'pending_approval',
      'workspace_name', v_ws_name);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.workspace_join_requests (
    workspace_id, user_id, requester_name, email, status
  )
  VALUES (
    v_workspace_id,
    auth.uid(),
    COALESCE(NULLIF(p_requester_name, ''), v_email),
    v_email,
    'pending'
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET status = 'pending', requester_name = EXCLUDED.requester_name;

  RETURN jsonb_build_object(
    'status', 'pending_approval',
    'workspace_name', v_ws_name,
    'workspace_type', v_ws_type
  );
END;
$$;
