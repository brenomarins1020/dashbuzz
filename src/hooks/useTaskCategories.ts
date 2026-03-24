import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useCallback } from "react";

export interface TaskCategoryOption {
  id: string;
  workspace_id: string;
  group_number: number;
  name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

async function fetchOptions(workspaceId: string): Promise<TaskCategoryOption[]> {
  const { data, error } = await supabase
    .from("task_category_options")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as TaskCategoryOption[];
}

export function useTaskCategories() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const queryKey = ["task-categories", workspaceId];

  const { data: options = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchOptions(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60_000,
  });

  const group1 = options.filter(o => o.group_number === 1);
  const group2 = options.filter(o => o.group_number === 2);
  const activeGroup1 = group1.filter(o => o.is_active);
  const activeGroup2 = group2.filter(o => o.is_active);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey });
  }, [qc, queryKey]);

  const addOption = useCallback(async (groupNumber: number, data: { name: string; color?: string }) => {
    if (!workspaceId) return;
    const group = groupNumber === 1 ? group1 : group2;
    const maxOrder = group.length > 0 ? Math.max(...group.map(o => o.sort_order)) + 1 : 0;
    await supabase.from("task_category_options").insert({
      workspace_id: workspaceId,
      group_number: groupNumber,
      name: data.name,
      color: data.color || "#3b82f6",
      sort_order: maxOrder,
    } as any);
    invalidate();
  }, [workspaceId, group1, group2, invalidate]);

  const updateOption = useCallback(async (id: string, changes: Partial<TaskCategoryOption>) => {
    await supabase.from("task_category_options").update(changes as any).eq("id", id);
    invalidate();
  }, [invalidate]);

  const deleteOption = useCallback(async (id: string) => {
    await supabase.from("task_category_options").delete().eq("id", id);
    invalidate();
  }, [invalidate]);

  return {
    options,
    group1,
    group2,
    activeGroup1,
    activeGroup2,
    loading: isLoading,
    addOption,
    updateOption,
    deleteOption,
  };
}
