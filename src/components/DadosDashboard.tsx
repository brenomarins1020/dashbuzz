import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, TrendingUp, TrendingDown, Minus, Clock, CheckCircle } from "lucide-react";
import { usePosts } from "@/hooks/usePosts";
import { useWorkspaceConfig } from "@/hooks/useWorkspaceConfig";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  type PeriodPreset, type AccountFilter,
  filterByPeriod, filterByAccount, countByStatus, countByAccount,
  postsPerWeek, getInactiveCardStyles, getDaysSinceLastActivity,
  weekOverWeekChange,
} from "@/lib/postUtils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AttendanceReports } from "@/components/attendance/AttendanceReports";
import { TasksReports } from "@/components/TasksReports";
import { useAttendance } from "@/hooks/useAttendance";
import { useTeam } from "@/hooks/useTeam";

function MetricCard({ label, value, icon: Icon, num }: { label: string; value: string | number; icon: React.ElementType; num: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <Icon className="h-4 w-4 text-amber-500" />
        <span className="text-[10px] text-muted-foreground font-mono">{num}</span>
      </div>
      <p className="text-2xl md:text-[2.5rem] font-extrabold tracking-[-0.04em] font-heading leading-none">{value}</p>
      <div className="h-px mt-3 mb-2" style={{ background: "rgba(148,163,184,0.2)" }} />
      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-medium">{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold font-heading uppercase tracking-[0.1em] mb-4 text-muted-foreground">{children}</h3>;
}

export function DadosDashboard() {
  const { posts } = usePosts();
  const { activeProfiles, activeCategories, activeStatuses } = useWorkspaceConfig();
  const { workspaceCreatedAt } = useWorkspace();
  const attendance = useAttendance();
  const { members } = useTeam();
  const [period, setPeriod] = useState<PeriodPreset>("6months");
  const [account, setAccount] = useState<AccountFilter>("total");

  const profileNames = activeProfiles.map(p => p.name);

  const filtered = useMemo(() => filterByAccount(filterByPeriod(posts, period), account), [posts, period, account]);
  const published = useMemo(() => filtered.filter((p) => p.status.toLowerCase().includes("publicad")), [filtered]);

  const statusCounts = useMemo(() => countByStatus(filtered), [filtered]);
  const accountCounts = useMemo(() => countByAccount(filtered), [filtered]);
  const sinceDate = useMemo(() => workspaceCreatedAt ? new Date(workspaceCreatedAt) : undefined, [workspaceCreatedAt]);
  const rhythm = useMemo(() => postsPerWeek(published, period, sinceDate), [published, period, sinceDate]);

  const wow = useMemo(() => weekOverWeekChange(filtered), [filtered]);

  const inactiveData = useMemo(() => {
    const { inactiveDays, lastActiveLabel } = getDaysSinceLastActivity(posts);
    const styles = getInactiveCardStyles(inactiveDays);
    return { inactiveDays, lastActiveLabel, styles };
  }, [posts]);

  const total = filtered.length;
  const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  const topStatuses = statusEntries.slice(0, 2);

  const WowIcon = wow.direction === "up" ? TrendingUp : wow.direction === "down" ? TrendingDown : Minus;
  const wowColor = wow.direction === "up" ? "text-emerald-500" : wow.direction === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-heading tracking-[-0.02em]">Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">Métricas e insights do seu conteúdo.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList>
          <TabsTrigger value="overview">Marketing</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="attendance">Presença</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          {activeCategories.length === 0 && activeProfiles.length === 0 && (
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="text-sm text-muted-foreground">Configure categorias e perfis em <strong>Configurações → Personalização</strong> para ver métricas detalhadas.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
              <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mês atual</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="1year">Último 1 ano</SelectItem>
              </SelectContent>
            </Select>
            {profileNames.length > 0 && (
              <Select value={account} onValueChange={(v) => setAccount(v)}>
                <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Todos os perfis</SelectItem>
                  {profileNames.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Main metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="glass-card rounded-2xl p-4 md:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <CalendarCheck className="h-4 w-4 text-amber-500" />
                <span className="text-[10px] text-muted-foreground font-mono">01</span>
              </div>
              <p className="text-2xl md:text-[2.5rem] font-extrabold tracking-[-0.04em] font-heading leading-none">{total}</p>
              <div className="h-px mt-3 mb-2" style={{ background: "rgba(148,163,184,0.2)" }} />
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-medium">Mídia Total</p>
              <div className="flex items-center gap-1.5 mt-2">
                <WowIcon className={`h-3.5 w-3.5 ${wowColor}`} />
                <span className={`text-sm font-semibold ${wowColor}`}>
                  {wow.pct}%
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {wow.direction === "up" ? "a mais que semana anterior" : wow.direction === "down" ? "a menos que semana anterior" : "igual à semana anterior"}
                </span>
              </div>
            </div>
            {topStatuses.map((entry, i) => (
              <MetricCard key={entry[0]} label={entry[0]} value={entry[1]} icon={i === 0 ? Clock : CheckCircle} num={String(i + 2).padStart(2, "0")} />
            ))}
          </div>

          {/* Profile distribution */}
          {profileNames.length > 0 && (
            <div className="glass-card rounded-2xl p-4 md:p-5">
              <SectionTitle>Distribuição por Perfil</SectionTitle>
              {account !== "total" ? (
                <p className="text-sm text-muted-foreground">Filtro ativo: <span className="text-foreground font-medium">{account}</span></p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {profileNames.map((acc) => {
                    const count = accountCounts[acc] || 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={acc} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{acc}</span>
                          <span className="text-sm font-bold font-heading">{count} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rhythm */}
          <div className="glass-card rounded-2xl p-4 md:p-5">
            <SectionTitle>Ritmo de Mídia</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold font-heading">{rhythm.avg}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Posts / semana</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-heading">{rhythm.bestWeek}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Melhor semana (sem. {rhythm.bestWeekLabel})</p>
              </div>
              <div className={`rounded-lg p-3 border transition-colors ${inactiveData.styles.bg || "bg-card"} ${inactiveData.styles.border || "border-border"}`}>
                <p className={`text-2xl font-bold font-heading ${inactiveData.styles.text}`}>{inactiveData.inactiveDays}</p>
                <p className={`text-[11px] uppercase tracking-wide ${inactiveData.styles.text || "text-muted-foreground"}`}>Dias inativos</p>
                <p className={`text-[10px] mt-1 ${inactiveData.styles.text || "text-muted-foreground"}`}>Última atividade: {inactiveData.lastActiveLabel}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <TasksReports />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceReports attendance={attendance} members={members} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
