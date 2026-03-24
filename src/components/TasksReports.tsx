import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTeam } from "@/hooks/useTeam";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trophy, ListChecks, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";

type PeriodFilter = "all" | "month" | "quarter";

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function rankColor(pct: number) {
  if (pct >= 70) return { bg: "bg-emerald-500/20", text: "text-emerald-500", bar: "bg-emerald-500" };
  if (pct >= 40) return { bg: "bg-amber-500/20", text: "text-amber-500", bar: "bg-amber-500" };
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

export function TasksReports() {
  const { tasks } = useTasks();
  const { members } = useTeam();
  const { group1 } = useTaskCategories();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  const today = format(new Date(), "yyyy-MM-dd");

  const periodRange = useMemo(() => {
    const now = new Date();
    if (periodFilter === "month") {
      return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    if (periodFilter === "quarter") {
      return { start: format(startOfQuarter(now), "yyyy-MM-dd"), end: format(endOfQuarter(now), "yyyy-MM-dd") };
    }
    return { start: "2020-01-01", end: today };
  }, [periodFilter, today]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const date = t.created_at?.slice(0, 10) ?? "";
      const inPeriod = date >= periodRange.start && date <= periodRange.end;
      const inCategory = categoryFilter.length === 0 || categoryFilter.includes(t.category);
      return inPeriod && inCategory;
    });
  }, [tasks, periodRange, categoryFilter]);

  const completedTasks = useMemo(() => filteredTasks.filter(t => t.status === "Pronto" || t.completed), [filteredTasks]);
  const pendingTasks = useMemo(() => filteredTasks.filter(t => t.status !== "Pronto" && !t.completed), [filteredTasks]);

  const ranking = useMemo(() => {
    const byAssignee: Record<string, { total: number; done: number }> = {};

    filteredTasks.forEach(t => {
      const name = t.assignee?.trim();
      if (!name) return;
      if (!byAssignee[name]) byAssignee[name] = { total: 0, done: 0 };
      byAssignee[name].total++;
      if (t.status === "Pronto" || t.completed) {
        byAssignee[name].done++;
      }
    });

    return Object.entries(byAssignee)
      .map(([name, stats]) => {
        const member = members.find(m => m.nome === name);
        const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
        return { name, ...stats, pct, cargo: member?.cargo ?? "" };
      })
      .sort((a, b) => b.done - a.done || b.pct - a.pct);
  }, [filteredTasks, members]);

  const maxDone = ranking.length > 0 ? ranking[0].done : 1;

  const exportCSV = () => {
    const header = "Posição,Nome,Cargo,Concluídas,Total,Percentual";
    const rows = ranking.map((r, i) => `${i + 1},${r.name},${r.cargo},${r.done},${r.total},${r.pct}%`);
    const content = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking-tarefas-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold font-heading tracking-wide uppercase">Ranking de Tarefas</h2>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <ListChecks className="h-4 w-4 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold font-heading">{filteredTasks.length}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold font-heading">{completedTasks.length}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Concluídas</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <Clock className="h-4 w-4 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold font-heading">{pendingTasks.length}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Pendentes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {group1.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoryFilter([])}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                categoryFilter.length === 0
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:border-accent/50"
              )}
            >
              Todas
            </button>
            {group1.filter(c => c.is_active !== false).map(c => {
              const isActive = categoryFilter.includes(c.name);
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(prev =>
                    prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name]
                  )}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                    isActive
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  )}
                  style={{ backgroundColor: isActive ? (c.color ?? "hsl(var(--accent))") : "transparent" }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? "white" : (c.color ?? "hsl(var(--accent))") }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

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
            const colors = rankColor(r.pct);
            const isPodium = i < 3;
            const barWidth = maxDone > 0 ? Math.round((r.done / maxDone) * 100) : 0;

            return (
              <div
                key={r.name}
                className={cn(
                  "glass-card rounded-xl px-4 py-3 flex items-center gap-4 transition-all",
                  isPodium && PODIUM_STYLES[i],
                  isPodium && "border"
                )}
              >
                <div className="w-10 shrink-0 text-center">
                  {isPodium ? (
                    <span className="text-xl">{PODIUM_EMOJI[i]}</span>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{i + 1}º</span>
                  )}
                </div>

                <div className="h-9 w-9 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(r.name)}
                </div>

                <div className="min-w-0 flex-shrink-0 w-32">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  {r.cargo && <p className="text-[11px] text-muted-foreground truncate">{r.cargo}</p>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {r.done} de {r.total}
                </div>

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
