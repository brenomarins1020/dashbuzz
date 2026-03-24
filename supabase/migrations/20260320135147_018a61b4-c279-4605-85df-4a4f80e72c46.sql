
-- Add user_id column to team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add unique constraint to prevent duplicates per workspace+user
ALTER TABLE public.team_members ADD CONSTRAINT team_members_workspace_user_unique UNIQUE (workspace_id, user_id);

-- Update approve_join_request to also create team_member
CREATE OR REPLACE FUNCTION public.approve_join_request(request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Create team member
  INSERT INTO public.team_members (workspace_id, nome, email, cargo, ano_entrada, user_id)
  VALUES (
    v_req.workspace_id,
    v_req.requester_name,
    v_req.email,
    '',
    EXTRACT(YEAR FROM now())::int,
    v_req.user_id
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Update request
  UPDATE public.workspace_join_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = request_id;
END;
$function$;
