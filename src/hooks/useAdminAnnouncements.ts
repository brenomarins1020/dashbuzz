import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Announcement } from "@/hooks/useAnnouncements";

export function useIsSystemAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); setLoading(false); return; }
      // Check via the DB function
      const { data } = await supabase.rpc("is_system_admin" as any, { _user_id: user.id });
      setIsAdmin(!!data);
      setLoading(false);
    })();
  }, []);

  return { isAdmin, loading };
}

export function useAdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("global_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setAnnouncements((data as Announcement[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = useCallback(async (ann: Partial<Announcement>) => {
    const { error } = await supabase.from("global_announcements").insert(ann as any);
    if (error) throw error;
    await fetch();
  }, [fetch]);

  const update = useCallback(async (id: string, changes: Partial<Announcement>) => {
    const { error } = await supabase.from("global_announcements").update(changes as any).eq("id", id);
    if (error) throw error;
    await fetch();
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("global_announcements").delete().eq("id", id);
    if (error) throw error;
    await fetch();
  }, [fetch]);

  return { announcements, loading, create, update, remove, refresh: fetch };
}
