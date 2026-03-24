import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useEffect } from "react";

export interface Task {
  id: string;
  title: string;
  category: string;
  category_2: string;
  assignee: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed: boolean;
  workspace_id?: string;
  created_at?: string;
}

async function fetchTasks(workspaceId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export function useTasks() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const queryKey = ["tasks", workspaceId];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTasks(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 3 * 60_000,
  });

  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`tasks-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `workspace_id=eq.${workspaceId}` }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, qc]);

  const addTask = async (task: Omit<Task, "id" | "workspace_id" | "created_at">) => {
    if (!workspaceId) return;
    const { error } = await supabase.from("tasks").insert({ ...task, workspace_id: workspaceId } as any);
    if (error) throw error;
    qc.invalidateQueries({ queryKey });
  };

  const updateTask = async (id: string, changes: Partial<Omit<Task, "id">>) => {
    const { error } = await supabase.from("tasks").update(changes as any).eq("id", id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey });
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey });
  };

  return { tasks, loading: isLoading, addTask, updateTask, deleteTask };
}
