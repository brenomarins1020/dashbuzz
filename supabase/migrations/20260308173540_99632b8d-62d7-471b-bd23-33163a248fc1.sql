
-- Create a security definer function to atomically create workspace + membership
CREATE OR REPLACE FUNCTION public.create_workspace_with_membership(
  _type text,
  _name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ws_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.workspaces (type, name, created_by)
  VALUES (_type, _name, _user_id)
  RETURNING id INTO _ws_id;

  INSERT INTO public.memberships (workspace_id, user_id, role)
  VALUES (_ws_id, _user_id, 'admin');

  RETURN _ws_id;
END;
$$;
