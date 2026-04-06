import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PendingStatus {
  status: "pending" | "approved" | "rejected" | null;
  workspaceName: string | null;
  loading: boolean;
}

/**
 * Polls every `intervalMs` to check if the current user
 * has been approved/rejected in their target workspace.
 * Uses the `memberships` view (approved) and `get_my_pending_status` RPC.
 */
export function usePendingStatus(intervalMs = 2000): PendingStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const redirected = useRef(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const targetWsId = localStorage.getItem("targetWorkspaceId");
    const storedName = localStorage.getItem("pendingWorkspaceName");
    if (storedName) setWorkspaceName(storedName);

    // Initial check + fetch workspace name
    const checkStatus = async () => {
      // Check if approved in memberships view
      if (targetWsId) {
        const { data } = await supabase
          .from("memberships")
          .select("id")
          .eq("user_id", user.id)
          .eq("workspace_id", targetWsId)
          .limit(1)
          .single();
        if (data) {
          setStatus("approved");
          setLoading(false);
          return;
        }
      } else {
        const { data } = await supabase
          .from("memberships")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .single();
        if (data) {
          setStatus("approved");
          setLoading(false);
          return;
        }
      }

      // Check pending/rejected via RPC
      try {
        const { data: pendingData } = await (supabase as any).rpc("get_my_pending_status");
        if (pendingData?.status === "rejected") {
          setStatus("rejected");
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus("pending");
      }

      // Fetch workspace name if not from localStorage
      if (!storedName && targetWsId) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("name")
          .eq("id", targetWsId)
          .single();
        if (ws) setWorkspaceName(ws.name);
      }

      setLoading(false);
    };

    checkStatus();
    const poll = setInterval(checkStatus, intervalMs);
    return () => clearInterval(poll);
  }, [user, intervalMs]);

  return { status, workspaceName, loading };
}
