import { useMemo, useState } from "react";
import type { useAttendance } from "@/hooks/useAttendance";
import type { TeamMember } from "@/hooks/useTeam";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp, UserX, Award, Check, X } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OccurrenceDetailModal } from "./OccurrenceDetailModal";

interface Props {
  attendance: ReturnType<typeof useAttendance>;
  members: TeamMember[];
  filterTypeIds: string[];
}

export function AttendanceOverview({ attendance, members, filterTypeIds }: Props) {
  const { meetings, occurrences, attendance: records, meetingTypes, participants } = attendance;
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [memberDetailId, setMemberDetailId] = useState<string | null>(null);
  const [occurrenceDetailId, setOccurrenceDetailId] = useState<string | null>(null);

  const monthStart = startOfMonth(parseISO(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);
  const today = format(new Date(), "yyyy-MM-dd");

  // Filter occurrences by month and type — only past/today
  const filteredOccurrences = useMemo(() => {
    return occurrences.filter(o => {
      const d = parseISO(o.occurrence_date);
      if (!isWithinInterval(d, { start: monthStart, end: monthEnd })) return false;
      if (o.cancelled) return false;
      if (o.occurrence_date > today) return false;
      if (filterTypeIds.length > 0) {
        const meeting = meetings.find(m => m.id === o.meeting_id);
        if (!meeting || !filterTypeIds.includes(meeting.meeting_type_id ?? "")) return false;
      }
      return true;
    });
  }, [occurrences, meetings, filterTypeIds, monthStart, monthEnd, today]);

  // Unique member names from participants
  const allMemberNames = useMemo(() => {
    const names = new Set<string>();
    participants.forEach(p => names.add(p.member_name));
    return Array.from(names);
  }, [participants]);

  // Stats per member
  const memberStats = useMemo(() => {
    return allMemberNames.map(name => {
      // Find which meetings this member is a participant of
      const memberMeetingIds = new Set(
        participants.filter(p => p.member_name === name).map(p => p.meeting_id)
      );
      // Relevant occurrences
      const relevantOccs = filteredOccurrences.filter(o => memberMeetingIds.has(o.meeting_id));
      const total = relevantOccs.length;
      const presentCount = relevantOccs.filter(o => {
        const rec = records.find(r => r.occurrence_id === o.id && r.member_name === name);
        return rec?.status === "present";
      }).length;
      const absentCount = relevantOccs.filter(o => {
        const rec = records.find(r => r.occurrence_id === o.id && r.member_name === name);
        return rec?.status === "absent";
      }).length;
      const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
      const teamMember = members.find(m => m.nome === name);
      return { name, total, present: presentCount, absent: absentCount, pct, teamMember };
    }).sort((a, b) => b.pct - a.pct);
  }, [allMemberNames, filteredOccurrences, records, participants, members]);

  // Top-level stats
  const totalMeetings = filteredOccurrences.length;
  const avgPresence = memberStats.length > 0
    ? Math.round(memberStats.reduce((s, m) => s + m.pct, 0) / memberStats.length)
    : 0;
  const topAbsent = memberStats.length > 0
    ? memberStats.reduce((max, m) => m.absent > max.absent ? m : max, memberStats[0])
    : null;
  const perfectMembers = memberStats.filter(m => m.pct === 100 && m.total > 0);

  // Occurrence enrichment
  const enrichedOccurrences = useMemo(() => {
    return filteredOccurrences.map(o => {
      const meeting = meetings.find(m => m.id === o.meeting_id);
      const type = meeting?.meeting_type_id ? meetingTypes.find(t => t.id === meeting.meeting_type_id) : null;
      const oParticipants = participants.filter(p => p.meeting_id === o.meeting_id);
      const oRecords = records.filter(r => r.occurrence_id === o.id);
      const presentCount = oRecords.filter(r => r.status === "present").length;
      const totalExpected = oParticipants.length;
      const hasAbsences = oRecords.some(r => r.status === "absent");
      return { ...o, meeting, type, presentCount, totalExpected, hasAbsences };
    }).sort((a, b) => b.occurrence_date.localeCompare(a.occurrence_date));
  }, [filteredOccurrences, meetings, meetingTypes, participants, records]);

  // Recent absences
  const recentAbsences = useMemo(() => {
    return records
      .filter(r => r.status === "absent")
      .map(r => {
        const occ = occurrences.find(o => o.id === r.occurrence_id);
        const meeting = occ ? meetings.find(m => m.id === occ.meeting_id) : null;
        return { ...r, occ, meeting };
      })
      .filter(r => r.occ && r.meeting)
      .sort((a, b) => (b.occ!.occurrence_date).localeCompare(a.occ!.occurrence_date))
      .slice(0, 5);
  }, [records, occurrences, meetings]);

  // Member detail modal data
  const memberDetailData = useMemo(() => {
    if (!memberDetailId) return null;
    const stat = memberStats.find(m => m.name === memberDetailId);
    if (!stat) return null;
    const memberMeetingIds = new Set(
      participants.filter(p => p.member_name === stat.name).map(p => p.meeting_id)
    );
    const memberOccs = occurrences
      .filter(o => memberMeetingIds.has(o.meeting_id) && !o.cancelled && o.occurrence_date <= today)
      .map(o => {
        const meeting = meetings.find(m => m.id === o.meeting_id);
        const rec = records.find(r => r.occurrence_id === o.id && r.member_name === stat.name);
        return { occurrence: o, meeting, record: rec };
      })
      .sort((a, b) => b.occurrence.occurrence_date.localeCompare(a.occurrence.occurrence_date));
    return { ...stat, occurrences: memberOccs };
  }, [memberDetailId, memberStats, participants, occurrences, meetings, records]);

  const pctColor = (pct: number) =>
    pct >= 90 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-red-400";
  const pctBg = (pct: number) =>
    pct >= 90 ? "bg-emerald-500/20 text-emerald-400" : pct >= 70 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400";

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading tracking-wide uppercase">Visão Geral</h2>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Reuniões</span>
            </div>
            <p className="text-2xl font-bold">{totalMeetings}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Média presença</span>
            </div>
            <p className={cn("text-2xl font-bold", pctColor(avgPresence))}>{avgPresence}%</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <UserX className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Maior faltante</span>
            </div>
            <p className="text-sm font-bold truncate">
              {topAbsent && topAbsent.absent > 0 ? `${topAbsent.name} (${topAbsent.absent})` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Award className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Presença perfeita</span>
            </div>
            <p className="text-sm font-bold truncate">
              {perfectMembers.length > 0 ? perfectMembers.map(m => m.name).join(", ") : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Members column */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Membros</h3>
          {memberStats.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum participante registrado ainda.</p>
          )}
          {memberStats.map(m => (
            <button
              key={m.name}
              onClick={() => setMemberDetailId(m.name)}
              className="w-full glass-card rounded-xl p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent shrink-0">
                {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                {m.teamMember && (
                  <p className="text-xs text-muted-foreground truncate">{m.teamMember.cargo}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={m.pct} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{m.present}/{m.total}</span>
                  <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", pctBg(m.pct))}>
                    {m.pct}%
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Occurrences column */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Reuniões realizadas</h3>
          {enrichedOccurrences.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma reunião no período selecionado.</p>
          )}
          {enrichedOccurrences.map(o => (
            <button
              key={o.id}
              onClick={() => setOccurrenceDetailId(o.id)}
              className={cn(
                "w-full glass-card rounded-xl p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors text-left",
                o.hasAbsences && "border-l-2 border-l-red-500 bg-red-500/5"
              )}
            >
              <div
                className="h-3 w-3 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: o.type?.color ?? "#94a3b8" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{o.meeting?.title ?? "Reunião"}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{format(parseISO(o.occurrence_date), "dd MMM yyyy", { locale: ptBR })}</span>
                  {o.meeting?.time && <span>• {o.meeting.time.slice(0, 5)}</span>}
                  {o.meeting?.location && <span>• {o.meeting.location}</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {o.meeting?.recurrence && o.meeting.recurrence !== "none" && (
                    <span className="text-[10px] text-muted-foreground">↻ {o.meeting.recurrence}</span>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      o.totalExpected > 0 && o.presentCount === o.totalExpected
                        ? "bg-emerald-500/20 text-emerald-400"
                        : o.hasAbsences
                        ? "bg-red-500/20 text-red-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {o.presentCount}/{o.totalExpected}
                  </Badge>
                </div>
              </div>
            </button>
          ))}

          {/* Recent absences */}
          {recentAbsences.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400">Faltas recentes</h4>
              {recentAbsences.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-400 shrink-0">
                    {r.member_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {format(parseISO(r.occ!.occurrence_date), "dd/MM")} — {r.member_name} — {r.meeting?.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Member detail modal */}
      <Dialog open={!!memberDetailId} onOpenChange={open => !open && setMemberDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {memberDetailData && (
                <>
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent">
                    {memberDetailData.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p>{memberDetailData.name}</p>
                    <Badge className={cn("text-xs", pctBg(memberDetailData.pct))}>
                      {memberDetailData.pct}%
                    </Badge>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {memberDetailData && (
            <div className="space-y-2 mt-2">
              {memberDetailData.occurrences.map(({ occurrence, meeting, record }) => (
                <div key={occurrence.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50">
                  <div>
                    <span className="text-muted-foreground">
                      {format(parseISO(occurrence.occurrence_date), "dd/MM/yy")}
                    </span>
                    <span className="ml-2">{meeting?.title}</span>
                  </div>
                  <div>
                    {record?.status === "present" && <Check className="h-4 w-4 text-emerald-400" />}
                    {record?.status === "absent" && <X className="h-4 w-4 text-red-400" />}
                    {record?.status === "justified" && <span className="text-xs text-amber-400">~</span>}
                    {!record && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground pt-2">
                {memberDetailData.present} presenças, {memberDetailData.absent} faltas
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Occurrence detail modal */}
      <OccurrenceDetailModal
        occurrenceId={occurrenceDetailId}
        attendance={attendance}
        onClose={() => setOccurrenceDetailId(null)}
      />
    </div>
  );
}
