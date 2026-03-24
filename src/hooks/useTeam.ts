import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface TeamMember {
  id: string;
  nome: string;
  email: string;
  ano_entrada: number;
  cargo: string;
  foto?: string;
  user_id?: string;
  workspace_id?: string;
}

async function fetchTeamMembers(workspaceId: string): Promise<TeamMember[]> {
  const { data } = await supabase
    .from("team_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return (data ?? []) as TeamMember[];
}

export function useTeam() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const enabled = !!workspaceId;
  const queryKey = ["team-members", workspaceId] as const;

  const teamQ = useQuery({
    queryKey: [...queryKey],
    queryFn: () => fetchTeamMembers(workspaceId!),
    enabled,
    staleTime: 10 * 60_000,
  });

  // Incremental realtime
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`team-members-realtime-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members", filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        const { eventType } = payload;
        const newRow = payload.new as TeamMember | undefined;
        const oldRow = payload.old as { id: string } | undefined;

        if (eventType === "INSERT" && newRow) {
          qc.setQueryData<TeamMember[]>([...queryKey], (old) => {
            if (!old) return old;
            if (old.some(m => m.id === newRow.id)) return old;
            return [...old, newRow];
          });
        } else if (eventType === "UPDATE" && newRow) {
          qc.setQueryData<TeamMember[]>([...queryKey], (old) => {
            if (!old) return old;
            // If soft-deleted, remove from list
            if ((newRow as any).deleted_at) return old.filter(m => m.id !== newRow.id);
            const exists = old.some(m => m.id === newRow.id);
            if (exists) return old.map(m => m.id === newRow.id ? newRow : m);
            return [...old, newRow];
          });
        } else if (eventType === "DELETE" && oldRow) {
          qc.setQueryData<TeamMember[]>([...queryKey], (old) =>
            old ? old.filter(m => m.id !== oldRow.id) : old
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, qc]);

  const members = teamQ.data ?? [];
  const loading = teamQ.isLoading;

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["team-members"] });
  }, [qc]);

  const addMember = useCallback(async (member: Omit<TeamMember, "id" | "workspace_id">) => {
    if (!workspaceId) throw new Error("No workspace");
    const { error } = await supabase.from("team_members").insert({ ...member, workspace_id: workspaceId } as any);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["team-members", workspaceId] });
  }, [workspaceId, qc]);

  const updateMember = useCallback(async (id: string, changes: Partial<Omit<TeamMember, "id">>) => {
    const { error } = await supabase.from("team_members").update(changes as any).eq("id", id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["team-members", workspaceId] });
  }, [workspaceId, qc]);

  const removeMember = useCallback(async (id: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["team-members", workspaceId] });
  }, [workspaceId, qc]);

  return { members, loading, addMember, updateMember, removeMember, refresh: invalidate };
}
