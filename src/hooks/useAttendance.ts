import { useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addWeeks, addMonths, addDays, isBefore, isAfter, parseISO, format, getDay, nextDay } from "date-fns";

export interface MeetingType {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  description?: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  workspace_id: string;
  meeting_type_id: string | null;
  title: string;
  location: string | null;
  date: string;
  time: string | null;
  recurrence: string;
  recurrence_end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface MeetingOccurrence {
  id: string;
  meeting_id: string;
  workspace_id: string;
  occurrence_date: string;
  cancelled: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  occurrence_id: string;
  workspace_id: string;
  member_name: string;
  member_id: string | null;
  status: "present" | "absent" | "justified";
  justification: string | null;
  created_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  workspace_id: string;
  member_name: string;
  member_id: string | null;
  created_at: string;
}

const MIN_DATE = "2026-01-01";

function generateOccurrenceDates(
  startDate: string,
  recurrence: string,
  endDate: string | null
): string[] {
  if (recurrence === "none") {
    const effectiveStart = startDate < MIN_DATE ? MIN_DATE : startDate;
    return [effectiveStart];
  }

  const originalStart = parseISO(startDate);
  const minDate = parseISO(MIN_DATE);
  const end = endDate ? parseISO(endDate) : addMonths(new Date(), 12);
  const dates: string[] = [];

  // If start is before MIN_DATE, find the first occurrence >= MIN_DATE
  // that matches the original day of week
  let current: Date;
  if (isBefore(originalStart, minDate)) {
    // Advance from original start using the recurrence step until >= MIN_DATE
    current = originalStart;
    while (isBefore(current, minDate)) {
      if (recurrence === "weekly") current = addWeeks(current, 1);
      else if (recurrence === "biweekly") current = addWeeks(current, 2);
      else if (recurrence === "monthly") current = addMonths(current, 1);
      else break;
    }
  } else {
    current = originalStart;
  }

  while (!isAfter(current, end) && dates.length < 200) {
    dates.push(format(current, "yyyy-MM-dd"));
    if (recurrence === "weekly") current = addWeeks(current, 1);
    else if (recurrence === "biweekly") current = addWeeks(current, 2);
    else if (recurrence === "monthly") current = addMonths(current, 1);
    else break;
  }
  return dates;
}

export function useAttendance() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const enabled = !!workspaceId;

  // Meeting types (standalone query so types show up even before any meeting exists)
  const meetingTypesQ = useQuery({
    queryKey: ["meeting-types", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("meeting_types")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      return (data ?? []) as MeetingType[];
    },
    enabled,
    staleTime: 5 * 60_000,
  });

  // Meetings with types (consolidated query)
  const meetingsWithTypesQ = useQuery({
    queryKey: ["meetings-with-types", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*, meeting_types(*)")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: false });
      return (data ?? []) as (Meeting & { meeting_types: MeetingType | null })[];
    },
    enabled,
    staleTime: 5 * 60_000,
  });

  // Occurrences
  const occurrencesQ = useQuery({
    queryKey: ["meeting-occurrences", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("meeting_occurrences")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("occurrence_date", { ascending: false });
      return (data ?? []) as MeetingOccurrence[];
    },
    enabled,
    staleTime: 5 * 60_000,
  });

  // Attendance
  const attendanceQ = useQuery({
    queryKey: ["attendance-records", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("workspace_id", workspaceId!);
      return (data ?? []) as AttendanceRecord[];
    },
    enabled,
    staleTime: 5 * 60_000,
  });

  // Participants
  const participantsQ = useQuery({
    queryKey: ["meeting-participants", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("meeting_participants")
        .select("*")
        .eq("workspace_id", workspaceId!);
      return (data ?? []) as MeetingParticipant[];
    },
    enabled,
    staleTime: 5 * 60_000,
  });

  // Realtime
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`attendance-realtime-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings", filter: `workspace_id=eq.${workspaceId}` }, () => {
        qc.invalidateQueries({ queryKey: ["meetings-with-types", workspaceId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_types", filter: `workspace_id=eq.${workspaceId}` }, () => {
        qc.invalidateQueries({ queryKey: ["meeting-types", workspaceId] });
        qc.invalidateQueries({ queryKey: ["meetings-with-types", workspaceId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_occurrences", filter: `workspace_id=eq.${workspaceId}` }, () => {
        qc.invalidateQueries({ queryKey: ["meeting-occurrences", workspaceId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records", filter: `workspace_id=eq.${workspaceId}` }, () => {
        qc.invalidateQueries({ queryKey: ["attendance-records", workspaceId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_participants", filter: `workspace_id=eq.${workspaceId}` }, () => {
        qc.invalidateQueries({ queryKey: ["meeting-participants", workspaceId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, qc]);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["meeting-types"] });
    qc.invalidateQueries({ queryKey: ["meetings-with-types"] });
    qc.invalidateQueries({ queryKey: ["meeting-occurrences"] });
    qc.invalidateQueries({ queryKey: ["attendance-records"] });
    qc.invalidateQueries({ queryKey: ["meeting-participants"] });
  }, [qc]);

  // CRUD: Meeting Types
  const addMeetingType = useCallback(async (data: { name: string; color: string; description?: string }): Promise<string> => {
    if (!workspaceId) throw new Error("No workspace");
    const { data: inserted, error } = await supabase
      .from("meeting_types")
      .insert({ ...data, workspace_id: workspaceId } as any)
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return (inserted as any).id as string;
  }, [workspaceId, refresh]);

  const updateMeetingType = useCallback(async (id: string, changes: Partial<MeetingType>) => {
    const { error } = await supabase.from("meeting_types").update(changes as any).eq("id", id);
    if (error) throw error;
    refresh();
  }, [refresh]);

  const deleteMeetingType = useCallback(async (id: string) => {
    const { error } = await supabase.from("meeting_types").delete().eq("id", id);
    if (error) throw error;
    refresh();
  }, [refresh]);

  // CRUD: Meetings + auto-generate occurrences
  const addMeeting = useCallback(async (
    data: Omit<Meeting, "id" | "workspace_id" | "created_at">,
    participantNames: string[]
  ) => {
    if (!workspaceId) throw new Error("No workspace");
    const { data: inserted, error } = await supabase
      .from("meetings")
      .insert({ ...data, workspace_id: workspaceId } as any)
      .select()
      .single();
    if (error) throw error;
    const meetingId = (inserted as any).id;

    // Generate occurrences
    const dates = generateOccurrenceDates(data.date, data.recurrence, data.recurrence_end_date ?? null);
    if (dates.length > 0) {
      const occRows = dates.map(d => ({
        meeting_id: meetingId,
        workspace_id: workspaceId,
        occurrence_date: d,
        cancelled: false,
      }));
      await supabase.from("meeting_occurrences").insert(occRows as any);
    }

    // Add participants
    if (participantNames.length > 0) {
      const pRows = participantNames.map(name => ({
        meeting_id: meetingId,
        workspace_id: workspaceId,
        member_name: name,
      }));
      await supabase.from("meeting_participants").insert(pRows as any);
    }

    refresh();
    return meetingId;
  }, [workspaceId, refresh]);

  const updateMeeting = useCallback(async (id: string, changes: Partial<Meeting>) => {
    const { error } = await supabase.from("meetings").update(changes as any).eq("id", id);
    if (error) throw error;
    refresh();
  }, [refresh]);

  const deleteMeeting = useCallback(async (id: string) => {
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) throw error;
    refresh();
  }, [refresh]);

  // Add a single occurrence (optimistic)
  const addOccurrence = useCallback(async (meetingId: string, date: string) => {
    if (!workspaceId) throw new Error("No workspace");
    const tempId = crypto.randomUUID();
    const optimistic: MeetingOccurrence = {
      id: tempId,
      meeting_id: meetingId,
      workspace_id: workspaceId,
      occurrence_date: date,
      cancelled: false,
      created_at: new Date().toISOString(),
    };

    qc.setQueryData<MeetingOccurrence[]>(["meeting-occurrences", workspaceId], (old) =>
      [...(old ?? []), optimistic]
    );

    (async () => {
      try {
        await supabase.from("meeting_occurrences").insert({
          meeting_id: meetingId,
          workspace_id: workspaceId,
          occurrence_date: date,
          cancelled: false,
        } as any);
        qc.invalidateQueries({ queryKey: ["meeting-occurrences", workspaceId] });
      } catch {
        qc.invalidateQueries({ queryKey: ["meeting-occurrences", workspaceId] });
      }
    })();

    return tempId;
  }, [workspaceId, qc]);

  // Cancel occurrence (soft delete, optimistic)
  const cancelOccurrence = useCallback(async (occurrenceId: string) => {
    if (!workspaceId) throw new Error("No workspace");

    qc.setQueryData<MeetingOccurrence[]>(["meeting-occurrences", workspaceId], (old) =>
      (old ?? []).map(o => o.id === occurrenceId ? { ...o, cancelled: true } : o)
    );

    (async () => {
      try {
        await supabase.from("meeting_occurrences").update({ cancelled: true } as any).eq("id", occurrenceId);
        qc.invalidateQueries({ queryKey: ["meeting-occurrences", workspaceId] });
      } catch {
        qc.invalidateQueries({ queryKey: ["meeting-occurrences", workspaceId] });
      }
    })();
  }, [workspaceId, qc]);

  // Undo cancel occurrence (optimistic)
  const uncancelOccurrence = useCallback(async (occurrenceId: string) => {
    if (!workspaceId) throw new Error("No workspace");

    qc.setQueryData<MeetingOccurrence[]>(["meeting-occurrences", workspaceId], (old) =>
      (old ?? []).map(o => o.id === occurrenceId ? { ...o, cancelled: false } : o)
    );

    (async () => {
      try {
        await supabase.from("meeting_occurrences").update({ cancelled: false } as any).eq("id", occurrenceId);
        qc.invalidateQueries({ queryKey: ["meeting-occurrences", workspaceId] });
      } catch {
        qc.invalidateQueries({ queryKey: ["meeting-occurrences", workspaceId] });
      }
    })();
  }, [workspaceId, qc]);

  // Update occurrence date (optimistic) — keeps attendance records
  const updateOccurrenceDate = useCallback(async (occurrenceId: string, newDate: string) => {
    if (!workspaceId) throw new Error("No workspace");

    qc.setQueryData<MeetingOccurrence[]>(["meeting-occurrences", workspaceId], (old) =>
      (old ?? []).map(o => o.id === occurrenceId ? { ...o, occurrence_date: newDate } : o)
    );

    (async () => {
      try {
        await supabase.from("meeting_occurrences").update({ occurrence_date: newDate } as any).eq("id", occurrenceId);
        qc.invalidateQueries({ queryKey: ["meeting-occurrences", workspaceId] });
      } catch {
        qc.invalidateQueries({ queryKey: ["meeting-occurrences", workspaceId] });
      }
    })();
  }, [workspaceId, qc]);

  // Attendance (optimistic)
  const saveAttendance = useCallback(async (
    occurrenceId: string,
    newRecords: { member_name: string; member_id?: string | null; status: string; justification?: string | null }[]
  ) => {
    if (!workspaceId) throw new Error("No workspace");

    const optimisticRows = newRecords.map(r => ({
      id: crypto.randomUUID(),
      occurrence_id: occurrenceId,
      workspace_id: workspaceId,
      member_name: r.member_name,
      member_id: r.member_id || null,
      status: r.status as "present" | "absent" | "justified",
      justification: r.justification || null,
      created_at: new Date().toISOString(),
    }));

    qc.setQueryData<AttendanceRecord[]>(["attendance-records", workspaceId], (old) => {
      if (!old) return optimisticRows;
      const filtered = old.filter(r => r.occurrence_id !== occurrenceId);
      return [...filtered, ...optimisticRows];
    });

    (async () => {
      try {
        await supabase.from("attendance_records").delete().eq("occurrence_id", occurrenceId);
        const rows = newRecords.map(r => ({
          occurrence_id: occurrenceId,
          workspace_id: workspaceId,
          member_name: r.member_name,
          member_id: r.member_id || null,
          status: r.status,
          justification: r.justification || null,
        }));
        if (rows.length > 0) {
          await supabase.from("attendance_records").insert(rows as any);
        }
        qc.invalidateQueries({ queryKey: ["attendance-records", workspaceId] });
      } catch {
        qc.invalidateQueries({ queryKey: ["attendance-records", workspaceId] });
      }
    })();
  }, [workspaceId, qc]);

  // Participants (optimistic)
  const updateParticipants = useCallback(async (meetingId: string, names: string[]) => {
    if (!workspaceId) throw new Error("No workspace");

    const optimisticRows = names.map(name => ({
      id: crypto.randomUUID(),
      meeting_id: meetingId,
      workspace_id: workspaceId,
      member_name: name,
      member_id: null,
      created_at: new Date().toISOString(),
    }));

    qc.setQueryData<MeetingParticipant[]>(["meeting-participants", workspaceId], (old) => {
      if (!old) return optimisticRows;
      const filtered = old.filter(p => p.meeting_id !== meetingId);
      return [...filtered, ...optimisticRows];
    });

    (async () => {
      try {
        await supabase.from("meeting_participants").delete().eq("meeting_id", meetingId);
        if (names.length > 0) {
          const rows = names.map(name => ({
            meeting_id: meetingId,
            workspace_id: workspaceId,
            member_name: name,
          }));
          await supabase.from("meeting_participants").insert(rows as any);
        }
        qc.invalidateQueries({ queryKey: ["meeting-participants", workspaceId] });
      } catch {
        qc.invalidateQueries({ queryKey: ["meeting-participants", workspaceId] });
      }
    })();
  }, [workspaceId, qc]);

  // Extract meetings from consolidated query
  const rawMeetingsWithTypes = meetingsWithTypesQ.data ?? [];
  const meetings = useMemo(() => rawMeetingsWithTypes.map(({ meeting_types: _, ...m }) => m as Meeting), [rawMeetingsWithTypes]);
  // Use the standalone meeting-types query so types appear even before any meeting exists
  const meetingTypes = meetingTypesQ.data ?? [];

  return {
    meetingTypes,
    meetings,
    occurrences: occurrencesQ.data ?? [],
    attendance: attendanceQ.data ?? [],
    participants: participantsQ.data ?? [],
    loading: meetingTypesQ.isLoading || meetingsWithTypesQ.isLoading || occurrencesQ.isLoading || attendanceQ.isLoading || participantsQ.isLoading,
    addMeetingType,
    updateMeetingType,
    deleteMeetingType,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    addOccurrence,
    cancelOccurrence,
    uncancelOccurrence,
    updateOccurrenceDate,
    saveAttendance,
    updateParticipants,
    refresh,
  };
}
