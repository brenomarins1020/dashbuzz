import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, TrendingUp, Clock, CheckCircle } from "lucide-react";
import type { Post } from "@/hooks/usePosts";

export function StatsCards({ posts = [] }: { posts: Post[] }) {
  const total = posts.length;
  const published = posts.filter((p) => p.status === "publicada").length;
  const inProgress = posts.filter((p) => p.status === "em andamento").length;
  const ready = posts.filter((p) => p.status === "pronto").length;

  const extras = [
    { label: "Em Andamento", value: inProgress, icon: Clock, num: "02" },
    { label: "Prontos", value: ready, icon: CheckCircle, num: "03" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
      <Card className="glass-card rounded-2xl gold-left-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <CalendarCheck className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] text-muted-foreground font-mono">01</span>
          </div>
          <p className="text-[2.5rem] font-extrabold tracking-[-0.04em] font-heading leading-none">{total}</p>
          <div className="h-px mt-3 mb-2" style={{ background: "rgba(148,163,184,0.2)" }} />
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-medium">Total de Mídia</p>
          <div className="flex items-center gap-1.5 mt-2">
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-sm font-semibold text-amber-500">{published}</span>
            <span className="text-[11px] text-muted-foreground">publicados</span>
          </div>
        </CardContent>
      </Card>
      {extras.map((s) => (
        <Card key={s.label} className="glass-card rounded-2xl gold-left-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <s.icon className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] text-muted-foreground font-mono">{s.num}</span>
            </div>
            <p className="text-[2.5rem] font-extrabold tracking-[-0.04em] font-heading leading-none">{s.value}</p>
            <div className="h-px mt-3 mb-2" style={{ background: "rgba(148,163,184,0.2)" }} />
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-medium">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
