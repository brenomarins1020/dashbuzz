-- Create trigger to sync team_members to workspace_responsibles
CREATE TRIGGER trg_sync_member_to_responsible
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_member_to_responsible();