import { useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface Post {
  id: string;
  conteudo: string;
  local: string;
  responsavel: string;
  status: string;
  data_postagem: string;
  link_canva: string;
  tipo_conteudo: string;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  workspace_id?: string;
}

export interface PostsDateRange {
  from?: string;
  to?: string;
}

async function fetchActivePosts(workspaceId: string, range?: PostsDateRange): Promise<Post[]> {
  let q = supabase
    .from("posts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("data_postagem", { ascending: true });
  if (range?.from) q = q.gte("data_postagem", range.from);
  if (range?.to) q = q.lte("data_postagem", range.to);
  q = q.limit(500);
  const { data } = await q;
  return (data ?? []) as Post[];
}

async function fetchTrashedPosts(workspaceId: string): Promise<Post[]> {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .not("deleted_at", "is", null)
    .order("data_postagem", { ascending: true })
    .limit(200);
  return (data ?? []) as Post[];
}

export function usePosts(dateRange?: PostsDateRange) {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const enabled = !!workspaceId;
  const rangeKey = dateRange ? `${dateRange.from ?? ""}_${dateRange.to ?? ""}` : "all";
  const activeKey = ["posts", "active", workspaceId, rangeKey] as const;
  const trashedKey = ["posts", "trashed", workspaceId] as const;

  const activeQ = useQuery({
    queryKey: [...activeKey],
    queryFn: () => fetchActivePosts(workspaceId!, dateRange),
    enabled,
    staleTime: 3 * 60_000,
  });

  const trashedQ = useQuery({
    queryKey: [...trashedKey],
    queryFn: () => fetchTrashedPosts(workspaceId!),
    enabled,
    staleTime: 3 * 60_000,
  });

  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`posts-realtime-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;

        const updateList = (prev: Post[] | undefined, isActive: boolean): Post[] => {
          if (!prev) return [];
          // Remove temp items that match the real item (by content + date)
          let list = eventType === "INSERT"
            ? prev.filter(p => !p.id.startsWith("temp-"))
            : [...prev];

          if (eventType === "DELETE") {
            return list.filter(p => p.id !== (oldRow as any)?.id);
          }
          const item = newRow as Post;
          const isTrashed = !!item.deleted_at;

          if (isActive && isTrashed) return list.filter(p => p.id !== item.id);
          if (!isActive && !isTrashed) return list.filter(p => p.id !== item.id);

          const idx = list.findIndex(p => p.id === item.id);
          if (idx >= 0) {
            list[idx] = item;
          } else if ((isActive && !isTrashed) || (!isActive && isTrashed)) {
            list = [...list, item];
          }
          return list;
        };

        qc.setQueriesData<Post[]>({ queryKey: ["posts", "active", workspaceId] }, (old) => updateList(old, true));
        qc.setQueriesData<Post[]>({ queryKey: ["posts", "trashed", workspaceId] }, (old) => updateList(old, false));
        qc.invalidateQueries({ queryKey: ["posts", "active", workspaceId] });
        qc.invalidateQueries({ queryKey: ["posts", "trashed", workspaceId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, qc]);

  const posts = activeQ.data ?? [];
  const trashedPosts = trashedQ.data ?? [];
  const loading = activeQ.isLoading;

  const responsaveis = useMemo(
    () => [...new Set(posts.map(p => p.responsavel).filter(Boolean))],
    [posts]
  );

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["posts"] });
  }, [qc]);

  const addPost = useCallback(async (post: Omit<Post, "id" | "created_at" | "workspace_id">) => {
    if (!workspaceId) throw new Error("No workspace");
    const tempId = `temp-${Date.now()}`;
    const optimistic: Post = {
      ...post, id: tempId, created_at: new Date().toISOString(), workspace_id: workspaceId,
      deleted_at: null, deleted_by: null,
    };
    // Instantly inject into all active query caches
    qc.setQueriesData<Post[]>({ queryKey: ["posts", "active", workspaceId] }, (old) => [...(old ?? []), optimistic]);
    try {
      const { error } = await supabase.from("posts").insert({ ...post, workspace_id: workspaceId });
      if (error) throw error;
    } catch (err) {
      // Rollback: remove the optimistic item
      qc.setQueriesData<Post[]>({ queryKey: ["posts", "active", workspaceId] }, (old) => (old ?? []).filter(p => p.id !== tempId));
      throw err;
    }
  }, [workspaceId, qc]);

  const updatePost = useCallback(async (id: string, changes: Partial<Omit<Post, "id" | "created_at">>) => {
    const { error } = await supabase.from("posts").update(changes).eq("id", id);
    if (error) throw error;
  }, []);

  const deletePost = useCallback(async (id: string) => {
    const { error } = await supabase.from("posts").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    if (error) throw error;
  }, []);

  const restorePost = useCallback(async (id: string) => {
    const { error } = await supabase.from("posts").update({ deleted_at: null, deleted_by: null } as any).eq("id", id);
    if (error) throw error;
  }, []);

  const permanentDeletePost = useCallback(async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw error;
  }, []);

  return { posts, trashedPosts, loading, responsaveis, addPost, updatePost, deletePost, restorePost, permanentDeletePost, refresh: invalidate };
}
