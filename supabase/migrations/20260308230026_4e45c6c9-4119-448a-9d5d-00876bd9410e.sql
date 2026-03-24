
-- 1a) Create LEGACY workspace for orphan records
DO $$
DECLARE
  _legacy_id uuid;
  _owner_id uuid;
BEGIN
  SELECT id INTO _legacy_id FROM public.workspaces WHERE name = 'LEGACY' LIMIT 1;
  IF _legacy_id IS NULL THEN
    SELECT id INTO _owner_id FROM auth.users LIMIT 1;
    IF _owner_id IS NOT NULL THEN
      INSERT INTO public.workspaces (type, name, created_by)
      VALUES ('ej', 'LEGACY', _owner_id)
      RETURNING id INTO _legacy_id;
    END IF;
  END IF;

  IF _legacy_id IS NOT NULL THEN
    UPDATE public.person_emails SET workspace_id = _legacy_id WHERE workspace_id IS NULL;
    UPDATE public.email_logs SET workspace_id = _legacy_id WHERE workspace_id IS NULL;
  ELSE
    DELETE FROM public.person_emails WHERE workspace_id IS NULL;
    DELETE FROM public.email_logs WHERE workspace_id IS NULL;
  END IF;
END $$;

-- 1b) workspace_id NOT NULL
ALTER TABLE public.person_emails ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.email_logs ALTER COLUMN workspace_id SET NOT NULL;

-- 1c) Unique multi-tenant
ALTER TABLE public.person_emails DROP CONSTRAINT IF EXISTS person_emails_name_key;
ALTER TABLE public.person_emails ADD CONSTRAINT person_emails_name_workspace_unique UNIQUE (name, workspace_id);

-- 1d) system_admins table
CREATE TABLE IF NOT EXISTS public.system_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_admins_select" ON public.system_admins
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid()));

CREATE POLICY "system_admins_insert" ON public.system_admins
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid()));

CREATE POLICY "system_admins_delete" ON public.system_admins
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid()));

-- 1e) Seed current admin
INSERT INTO public.system_admins (user_id)
SELECT id FROM auth.users WHERE email = 'brenonmarins05@gmail.com'
ON CONFLICT DO NOTHING;

-- 1f) Update is_system_admin to use table
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = _user_id);
$$;
