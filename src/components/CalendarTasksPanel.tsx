import { useState, useRef } from "react";
import { Plus, ListChecks, Filter, CheckCircle2, Circle, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTasks, type Task } from "@/hooks/useTasks";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceConfig } from "@/hooks/useWorkspaceConfig";

type StatusFilter = "todas" | "A Fazer" | "Pronto";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; colorClass: string; bgClass: string }> = {
  "A Fazer": { icon: Circle, colorClass: "text-muted-foreground", bgClass: "bg-secondary" },
  "Pronto": { icon: CheckCircle2, colorClass: "text-status-done", bgClass: "bg-status-done/15" },
};

export function CalendarTasksPanel() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
  const config = useWorkspaceConfig();
  const activeResponsibles = config.responsibles.filter((r) => r.is_active);
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAssignee, setQuickAssignee] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = filter === "todas" ? tasks : tasks.filter((t) => t.status === filter);

  const doneCount = tasks.filter((t) => t.status === "Pronto" || t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const handleQuickAdd = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      await addTask({
        title,
        category: "Semana 1",
        category_2: "",
        assignee: quickAssignee,
        status: "A Fazer",
        priority: "Média",
        due_date: null,
        completed: false,
      });
      setQuickTitle("");
      setQuickAssignee("");
      inputRef.current?.focus();
    } catch {
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleQuickAdd();
  };

  const toggleStatus = async (task: Task) => {
    const next = task.status === "Pronto" ? "A Fazer" : "Pronto";
    await updateTask(task.id, { status: next, completed: next === "Pronto" });
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-card border border-border rounded-2xl items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-extrabold font-heading tracking-[-0.02em]">Tarefas</h3>
          <span className="text-[10px] font-semibold bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Quick add */}
      <div className="px-3 py-2.5 border-b border-border space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicionar tarefa rápida..."
            className="h-8 text-xs rounded-lg"
            disabled={adding}
          />
          <Button
            size="sm"
            onClick={handleQuickAdd}
            disabled={adding || !quickTitle.trim()}
            className="h-8 w-8 p-0 rounded-lg shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Select value={quickAssignee} onValueChange={setQuickAssignee}>
          <SelectTrigger className={cn(
            "h-7 w-auto rounded-full border px-2.5 text-[10px] font-medium gap-1",
            quickAssignee
              ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
              : "border-border text-muted-foreground"
          )}>
            <User className="h-3 w-3 shrink-0" />
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            {activeResponsibles.length > 0 ? (
              activeResponsibles.map((r) => (
                <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
              ))
            ) : (
              <div className="px-2 py-3 text-center">
                <p className="text-xs text-muted-foreground">Nenhum responsável cadastrado</p>
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Progress */}
      <div className="px-4 py-2.5 border-b border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progresso</span>
          <span className="text-[11px] font-bold text-foreground">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
        <p className="text-[10px] text-muted-foreground mt-1">
          {doneCount} de {tasks.length} concluídas
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        <Filter className="h-3 w-3 text-muted-foreground mr-0.5" />
        {([["todas", "Todas"], ["A Fazer", "A Fazer"], ["Pronto", "Prontas"]] as [StatusFilter, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={cn(
              "text-[10px] font-semibold px-2 py-1 rounded-full transition-all",
              filter === val
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-muted-foreground hover:bg-secondary border border-transparent"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2 space-y-1.5">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhuma tarefa encontrada.
            </p>
          )}
          {filtered.map((task) => {
            const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG["A Fazer"];
            const isDone = task.status === "Pronto";
            const StatusIcon = sc.icon;
            return (
              <div
                key={task.id}
                className={cn(
                  "rounded-xl border border-border bg-background p-2.5 hover:shadow-sm transition-all group",
                  isDone && "opacity-60"
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => toggleStatus(task)}
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md border-2 w-4 h-4 flex items-center justify-center transition-all",
                      isDone
                        ? "border-status-done bg-status-done text-primary-foreground"
                        : "border-border hover:border-accent"
                    )}
                  >
                    {isDone && <span className="text-[8px] font-bold">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-semibold leading-snug", isDone && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className={cn("text-[8px] font-bold px-1.5 py-px rounded-full flex items-center gap-0.5", sc.bgClass, sc.colorClass)}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {task.status}
                      </span>
                      {task.assignee && (
                        <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                          <span className="w-3.5 h-3.5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[7px] font-bold">
                            {task.assignee[0]}
                          </span>
                          <span className="truncate max-w-[60px]">{task.assignee}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-muted-foreground/30 hover:text-destructive transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
