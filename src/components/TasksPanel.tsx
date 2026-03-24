import { useState, useMemo } from "react";
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle, Trash2, ListChecks, Filter, Users, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTasks, type Task } from "@/hooks/useTasks";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Reunião", "Semana 1", "Semana 2", "Semana 3", "Semana 4"];
const STATUS_OPTIONS = ["A Fazer", "Em Andamento", "Pronto"];
const PRIORITY_OPTIONS = ["Alta", "Média", "Baixa"];

type StatusFilter = "todas" | "A Fazer" | "Em Andamento" | "Pronto";
type GroupBy = "category" | "assignee";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; colorClass: string; bgClass: string }> = {
  "A Fazer": { icon: Circle, colorClass: "text-muted-foreground", bgClass: "bg-secondary" },
  "Em Andamento": { icon: Clock, colorClass: "text-status-progress", bgClass: "bg-status-progress/15" },
  "Pronto": { icon: CheckCircle2, colorClass: "text-status-done", bgClass: "bg-status-done/15" },
};

const PRIORITY_CONFIG: Record<string, string> = {
  "Alta": "text-destructive bg-destructive/15",
  "Média": "text-accent bg-accent/15",
  "Baixa": "text-status-done bg-status-done/15",
};

export function TasksPanel() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const { members } = useTeam();
  const { toast } = useToast();

  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "Semana 1",
    assignee: "",
    status: "A Fazer",
    priority: "Média",
    due_date: "",
  });

  const filtered = useMemo(() => {
    if (filter === "todas") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    filtered.forEach((t) => {
      const key = groupBy === "category" ? t.category : (t.assignee || "Sem responsável");
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filtered, groupBy]);

  const doneCount = tasks.filter((t) => t.status === "Pronto" || t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const stats = [
    { label: "Total", value: tasks.length, className: "text-foreground" },
    { label: "A Fazer", value: tasks.filter((t) => t.status === "A Fazer").length, className: "text-muted-foreground" },
    { label: "Em Andamento", value: tasks.filter((t) => t.status === "Em Andamento").length, className: "text-status-progress" },
    { label: "Concluídas", value: doneCount, className: "text-status-done" },
  ];

  const handleAdd = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await addTask({
        title: form.title,
        category: form.category,
        category_2: "",
        assignee: form.assignee,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        completed: form.status === "Pronto",
      });
      setForm({ title: "", category: "Semana 1", assignee: "", status: "A Fazer", priority: "Média", due_date: "" });
      setShowForm(false);
      toast({ title: "Tarefa criada!" });
    } catch {
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (task: Task) => {
    const cycle: Record<string, string> = { "A Fazer": "Em Andamento", "Em Andamento": "Pronto", "Pronto": "A Fazer" };
    const next = cycle[task.status] || "A Fazer";
    await updateTask(task.id, { status: next, completed: next === "Pronto" });
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    toast({ title: "Tarefa removida" });
  };

  const memberNames = members.map((m) => m.nome);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-heading tracking-wide uppercase flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-accent" />
            Tarefas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as tarefas das semanas e reuniões</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1.5 rounded-xl shadow-md">
          <Plus className="h-4 w-4" /> Nova Tarefa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={cn("text-2xl font-extrabold font-heading", s.className)}>{s.value}</p>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progresso</span>
              <span className="text-sm font-extrabold font-heading text-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {([["todas", "Todas"], ["A Fazer", "A Fazer"], ["Em Andamento", "Andamento"], ["Pronto", "Concluídas"]] as [StatusFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={cn(
                "text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all",
                filter === val
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Agrupar:</span>
          {([["category", "Categoria", FolderOpen], ["assignee", "Responsável", Users]] as [GroupBy, string, React.ElementType][]).map(([val, label, Icon]) => (
            <button
              key={val}
              onClick={() => setGroupBy(val)}
              className={cn(
                "text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1",
                groupBy === val
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Task groups */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([group, groupTasks]) => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-extrabold font-heading uppercase tracking-wide text-foreground">{group}</h3>
              <Badge variant="secondary" className="text-[10px] font-bold">{groupTasks.length}</Badge>
              <div className="flex-1 border-t border-border" />
            </div>
            <div className="space-y-2">
              {groupTasks.map((task) => {
                const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG["A Fazer"];
                const isDone = task.status === "Pronto";
                const StatusIcon = sc.icon;
                return (
                  <Card key={task.id} className={cn("shadow-sm transition-all hover:shadow-md", isDone && "opacity-70")}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Check button */}
                        <button
                          onClick={() => toggleStatus(task)}
                          className={cn(
                            "mt-0.5 flex-shrink-0 rounded-md border-2 w-5 h-5 flex items-center justify-center transition-all",
                            isDone
                              ? "border-status-done bg-status-done text-primary-foreground"
                              : "border-border hover:border-accent"
                          )}
                        >
                          {isDone && <span className="text-[10px] font-bold">✓</span>}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold leading-snug", isDone && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1", sc.bgClass, sc.colorClass)}>
                              <StatusIcon className="h-3 w-3" />
                              {task.status}
                            </span>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", PRIORITY_CONFIG[task.priority] || "")}>
                              {task.priority}
                            </span>
                            {task.due_date && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                📅 {new Date(task.due_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                            {task.assignee && (
                              <span className="flex items-center gap-1">
                                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[9px] font-bold">
                                  {task.assignee[0]}
                                </span>
                                {task.assignee}
                              </span>
                            )}
                            <span className="bg-secondary px-1.5 py-0.5 rounded font-medium text-[10px]">{task.category}</span>
                          </div>
                        </div>

                        <button onClick={() => handleDelete(task.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors flex-shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-bold text-foreground">Nenhuma tarefa encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Tarefa" para começar</p>
          </div>
        )}
      </div>

      {/* New Task Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título da tarefa</Label>
              <Input
                placeholder="Ex: Criar arte para o Instagram..."
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Data limite</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Select value={form.assignee} onValueChange={(v) => setForm((p) => ({ ...p, assignee: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {memberNames.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    {memberNames.length === 0 && <SelectItem value="" disabled>Nenhum membro</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Salvando..." : "Adicionar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
