import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { migrateLocalStorageToDb } from "@/lib/migrateLocalStorage";

interface WorkspaceContextType {
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceType: string | null;
  workspaceCreatedAt: string | null;
  joinCode: string | null;
  taskCat1Label: string;
  taskCat2Label: string;
  loading: boolean;
  hasPendingRequest: boolean;
  isAdmin: boolean;
  userRole: string;
  createWorkspace: (type: string, name: string) => Promise<string>;
  updateCategoryLabels: (cat1: string, cat2: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  workspaceName: null,
  workspaceType: null,
  workspaceCreatedAt: null,
  joinCode: null,
  taskCat1Label: "Categoria 1",
  taskCat2Label: "Categoria 2",
  loading: true,
  hasPendingRequest: false,
  isAdmin: false,
  userRole: "member",
  createWorkspace: async () => "",
  updateCategoryLabels: async () => {},
  refresh: async () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [workspaceType, setWorkspaceType] = useState<string | null>(null);
  const [workspaceCreatedAt, setWorkspaceCreatedAt] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [taskCat1Label, setTaskCat1Label] = useState("Categoria 1");
  const [taskCat2Label, setTaskCat2Label] = useState("Categoria 2");
  const [loading, setLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [userRole, setUserRole] = useState("member");
  const creatingRef = useRef(false);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);

    try {
      if (!user) {
        setWorkspaceId(null);
        setWorkspaceName(null);
        setWorkspaceType(null);
        setWorkspaceCreatedAt(null);
        setHasPendingRequest(false);
        return;
      }

      const { data: memberships } = await supabase
        .from("memberships")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .limit(1);

      if (memberships && memberships.length > 0) {
        const wsId = memberships[0].workspace_id;
        const role = (memberships[0] as any).role || "member";
        setWorkspaceId(wsId);
        setUserRole(role);
        setHasPendingRequest(false);

        const [{ data: ws }, { data: joinCodeValue }] = await Promise.all([
          supabase
            .from("workspaces")
            .select("name, type, created_at, task_cat1_label, task_cat2_label, join_code")
            .eq("id", wsId)
            .single(),
          supabase.rpc("get_my_workspace_join_code" as any),
        ]);

        // Use whichever returns a value first
        const code = (ws as any)?.join_code || (joinCodeValue as string | null) || null;
        setJoinCode(code);

        if (ws) {
          setWorkspaceName(ws.name);
          setWorkspaceType(ws.type);
          setWorkspaceCreatedAt(ws.created_at);
          const cat1Raw = (ws as any).task_cat1_label;
          // Auto-migrate old default "Categoria 1" → "Área"
          const cat1 = (!cat1Raw || cat1Raw === "Categoria 1") ? "Área" : cat1Raw;
          if (!cat1Raw || cat1Raw === "Categoria 1") {
            supabase.from("workspaces").update({ task_cat1_label: "Área" } as any).eq("id", wsId).then(() => {});
          }
          setTaskCat1Label(cat1);
          setTaskCat2Label((ws as any).task_cat2_label || "Categoria 2");
          localStorage.setItem("onboardingName", ws.name);
          localStorage.setItem("onboardingType", ws.type);
        }

        await migrateLocalStorageToDb(wsId);
        return;
      }

      setWorkspaceId(null);
      setWorkspaceName(null);
      setWorkspaceType(null);
      setWorkspaceCreatedAt(null);

      const { data: joinRequests } = await supabase
        .from("workspace_join_requests")
        .select("id, status")
        .eq("user_id", user.id)
        .in("status", ["pending", "rejected"])
        .limit(1);

      if (joinRequests && joinRequests.length > 0) {
        setHasPendingRequest(true);
        return;
      }

      setHasPendingRequest(false);

      const obType = localStorage.getItem("onboardingType");
      const obName = localStorage.getItem("onboardingName");
      if (obType && obName && !creatingRef.current) {
        creatingRef.current = true;
        try {
          const { data: wsId, error: rpcErr } = await supabase
            .rpc("create_workspace_with_membership", { _type: obType, _name: obName });
          if (!rpcErr && wsId) {
            // Re-fetch para confirmar o papel "admin" diretamente do banco
            // (creatingRef=true garante que não haverá loop infinito)
            await fetchWorkspace();
          } else {
            // Don't retry on error — clear onboarding data to stop loop
            console.error("Auto-create workspace failed:", rpcErr);
          }
        } catch (e) {
          console.error("Auto-create workspace failed:", e);
        }
        // Never reset creatingRef to prevent infinite retry loops
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchWorkspace();
    }
  }, [authLoading, fetchWorkspace]);

  // Realtime: detect role changes and removal from workspace
  useEffect(() => {
    if (!user || !workspaceId) return;

    const channel = supabase
      .channel(`membership-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "memberships",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // User was removed — sign out and redirect
          supabase.auth.signOut().then(() => {
            window.location.href = "/welcome";
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "memberships",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRole = (payload.new as any)?.role;
          if (newRole && newRole !== userRole) {
            setUserRole(newRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, workspaceId, userRole]);

  const createWorkspace = useCallback(async (type: string, name: string): Promise<string> => {
    if (!user) throw new Error("Not authenticated");

    const { data: wsId, error } = await supabase
      .rpc("create_workspace_with_membership", { _type: type, _name: name });

    if (error) throw error;

    setWorkspaceId(wsId);
    setWorkspaceName(name);
    setWorkspaceType(type);
    setUserRole("admin"); // criador SEMPRE é admin
    localStorage.setItem("onboardingName", name);
    localStorage.setItem("onboardingType", type);

    await fetchWorkspace();

    return wsId;
  }, [user, fetchWorkspace]);

  const updateCategoryLabels = useCallback(async (cat1: string, cat2: string) => {
    if (!workspaceId) return;
    await supabase.from("workspaces").update({ task_cat1_label: cat1, task_cat2_label: cat2 } as any).eq("id", workspaceId);
    setTaskCat1Label(cat1);
    setTaskCat2Label(cat2);
  }, [workspaceId]);

  return (
    <WorkspaceContext.Provider
      value={{ workspaceId, workspaceName, workspaceType, workspaceCreatedAt, joinCode, taskCat1Label, taskCat2Label, loading, hasPendingRequest, isAdmin: userRole === "admin", userRole, createWorkspace, updateCategoryLabels, refresh: fetchWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
