import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil, X, Clock, Check, CalendarIcon, ClipboardList, Circle, User, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { usePosts, type Post } from "@/hooks/usePosts";
import { useAppointments, type Appointment, type AppointmentStatus, type AppointmentRecurrence } from "@/hooks/useAppointments";
import { StatusBadgeFilled } from "@/components/StatusBadgeFilled";
import { ChipSelect } from "@/components/ChipSelect";
import { useWorkspaceConfig } from "@/hooks/useWorkspaceConfig";
import { getIcon, getIconColor } from "@/lib/icons";
import { toast } from "sonner";

const MAX_VISIBLE_ITEMS = 2;
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  reunião: "REUNIÃO", evento: "EVENTO", entrega: "ENTREGA", prazo: "PRAZO", outro: "OUTRO",
};

const APPT_TYPES = ["Reunião", "Evento", "Entrega", "Prazo", "Outro"] as const;
const APPT_TYPE_COLORS: Record<string, string> = { "Reunião": "#f97316", "Evento": "#3b82f6", "Entrega": "#22c55e", "Prazo": "#ef4444", "Outro": "#9ca3af" };
const APPT_STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" }, { value: "concluído", label: "Concluído" }, { value: "cancelado", label: "Cancelado" },
];
const APPT_STATUS_COLORS: Record<AppointmentStatus, string> = { pendente: "#eab308", concluído: "#22c55e", cancelado: "#ef4444" };
const APPT_RECURRENCE_OPTIONS: { value: AppointmentRecurrence; label: string }[] = [
  { value: "nenhuma", label: "Nenhuma" }, { value: "diária", label: "Diária" }, { value: "semanal", label: "Semanal" }, { value: "mensal", label: "Mensal" },
];

interface MarketingCalendarProps {}

/* ── Inline chip for calendar edit popovers ──────── */
function CalendarInlineChip({ icon: Icon, chipColor, label, value, onValueChange, options }: {
  icon: React.ElementType; chipColor: string; label: string; value: string;
  onValueChange: (v: string) => void; options: { value: string; label: string; color?: string }[];
}) {
  const selected = options.find(o => o.value === value);
  const hasValue = !!selected;
  const chipBg = hasValue ? { backgroundColor: chipColor + "22", borderColor: chipColor } : undefined;
  const chipTextColor = hasValue ? { color: chipColor } : undefined;
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn("h-8 min-h-[32px] w-auto rounded-full border px-2.5", "transition-all", !hasValue && "bg-muted/50 border-border text-muted-foreground", "[&>svg:last-child]:hidden", "[&>span]:!inline-flex [&>span]:!flex-row [&>span]:!items-center [&>span]:!gap-1")}
        style={chipBg}
      >
        <span style={chipTextColor} className="inline-flex flex-row items-center gap-1">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium whitespace-nowrap leading-none max-w-[100px] truncate">{hasValue ? selected!.label : label}</span>
        </span>
      </SelectTrigger>
      <SelectContent className="z-[999999]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="flex items-center gap-2">{o.color && <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}{o.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CalendarTimeChip({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) {
  const hasValue = !!value;
  const chipColor = "#64748b";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("h-8 min-h-[32px] rounded-full border px-2.5 inline-flex items-center gap-1 transition-all", !hasValue && "bg-muted/50 border-border text-muted-foreground")}
          style={hasValue ? { backgroundColor: chipColor + "22", borderColor: chipColor, color: chipColor } : undefined}>
          <Clock className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium whitespace-nowrap">{hasValue ? value : "Hora"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Horário</label>
          <Input type="time" value={value} onChange={(e) => onValueChange(e.target.value)} className="h-8 w-[140px]" autoFocus />
          {hasValue && <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={() => onValueChange("")}>Limpar</Button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type UnifiedItem =
  | { type: "post"; data: Post; dateStr: string }
  | { type: "appointment"; data: Appointment; dateStr: string };

function getAppointmentOccurrences(appointments: Appointment[], year: number, month: number, rangeStart?: Date, rangeEnd?: Date): UnifiedItem[] {
  const start = rangeStart || new Date(year, month, 1);
  const end = rangeEnd || new Date(year, month + 1, 0);
  const items: UnifiedItem[] = [];
  const pad = (n: number) => String(n).padStart(2, "0");
  const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  for (const appt of appointments) {
    if (appt.status === "cancelado") continue;
    const apptDate = new Date(appt.date + "T00:00:00");
    if (appt.recurrence === "nenhuma") {
      if (apptDate >= start && apptDate <= end) {
        items.push({ type: "appointment", data: appt, dateStr: appt.date });
      }
    } else {
      let current = new Date(apptDate);
      while (current < start) {
        if (appt.recurrence === "diária") current.setDate(current.getDate() + 1);
        else if (appt.recurrence === "semanal") current.setDate(current.getDate() + 7);
        else if (appt.recurrence === "mensal") current.setMonth(current.getMonth() + 1);
      }
      let safety = 0;
      while (current <= end && safety < 50) {
        items.push({ type: "appointment", data: appt, dateStr: toStr(current) });
        if (appt.recurrence === "diária") current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
        else if (appt.recurrence === "semanal") current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
        else if (appt.recurrence === "mensal") current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
        else break;
        safety++;
      }
    }
  }
  return items;
}

function getItemLabel(item: UnifiedItem): string {
  if (item.type === "post") return "MÍDIA";
  if (item.type === "appointment") {
    const appt = item.data as Appointment;
    return APPOINTMENT_TYPE_LABELS[appt.type.toLowerCase()] || appt.type.toUpperCase();
  }
  return "";
}

function getItemTitle(item: UnifiedItem): string {
  if (item.type === "post") return (item.data as Post).conteudo;
  return (item.data as Appointment).title;
}

function isPostOverdue(post: Post): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(post.data_postagem + "T00:00:00");
  return d < today && !post.status.toLowerCase().includes("publicad");
}

function getItemStatus(item: UnifiedItem): string {
  if (item.type === "post") {
    const post = item.data as Post;
    if (isPostOverdue(post)) return "Atrasado";
    return post.status;
  }
  return (item.data as Appointment).status;
}

function getItemResponsible(item: UnifiedItem): string {
  if (item.type === "post") return (item.data as Post).responsavel || "";
  if (item.type === "appointment") return (item.data as Appointment).responsible || "";
  return "";
}

function getItemProfile(item: UnifiedItem): string {
  if (item.type === "post") return (item.data as Post).local || "";
  return "";
}

function getLabelStyle(item: UnifiedItem): string {
  if (item.type === "post") return "text-primary/70 bg-primary/10";
  return "text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30";
}

const VISIBILITY_KEY = "calendarVisibility";
type CalendarVisibility = { publications: boolean; appointments: boolean };
function loadVisibility(): CalendarVisibility {
  try {
    const raw = localStorage.getItem(VISIBILITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { publications: parsed.publications ?? true, appointments: parsed.appointments ?? true };
    }
    return { publications: true, appointments: true };
  } catch { return { publications: true, appointments: true }; }
}

export function MarketingCalendar({}: MarketingCalendarProps = {}) {
  const { activeProfiles, activeStatuses, activeCategories, activeResponsibles } = useWorkspaceConfig();
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const calendarRange = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const from = new Date(y, m, -6);
    const to = new Date(y, m + 1, 6);
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
      to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
    };
  }, [currentDate]);

  const { posts, updatePost, deletePost } = usePosts(calendarRange);
  const { appointments, updateAppointment } = useAppointments(calendarRange);
  const [visibility, setVisibility] = useState<CalendarVisibility>(loadVisibility);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState("");

  // Inline edit state
  const [editingItem, setEditingItem] = useState<{ type: string; id: string } | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "post"; id: string } | null>(null);

  // DnD state
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<UnifiedItem | null>(null);
  const [recurrenceConfirm, setRecurrenceConfirm] = useState<{ appt: Appointment; newDate: string } | null>(null);
  const dragDataRef = useRef<{ type: string; id: string; itemType: string; recurrence?: string } | null>(null);



  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  useEffect(() => { localStorage.setItem(VISIBILITY_KEY, JSON.stringify(visibility)); }, [visibility]);
  const toggleVisibility = (key: keyof CalendarVisibility) => setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

  const postsByDate = useMemo(() => {
    const map: Record<string, Post[]> = {};
    posts.forEach((p) => { if (!map[p.data_postagem]) map[p.data_postagem] = []; map[p.data_postagem].push(p); });
    return map;
  }, [posts]);


  // Compute grid range (includes prev/next month overflow days)
  const gridRange = useMemo(() => {
    const prevMonthDays = new Date(year, month, 0).getDate();
    const leadingEmpties = firstDayOfWeek;
    const totalCells = leadingEmpties + daysInMonth;
    const trailingEmpties = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    const firstDate = leadingEmpties > 0
      ? new Date(year, month - 1, prevMonthDays - leadingEmpties + 1)
      : new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, trailingEmpties > 0 ? trailingEmpties : 0);
    // If no trailing, last date is last day of current month
    const actualLast = trailingEmpties > 0 ? lastDate : new Date(year, month + 1, 0);
    return { firstDate, lastDate: actualLast };
  }, [year, month, firstDayOfWeek, daysInMonth]);

  const appointmentItems = useMemo(() => getAppointmentOccurrences(appointments, year, month, gridRange.firstDate, gridRange.lastDate), [appointments, year, month, gridRange]);
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, UnifiedItem[]> = {};
    appointmentItems.forEach((item) => { if (!map[item.dateStr]) map[item.dateStr] = []; map[item.dateStr].push(item); });
    return map;
  }, [appointmentItems]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  type CalendarCell = { day: number; isCurrentMonth: boolean; fullDate: Date };
  const cells: CalendarCell[] = useMemo(() => {
    const result: CalendarCell[] = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      result.push({ day: d, isCurrentMonth: false, fullDate: new Date(year, month - 1, d) });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ day: d, isCurrentMonth: true, fullDate: new Date(year, month, d) });
    }
    // Trailing days from next month
    while (result.length % 7 !== 0) {
      const d = result.length - firstDayOfWeek - daysInMonth + 1;
      result.push({ day: d, isCurrentMonth: false, fullDate: new Date(year, month + 1, d) });
    }
    return result;
  }, [year, month, daysInMonth, firstDayOfWeek]);

  const cellDateStr = (cell: CalendarCell) => {
    const y = cell.fullDate.getFullYear();
    const m = cell.fullDate.getMonth() + 1;
    const d = cell.fullDate.getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const dateStr = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const matchesProfileFilter = (item: UnifiedItem): boolean => {
    if (selectedProfiles.size === 0) return true;
    const profile = getItemProfile(item);
    if (!profile) return true; // appointments have no profile, always show
    return selectedProfiles.has(profile);
  };

  const buildUnifiedForDate = (ds: string, applyVisibility = true): UnifiedItem[] => {
    const unified: UnifiedItem[] = [];
    if (!applyVisibility || visibility.publications) (postsByDate[ds] || []).forEach((p) => unified.push({ type: "post", data: p, dateStr: ds }));
    if (!applyVisibility || visibility.appointments) (appointmentsByDate[ds] || []).forEach((item) => unified.push(item));
    const filtered = applyVisibility ? unified.filter(matchesProfileFilter) : unified;
    filtered.sort((a, b) => {
      const order = { post: 0, appointment: 1 };
      if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
      return getItemTitle(a).localeCompare(getItemTitle(b));
    });
    return filtered;
  };

  const { upcomingByDay, pastByDay } = useMemo(() => {
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const futureLimit = new Date(todayDate);
    futureLimit.setDate(futureLimit.getDate() + 15);
    const allItems: UnifiedItem[] = [];
    posts.forEach((p) => allItems.push({ type: "post", data: p, dateStr: p.data_postagem }));
    appointments.forEach((a) => {
      if (a.status === "cancelado") return;
      if (a.recurrence === "nenhuma") { allItems.push({ type: "appointment", data: a, dateStr: a.date }); return; }
      const pad = (n: number) => String(n).padStart(2, "0");
      const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      let current = new Date(a.date + "T00:00:00");
      const limit = new Date(todayDate); limit.setDate(limit.getDate() + 30);
      let safety = 0;
      while (current <= limit && safety < 60) {
        allItems.push({ type: "appointment", data: a, dateStr: toStr(current) });
        if (a.recurrence === "diária") current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
        else if (a.recurrence === "semanal") current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
        else if (a.recurrence === "mensal") current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
        else break;
        safety++;
      }
    });
    const filtered = allItems.filter((item) => {
      if (item.type === "post" && !visibility.publications) return false;
      if (item.type === "appointment" && !visibility.appointments) return false;
      if (selectedProfiles.size > 0) {
        const profile = getItemProfile(item);
        if (profile && !selectedProfiles.has(profile)) return false;
      }
      return true;
    });
    const upcoming: UnifiedItem[] = [];
    const past: UnifiedItem[] = [];
    filtered.forEach((item) => {
      const d = new Date(item.dateStr + "T00:00:00");
      if (d < todayDate) past.push(item);
      else if (d <= futureLimit) upcoming.push(item);
    });
    upcoming.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    past.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    const groupByDay = (items: UnifiedItem[]) => {
      const map: Record<string, UnifiedItem[]> = {};
      items.forEach((item) => { if (!map[item.dateStr]) map[item.dateStr] = []; map[item.dateStr].push(item); });
      return Object.entries(map).map(([ds, items]) => ({ dateStr: ds, items }));
    };
    return { upcomingByDay: groupByDay(upcoming), pastByDay: groupByDay(past) };
  }, [posts, appointments, todayStr, visibility, selectedProfiles]);

  const formatDayLabel = (ds: string) => {
    const d = new Date(ds + "T00:00:00");
    const dayOfWeek = DAYS[d.getDay()];
    return `${dayOfWeek} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const getStatusColor = (statusName: string) => {
    const found = activeStatuses.find(s => s.name === statusName);
    return found?.color || undefined;
  };

  // ── Drag and Drop handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, item: UnifiedItem) => {
    const id = item.type === "post" ? (item.data as Post).id
      : (item.data as Appointment).id;
    const recurrence = item.type === "appointment" ? (item.data as Appointment).recurrence : "nenhuma";
    dragDataRef.current = { type: item.type, id, itemType: item.type, recurrence };
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(dragDataRef.current));
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDragOverDate(null);
    setDraggedItem(null);
    dragDataRef.current = null;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, ds: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(ds);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as { type: string; id: string; recurrence?: string };
      if (data.type === "post") {
        await updatePost(data.id, { data_postagem: targetDate });
        toast.success("Mídia movida para " + targetDate);
      } else if (data.type === "appointment") {
        const appt = appointments.find(a => a.id === data.id);
        if (appt && appt.recurrence !== "nenhuma") {
          setRecurrenceConfirm({ appt, newDate: targetDate });
        } else {
          await updateAppointment(data.id, { date: targetDate });
          toast.success("Compromisso movido para " + targetDate);
        }
      }
    } catch { /* ignore */ }
  }, [updatePost, updateAppointment, appointments]);

  const confirmRecurrenceDrag = useCallback(async () => {
    if (!recurrenceConfirm) return;
    const { appt, newDate } = recurrenceConfirm;
    await updateAppointment(appt.id, { date: newDate });
    const newDateObj = new Date(newDate + "T00:00:00");
    const dayName = DAYS_FULL[newDateObj.getDay()];
    if (appt.recurrence === "semanal") {
      toast.success(`Recorrência atualizada para toda ${dayName}`);
    } else if (appt.recurrence === "mensal") {
      toast.success(`Recorrência atualizada para todo dia ${newDateObj.getDate()}`);
    } else if (appt.recurrence === "diária") {
      toast.success("Data base da recorrência diária atualizada");
    }
    setRecurrenceConfirm(null);
  }, [recurrenceConfirm, updateAppointment]);

  // ── Render helpers ──
  const renderLabel = (item: UnifiedItem, size: "sm" | "xs" = "xs") => {
    const profile = getItemProfile(item);
    const profileChip = profile ? (
      <span className="text-[8px] font-medium bg-secondary text-muted-foreground px-1 py-px rounded">{profile}</span>
    ) : null;
    return (
      <span className="flex items-center gap-1">
        <span className={cn("font-bold uppercase tracking-wide font-heading px-1.5 py-0.5 rounded", size === "sm" ? "text-[9px]" : "text-[8px]", getLabelStyle(item))}>
          {getItemLabel(item)}
        </span>
        {profileChip}
      </span>
    );
  };

  const getDragItemId = (item: UnifiedItem): string => {
    if (item.type === "post") return (item.data as Post).id;
    return (item.data as Appointment).id;
  };

  const isItemBeingDragged = (item: UnifiedItem): boolean => {
    if (!draggedItem) return false;
    return getDragItemId(item) === getDragItemId(draggedItem) && item.type === draggedItem.type;
  };

  const renderGhostCard = (item: UnifiedItem) => {
    const title = getItemTitle(item);
    const status = getItemStatus(item);
    return (
      <div className="rounded-lg p-1.5 border border-dashed border-primary/40 opacity-50 pointer-events-none glass-card-sm" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <p className="text-[11px] font-medium truncate leading-tight mb-0.5">{title}</p>
        <div className="flex items-center gap-1 overflow-hidden flex-wrap">
          <StatusBadgeFilled status={status} color={getStatusColor(status)} className="text-[8px] px-1.5 py-px shrink-0" />
          <span className="shrink-0">{renderLabel(item)}</span>
        </div>
      </div>
    );
  };

  const renderDesktopCard = (item: UnifiedItem) => {
    const title = getItemTitle(item);
    const status = getItemStatus(item);
    const responsible = getItemResponsible(item);
    const beingDragged = isItemBeingDragged(item);

    const cardContent = (
      <>
        <p className="text-[11px] font-medium truncate leading-tight mb-0.5">{title}</p>
        <div className="flex items-center gap-1 overflow-hidden flex-wrap">
          <StatusBadgeFilled status={status} color={getStatusColor(status)} className="text-[8px] px-1.5 py-px shrink-0" />
          <span className="shrink-0">{renderLabel(item)}</span>
          {responsible && <span className="text-[9px] text-muted-foreground truncate">{responsible}</span>}
        </div>
      </>
    );

    const dragProps = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, item),
      onDragEnd: handleDragEnd,
    };

    if (item.type === "post") {
      const post = item.data as Post;
      const isEditing = editingItem?.type === "post" && editingItem?.id === post.id;
      return (
        <Popover key={`post-${post.id}`} open={isEditing} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <PopoverTrigger asChild>
                <div {...dragProps} className={cn("group relative rounded-lg p-1.5 border transition-all duration-150 cursor-grab active:cursor-grabbing border-l-[3px] overflow-hidden glass-card-sm")} style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
                  onClick={(e) => { if (!isEditing) { e.stopPropagation(); setEditingItem({ type: "post", id: post.id }); } }}
                >
                  <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 z-10">
                    <button onClick={(e) => { e.stopPropagation(); setEditingItem({ type: "post", id: post.id }); }} className="h-5 w-5 rounded flex items-center justify-center bg-card/90 border border-border hover:bg-accent hover:text-accent-foreground transition-colors"><Pencil className="h-2.5 w-2.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "post", id: post.id }); }} className="h-5 w-5 rounded flex items-center justify-center bg-card/90 border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"><X className="h-2.5 w-2.5" /></button>
                  </div>
                  {cardContent}
                </div>
              </PopoverTrigger>
            </HoverCardTrigger>
            {!isEditing && (
              <HoverCardContent side="right" align="start" sideOffset={8} className="w-72 p-4 space-y-2 z-[9999]">
                <p className="text-sm font-bold font-heading">{post.conteudo}</p>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-2"><span>Status:</span><StatusBadgeFilled status={post.status} color={getStatusColor(post.status)} /></div>
                  {post.local && <p>Perfil: <span className="text-foreground">{post.local}</span></p>}
                  {post.responsavel && <p>Responsável: <span className="text-foreground">{post.responsavel}</span></p>}
                  <p>Data: <span className="text-foreground">{post.data_postagem}</span></p>
                  {post.tipo_conteudo && (() => {
                    const catDef = activeCategories.find(c => c.name === post.tipo_conteudo);
                    const CatIcon = catDef ? getIcon(catDef.icon_key) : null;
                    return (
                      <p className="flex items-center gap-1">Categoria: {CatIcon && <CatIcon className="h-3 w-3 inline" style={{ color: getIconColor(catDef!.icon_key) }} />}<span className="text-foreground capitalize">{post.tipo_conteudo}</span></p>
                    );
                  })()}
                </div>
              </HoverCardContent>
            )}
          </HoverCard>
          <PopoverContent side="right" align="start" sideOffset={8} className="w-auto max-w-[420px] p-3 z-[99999]">
            <CalendarPostEditBar post={post} onSave={(changes) => { if (Object.keys(changes).length > 0) updatePost(post.id, changes); setEditingItem(null); }} onCancel={() => setEditingItem(null)} profiles={activeProfiles} categories={activeCategories} statuses={activeStatuses} responsibles={activeResponsibles.map(r => r.name)} />
          </PopoverContent>
        </Popover>
      );
    }




    const appt = item.data as Appointment;
    const isEditingAppt = editingItem?.type === "appointment" && editingItem?.id === appt.id;
    return (
      <Popover key={`appt-${appt.id}-${item.dateStr}`} open={isEditingAppt} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <PopoverTrigger asChild>
              <div {...dragProps} className={cn("group relative rounded-lg p-1.5 border cursor-grab active:cursor-grabbing overflow-hidden glass-card-sm")} style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
                onClick={(e) => { if (!isEditingAppt) { e.stopPropagation(); setEditingItem({ type: "appointment", id: appt.id }); } }}
              >
                <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 z-10">
                  <button onClick={(e) => { e.stopPropagation(); setEditingItem({ type: "appointment", id: appt.id }); }} className="h-5 w-5 rounded flex items-center justify-center bg-card/90 border border-border hover:bg-accent hover:text-accent-foreground transition-colors"><Pencil className="h-2.5 w-2.5" /></button>
                </div>
                {cardContent}
              </div>
            </PopoverTrigger>
          </HoverCardTrigger>
          {!isEditingAppt && (
            <HoverCardContent side="right" align="start" sideOffset={8} className="w-72 p-4 space-y-2 z-[9999]">
              <p className="text-sm font-bold font-heading">{appt.title}</p>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2"><span>Status:</span><span className="text-foreground capitalize">{appt.status}</span></div>
                <p>Tipo: <span className="text-foreground capitalize">{appt.type}</span></p>
                {appt.responsible && <p>Responsável: <span className="text-foreground">{appt.responsible}</span></p>}
                <p>Data: <span className="text-foreground">{item.dateStr}</span></p>
                {appt.start_time && <p>Horário: <span className="text-foreground">{appt.start_time}</span></p>}
                {appt.local && <p>Local: <span className="text-foreground">{appt.local}</span></p>}
                {appt.recurrence !== "nenhuma" && <p>Recorrência: <span className="text-foreground capitalize">{appt.recurrence}</span></p>}
              </div>
            </HoverCardContent>
          )}
        </HoverCard>
        <PopoverContent side="right" align="start" sideOffset={8} className="w-auto max-w-[480px] p-3 z-[99999]">
          <CalendarApptEditBar appointment={appt} onSave={(changes) => { if (Object.keys(changes).length > 0) updateAppointment(appt.id, changes); setEditingItem(null); }} onCancel={() => setEditingItem(null)} responsibles={activeResponsibles.map(r => r.name)} />
        </PopoverContent>
      </Popover>
    );
  };

  const renderMobileItem = (item: UnifiedItem) => {
    const responsible = getItemResponsible(item);
    if (item.type === "post") {
      const post = item.data as Post;
      return (
        <div key={`post-${post.id}`} className="relative rounded-lg p-3 border border-l-[3px] bg-card border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug line-clamp-2 mb-1">{post.conteudo}</p>
              <div className="flex items-center gap-1.5 min-w-0">
                <StatusBadgeFilled status={post.status} color={getStatusColor(post.status)} className="shrink-0 text-[9px]" />
                {renderLabel(item, "sm")}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditingItem({ type: "post", id: post.id })} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => setDeleteConfirm({ type: "post", id: post.id })} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
            </div>
          </div>
          {post.responsavel && <p className="text-[11px] text-muted-foreground mt-1.5">{post.responsavel}</p>}
        </div>
      );
    }
    const appt = item.data as Appointment;
    return (
      <div key={`appt-${appt.id}-${item.dateStr}`} className="relative rounded-lg p-3 border bg-card border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug line-clamp-2 mb-1">{appt.title}</p>
            <div className="flex items-center gap-1.5">{renderLabel(item, "sm")}</div>
            {appt.start_time && <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="h-3 w-3" />{appt.start_time}</p>}
          </div>
        </div>
        {appt.responsible && <p className="text-[11px] text-muted-foreground mt-1.5">{appt.responsible}</p>}
      </div>
    );
  };

  const renderModalItem = (item: UnifiedItem) => renderMobileItem(item);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-heading tracking-[-0.02em]">Calendário</h1>
        <p className="text-sm text-muted-foreground mt-1">{MONTHS[month]} {year}</p>
      </div>

      <div>
          <div className="glass-card rounded-2xl">
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4" style={{ borderBottom: "1px solid rgba(148,163,184,0.2)" }}>
              <h2 className="text-base md:text-lg font-extrabold font-heading tracking-[-0.03em]">{MONTHS[month]} {year}</h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-full hover:bg-amber-500 hover:text-slate-900 transition-all"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-full hover:bg-amber-500 hover:text-slate-900 transition-all"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Visibility & Profile Filters */}
            <div className="flex items-center gap-2 px-4 md:px-6 py-2" style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
              <TooltipProvider delayDuration={200}>
                {([["publications", "Mídia"], ["appointments", "Compromissos"]] as [keyof typeof visibility, string][]).map(([key, label]) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleVisibility(key)}
                        className={cn(
                          "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border",
                          visibility[key]
                            ? "bg-accent/15 text-accent border-accent/30"
                            : "text-muted-foreground/50 border-transparent line-through"
                        )}
                      >
                        {label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{visibility[key] ? `Ocultar ${label}` : `Mostrar ${label}`}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
              {activeProfiles.length > 0 && (
                <>
                  <div className="w-px h-4 bg-border/50 mx-1" />
                  {activeProfiles.map((profile) => {
                    const isSelected = selectedProfiles.has(profile.name);
                    const ProfileIcon = getIcon(profile.icon_key);
                    const iconColor = getIconColor(profile.icon_key);
                    return (
                      <Tooltip key={profile.name}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              setSelectedProfiles((prev) => {
                                const next = new Set(prev);
                                if (next.has(profile.name)) next.delete(profile.name);
                                else next.add(profile.name);
                                return next;
                              });
                            }}
                            className={cn(
                              "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border inline-flex items-center gap-1",
                              isSelected
                                ? "border-accent/30 shadow-sm"
                                : selectedProfiles.size > 0
                                  ? "text-muted-foreground/40 border-transparent line-through"
                                  : "text-muted-foreground border-transparent hover:border-border"
                            )}
                            style={isSelected ? { backgroundColor: iconColor + "18", borderColor: iconColor + "40", color: iconColor } : undefined}
                          >
                            {ProfileIcon && <ProfileIcon className="h-3 w-3" style={{ color: isSelected ? iconColor : undefined }} />}
                            {profile.name}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{isSelected ? `Remover filtro ${profile.name}` : `Filtrar por ${profile.name}`}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </>
              )}
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:block">
              <div className="grid grid-cols-7">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1.5" style={{ borderBottom: "1px solid rgba(148,163,184,0.18)" }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((cell, idx) => {
                  const ds = cellDateStr(cell);
                  const items = buildUnifiedForDate(ds);
                  const isTodayCell = cell.isCurrentMonth && isToday(cell.day);
                  const isDragOver = dragOverDate === ds;
                  return (
                    <div
                      key={idx}
                       className={cn(
                         "p-1 relative transition-colors duration-150",
                         isDragOver && "bg-accent/10 ring-1 ring-accent/30 ring-inset"
                       )}
                       style={{
                         height: `calc((100vh - 180px) / ${Math.ceil(cells.length / 7)})`,
                         borderBottom: "1px solid rgba(148,163,184,0.18)",
                         borderRight: idx % 7 < 6 ? "1px solid rgba(148,163,184,0.18)" : "none",
                       }}
                      
                      onDragOver={(e) => handleDragOver(e, ds)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, ds)}
                    >
                      <button
                        onClick={() => { setDayModalDate(ds); setDayModalOpen(true); }}
                        className={cn(
                          "text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center mb-0.5 transition-colors",
                          isTodayCell ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
                          !cell.isCurrentMonth && "opacity-40"
                        )}
                      >
                        {cell.day}
                      </button>
                      <div className="space-y-0.5">
                        {items.slice(0, MAX_VISIBLE_ITEMS).map((item) => {
                          if (isItemBeingDragged(item) && dragOverDate && dragOverDate !== ds) return renderGhostCard(item);
                          return renderDesktopCard(item);
                        })}
                        {items.length > MAX_VISIBLE_ITEMS && (
                          <button
                            onClick={() => { setDayModalDate(ds); setDayModalOpen(true); }}
                            className="text-[9px] text-accent font-semibold hover:underline w-full text-left px-1"
                          >
                            +{items.length - MAX_VISIBLE_ITEMS} mais
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile: Next 15 days + History */}
            <div className="md:hidden px-3 py-3 space-y-3">
              {upcomingByDay.length === 0 && pastByDay.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum item encontrado.</p>
              )}
              {upcomingByDay.map(({ dateStr: ds, items }) => (
                <div key={ds}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{formatDayLabel(ds)}</p>
                  <div className="space-y-1.5">{items.map(renderMobileItem)}</div>
                </div>
              ))}
              {pastByDay.length > 0 && (
                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-2 w-full">
                    {historyOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    Histórico
                    <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded-full ml-1">{pastByDay.reduce((acc, d) => acc + d.items.length, 0)}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 pt-1">
                      {pastByDay.map(({ dateStr: ds, items }) => (
                        <div key={ds}>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{formatDayLabel(ds)}</p>
                          <div className="space-y-1.5">{items.map(renderMobileItem)}</div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
        </div>
      </div>

      {/* Day modal */}
      <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{dayModalDate && formatDayLabel(dayModalDate)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {dayModalDate && buildUnifiedForDate(dayModalDate, false).map(renderModalItem)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recurrence confirmation dialog */}
      <AlertDialog open={!!recurrenceConfirm} onOpenChange={(open) => { if (!open) setRecurrenceConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar recorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              {recurrenceConfirm && (() => {
                const nd = new Date(recurrenceConfirm.newDate + "T00:00:00");
                const dayName = DAYS_FULL[nd.getDay()];
                if (recurrenceConfirm.appt.recurrence === "semanal") {
                  return `Tem certeza que quer alterar a recorrência para toda ${dayName}? Isso afetará todas as ocorrências futuras.`;
                }
                if (recurrenceConfirm.appt.recurrence === "mensal") {
                  return `Tem certeza que quer alterar a recorrência para todo dia ${nd.getDate()}? Isso afetará todas as ocorrências futuras.`;
                }
                return `Tem certeza que quer alterar a data base da recorrência? Isso afetará todas as ocorrências futuras.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRecurrenceDrag}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta mídia será movida para a lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (deleteConfirm) deletePost(deleteConfirm.id);
              setDeleteConfirm(null);
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Calendar Inline Edit Bars ───────────────────── */

function CalendarPostEditBar({ post, onSave, onCancel, profiles, categories, statuses, responsibles }: {
  post: Post;
  onSave: (changes: Partial<Omit<Post, "id" | "created_at">>) => void;
  onCancel: () => void;
  profiles: { name: string; icon_key: string }[];
  categories: { name: string; color: string | null }[];
  statuses: { name: string; color: string | null }[];
  responsibles: string[];
}) {
  const [title, setTitle] = useState(post.conteudo);
  const [local, setLocal] = useState(post.local || "");
  const [tipo, setTipo] = useState(post.tipo_conteudo || "");
  const [status, setStatus] = useState(post.status);
  const [resp, setResp] = useState(post.responsavel || "");
  const [date, setDate] = useState(post.data_postagem);

  const handleSave = () => {
    const changes: Partial<Omit<Post, "id" | "created_at">> = {};
    if (title.trim() && title.trim() !== post.conteudo) changes.conteudo = title.trim();
    if (local !== (post.local || "")) changes.local = local;
    if (tipo !== (post.tipo_conteudo || "")) changes.tipo_conteudo = tipo;
    if (status !== post.status) changes.status = status;
    if (resp !== (post.responsavel || "")) changes.responsavel = resp;
    if (date !== post.data_postagem) changes.data_postagem = date;
    onSave(changes);
  };

  return (
    <div className="space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }} className="h-8 text-xs" autoFocus />
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChipSelect variant="profile" value={local} onValueChange={setLocal} options={profiles.map(p => ({ value: p.name, label: p.name, icon_key: p.icon_key || null }))} />
        <ChipSelect variant="category" value={tipo} onValueChange={setTipo} options={categories.map(c => ({ value: c.name, label: c.name, color: c.color || null }))} />
        <ChipSelect variant="status" value={status} onValueChange={setStatus} options={statuses.map(s => ({ value: s.name, label: s.name, color: s.color || null }))} />
        <ChipSelect variant="member" value={resp} onValueChange={setResp} options={responsibles.map(n => ({ value: n, label: n }))} />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2"><CalendarIcon className="h-3.5 w-3.5" />{date ? new Date(date + "T00:00:00").toLocaleDateString("pt-BR") : "Data"}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[999999]" align="end"><Calendar mode="single" selected={date ? new Date(date + "T00:00:00") : undefined} onSelect={(d) => { if (d) { setDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`); }}} initialFocus /></PopoverContent>
        </Popover>
      </div>
      <div className="flex gap-1 justify-end">
        <Button onClick={handleSave} size="sm" className="h-7 gap-1 text-xs px-2.5"><Check className="h-3 w-3" /> Salvar</Button>
        <Button onClick={onCancel} variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground"><X className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}




function CalendarApptEditBar({ appointment, onSave, onCancel, responsibles }: {
  appointment: Appointment;
  onSave: (changes: Partial<Omit<Appointment, "id" | "created_at">>) => void;
  onCancel: () => void;
  responsibles: string[];
}) {
  const [title, setTitle] = useState(appointment.title);
  const [type, setType] = useState(appointment.type);
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [resp, setResp] = useState(appointment.responsible || "");
  const [recurrence, setRecurrence] = useState<AppointmentRecurrence>(appointment.recurrence);
  const [time, setTime] = useState(appointment.start_time || "");
  const [date, setDate] = useState(appointment.date);

  const handleSave = () => {
    const changes: Partial<Omit<Appointment, "id" | "created_at">> = {};
    if (title.trim() && title.trim() !== appointment.title) changes.title = title.trim();
    if (type !== appointment.type) changes.type = type;
    if (status !== appointment.status) changes.status = status;
    if (resp !== (appointment.responsible || "")) changes.responsible = resp || undefined;
    if (recurrence !== appointment.recurrence) changes.recurrence = recurrence;
    if (time !== (appointment.start_time || "")) changes.start_time = time || undefined;
    if (date !== appointment.date) changes.date = date;
    onSave(changes);
  };

  return (
    <div className="space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }} className="h-8 text-xs" autoFocus />
      <div className="flex items-center gap-1.5 flex-wrap">
        <CalendarInlineChip icon={ClipboardList} chipColor="#f97316" label="Tipo" value={type} onValueChange={setType} options={APPT_TYPES.map(t => ({ value: t, label: t, color: APPT_TYPE_COLORS[t] }))} />
        <CalendarInlineChip icon={Circle} chipColor="#3b82f6" label="Status" value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)} options={APPT_STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label, color: APPT_STATUS_COLORS[s.value] }))} />
        <CalendarInlineChip icon={User} chipColor="#22c55e" label="Responsável" value={resp} onValueChange={setResp} options={responsibles.map(n => ({ value: n, label: n }))} />
        <CalendarInlineChip icon={Repeat} chipColor="#a855f7" label="Recorrência" value={recurrence} onValueChange={(v) => setRecurrence(v as AppointmentRecurrence)} options={APPT_RECURRENCE_OPTIONS.map(r => ({ value: r.value, label: r.label }))} />
        <CalendarTimeChip value={time} onValueChange={setTime} />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2"><CalendarIcon className="h-3.5 w-3.5" />{date ? new Date(date + "T00:00:00").toLocaleDateString("pt-BR") : "Data"}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[999999]" align="end"><Calendar mode="single" selected={date ? new Date(date + "T00:00:00") : undefined} onSelect={(d) => { if (d) { setDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`); }}} initialFocus /></PopoverContent>
        </Popover>
      </div>
      <div className="flex gap-1 justify-end">
        <Button onClick={handleSave} size="sm" className="h-7 gap-1 text-xs px-2.5"><Check className="h-3 w-3" /> Salvar</Button>
        <Button onClick={onCancel} variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground"><X className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}
