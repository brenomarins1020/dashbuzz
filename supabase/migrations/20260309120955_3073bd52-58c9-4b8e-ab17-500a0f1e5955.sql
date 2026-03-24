-- Drop the overly permissive INSERT policy on memberships
DROP POLICY IF EXISTS "Authenticated can create own membership" ON public.memberships;