
-- Security definer function to check if user is system admin
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND email = 'brenonmarins05@gmail.com'
  );
$$;

-- Admin write policies for global_announcements
CREATE POLICY "admin_insert_announcements"
  ON public.global_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "admin_update_announcements"
  ON public.global_announcements
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "admin_delete_announcements"
  ON public.global_announcements
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin(auth.uid()));
