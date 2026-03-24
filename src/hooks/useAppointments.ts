import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type AppointmentStatus = "pendente" | "concluído" | "cancelado";
export type AppointmentRecurrence = "nenhuma" | "diária" | "semanal" | "mensal";

export interface Appointment {
  id: string;
  title: string;
  type: string;
  date: string;
  start_time?: string;
  responsible?: string;
  status: AppointmentStatus;
  local?: string;
  notes?: string;
  recurrence: AppointmentRecurrence;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  workspace_id?: string;
}

export interface AppointmentsDateRange {
  from?: string;
  to?: string;
}

async function fetchActiveAppointments(workspaceId: string, range?: AppointmentsDateRange): Promise<Appointment[]> {
  let q = supabase
    .from("appointments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("date", { ascending: true });
  if (range?.from) q = q.gte("date", range.from);
  if (range?.to) q = q.lte("date", range.to);
  q = q.limit(500);
  const { data } = await q;
  return (data ?? []) as Appointment[];
}

async function fetchTrashedAppointments(workspaceId: string): Promise<Appointment[]> {
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .not("deleted_at", "is", null)
    .order("date", { ascending: true })
    .limit(200);
  return (data ?? []) as Appointment[];
}

export function useAppointments(dateRange?: AppointmentsDateRange) {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const enabled = !!workspaceId;
  const rangeKey = dateRange ? `${dateRange.from ?? ""}_${dateRange.to ?? ""}` : "all";
  const activeKey = ["appointments", "active", workspaceId, rangeKey] as const;
  const trashedKey = ["appointments", "trashed", workspaceId] as const;

  const activeQ = useQuery({
    queryKey: [...activeKey],
    queryFn: () => fetchActiveAppointments(workspaceId!, dateRange),
    enabled,
    staleTime: 3 * 60_000,
  });

  const trashedQ = useQuery({
    queryKey: [...trashedKey],
    queryFn: () => fetchTrashedAppointments(workspaceId!),
    enabled,
    staleTime: 3 * 60_000,
  });

  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`appointments-realtime-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;

        const updateList = (prev: Appointment[] | undefined, isActive: boolean): Appointment[] => {
          if (!prev) return [];
          let list = eventType === "INSERT"
            ? prev.filter(a => !a.id.startsWith("temp-"))
            : [...prev];

          if (eventType === "DELETE") {
            return list.filter(a => a.id !== (oldRow as any)?.id);
          }
          const item = newRow as Appointment;
          const isTrashed = !!item.deleted_at;

          if (isActive && isTrashed) return list.filter(a => a.id !== item.id);
          if (!isActive && !isTrashed) return list.filter(a => a.id !== item.id);

          const idx = list.findIndex(a => a.id === item.id);
          if (idx >= 0) {
            list[idx] = item;
          } else if ((isActive && !isTrashed) || (!isActive && isTrashed)) {
            list = [...list, item];
          }
          return list;
        };

        qc.setQueriesData<Appointment[]>({ queryKey: ["appointments", "active", workspaceId] }, (old) => updateList(old, true));
        qc.setQueriesData<Appointment[]>({ queryKey: ["appointments", "trashed", workspaceId] }, (old) => updateList(old, false));
        qc.invalidateQueries({ queryKey: ["appointments", "active", workspaceId] });
        qc.invalidateQueries({ queryKey: ["appointments", "trashed", workspaceId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, qc]);

  const appointments = activeQ.data ?? [];
  const trashedAppointments = trashedQ.data ?? [];
  const loading = activeQ.isLoading;

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["appointments"] });
  }, [qc]);

  const addAppointment = useCallback(async (data: Omit<Appointment, "id" | "created_at" | "workspace_id">) => {
    if (!workspaceId) throw new Error("No workspace");
    const tempId = `temp-${Date.now()}`;
    const optimistic: Appointment = {
      ...data, id: tempId, created_at: new Date().toISOString(), workspace_id: workspaceId,
      deleted_at: null, deleted_by: null,
    };
    qc.setQueriesData<Appointment[]>({ queryKey: ["appointments", "active", workspaceId] }, (old) => [...(old ?? []), optimistic]);
    try {
      const { error } = await supabase.from("appointments").insert({ ...data, workspace_id: workspaceId } as any);
      if (error) throw error;
    } catch (err) {
      qc.setQueriesData<Appointment[]>({ queryKey: ["appointments", "active", workspaceId] }, (old) => (old ?? []).filter(a => a.id !== tempId));
      throw err;
    }
  }, [workspaceId, qc]);

  const updateAppointment = useCallback(async (id: string, changes: Partial<Omit<Appointment, "id" | "created_at">>) => {
    const { error } = await supabase.from("appointments").update(changes as any).eq("id", id);
    if (error) throw error;
  }, []);

  const removeAppointment = useCallback(async (id: string) => {
    const { error } = await supabase.from("appointments").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    if (error) throw error;
  }, []);

  const restoreAppointment = useCallback(async (id: string) => {
    const { error } = await supabase.from("appointments").update({ deleted_at: null, deleted_by: null } as any).eq("id", id);
    if (error) throw error;
  }, []);

  const permanentDeleteAppointment = useCallback(async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) throw error;
  }, []);

  return {
    appointments, trashedAppointments, loading,
    addAppointment, updateAppointment, removeAppointment, restoreAppointment, permanentDeleteAppointment,
    refresh: invalidate,
  };
}
