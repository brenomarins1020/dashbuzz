import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

// ── Date helpers ─────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, "0"); }
function dateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function subDays(d: Date, n: number) { return addDays(d, -n); }
function fmtShort(s: string) {
  const d = new Date(s + "T00:00:00");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

// ── Avatar color from name hash ───────────────────────────────
function nameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}
function initials(name: string) {
  const parts = name.trim().split(/[\s_]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ pct, color = "#22c55e" }: { pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-24 rounded-2xl bg-muted/30" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-40 rounded-2xl bg-muted/20" />
        <div className="h-40 rounded-2xl bg-muted/20" />
      </div>
      <div className="h-48 rounded-2xl bg-muted/20" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
interface InicioPanelProps {
  changeView?: (v: string) => void;
}

export function InicioPanel({ changeView }: InicioPanelProps) {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();

  // Derive raw displayName (no @ prefix) for DB queries
  const isMemberEmail = user?.email?.includes("@member.dashbuzz.app");
  const dn = user?.user_metadata?.display_name;
  const rawName: string = dn
    ? dn
    : isMemberEmail
    ? (user?.email?.split("__")[0] || "")
    : (user?.email?.split("@")[0] || "");

  // Human-friendly first name for greeting
  const firstName = rawName.split(/[\s_]+/)[0];

  const today = new Date();
  const periodStart = dateStr(subDays(today, 60));
  const periodEnd   = dateStr(addDays(today, 30));
  const todayStr    = dateStr(today);
  const tomorrowStr = dateStr(addDays(today, 1));

  const enabled = !!workspaceId && !!rawName;

  // ── Queries ──────────────────────────────────────────────────
  const { data: minhasTarefas = [], isLoading: loadT } = useQuery({
    queryKey: ["inicio-tarefas", workspaceId, rawName],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, due_date")
        .eq("workspace_id", workspaceId!)
        .eq("responsavel", rawName)
        .is("deleted_at", null);
      return (data ?? []) as { id: string; title: string; status: string; due_date: string | null }[];
    },
    enabled,
    staleTime: 3 * 60_000,
  });

  const { data: minhasMidias = [], isLoading: loadM } = useQuery({
    queryKey: ["inicio-midias", workspaceId, rawName],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, conteudo, status, data_postagem, local")
        .eq("workspace_id", workspaceId!)
        .eq("responsavel", rawName)
        .gte("data_postagem", periodStart)
        .lte("data_postagem", periodEnd)
        .is("deleted_at", null);
      return (data ?? []) as { id: string; conteudo: string; status: string; data_postagem: string; local: string | null }[];
    },
    enabled,
    staleTime: 3 * 60_000,
  });

  const { data: minhasPresencas = [], isLoading: loadP } = useQuery({
    queryKey: ["inicio-presencas", workspaceId, rawName],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("id, status, occurrence_id")
        .eq("workspace_id", workspaceId!)
        .eq("member_name", rawName);
      return (data ?? []) as { id: string; status: string; occurrence_id: string }[];
    },
    enabled,
    staleTime: 3 * 60_000,
  });

  const { data: todasTarefas = [] } = useQuery({
    queryKey: ["inicio-ranking-tarefas", workspaceId, periodStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("responsavel, status")
        .eq("workspace_id", workspaceId!)
        .eq("status", "pronto")
        .gte("created_at", periodStart)
        .is("deleted_at", null);
      return (data ?? []) as { responsavel: string; status: string }[];
    },
    enabled: !!workspaceId,
    staleTime: 3 * 60_000,
  });

  const { data: todasPresencas = [] } = useQuery({
    queryKey: ["inicio-ranking-presencas", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("member_name, status")
        .eq("workspace_id", workspaceId!);
      return (data ?? []) as { member_name: string; status: string }[];
    },
    enabled: !!workspaceId,
    staleTime: 3 * 60_000,
  });

  const isLoading = loadT || loadM || loadP;

  // ── Derived data ─────────────────────────────────────────────
  const doneTasks = useMemo(() => minhasTarefas.filter(t => t.status === "pronto"), [minhasTarefas]);
  const pendingTasks = useMemo(() => minhasTarefas.filter(t => t.status !== "pronto"), [minhasTarefas]);
  const overdueTasks = useMemo(() =>
    minhasTarefas.filter(t => t.status !== "pronto" && t.due_date && t.due_date < todayStr),
    [minhasTarefas, todayStr]);

  const taskPct = minhasTarefas.length > 0 ? Math.round((doneTasks.length / minhasTarefas.length) * 100) : 0;

  const publishedPosts = useMemo(() => minhasMidias.filter(p => p.status.toLowerCase().includes("publicad")), [minhasMidias]);
  const pendingPosts   = useMemo(() => minhasMidias.filter(p => !p.status.toLowerCase().includes("publicad")), [minhasMidias]);
  const urgentPosts    = useMemo(() =>
    pendingPosts.filter(p => p.data_postagem === todayStr || p.data_postagem === tomorrowStr),
    [pendingPosts, todayStr, tomorrowStr]);
  const mediaPct = minhasMidias.length > 0 ? Math.round((publishedPosts.length / minhasMidias.length) * 100) : 0;

  const presentCount    = useMemo(() => minhasPresencas.filter(r => r.status === "present").length, [minhasPresencas]);
  const absentCount     = useMemo(() => minhasPresencas.filter(r => r.status === "absent").length, [minhasPresencas]);
  const justifiedCount  = useMemo(() => minhasPresencas.filter(r => r.status === "justified").length, [minhasPresencas]);
  const totalPresencas  = minhasPresencas.length;
  const presencaPct = totalPresencas > 0 ? Math.round((presentCount / totalPresencas) * 100) : 0;

  // Next pending tasks (soonest due_date)
  const nextTasks = useMemo(() =>
    [...pendingTasks]
      .filter(t => t.due_date)
      .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1))
      .slice(0, 3),
    [pendingTasks]);

  // Next pending posts (soonest date)
  const nextPosts = useMemo(() =>
    [...pendingPosts]
      .sort((a, b) => (a.data_postagem > b.data_postagem ? 1 : -1))
      .slice(0, 3),
    [pendingPosts]);

  // Motivational message
  const motivMsg =
    taskPct === 0   ? "Você está começando. Vamos nessa! 💪" :
    taskPct < 30    ? "Bom começo! Continue avançando. 🚀" :
    taskPct < 60    ? "Você está no caminho certo! 👊" :
    taskPct < 90    ? "Quase lá! Só mais um pouco. ⚡" :
                      "Incrível! Você está arrasando! 🏆";

  // ── Rankings ─────────────────────────────────────────────────
  const rankTarefas = useMemo(() => {
    const map: Record<string, number> = {};
    todasTarefas.forEach(t => {
      if (!t.responsavel) return;
      map[t.responsavel] = (map[t.responsavel] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, pts]) => ({ name, pts }));
  }, [todasTarefas]);

  const rankPresencas = useMemo(() => {
    const totMap: Record<string, number> = {};
    const presMap: Record<string, number> = {};
    todasPresencas.forEach(r => {
      if (!r.member_name) return;
      totMap[r.member_name] = (totMap[r.member_name] || 0) + 1;
      if (r.status === "present") presMap[r.member_name] = (presMap[r.member_name] || 0) + 1;
    });
    return Object.entries(totMap)
      .map(([name, total]) => ({ name, pct: Math.round(((presMap[name] || 0) / total) * 100) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }, [todasPresencas]);

  const myTaskRank = useMemo(() => {
    const map: Record<string, number> = {};
    todasTarefas.forEach(t => { if (t.responsavel) map[t.responsavel] = (map[t.responsavel] || 0) + 1; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const idx = sorted.findIndex(([n]) => n === rawName);
    return idx >= 0 ? idx + 1 : null;
  }, [todasTarefas, rawName]);

  const myPresRank = useMemo(() => {
    const totMap: Record<string, number> = {};
    const presMap: Record<string, number> = {};
    todasPresencas.forEach(r => {
      if (!r.member_name) return;
      totMap[r.member_name] = (totMap[r.member_name] || 0) + 1;
      if (r.status === "present") presMap[r.member_name] = (presMap[r.member_name] || 0) + 1;
    });
    const sorted = Object.entries(totMap)
      .map(([n, total]) => ({ n, pct: Math.round(((presMap[n] || 0) / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
    const idx = sorted.findIndex(e => e.n === rawName);
    return idx >= 0 ? idx + 1 : null;
  }, [todasPresencas, rawName]);

  const hasAnyData = minhasTarefas.length > 0 || minhasMidias.length > 0 || totalPresencas > 0;

  if (isLoading) return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold font-heading tracking-[-0.02em] mb-6">Início</h1>
      <Skeleton />
    </div>
  );

  if (!hasAnyData) {
    return (
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-heading tracking-[-0.02em] mb-4">Início</h1>
        {/* Welcome card even with no data */}
        <WelcomeCard firstName={firstName} msg="Bem-vindo ao DashBuzz! 👋" pct={0} />
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm font-medium">Ainda sem dados para mostrar</p>
          <p className="text-xs text-muted-foreground">
            Quando o administrador atribuir tarefas ou mídias para você, elas aparecerão aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-heading tracking-[-0.02em]">Início</h1>
        <p className="text-sm text-muted-foreground mt-1">Seu painel pessoal</p>
      </div>

      {/* Welcome */}
      <WelcomeCard firstName={firstName} msg={motivMsg} pct={taskPct} />

      {/* Alerts */}
      {(overdueTasks.length > 0 || urgentPosts.length > 0) && (
        <div className="space-y-2">
          {overdueTasks.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-red-400">
                  ⚠ {overdueTasks.length} tarefa{overdueTasks.length > 1 ? "s" : ""} atrasada{overdueTasks.length > 1 ? "s" : ""}
                </p>
                {changeView && (
                  <button onClick={() => changeView("tarefas")} className="text-[11px] font-semibold text-red-400 hover:underline shrink-0">
                    Ver tarefas →
                  </button>
                )}
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {overdueTasks.slice(0, 3).map(t => (
                  <li key={t.id} className="text-xs text-red-300/80 truncate">• {t.title}</li>
                ))}
              </ul>
            </div>
          )}
          {urgentPosts.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-amber-400">
                  📅 {urgentPosts.length} post{urgentPosts.length > 1 ? "s" : ""} para publicar hoje/amanhã
                </p>
                {changeView && (
                  <button onClick={() => changeView("publicacoes")} className="text-[11px] font-semibold text-amber-400 hover:underline shrink-0">
                    Ver mídia →
                  </button>
                )}
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {urgentPosts.slice(0, 3).map(p => (
                  <li key={p.id} className="text-xs text-amber-300/80 truncate">
                    • {p.conteudo} · {fmtShort(p.data_postagem)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Meu Progresso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Tarefas */}
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Minhas Tarefas</p>
            <span className="text-[10px] text-muted-foreground">{minhasTarefas.length} total</span>
          </div>
          <div className="flex gap-4 text-center">
            <StatPill label="Concluídas" val={doneTasks.length} color="text-green-400" />
            <StatPill label="Pendentes"  val={pendingTasks.length} color="text-muted-foreground" />
          </div>
          <ProgressBar pct={taskPct} />
          {nextTasks.length > 0 && (
            <ul className="mt-2 space-y-1">
              {nextTasks.map(t => (
                <li key={t.id} className="flex items-center gap-1.5 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  <span className="truncate flex-1">{t.title}</span>
                  {t.due_date && <span className="text-[10px] text-muted-foreground shrink-0">vence {fmtShort(t.due_date)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Mídias */}
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Minhas Mídias</p>
            <span className="text-[10px] text-muted-foreground">{minhasMidias.length} total</span>
          </div>
          <div className="flex gap-4 text-center">
            <StatPill label="Publicados" val={publishedPosts.length} color="text-green-400" />
            <StatPill label="Pendentes"  val={pendingPosts.length}   color="text-muted-foreground" />
          </div>
          <ProgressBar pct={mediaPct} />
          {nextPosts.length > 0 && (
            <ul className="mt-2 space-y-1">
              {nextPosts.map(p => (
                <li key={p.id} className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px]">📸</span>
                  <span className="truncate flex-1">{p.conteudo}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{fmtShort(p.data_postagem)}{p.local ? ` · ${p.local}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Presenças */}
      {totalPresencas > 0 && (
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold">Minhas Presenças</p>
          <div className="flex gap-4">
            <StatPill label="Presentes"    val={presentCount}   color="text-green-400" />
            <StatPill label="Faltas"       val={absentCount}    color="text-red-400" />
            <StatPill label="Justificadas" val={justifiedCount} color="text-amber-400" />
          </div>
          <ProgressBar pct={presencaPct} color="#22c55e" />
        </div>
      )}

      {/* Ranking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rankTarefas.length >= 1 && (
          <RankingPodium
            title="🏆 Mais produtivos"
            items={rankTarefas.map(r => ({ name: r.name, score: `${r.pts} tarefa${r.pts !== 1 ? "s" : ""}` }))}
            myRank={myTaskRank}
            myName={rawName}
          />
        )}
        {rankPresencas.length >= 1 && (
          <RankingPodium
            title="🎯 Mais presentes"
            items={rankPresencas.map(r => ({ name: r.name, score: `${r.pct}%` }))}
            myRank={myPresRank}
            myName={rawName}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function WelcomeCard({ firstName, msg, pct }: { firstName: string; msg: string; pct: number }) {
  return (
    <div
      className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.03) 100%)",
        border: "1px solid rgba(245,158,11,0.20)",
      }}
    >
      <div>
        <p className="text-lg md:text-xl font-bold">Olá, {firstName}!</p>
        <p className="text-sm text-muted-foreground mt-0.5">{msg}</p>
      </div>
      <div
        className="h-14 w-14 rounded-full flex items-center justify-center shrink-0 font-bold text-lg"
        style={{
          background: "rgba(245,158,11,0.15)",
          border: "2px solid rgba(245,158,11,0.35)",
          color: "#f59e0b",
        }}
      >
        {pct}%
      </div>
    </div>
  );
}

function StatPill({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("text-lg font-bold tabular-nums", color)}>{val}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

const PODIUM_ORDER = [1, 0, 2]; // 2nd, 1st, 3rd
const PODIUM_HEIGHT = ["h-10", "h-16", "h-7"];
const PODIUM_COLORS = ["#94a3b8", "#f59e0b", "#cd7f32"]; // silver, gold, bronze

function RankingPodium({
  title, items, myRank, myName,
}: {
  title: string;
  items: { name: string; score: string }[];
  myRank: number | null;
  myName: string;
}) {
  if (items.length === 0) return null;

  // pad to 3 if fewer
  const padded = [
    items[0] ?? null,
    items[1] ?? null,
    items[2] ?? null,
  ];

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      {/* Podium */}
      <div className="flex items-end justify-center gap-4 pt-2">
        {PODIUM_ORDER.map((rank) => {
          const item = padded[rank];
          if (!item) return <div key={rank} className="w-16" />;
          const isFirst = rank === 0;
          const color = PODIUM_COLORS[rank];
          const isMe = item.name === myName;
          return (
            <div key={rank} className="flex flex-col items-center gap-1 w-[70px]">
              {isFirst && <Crown className="h-4 w-4 mb-0.5" style={{ color: "#f59e0b" }} />}
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ring-2"
                style={{ backgroundColor: nameColor(item.name), ringColor: isMe ? "#f59e0b" : "transparent", outline: isMe ? `2px solid #f59e0b` : undefined }}
              >
                {initials(item.name)}
              </div>
              <p className="text-[10px] font-medium text-center truncate w-full">{item.name.split(/[\s_]+/)[0]}</p>
              <p className="text-[10px] text-muted-foreground text-center">{item.score}</p>
              <div className={cn("w-full rounded-t-md", PODIUM_HEIGHT[rank])} style={{ backgroundColor: color + "33", border: `1px solid ${color}55` }} />
            </div>
          );
        })}
      </div>
      {myRank && myRank > 3 && (
        <p className="text-xs text-center text-muted-foreground">Você está em {myRank}° lugar</p>
      )}
    </div>
  );
}
