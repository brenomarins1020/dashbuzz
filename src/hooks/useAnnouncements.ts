import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  style: "info" | "warning" | "urgent";
  priority: number;
  is_active: boolean;
  start_at: string;
  end_at: string | null;
  require_ack: boolean;
  link_url: string | null;
  created_at: string;
}

export function useAnnouncements() {
  const [unread, setUnread] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnread = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const now = new Date().toISOString();

    // Fetch active announcements
    const { data: announcements, error: aErr } = await supabase
      .from("global_announcements")
      .select("*")
      .eq("is_active", true)
      .lte("start_at", now)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (aErr || !announcements) { setLoading(false); return; }

    // Filter end_at client-side (null = no expiry)
    const active = (announcements as Announcement[]).filter(
      (a) => !a.end_at || a.end_at >= now
    );

    // Fetch reads for this user
    const { data: reads } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", user.id);

    const readIds = new Set((reads || []).map((r: any) => r.announcement_id));
    setUnread(active.filter((a) => !readIds.has(a.id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUnread();

    // Realtime: refetch when announcements change
    const channel = supabase
      .channel("global-announcements-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "global_announcements" }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUnread]);

  const markAsRead = useCallback(async (announcementId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("announcement_reads").insert({
      announcement_id: announcementId,
      user_id: user.id,
    } as any);

    setUnread((prev) => prev.filter((a) => a.id !== announcementId));
  }, []);

  return { unread, loading, markAsRead, refresh: fetchUnread };
}
