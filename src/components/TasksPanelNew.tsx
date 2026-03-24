import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus, Pencil, Trash2, CalendarIcon, Search,
  Circle, User, Settings, Check, X, Tag, Layers, Flag,
} from "lucide-react";
import {
  Drawer, DrawerContent,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useTasks, type Task } from "@/hooks/useTasks";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceConfig } from "@/hooks/useWorkspaceConfig";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { StatusBadgeFilled } from "@/components/StatusBadgeFilled";
import { QuickEditModal, type QuickEditItem } from "@/components/QuickEditModal";
import { ChipSelect } from "@/components/ChipSelect";

const STATUS_OPTIONS = [
  { value: "A Fazer", label: "A Fazer" },
  { value: "Em Andamento", label: "Em Andamento" },
  { value: "Pronto", label: "Pronto" },
];

const STATUS_COLORS: Record<string, string> = {
  "A Fazer": "#9ca3af",
  "Em Andamento": "#f97316",
  "Pronto": "#22c55e",
};

type PeriodPreset = "month" | "3months" | "6months" | "1year";

function getStartDate(preset: PeriodPreset): Date {
  const now = new Date();
  switch (preset) {
    case "month": return new Date(now.getFullYear(), now.getMonth(), 1);
    case "3months": { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    case "6months": { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
    case "1year": { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  }
}

const formatDate = (ds: string) => new Date(ds + "T00:00:00").toLocaleDateString("pt-BR");

/* ── Inline chip ──────────────────────── */

interface InlineChipProps {
  icon: React.ElementType;
  chipColor: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string; color?: string }[];
  onManage?: () => void;
  searchable?: boolean;
}

function InlineChip({ icon: Icon, chipColor, label, value, onValueChange, options, onManage, searchable }: InlineChipProps) {
  const [selectOpen, setSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const selected = options.find(o => o.value === value);
  const hasValue = !!selected;

  const isSearchable = searchable ?? false;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const chipTriggerBtn = (
    <button
      type="button"
      className={cn(
        "h-9 min-h-[36px] w-auto rounded-full border px-3 inline-flex flex-row items-center gap-1.5 transition-all",
        "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none",
        !hasValue && "bg-muted/50 border-border text-muted-foreground",
        "[&>svg:last-child]:hidden",
      )}
      style={hasValue ? { backgroundColor: chipColor + "22", borderColor: chipColor, color: chipColor } : undefined}
    >
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium whitespace-nowrap leading-none max-w-[120px] truncate">
        {hasValue ? selected!.label : label}
      </span>
    </button>
  );

  if (isSearchable) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">
              <Popover open={selectOpen} onOpenChange={(o) => { setSelectOpen(o); if (!o) setSearchQuery(""); }}>
                <PopoverTrigger asChild>
                  {chipTriggerBtn}
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0 z-[999999]" align="start">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar..."
                        className="h-8 pl-8 text-xs"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-1">
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((o) => {
                        const isSelected = o.value === value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors text-left",
                              isSelected && "bg-accent"
                            )}
                            onClick={() => { onValueChange(o.value); setSelectOpen(false); setSearchQuery(""); }}
                          >
                            {o.color && <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                            <span className="flex-1 truncate">{o.label}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-2 py-3 text-center">
                        <p className="text-xs text-muted-foreground">Nenhum encontrado</p>
                      </div>
                    )}
                  </div>
                  {onManage && (
                    <div className="border-t border-border pt-1 px-2 pb-1">
                      <button
                        type="button"
                        className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 px-1 rounded transition-colors hover:bg-secondary/50"
                        onClick={() => { setSelectOpen(false); setSearchQuery(""); setTimeout(() => onManage!(), 50); }}
                      >
                        <Settings className="h-3 w-3" /> Gerenciar...
                      </button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {hasValue ? `${label}: ${selected!.label}` : `Selecionar ${label.toLowerCase()}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex">
            <Select open={selectOpen} onOpenChange={setSelectOpen} value={value} onValueChange={(v) => { onValueChange(v); setSelectOpen(false); }}>
              <SelectTrigger
                className={cn(
                  "h-9 min-h-[36px] w-auto rounded-full border px-3",
                  "focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all",
                  !hasValue && "bg-muted/50 border-border text-muted-foreground",
                  "[&>svg:last-child]:hidden",
                  "[&>span]:!inline-flex [&>span]:!flex-row [&>span]:!items-center [&>span]:!gap-1.5",
                )}
                style={hasValue ? { backgroundColor: chipColor + "22", borderColor: chipColor, color: chipColor } : undefined}
              >
                <span style={hasValue ? { color: chipColor } : undefined} className="inline-flex flex-row items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium whitespace-nowrap leading-none max-w-[120px] truncate">
                    {hasValue ? selected!.label : label}
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent>
                {options.length > 0 ? (
                  options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2 w-full">
                        {o.color && <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                        <span className="flex-1">{o.label}</span>
                      </span>
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-3 text-center">
                    <p className="text-xs text-muted-foreground">Nenhum cadastrado</p>
                  </div>
                )}
                {onManage && (
                  <div className="border-t border-border mt-1 pt-1 px-2 pb-1">
                    <button
                      type="button"
                      className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 px-1 rounded transition-colors hover:bg-secondary/50"
                      onMouseDown={(e) => { e.preventDefault(); setSelectOpen(false); setTimeout(() => onManage!(), 50); }}
                    >
                      <Settings className="h-3 w-3" /> Gerenciar...
                    </button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {hasValue ? `${label}: ${selected!.label}` : `Selecionar ${label.toLowerCase()}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── Inline Edit Bar ──────────────────── */

function TaskInlineEditBar({ task, onSave, onCancel, responsibleOptions, cat1Options, cat2Options, cat1Label, cat2Label, onManageCat1, onManageCat2, onManageResp }: {
  task: Task;
  onSave: (changes: Partial<Omit<Task, "id" | "created_at">>) => void;
  onCancel: () => void;
  responsibleOptions: string[];
  cat1Options: { value: string; label: string; color?: string }[];
  cat2Options: { value: string; label: string; color?: string }[];
  cat1Label: string;
  cat2Label: string;
  onManageCat1: () => void;
  onManageCat2: () => void;
  onManageResp: () => void;
}) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editStatus, setEditStatus] = useState(task.status);
  const [editAssignee, setEditAssignee] = useState(task.assignee || "");
  const [editCat1, setEditCat1] = useState(task.category || "");
  const [editCat2, setEditCat2] = useState(task.category_2 || "");
  const [editDate, setEditDate] = useState(task.due_date || "");
  const barRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    const changes: Partial<Omit<Task, "id" | "created_at">> = {};
    if (editTitle.trim() && editTitle.trim() !== task.title) changes.title = editTitle.trim();
    if (editStatus !== task.status) { changes.status = editStatus; changes.completed = editStatus === "Pronto"; }
    if (editAssignee !== (task.assignee || "")) changes.assignee = editAssignee;
    if (editCat1 !== (task.category || "")) changes.category = editCat1;
    if (editCat2 !== (task.category_2 || "")) changes.category_2 = editCat2;
    if (editDate !== (task.due_date || "")) changes.due_date = editDate || null;
    onSave(changes);
  }, [editTitle, editStatus, editAssignee, editCat1, editCat2, editDate, task, onSave]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest("[data-radix-popper-content-wrapper]") || target.closest("[role='listbox']")) return;
        handleSave();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [handleSave]);

  return (
    <div ref={barRef} className="glass-card rounded-xl p-3 ring-2 ring-primary/30 shadow-lg">
      <div className="flex items-center gap-2 flex-wrap">
        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }} className="h-8 text-xs flex-1 min-w-[140px]" autoFocus />
        <div className="flex items-center gap-1.5">
          <InlineChip icon={Tag} chipColor="#3b82f6" label={cat1Label} value={editCat1} onValueChange={setEditCat1} options={cat1Options} onManage={onManageCat1} />
          <InlineChip icon={Layers} chipColor="#8b5cf6" label={cat2Label} value={editCat2} onValueChange={setEditCat2} options={cat2Options} onManage={onManageCat2} />
          <InlineChip icon={Circle} chipColor="#f97316" label="Status" value={editStatus} onValueChange={setEditStatus} options={STATUS_OPTIONS.map(s => ({ ...s, color: STATUS_COLORS[s.value] }))} />
          <InlineChip icon={User} chipColor="#22c55e" label="Responsável" value={editAssignee} onValueChange={setEditAssignee} options={responsibleOptions.map(n => ({ value: n, label: n }))} searchable />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2 shrink-0">
              <CalendarIcon className="h-3.5 w-3.5" />
              {editDate ? formatDate(editDate) : "Data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={editDate ? new Date(editDate + "T00:00:00") : undefined} onSelect={(date) => { if (date) { setEditDate(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`); }}} initialFocus />
          </PopoverContent>
        </Popover>
        <div className="flex gap-1">
          <Button onClick={handleSave} size="sm" className="h-8 gap-1 text-xs px-2.5"><Check className="h-3.5 w-3.5" /> Salvar</Button>
          <Button onClick={onCancel} variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile creation component ─────────────────── */

function MobileTaskCreation({ newTitle, setNewTitle, newCat1, setNewCat1, newCat2, setNewCat2, newStatus, setNewStatus, newDate, setNewDate, newAssignee, setNewAssignee, cat1Options, cat2Options, cat1Label, cat2Label, responsibleOptions, canAdd, adding, handleAdd }: {
  newTitle: string; setNewTitle: (v: string) => void;
  newCat1: string; setNewCat1: (v: string) => void;
  newCat2: string; setNewCat2: (v: string) => void;
  newStatus: string; setNewStatus: (v: string) => void;
  newDate: string; setNewDate: (v: string) => void;
  newAssignee: string; setNewAssignee: (v: string) => void;
  cat1Options: { value: string; label: string; color?: string }[];
  cat2Options: { value: string; label: string; color?: string }[];
  cat1Label: string; cat2Label: string;
  responsibleOptions: string[];
  canAdd: boolean; adding: boolean; handleAdd: () => void;
}) {
  const [activePicker, setActivePicker] = useState<string | null>(null);

  const pillStyle = (active: boolean, color?: string) => active && color
    ? { backgroundColor: color + "22", borderColor: color, color }
    : undefined;

  return (
    <div className="md:hidden glass-card rounded-2xl p-4 space-y-3 mb-4">
      <input
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        placeholder="Título da tarefa..."
        className="w-full bg-transparent border-b border-border pb-2 text-sm focus:outline-none focus:border-accent text-foreground placeholder:text-muted-foreground"
      />
      <div className="grid grid-cols-2 gap-2 pb-1">
        <button
          onClick={() => setActivePicker("cat1")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-transform active:scale-95 text-muted-foreground"
          style={{ ...pillStyle(!!newCat1, cat1Options.find(c => c.value === newCat1)?.color), WebkitTapHighlightColor: "transparent" }}
        >
          <Tag className="h-3 w-3 shrink-0" />
          <span className="truncate">{newCat1 || cat1Label}</span>
        </button>
        <button
          onClick={() => setActivePicker("cat2")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-transform active:scale-95 text-muted-foreground"
          style={{ ...pillStyle(!!newCat2, cat2Options.find(c => c.value === newCat2)?.color), WebkitTapHighlightColor: "transparent" }}
        >
          <Layers className="h-3 w-3 shrink-0" />
          <span className="truncate">{newCat2 || cat2Label}</span>
        </button>
        <button
          onClick={() => setActivePicker("status")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-transform active:scale-95 text-muted-foreground"
          style={{ ...pillStyle(!!newStatus, STATUS_COLORS[newStatus]), WebkitTapHighlightColor: "transparent" }}
        >
          <Circle className="h-3 w-3 shrink-0" />
          <span className="truncate">{newStatus || "Status"}</span>
        </button>
        <button
          onClick={() => setActivePicker("responsavel")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-transform active:scale-95 text-muted-foreground"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{newAssignee || "Responsável"}</span>
        </button>
        <button
          onClick={() => setActivePicker("data")}
          className="col-span-2 h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-transform active:scale-95 text-muted-foreground"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <CalendarIcon className="h-3 w-3 shrink-0" />
          {newDate ? new Date(newDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Data"}
        </button>
      </div>
      <button
        onClick={handleAdd}
        disabled={!canAdd || adding}
        className="w-full h-10 rounded-full bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Plus className="h-4 w-4" />
        Adicionar tarefa
      </button>

      {/* Drawers */}
      <Drawer open={activePicker === "cat1"} onOpenChange={(o) => !o && setActivePicker(null)}>
        <DrawerContent>
          <div className="px-4 pb-6 pt-2">
            <p className="text-sm font-semibold mb-3">{cat1Label}</p>
            {cat1Options.map((c) => (
              <button key={c.value} onClick={() => { setNewCat1(c.value); setActivePicker(null); }}
                className="w-full flex items-center justify-between h-12 px-3 rounded-xl hover:bg-muted/50 text-sm transition-colors">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color || "hsl(var(--muted-foreground))" }} />
                  {c.label}
                </div>
                {newCat1 === c.value && <Check className="h-4 w-4 text-accent" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer open={activePicker === "cat2"} onOpenChange={(o) => !o && setActivePicker(null)}>
        <DrawerContent>
          <div className="px-4 pb-6 pt-2">
            <p className="text-sm font-semibold mb-3">{cat2Label}</p>
            {cat2Options.map((c) => (
              <button key={c.value} onClick={() => { setNewCat2(c.value); setActivePicker(null); }}
                className="w-full flex items-center justify-between h-12 px-3 rounded-xl hover:bg-muted/50 text-sm transition-colors">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color || "hsl(var(--muted-foreground))" }} />
                  {c.label}
                </div>
                {newCat2 === c.value && <Check className="h-4 w-4 text-accent" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer open={activePicker === "status"} onOpenChange={(o) => !o && setActivePicker(null)}>
        <DrawerContent>
          <div className="px-4 pb-6 pt-2">
            <p className="text-sm font-semibold mb-3">Status</p>
            {STATUS_OPTIONS.map((s) => (
              <button key={s.value} onClick={() => { setNewStatus(s.value); setActivePicker(null); }}
                className="w-full flex items-center justify-between h-12 px-3 rounded-xl hover:bg-muted/50 text-sm transition-colors">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s.value] }} />
                  {s.label}
                </div>
                {newStatus === s.value && <Check className="h-4 w-4 text-accent" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer open={activePicker === "responsavel"} onOpenChange={(o) => !o && setActivePicker(null)}>
        <DrawerContent>
          <div className="px-4 pb-6 pt-2">
            <p className="text-sm font-semibold mb-3">Responsável</p>
            {responsibleOptions.map((n) => (
              <button key={n} onClick={() => { setNewAssignee(n); setActivePicker(null); }}
                className="w-full flex items-center justify-between h-12 px-3 rounded-xl hover:bg-muted/50 text-sm transition-colors">
                {n}
                {newAssignee === n && <Check className="h-4 w-4 text-accent" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer open={activePicker === "data"} onOpenChange={(o) => !o && setActivePicker(null)}>
        <DrawerContent>
          <div className="px-4 pb-6 pt-2">
            <p className="text-sm font-semibold mb-3">Data</p>
            <Calendar
              mode="single"
              selected={newDate ? new Date(newDate + "T00:00:00") : undefined}
              onSelect={(date) => {
                if (date) {
                  setNewDate(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`);
                  setActivePicker(null);
                }
              }}
              className="rounded-xl"
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/* ── Main panel ──────────────────────────────────── */

export function TasksPanelNew() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const config = useWorkspaceConfig();
  const taskCats = useTaskCategories();
  const { taskCat1Label, taskCat2Label, isAdmin } = useWorkspace();

  const [search, setSearch] = useState("");
  const [selectedCat1, setSelectedCat1] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState<PeriodPreset>("1year");

  // Inline add
  const [newTitle, setNewTitle] = useState("");
  const [newCat1, setNewCat1] = useState("");
  const [newCat2, setNewCat2] = useState("");
  const [newStatus, setNewStatus] = useState("A Fazer");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Quick edit modals
  const [editModal, setEditModal] = useState<"cat1" | "cat2" | "responsibles" | null>(null);

  const responsibleOptions = config.activeResponsibles.map(r => r.name);

  // Auto-set defaults
  useMemo(() => {
    if (!newCat1 && taskCats.activeGroup1.length > 0) setNewCat1(taskCats.activeGroup1[0].name);
    if (!newCat2 && taskCats.activeGroup2.length > 0) setNewCat2(taskCats.activeGroup2[0].name);
  }, [taskCats.activeGroup1, taskCats.activeGroup2]);

  const cat1Options = useMemo(() => taskCats.activeGroup1.map(o => ({ value: o.name, label: o.name, color: o.color })), [taskCats.activeGroup1]);
  const cat2Options = useMemo(() => taskCats.activeGroup2.map(o => ({ value: o.name, label: o.name, color: o.color })), [taskCats.activeGroup2]);

  const canAdd = newTitle.trim() && newStatus && newDate;

  const handleAdd = async () => {
    if (!canAdd) return;
    setAdding(true);
    try {
      await addTask({
        title: newTitle.trim(),
        category: newCat1,
        category_2: newCat2,
        assignee: newAssignee,
        status: newStatus,
        priority: "Média",
        due_date: newDate || null,
        completed: newStatus === "Pronto",
      });
      setNewTitle("");
    } catch {}
    setAdding(false);
  };

  const isOverdue = useCallback((t: Task) => {
    if (!t.due_date) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(t.due_date + "T00:00:00") < today && t.status !== "Pronto";
  }, []);

  const filtered = useMemo(() => {
    const startDate = getStartDate(period);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return tasks
      .filter(t => !t.due_date || new Date(t.due_date + "T00:00:00") >= startDate)
      .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
      .filter(t => statusFilter === "all" || t.status === statusFilter)
      .sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date + "T00:00:00") : new Date(a.created_at || "");
        const dateB = b.due_date ? new Date(b.due_date + "T00:00:00") : new Date(b.created_at || "");
        const diffA = Math.abs(dateA.getTime() - today.getTime());
        const diffB = Math.abs(dateB.getTime() - today.getTime());
        return diffA - diffB;
      });
  }, [tasks, search, statusFilter, period]);

  // Columns by category 1
  const visibleColumns = useMemo(() => {
    if (showAll) return [{ name: "Todas as tarefas", items: filtered, color: "" }];
    const catsToShow = selectedCat1.size > 0
      ? taskCats.activeGroup1.filter(c => selectedCat1.has(c.name))
      : taskCats.activeGroup1;
    return catsToShow.map(c => ({
      name: c.name,
      items: filtered.filter(t => t.category === c.name),
      color: c.color,
    }));
  }, [filtered, showAll, selectedCat1, taskCats.activeGroup1]);

  const renderRow = (task: Task) => {
    if (editingId === task.id) {
      return (
        <TaskInlineEditBar
          key={task.id}
          task={task}
          onSave={(changes) => { if (Object.keys(changes).length > 0) updateTask(task.id, changes); setEditingId(null); }}
          onCancel={() => setEditingId(null)}
          responsibleOptions={responsibleOptions}
          cat1Options={cat1Options}
          cat2Options={cat2Options}
          cat1Label={taskCat1Label}
          cat2Label={taskCat2Label}
          onManageCat1={() => setEditModal("cat1")}
          onManageCat2={() => setEditModal("cat2")}
          onManageResp={() => setEditModal("responsibles")}
        />
      );
    }

    const overdue = isOverdue(task);
    const cat1Color = taskCats.activeGroup1.find(c => c.name === task.category)?.color;
    const cat2Color = taskCats.activeGroup2.find(c => c.name === task.category_2)?.color;

    return (
      <div key={task.id} className={cn(
        "flex items-start gap-3 px-3 py-3.5 hover:bg-amber-500/[0.04] transition-colors duration-150",
        overdue && "bg-red-50 dark:bg-red-950/20",
      )} style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
        <span className={cn("text-[11px] font-mono w-[72px] shrink-0 pt-0.5", overdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
          {task.due_date ? formatDate(task.due_date) : "—"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 flex-wrap">
            <p className={cn("text-sm font-medium", task.status === "Pronto" && "line-through text-muted-foreground")}>{task.title}</p>
            {overdue && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-red-600 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded shrink-0">Atrasado</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {task.assignee && <span>{task.assignee}</span>}
          </p>
        </div>
        {task.category && (
          <span className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
            style={cat1Color ? { backgroundColor: cat1Color + "25", color: cat1Color } : undefined}>
            {task.category}
          </span>
        )}
        {task.category_2 && (
          <span className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
            style={cat2Color ? { backgroundColor: cat2Color + "25", color: cat2Color } : undefined}>
            {task.category_2}
          </span>
        )}
        <StatusBadgeFilled status={task.status} color={STATUS_COLORS[task.status]} />
        {isAdmin && (
          <div className="flex gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingId(task.id)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(task.id)} title="Mover para lixeira">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderColumn = (title: string, items: Task[], color?: string) => (
    <div className="flex-1 md:min-w-[320px] min-w-0 glass-card rounded-2xl overflow-hidden">
      <div className="sticky top-0 z-10 px-4 py-3" style={{ background: "rgba(15,23,42,0.04)", borderBottom: "1px solid rgba(148,163,184,0.2)", borderRadius: "16px 16px 0 0" }}>
        <h3 className="text-sm font-bold font-heading uppercase tracking-[0.06em] flex items-center gap-2">
          {color && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />}
          {title}
        </h3>
        <p className="text-[11px] text-muted-foreground">{items.length} tarefa{items.length !== 1 ? "s" : ""}</p>
      </div>
      <ScrollArea className="h-[60vh]">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa encontrada.</p>
        ) : (
          items.map(renderRow)
        )}
      </ScrollArea>
    </div>
  );

  if (loading || taskCats.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-heading tracking-tight">Tarefas</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end overflow-x-hidden">
        <div className="relative flex-1 min-w-0 md:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
          <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mês atual</SelectItem>
            <SelectItem value="3months">Últimos 3 meses</SelectItem>
            <SelectItem value="6months">Últimos 6 meses</SelectItem>
            <SelectItem value="1year">Último 1 ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category 1 chip filters */}
      {taskCats.activeGroup1.length > 0 && (
        <div className="flex items-center gap-2 px-1 py-1" style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setShowAll(true); setSelectedCat1(new Set()); }}
                  className={cn(
                    "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border",
                    showAll ? "bg-accent/15 text-accent border-accent/30" : "text-muted-foreground border-transparent hover:border-border"
                  )}
                >
                  Todas
                </button>
              </TooltipTrigger>
              <TooltipContent>Exibir todas as tarefas em uma lista</TooltipContent>
            </Tooltip>
            <div className="w-px h-4 bg-border/50 mx-1" />
            {taskCats.activeGroup1.map((cat) => {
              const isSelected = !showAll && selectedCat1.has(cat.name);
              return (
                <Tooltip key={cat.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (showAll) { setShowAll(false); setSelectedCat1(new Set([cat.name])); }
                        else {
                          setSelectedCat1(prev => {
                            const next = new Set(prev);
                            if (next.has(cat.name)) next.delete(cat.name); else next.add(cat.name);
                            if (next.size === 0) setShowAll(true);
                            return next;
                          });
                        }
                      }}
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border inline-flex items-center gap-1",
                        isSelected
                          ? "border-accent/30 shadow-sm"
                          : !showAll && selectedCat1.size > 0
                            ? "text-muted-foreground/40 border-transparent line-through"
                            : "text-muted-foreground border-transparent hover:border-border"
                      )}
                      style={isSelected ? { backgroundColor: cat.color + "18", borderColor: cat.color + "40", color: cat.color } : undefined}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isSelected ? cat.color : cat.color + "60" }} />
                      {cat.name}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{isSelected ? `Remover filtro ${cat.name}` : `Filtrar por ${cat.name}`}</TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      )}

      {/* Inline add bar — desktop */}
      <div className="hidden md:block glass-card rounded-2xl p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Título da tarefa..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canAdd && handleAdd()}
            className="h-8 text-xs flex-1 min-w-[140px]"
          />
          <div className="flex items-center gap-1.5">
            <InlineChip icon={Tag} chipColor="#3b82f6" label={taskCat1Label} value={newCat1} onValueChange={setNewCat1} options={cat1Options} onManage={() => setEditModal("cat1")} />
            <InlineChip icon={Layers} chipColor="#8b5cf6" label={taskCat2Label} value={newCat2} onValueChange={setNewCat2} options={cat2Options} onManage={() => setEditModal("cat2")} />
            <InlineChip icon={Circle} chipColor="#f97316" label="Status" value={newStatus} onValueChange={setNewStatus} options={STATUS_OPTIONS.map(s => ({ ...s, color: STATUS_COLORS[s.value] }))} />
            <InlineChip icon={User} chipColor="#22c55e" label="Responsável" value={newAssignee} onValueChange={setNewAssignee} options={responsibleOptions.map(n => ({ value: n, label: n }))} searchable />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2 shrink-0">
                <CalendarIcon className="h-3.5 w-3.5" />
                {newDate ? formatDate(newDate) : "Data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={newDate ? new Date(newDate + "T00:00:00") : undefined} onSelect={(date) => { if (date) { setNewDate(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`); }}} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Button onClick={handleAdd} disabled={!canAdd || adding} size="sm" className="h-8 gap-1 text-xs px-3">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        {!canAdd && newTitle.trim() && (
          <p className="text-[10px] text-destructive">Preencha os campos obrigatórios: título, status e data.</p>
        )}
      </div>

      {/* Inline add bar — mobile */}
      <MobileTaskCreation
        newTitle={newTitle} setNewTitle={setNewTitle}
        newCat1={newCat1} setNewCat1={setNewCat1}
        newCat2={newCat2} setNewCat2={setNewCat2}
        newStatus={newStatus} setNewStatus={setNewStatus}
        newDate={newDate} setNewDate={setNewDate}
        newAssignee={newAssignee} setNewAssignee={setNewAssignee}
        cat1Options={cat1Options} cat2Options={cat2Options}
        cat1Label={taskCat1Label} cat2Label={taskCat2Label}
        responsibleOptions={responsibleOptions}
        canAdd={!!canAdd} adding={adding} handleAdd={handleAdd}
      />

      {/* Content — horizontal scrollable columns */}
      <div className="md:overflow-x-auto overflow-x-hidden pb-2 md:-mx-2 md:px-2">
        <div className="flex flex-col md:flex-row gap-4" style={{ minWidth: visibleColumns.length > 1 ? undefined : "100%" }}>
          {visibleColumns.map((col) => renderColumn(col.name, col.items, col.color))}
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para lixeira?</AlertDialogTitle>
            <AlertDialogDescription>A tarefa será movida para a lixeira e poderá ser restaurada depois.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteTask(deleteId); setDeleteId(null); } }}>Mover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick edit modals */}
      <QuickEditModal
        open={editModal === "cat1"}
        onOpenChange={(o) => !o && setEditModal(null)}
        title={`Gerenciar ${taskCat1Label}`}
        items={taskCats.group1.map(o => ({ id: o.id, name: o.name, color: o.color, is_active: o.is_active, sort_order: o.sort_order }))}
        onAdd={async (data) => { await taskCats.addOption(1, { name: (data as any).name, color: (data as any).color }); }}
        onUpdate={async (id, changes) => { await taskCats.updateOption(id, changes as any); }}
        onDelete={async (id) => { await taskCats.deleteOption(id); }}
        inUseIds={new Set(tasks.map(t => t.category).filter(Boolean))}
        showColor
      />
      <QuickEditModal
        open={editModal === "cat2"}
        onOpenChange={(o) => !o && setEditModal(null)}
        title={`Gerenciar ${taskCat2Label}`}
        items={taskCats.group2.map(o => ({ id: o.id, name: o.name, color: o.color, is_active: o.is_active, sort_order: o.sort_order }))}
        onAdd={async (data) => { await taskCats.addOption(2, { name: (data as any).name, color: (data as any).color }); }}
        onUpdate={async (id, changes) => { await taskCats.updateOption(id, changes as any); }}
        onDelete={async (id) => { await taskCats.deleteOption(id); }}
        inUseIds={new Set(tasks.map(t => t.category_2).filter(Boolean))}
        showColor
      />
      <QuickEditModal
        open={editModal === "responsibles"}
        onOpenChange={(o) => !o && setEditModal(null)}
        title="Gerenciar Responsáveis"
        items={config.responsibles.map(r => ({ id: r.id, name: r.name, is_active: r.is_active, sort_order: r.sort_order }))}
        onAdd={async (data) => { await config.addResponsible({ name: (data as any).name }); }}
        onUpdate={async (id, changes) => { await config.updateResponsible(id, changes as any); }}
        onDelete={async (id) => { await config.deleteResponsible(id); }}
        inUseIds={new Set(tasks.map(t => t.assignee).filter(Boolean))}
      />
    </div>
  );
}
