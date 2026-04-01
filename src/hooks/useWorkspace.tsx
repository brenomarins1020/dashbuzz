import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { migrateLocalStorageToDb } from "@/lib/migrateLocalStorage";

interface WorkspaceContextType {
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceType: string | null;
  workspaceCreatedAt: string | null;
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

      // Check target workspace from join flow
      const targetWsId = localStorage.getItem("targetWorkspaceId");

      // Get all memberships for this user
      const { data: memberships } = await supabase
        .from("memberships")
        .select("workspace_id, role")
        .eq("user_id", user.id);

      // If user has a target workspace, check if they're approved there
      if (targetWsId && memberships) {
        const targetMembership = memberships.find(m => m.workspace_id === targetWsId);
        if (targetMembership) {
          // Approved in target workspace — go there
          localStorage.removeItem("targetWorkspaceId");
          localStorage.removeItem("pendingAccessCode");
          localStorage.removeItem("pendingWorkspaceName");
          const wsId = targetMembership.workspace_id;
          const role = (targetMembership as any).role || "member";
          setWorkspaceId(wsId);
          setUserRole(role);
          setHasPendingRequest(false);

          const { data: ws } = await supabase.from("workspaces").select("*").eq("id", wsId).single();
          if (ws) {
            setWorkspaceName(ws.name);
            setWorkspaceType(ws.type);
            setWorkspaceCreatedAt(ws.created_at);
            const cat1Raw = (ws as any).task_cat1_label;
            const cat1 = (!cat1Raw || cat1Raw === "Categoria 1") ? "Área" : cat1Raw;
            setTaskCat1Label(cat1);
            setTaskCat2Label((ws as any).task_cat2_label || "Categoria 2");
          }
          await migrateLocalStorageToDb(wsId);
          return;
        } else {
          // Not approved in target workspace — must be pending
          setWorkspaceId(null);
          setWorkspaceName(null);
          setWorkspaceType(null);
          setWorkspaceCreatedAt(null);
          setHasPendingRequest(true);
          setLoading(false);
          return;
        }
      }

      if (memberships && memberships.length > 0) {
        localStorage.removeItem("targetWorkspaceId");
        const wsId = memberships[0].workspace_id;
        const role = (memberships[0] as any).role || "member";
        setWorkspaceId(wsId);
        setUserRole(role);
        setHasPendingRequest(false);

        const { data: ws } = await supabase
          .from("workspaces")
          .select("*")
          .eq("id", wsId)
          .single();

        if (ws) {
          setWorkspaceName(ws.name);
          setWorkspaceType(ws.type);
          setWorkspaceCreatedAt(ws.created_at);
          const cat1Raw = (ws as any).task_cat1_label;
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
      setHasPendingRequest(false);

      // Only auto-create workspace if user came from admin flow (not join flow)
      const isJoinFlow = localStorage.getItem("pendingAccessCode") || localStorage.getItem("targetWorkspaceId");
      const obType = localStorage.getItem("onboardingType");
      const obName = localStorage.getItem("onboardingName");
      if (obType && obName && !creatingRef.current && !isJoinFlow) {
        creatingRef.current = true;
        try {
          const { data: wsId, error: rpcErr } = await supabase
            .rpc("create_workspace_with_membership", { _type: obType, _name: obName });
          if (!rpcErr && wsId) {
            await fetchWorkspace();
          } else {
            console.error("Auto-create workspace failed:", rpcErr);
          }
        } catch (e) {
          console.error("Auto-create workspace failed:", e);
        }
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
    setUserRole("admin");
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
      value={{ workspaceId, workspaceName, workspaceType, workspaceCreatedAt, taskCat1Label, taskCat2Label, loading, hasPendingRequest, isAdmin: userRole === "admin", userRole, createWorkspace, updateCategoryLabels, refresh: fetchWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
