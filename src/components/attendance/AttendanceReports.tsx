import { useMemo, useState } from "react";
import type { useAttendance } from "@/hooks/useAttendance";
import type { TeamMember } from "@/hooks/useTeam";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trophy, ListChecks, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  attendance: ReturnType<typeof useAttendance>;
  members: TeamMember[];
}

const MIN_DATE = "2026-01-01";

type PeriodFilter = "all" | "month" | "quarter";

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function pctColor(pct: number) {
  if (pct >= 90) return { bg: "bg-emerald-500/20", text: "text-emerald-500", bar: "bg-emerald-500" };
  if (pct >= 70) return { bg: "bg-amber-500/20", text: "text-amber-500", bar: "bg-amber-500" };
  return { bg: "bg-red-500/20", text: "text-red-500", bar: "bg-red-500" };
}

const PODIUM_STYLES: Record<number, string> = {
  0: "bg-amber-500/10 border-amber-500/30",
  1: "bg-slate-300/10 border-slate-400/30",
  2: "bg-orange-700/10 border-orange-700/30",
};

const PODIUM_EMOJI: Record<number, string> = {
  0: "🥇",
  1: "🥈",
  2: "🥉",
};

export function AttendanceReports({ attendance, members }: Props) {
  const { meetings, meetingTypes, occurrences, attendance: records, participants } = attendance;
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  const today = format(new Date(), "yyyy-MM-dd");

  // Period boundaries
  const periodRange = useMemo(() => {
    const now = new Date();
    if (periodFilter === "month") {
      return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    if (periodFilter === "quarter") {
      return { start: format(startOfQuarter(now), "yyyy-MM-dd"), end: format(endOfQuarter(now), "yyyy-MM-dd") };
    }
    return { start: MIN_DATE, end: today };
  }, [periodFilter, today]);

  // Filtered occurrences (past only, non-cancelled, within period)
  const filteredOccurrences = useMemo(() => {
    const typeMeetingIds = typeFilter.length > 0
      ? new Set(meetings.filter(m => typeFilter.includes(m.meeting_type_id ?? "")).map(m => m.id))
      : new Set(meetings.map(m => m.id));

    const effectiveEnd = periodRange.end < today ? periodRange.end : today;
    return occurrences.filter(o =>
      typeMeetingIds.has(o.meeting_id) &&
      !o.cancelled &&
      o.occurrence_date >= periodRange.start &&
      o.occurrence_date <= effectiveEnd &&
      o.occurrence_date >= MIN_DATE
    );
  }, [meetings, occurrences, typeFilter, periodRange, today]);

  // Ranking
  const ranking = useMemo(() => {
    const allNames = new Set<string>();
    const relevantMeetingIds = typeFilter.length > 0
      ? new Set(meetings.filter(m => typeFilter.includes(m.meeting_type_id ?? "")).map(m => m.id))
      : new Set(meetings.map(m => m.id));

    participants
      .filter(p => relevantMeetingIds.has(p.meeting_id))
      .forEach(p => allNames.add(p.member_name));

    return Array.from(allNames).map(name => {
      const memberMeetingIds = new Set(
        participants.filter(p => p.member_name === name && relevantMeetingIds.has(p.meeting_id)).map(p => p.meeting_id)
      );

      const memberOccs = filteredOccurrences.filter(o => memberMeetingIds.has(o.meeting_id));
      const total = memberOccs.length;
      const present = memberOccs.filter(o =>
        records.find(r => r.occurrence_id === o.id && r.member_name === name)?.status === "present"
      ).length;

      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      const member = members.find(m => m.nome === name);

      return { name, present, total, pct, cargo: member?.cargo ?? "" };
    }).sort((a, b) => b.pct - a.pct || b.present - a.present);
  }, [participants, filteredOccurrences, records, meetings, members, typeFilter]);

  const exportCSV = () => {
    const header = "Posição,Nome,Cargo,Presenças,Total,Percentual";
    const rows = ranking.map((r, i) => `${i + 1},${r.name},${r.cargo},${r.present},${r.total},${r.pct}%`);
    const content = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking-presencas-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRecords = useMemo(() => {
    let present = 0;
    let absent = 0;
    filteredOccurrences.forEach(o => {
      const recs = records.filter(r => r.occurrence_id === o.id);
      recs.forEach(r => {
        if (r.status === "present") present++;
        else absent++;
      });
    });
    return { occurrences: filteredOccurrences.length, present, absent };
  }, [filteredOccurrences, records]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold font-heading tracking-wide uppercase">Ranking de Presença</h2>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Stats cards — same structure as TasksReports */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <ListChecks className="h-4 w-4 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold font-heading">{totalRecords.occurrences}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Reuniões</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold font-heading">{totalRecords.present}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Presenças</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <Clock className="h-4 w-4 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold font-heading">{totalRecords.absent}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Ausências</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Type filter chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTypeFilter([])}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              typeFilter.length === 0
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border text-muted-foreground hover:border-accent/50"
            )}
          >
            Todas
          </button>
          {meetingTypes.map(t => {
            const isActive = typeFilter.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => setTypeFilter(prev =>
                  prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                )}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                  isActive
                    ? "border-transparent text-white"
                    : "border-border text-muted-foreground hover:border-accent/50"
                )}
                style={{
                  backgroundColor: isActive ? t.color : "transparent",
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? "white" : t.color }} />
                {t.name}
              </button>
            );
          })}
        </div>

        {/* Period filter */}
        <div className="flex gap-1.5">
          {([
            { value: "all" as PeriodFilter, label: "Tudo" },
            { value: "month" as PeriodFilter, label: "Este mês" },
            { value: "quarter" as PeriodFilter, label: "Este trimestre" },
          ]).map(o => (
            <button
              key={o.value}
              onClick={() => setPeriodFilter(o.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                periodFilter === o.value
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ranking list */}
      {ranking.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Sem dados suficientes para o ranking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((r, i) => {
            const colors = pctColor(r.pct);
            const isPodium = i < 3;

            return (
              <div
                key={r.name}
                className={cn(
                  "glass-card rounded-xl px-4 py-3 flex items-center gap-4 transition-all",
                  isPodium && PODIUM_STYLES[i],
                  isPodium && "border"
                )}
              >
                {/* Position */}
                <div className="w-10 shrink-0 text-center">
                  {isPodium ? (
                    <span className="text-xl">{PODIUM_EMOJI[i]}</span>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{i + 1}º</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(r.name)}
                </div>

                {/* Name + cargo */}
                <div className="min-w-0 flex-shrink-0 w-32">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  {r.cargo && <p className="text-[11px] text-muted-foreground truncate">{r.cargo}</p>}
                </div>

                {/* Progress bar */}
                <div className="flex-1 min-w-0">
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>

                {/* Count */}
                <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {r.present} de {r.total}
                </div>

                {/* Percentage badge */}
                <Badge className={cn("text-xs shrink-0 min-w-[48px] justify-center", colors.bg, colors.text)}>
                  {r.pct}%
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
