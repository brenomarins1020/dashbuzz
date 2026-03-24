
-- Function to approve a join request (security definer to bypass memberships RLS)
CREATE OR REPLACE FUNCTION public.approve_join_request(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req public.workspace_join_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req
  FROM public.workspace_join_requests
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Verify caller is a member of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = v_req.workspace_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Create membership
  INSERT INTO public.memberships (workspace_id, user_id)
  VALUES (v_req.workspace_id, v_req.user_id)
  ON CONFLICT DO NOTHING;

  -- Update request
  UPDATE public.workspace_join_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = request_id;
END;
$$;

-- Function to reject a join request
CREATE OR REPLACE FUNCTION public.reject_join_request(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req public.workspace_join_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req
  FROM public.workspace_join_requests
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = v_req.workspace_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.workspace_join_requests
  SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = request_id;
END;
$$;
