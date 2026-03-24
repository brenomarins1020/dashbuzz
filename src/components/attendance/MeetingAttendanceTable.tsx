import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { useAttendance } from "@/hooks/useAttendance";
import type { TeamMember } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Plus, UserPlus, Pencil } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  attendance: ReturnType<typeof useAttendance>;
  members: TeamMember[];
  meetingTypeId: string;
  onBack: () => void;
}

type StatusVal = "present" | "absent" | "justified" | null;

const STATUS_CYCLE: StatusVal[] = [null, "present", "absent", "justified"];

function nextStatus(current: StatusVal): StatusVal {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

const MIN_DATE = "2026-01-01";

/* ── Badge Cell with tooltip for justified ── */
function BadgeCell({
  status,
  justification,
  onClick,
  onJustifiedConfirm,
}: {
  status: StatusVal;
  justification: string | null;
  onClick: () => void;
  onJustifiedConfirm: (justification: string | null) => void;
}) {
  const handleClick = () => {
    onClick();
  };

  const config: Record<string, { bg: string; text: string; label: string }> = {
    present: { bg: "bg-emerald-600", text: "text-white", label: "P" },
    absent: { bg: "bg-red-500", text: "text-white", label: "F" },
    justified: { bg: "bg-amber-500", text: "text-white", label: "FJ" },
  };
  const c = status ? config[status] : null;

  const badge = (
    <button
      onClick={handleClick}
      className={cn(
        "h-8 w-8 rounded-full text-[10px] font-bold flex items-center justify-center transition-all hover:scale-110 active:scale-95 select-none",
        c ? `${c.bg} ${c.text}` : "bg-muted text-muted-foreground"
      )}
    >
      {c ? c.label : "?"}
    </button>
  );

  // If justified with justification text, show tooltip on hover
  if (status === "justified" && justification) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            {justification}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

export function MeetingAttendanceTable({ attendance, members, meetingTypeId, onBack }: Props) {
  const { meetings, meetingTypes, occurrences, attendance: records, participants, saveAttendance, updateParticipants, addOccurrence, cancelOccurrence, uncancelOccurrence, updateOccurrenceDate } = attendance;
  const { toast } = useToast();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [hoverColId, setHoverColId] = useState<string | null>(null);
  const [editingOccId, setEditingOccId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const undoTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const meetingType = meetingTypes.find(t => t.id === meetingTypeId);
  const today = format(new Date(), "yyyy-MM-dd");

  // All meetings of this type
  const typeMeetings = useMemo(
    () => meetings.filter(m => m.meeting_type_id === meetingTypeId),
    [meetings, meetingTypeId]
  );

  // Occurrences: only past/today, non-cancelled, >= MIN_DATE, sorted oldest->newest
  const typeOccurrences = useMemo(() => {
    const meetingIds = new Set(typeMeetings.map(m => m.id));
    return occurrences
      .filter(o =>
        meetingIds.has(o.meeting_id) &&
        !o.cancelled &&
        o.occurrence_date >= MIN_DATE &&
        o.occurrence_date <= today
      )
      .sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date));
  }, [typeMeetings, occurrences, today]);

  // All participants across these meetings (unique names)
  const memberNames = useMemo(() => {
    const meetingIds = new Set(typeMeetings.map(m => m.id));
    const names = new Set<string>();
    participants.filter(p => meetingIds.has(p.meeting_id)).forEach(p => names.add(p.member_name));
    return Array.from(names).sort();
  }, [typeMeetings, participants]);

  const availableMembers = useMemo(() => {
    const inSet = new Set(memberNames);
    return members.filter(m => !inSet.has(m.nome));
  }, [members, memberNames]);

  // Local overrides for instant UI updates (independent per cell)
  const [localOverrides, setLocalOverrides] = useState<Record<string, { status: StatusVal; justification: string | null }>>({});

  // Build status+justification map from server records
  const serverStatusMap = useMemo(() => {
    const map: Record<string, { status: StatusVal; justification: string | null }> = {};
    for (const occ of typeOccurrences) {
      for (const name of memberNames) {
        const rec = records.find(r => r.occurrence_id === occ.id && r.member_name === name);
        map[`${name}__${occ.id}`] = rec
          ? { status: rec.status as StatusVal, justification: rec.justification }
          : { status: null, justification: null };
      }
    }
    return map;
  }, [typeOccurrences, memberNames, records]);

  // Clear local overrides when server data arrives (they're now reflected)
  useEffect(() => {
    setLocalOverrides({});
  }, [records]);

  // Merged map: local overrides take priority
  const statusMap = useMemo(() => {
    return { ...serverStatusMap, ...localOverrides };
  }, [serverStatusMap, localOverrides]);

  // Stat: count of past occurrences
  const meetingCount = typeOccurrences.length;

  // Next occurrence (future)
  const nextOccurrence = useMemo(() => {
    const meetingIds = new Set(typeMeetings.map(m => m.id));
    return occurrences
      .filter(o => meetingIds.has(o.meeting_id) && !o.cancelled && o.occurrence_date > today)
      .sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date))[0] ?? null;
  }, [typeMeetings, occurrences, today]);

  // Pending saves queue ref to avoid stale closure issues
  const pendingSaves = useRef<Map<string, { memberName: string; occurrenceId: string; status: StatusVal; justification: string | null }>>(new Map());
  const saveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Toggle attendance status — fully independent per cell
  const handleToggle = useCallback((memberName: string, occurrenceId: string) => {
    const key = `${memberName}__${occurrenceId}`;

    // Read current from local overrides first, then server map
    const current = localOverrides[key]?.status ?? serverStatusMap[key]?.status ?? null;
    const next = nextStatus(current);

    // Immediately update local state (independent, no other cells touched)
    setLocalOverrides(prev => ({
      ...prev,
      [key]: { status: next, justification: null },
    }));

    // Track pending save
    pendingSaves.current.set(key, { memberName, occurrenceId, status: next, justification: null });

    // Debounce the actual save per occurrence to batch rapid clicks on same occurrence
    const timerKey = occurrenceId;
    const existingTimer = saveTimers.current.get(timerKey);
    if (existingTimer) clearTimeout(existingTimer);

    saveTimers.current.set(timerKey, setTimeout(async () => {
      saveTimers.current.delete(timerKey);

      // Collect all pending changes for this occurrence
      const changes = new Map<string, { status: StatusVal; justification: string | null }>();
      for (const [k, v] of pendingSaves.current.entries()) {
        if (v.occurrenceId === occurrenceId) {
          changes.set(v.memberName, { status: v.status, justification: v.justification });
          pendingSaves.current.delete(k);
        }
      }

      // Build final records: start from current server records, apply changes
      const existingRecords = records.filter(r => r.occurrence_id === occurrenceId);
      const finalRecords: { member_name: string; member_id: string | null; status: string; justification: string | null }[] = [];

      // Keep unchanged records
      for (const r of existingRecords) {
        if (!changes.has(r.member_name)) {
          finalRecords.push({
            member_name: r.member_name,
            member_id: r.member_id,
            status: r.status,
            justification: r.justification,
          });
        }
      }

      // Apply changed records
      for (const [name, change] of changes.entries()) {
        if (change.status !== null) {
          finalRecords.push({
            member_name: name,
            member_id: null,
            status: change.status,
            justification: change.justification,
          });
        }
      }

      try {
        await saveAttendance(occurrenceId, finalRecords);
      } catch {
        toast({ title: "Erro ao salvar", variant: "destructive" });
      }
    }, 300));
  }, [localOverrides, serverStatusMap, records, saveAttendance, toast]);

  // Handle justified status with optional justification
  const handleJustified = useCallback(async (memberName: string, occurrenceId: string, justification: string | null) => {
    const existingRecords = records.filter(r => r.occurrence_id === occurrenceId);
    const otherRecords = existingRecords.filter(r => r.member_name !== memberName);

    const newRecords = [
      ...otherRecords.map(r => ({
        member_name: r.member_name,
        member_id: r.member_id,
        status: r.status,
        justification: r.justification,
      })),
      {
        member_name: memberName,
        member_id: null,
        status: "justified",
        justification,
      },
    ];

    try {
      await saveAttendance(occurrenceId, newRecords);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  }, [records, saveAttendance, toast]);

  // Add member to all meetings of this type
  const handleAddMember = async (memberName: string) => {
    try {
      for (const meeting of typeMeetings) {
        const current = participants.filter(p => p.meeting_id === meeting.id).map(p => p.member_name);
        if (!current.includes(memberName)) {
          await updateParticipants(meeting.id, [...current, memberName]);
        }
      }
      setAddMemberOpen(false);
      toast({ title: `${memberName} adicionado(a)` });
    } catch {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (memberName: string) => {
    try {
      for (const meeting of typeMeetings) {
        const current = participants.filter(p => p.meeting_id === meeting.id).map(p => p.member_name);
        if (current.includes(memberName)) {
          await updateParticipants(meeting.id, current.filter(n => n !== memberName));
        }
      }
      toast({ title: `${memberName} removido(a)` });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  // Add new occurrence — always use today so it appears immediately in the table
  const handleAddOccurrence = async () => {
    if (typeMeetings.length === 0) return;
    const meetingId = typeMeetings[0].id;

    // Find the latest occurrence (including future, non-cancelled) for this meeting type
    const meetingIds = new Set(typeMeetings.map(m => m.id));
    const allTypeOccs = occurrences
      .filter(o => meetingIds.has(o.meeting_id) && !o.cancelled)
      .sort((a, b) => b.occurrence_date.localeCompare(a.occurrence_date));

    const lastDate = allTypeOccs[0]?.occurrence_date ?? today;
    let nextDate = format(addDays(parseISO(lastDate), 7), "yyyy-MM-dd");

    // If the calculated date is in the future, use today instead so it shows in the table
    if (nextDate > today) {
      nextDate = today;
    }

    try {
      await addOccurrence(meetingId, nextDate);
      toast({ title: `Reunião adicionada para ${format(parseISO(nextDate), "dd/MM", { locale: ptBR })}` });
    } catch {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
  };

  // Cancel (soft delete) occurrence with undo
  const handleCancelOccurrence = (occId: string, dateStr: string) => {
    cancelOccurrence(occId);

    const formattedDate = format(parseISO(dateStr), "dd/MM", { locale: ptBR });

    // Set undo timer
    const timer = setTimeout(() => {
      undoTimers.current.delete(occId);
    }, 5000);
    undoTimers.current.set(occId, timer);

    toast({
      title: `Reunião de ${formattedDate} removida`,
      action: (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            const t = undoTimers.current.get(occId);
            if (t) {
              clearTimeout(t);
              undoTimers.current.delete(occId);
            }
            uncancelOccurrence(occId);
            toast({ title: "Reunião restaurada" });
          }}
        >
          Desfazer
        </Button>
      ),
    });
  };

  // Edit occurrence date
  const handleEditOccurrence = (occId: string) => {
    const occ = typeOccurrences.find(o => o.id === occId);
    if (occ) {
      setEditDate(parseISO(occ.occurrence_date));
      setEditingOccId(occId);
    }
  };

  const handleSaveEditDate = async () => {
    if (!editingOccId || !editDate) return;
    const newDateStr = format(editDate, "yyyy-MM-dd");
    try {
      await updateOccurrenceDate(editingOccId, newDateStr);
      toast({ title: `Reunião atualizada para ${format(editDate, "dd/MM", { locale: ptBR })}` });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
    setEditingOccId(null);
    setEditDate(undefined);
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      undoTimers.current.forEach(t => clearTimeout(t));
      saveTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Stats per member (past only)
  const memberCountStats = useCallback((name: string) => {
    let p = 0, f = 0, fj = 0;
    for (const occ of typeOccurrences) {
      const key = `${name}__${occ.id}`;
      const s = statusMap[key]?.status;
      if (s === "present") p++;
      else if (s === "absent") f++;
      else if (s === "justified") fj++;
    }
    return { p, f, fj };
  }, [typeOccurrences, statusMap]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: meetingType?.color ?? "#94a3b8" }} />
          <h2 className="text-lg font-bold font-heading tracking-wide uppercase truncate">
            {meetingType?.name ?? "Reunião"}
          </h2>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex gap-3 flex-wrap">
        <div className="glass-card rounded-xl px-4 py-3 text-center flex-1 min-w-[90px]">
          <p className="text-[11px] text-muted-foreground">Reuniões</p>
          <p className="text-xl font-semibold">{meetingCount}</p>
        </div>
        <div className="glass-card rounded-xl px-4 py-3 text-center flex-1 min-w-[90px]">
          <p className="text-[11px] text-muted-foreground">Membros</p>
          <p className="text-xl font-semibold">{memberNames.length}</p>
        </div>
        <div className="glass-card rounded-xl px-4 py-3 text-center flex-1 min-w-[90px]">
          <p className="text-[11px] text-muted-foreground">Próxima</p>
          <p className="text-sm font-semibold mt-1">
            {nextOccurrence
              ? format(parseISO(nextOccurrence.occurrence_date), "dd MMM", { locale: ptBR })
              : "—"}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-emerald-600 inline-flex items-center justify-center text-[9px] font-bold text-white">P</span> Presente</div>
        <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-red-500 inline-flex items-center justify-center text-[9px] font-bold text-white">F</span> Falta</div>
        <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-amber-500 inline-flex items-center justify-center text-[9px] font-bold text-white">FJ</span> Justificada</div>
        <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-muted inline-flex items-center justify-center text-[9px] font-bold text-muted-foreground">?</span> Pendente</div>
        <span className="text-muted-foreground/60">— clique para alternar</span>
      </div>

      {/* Table */}
      {memberNames.length === 0 && typeMeetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Crie uma reunião deste tipo e adicione participantes para começar.</p>
      ) : memberNames.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Adicione participantes a esta reunião.</p>
          <Popover open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/30">
                <UserPlus className="h-3.5 w-3.5" />
                Adicionar pessoa
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {availableMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">
                  Todas as pessoas já foram adicionadas. Cadastre novas na aba Pessoas.
                </p>
              ) : (
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {availableMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleAddMember(m.nome)}
                      className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                      {m.nome}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      ) : typeOccurrences.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma reunião realizada ainda.</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={handleAddOccurrence}>
            <Plus className="h-3.5 w-3.5" /> Adicionar reunião
          </Button>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden max-w-full">
          <div className="overflow-x-auto max-w-[calc(100vw-32px)] md:max-w-full">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 sticky left-0 z-10 min-w-[140px]"
                    style={{ background: "hsl(var(--card))" }}>
                    Membro
                  </th>
                  {typeOccurrences.map(occ => {
                    const isToday = occ.occurrence_date === today;
                    const isEditing = editingOccId === occ.id;
                    return (
                      <th
                        key={occ.id}
                        className={cn(
                          "px-1.5 py-2.5 text-xs font-medium text-center whitespace-nowrap min-w-[48px] relative",
                          isToday ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
                        )}
                        onMouseEnter={() => setHoverColId(occ.id)}
                        onMouseLeave={() => setHoverColId(null)}
                      >
                        <Popover open={isEditing} onOpenChange={(open) => { if (!open) { setEditingOccId(null); setEditDate(undefined); } }}>
                          <PopoverTrigger asChild>
                            <div className="relative cursor-default">
                              {format(parseISO(occ.occurrence_date), "dd/MM", { locale: ptBR })}
                              {hoverColId === occ.id && !isEditing && (
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditOccurrence(occ.id); }}
                                    className="h-4 w-4 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:scale-110 transition-transform"
                                  >
                                    <Pencil className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCancelOccurrence(occ.id, occ.occurrence_date); }}
                                    className="h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform"
                                  >
                                    <span className="text-[8px]">✕</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3 z-[99999]" align="center" side="bottom">
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Alterar data</p>
                              <Calendar
                                mode="single"
                                selected={editDate}
                                onSelect={setEditDate}
                                className="p-1 pointer-events-auto"
                              />
                              <div className="flex gap-1.5">
                                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveEditDate} disabled={!editDate}>Salvar</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => { setEditingOccId(null); setEditDate(undefined); }}>Cancelar</Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </th>
                    );
                  })}
                  {/* Add occurrence button column */}
                  <th className="px-2 py-2.5 bg-muted/50 min-w-[40px]">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleAddOccurrence}
                            className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/50 hover:border-accent hover:text-accent transition-colors mx-auto"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Adicionar reunião</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-2 py-2.5 text-xs font-medium text-center bg-muted/50 text-emerald-500">P</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-center bg-muted/50 text-red-500">F</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-center bg-muted/50 text-amber-500">FJ</th>
                  <th className="px-1 py-2.5 bg-muted/50 w-8" />
                </tr>
              </thead>
              <tbody>
                {memberNames.map(name => {
                  const stats = memberCountStats(name);
                  return (
                    <tr key={name} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 sticky left-0 z-10 min-w-[140px]"
                        style={{ background: "hsl(var(--card))" }}>
                        <span className="font-medium text-sm">{name}</span>
                      </td>
                      {typeOccurrences.map(occ => {
                        const key = `${name}__${occ.id}`;
                        const data = statusMap[key] ?? { status: null, justification: null };
                        return (
                          <td key={occ.id} className="px-1.5 py-2 text-center">
                            <div className="flex justify-center">
                              <BadgeCell
                                status={data.status}
                                justification={data.justification}
                                onClick={() => handleToggle(name, occ.id)}
                                onJustifiedConfirm={(just) => handleJustified(name, occ.id, just)}
                              />
                            </div>
                          </td>
                        );
                      })}
                      {/* Empty cell for add column */}
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2 text-center font-medium text-emerald-500">{stats.p}</td>
                      <td className="px-2 py-2 text-center font-medium text-red-500">{stats.f}</td>
                      <td className="px-2 py-2 text-center font-medium text-amber-500">{stats.fj}</td>
                      <td className="px-1 py-2">
                        <button
                          onClick={() => handleRemoveMember(name)}
                          className="text-muted-foreground/40 hover:text-red-400 transition-colors text-xs p-1 rounded"
                          title="Remover membro"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* Add member row */}
                <tr className="border-t border-border/30">
                  <td colSpan={typeOccurrences.length + 6} className="px-3 py-2">
                    <Popover open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                      <PopoverTrigger asChild>
                        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/30">
                          <UserPlus className="h-3.5 w-3.5" />
                          Adicionar pessoa
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        {availableMembers.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-2">
                            Todas as pessoas já foram adicionadas. Cadastre novas na aba Pessoas.
                          </p>
                        ) : (
                          <div className="space-y-0.5 max-h-48 overflow-y-auto">
                            {availableMembers.map(m => (
                              <button
                                key={m.id}
                                onClick={() => handleAddMember(m.nome)}
                                className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                              >
                                {m.nome}
                              </button>
                            ))}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
