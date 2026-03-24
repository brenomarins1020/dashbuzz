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
  Plus, Pencil, Trash2, Clock, CalendarIcon, Search,
  ClipboardList, Circle, User, Repeat,
  Settings, Check, X, Layers,
} from "lucide-react";
import {
  Drawer, DrawerContent,
} from "@/components/ui/drawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAppointments, type Appointment, type AppointmentStatus, type AppointmentRecurrence } from "@/hooks/useAppointments";
import { useWorkspaceConfig } from "@/hooks/useWorkspaceConfig";
import { useWorkspace } from "@/hooks/useWorkspace";
import { StatusBadgeFilled } from "@/components/StatusBadgeFilled";
import { QuickEditModal, type QuickEditItem } from "@/components/QuickEditModal";
import { ChipSelect, type ChipOption } from "@/components/ChipSelect";
import { getIcon, getIconColor } from "@/lib/icons";

/* ── constants ──────────────────────────────────────── */

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "concluído", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pendente: "#eab308",
  concluído: "#22c55e",
  cancelado: "#ef4444",
};

const RECURRENCE_OPTIONS: { value: AppointmentRecurrence; label: string }[] = [
  { value: "nenhuma", label: "Nenhuma" },
  { value: "diária", label: "Diária" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
];

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

const formatDate = (ds: string) => {
  const d = new Date(ds + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
};

/* ── Chip component for inline creation ──────────── */

interface InlineChipProps {
  icon: React.ElementType;
  chipColor: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string; color?: string }[];
  tooltip?: string;
  onManage?: () => void;
  searchable?: boolean;
}

function InlineChip({ icon: Icon, chipColor, label, value, onValueChange, options, tooltip, onManage, searchable }: InlineChipProps) {
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

  const chipBg = hasValue
    ? { backgroundColor: chipColor + "22", borderColor: chipColor }
    : undefined;
  const chipTextColor = hasValue ? { color: chipColor } : undefined;

  const tooltipText = tooltip ?? (hasValue ? `${label}: ${selected!.label}` : `Selecionar ${label.toLowerCase()}`);

  const chipTriggerBtn = (
    <button
      type="button"
      className={cn(
        "h-9 min-h-[36px] w-auto rounded-full border px-3 inline-flex flex-row items-center gap-1.5 transition-all",
        "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none",
        !hasValue && "bg-muted/50 border-border text-muted-foreground",
      )}
      style={chipBg}
    >
      <span style={chipTextColor} className="inline-flex flex-row items-center gap-1.5">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium whitespace-nowrap leading-none max-w-[120px] truncate">
          {hasValue ? selected!.label : label}
        </span>
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
          <TooltipContent side="bottom" className="text-xs">{tooltipText}</TooltipContent>
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
                style={chipBg}
              >
                <span style={chipTextColor} className="inline-flex flex-row items-center gap-1.5">
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
                        {o.color && (
                          <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                        )}
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
        <TooltipContent side="bottom" className="text-xs">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── Time chip (popover with time input) ─────────── */

function TimeChip({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) {
  const hasValue = !!value;
  const chipColor = "#64748b";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-9 min-h-[36px] rounded-full border px-3 inline-flex flex-row items-center gap-1.5 transition-all",
                  "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none",
                  !hasValue && "bg-muted/50 border-border text-muted-foreground",
                )}
                style={hasValue ? { backgroundColor: chipColor + "22", borderColor: chipColor, color: chipColor } : undefined}
              >
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium whitespace-nowrap leading-none">
                  {hasValue ? value : "Hora"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Horário</label>
                <Input
                  type="time"
                  value={value}
                  onChange={(e) => onValueChange(e.target.value)}
                  className="h-9 w-[140px]"
                  autoFocus
                />
                {hasValue && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={() => onValueChange("")}>
                    Limpar
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {hasValue ? `Hora: ${value}` : "Definir horário"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


/* ── Inline Edit Bar for Appointments ────────────── */

function AppointmentInlineEditBar({ appointment, onSave, onCancel, responsibleOptions, typeOptions, onManageTypes }: {
  appointment: Appointment;
  onSave: (changes: Partial<Omit<Appointment, "id" | "created_at">>) => void;
  onCancel: () => void;
  responsibleOptions: string[];
  typeOptions: { value: string; label: string; color?: string }[];
  onManageTypes: () => void;
}) {
  const [editTitle, setEditTitle] = useState(appointment.title);
  const [editType, setEditType] = useState(appointment.type);
  const [editStatus, setEditStatus] = useState<AppointmentStatus>(appointment.status);
  const [editResponsible, setEditResponsible] = useState(appointment.responsible || "");
  const [editRecurrence, setEditRecurrence] = useState<AppointmentRecurrence>(appointment.recurrence);
  const [editTime, setEditTime] = useState(appointment.start_time || "");
  const [editDate, setEditDate] = useState(appointment.date);
  const barRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    const changes: Partial<Omit<Appointment, "id" | "created_at">> = {};
    if (editTitle.trim() && editTitle.trim() !== appointment.title) changes.title = editTitle.trim();
    if (editType !== appointment.type) changes.type = editType;
    if (editStatus !== appointment.status) changes.status = editStatus;
    if (editResponsible !== (appointment.responsible || "")) changes.responsible = editResponsible || undefined;
    if (editRecurrence !== appointment.recurrence) changes.recurrence = editRecurrence;
    if (editTime !== (appointment.start_time || "")) changes.start_time = editTime || undefined;
    if (editDate !== appointment.date) changes.date = editDate;
    onSave(changes);
  }, [editTitle, editType, editStatus, editResponsible, editRecurrence, editTime, editDate, appointment, onSave]);

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
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onCancel();
          }}
          className="h-8 text-xs flex-1 min-w-[140px]"
          autoFocus
        />
        <div className="flex items-center gap-1.5">
          <InlineChip
            icon={ClipboardList}
            chipColor="#f97316"
            label="Tipo"
            value={editType}
            onValueChange={setEditType}
            options={typeOptions}
            onManage={onManageTypes}
          />
          <InlineChip
            icon={Circle}
            chipColor="#3b82f6"
            label="Status"
            value={editStatus}
            onValueChange={(v) => setEditStatus(v as AppointmentStatus)}
            options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label, color: STATUS_COLORS[s.value] }))}
          />
          <InlineChip
            icon={User}
            chipColor="#22c55e"
            label="Responsável"
            value={editResponsible}
            onValueChange={setEditResponsible}
            options={responsibleOptions.map((n) => ({ value: n, label: n }))}
            searchable
          />
          <InlineChip
            icon={Repeat}
            chipColor="#a855f7"
            label="Recorrência"
            value={editRecurrence}
            onValueChange={(v) => setEditRecurrence(v as AppointmentRecurrence)}
            options={RECURRENCE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
          />
          <TimeChip value={editTime} onValueChange={setEditTime} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2 shrink-0">
              <CalendarIcon className="h-3.5 w-3.5" />
              {editDate ? new Date(editDate + "T00:00:00").toLocaleDateString("pt-BR") : "Data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={editDate ? new Date(editDate + "T00:00:00") : undefined}
              onSelect={(date) => {
                if (date) {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  setEditDate(`${y}-${m}-${d}`);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className="flex gap-1">
          <Button onClick={handleSave} size="sm" className="h-8 gap-1 text-xs px-2.5">
            <Check className="h-3.5 w-3.5" /> Salvar
          </Button>
          <Button onClick={onCancel} variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile creation component ─────────────────── */

function MobileAppointmentCreation({ newTitle, setNewTitle, newType, setNewType, newStatus, setNewStatus, newDate, setNewDate, newTime, setNewTime, newResponsible, setNewResponsible, typeOptions, responsibleOptions, canAdd, adding, handleAdd }: {
  newTitle: string; setNewTitle: (v: string) => void;
  newType: string; setNewType: (v: string) => void;
  newStatus: AppointmentStatus; setNewStatus: (v: AppointmentStatus) => void;
  newDate: string; setNewDate: (v: string) => void;
  newTime: string; setNewTime: (v: string) => void;
  newResponsible: string; setNewResponsible: (v: string) => void;
  typeOptions: { value: string; label: string; color?: string }[];
  responsibleOptions: string[];
  canAdd: boolean; adding: boolean; handleAdd: () => void;
}) {
  const [activePicker, setActivePicker] = useState<string | null>(null);

  return (
    <div className="md:hidden glass-card rounded-2xl p-4 space-y-3 mb-4">
      <input
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        placeholder="Título do compromisso..."
        className="w-full bg-transparent border-b border-border pb-2 text-sm focus:outline-none focus:border-accent text-foreground placeholder:text-muted-foreground"
      />
      <div className="grid grid-cols-2 gap-2 pb-1">
        <button onClick={() => setActivePicker("tipo")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-muted-foreground"
          style={newType ? { backgroundColor: (typeOptions.find(t => t.value === newType)?.color || "#f97316") + "22", borderColor: typeOptions.find(t => t.value === newType)?.color || "#f97316", color: typeOptions.find(t => t.value === newType)?.color || "#f97316", WebkitTapHighlightColor: "transparent" } : { WebkitTapHighlightColor: "transparent" }}>
          <Layers className="h-3 w-3 shrink-0" />
          <span className="truncate">{newType || "Tipo"}</span>
        </button>
        <button onClick={() => setActivePicker("status")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-muted-foreground"
          style={newStatus ? { backgroundColor: STATUS_COLORS[newStatus] + "22", borderColor: STATUS_COLORS[newStatus], color: STATUS_COLORS[newStatus], WebkitTapHighlightColor: "transparent" } : { WebkitTapHighlightColor: "transparent" }}>
          <Circle className="h-3 w-3 shrink-0" />
          <span className="truncate">{newStatus === "pendente" ? "Pendente" : newStatus === "concluído" ? "Concluído" : "Cancelado"}</span>
        </button>
        <button onClick={() => setActivePicker("data")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-muted-foreground"
          style={{ WebkitTapHighlightColor: "transparent" }}>
          <CalendarIcon className="h-3 w-3 shrink-0" />
          {newDate ? new Date(newDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Data"}
        </button>
        <button onClick={() => setActivePicker("horario")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-muted-foreground"
          style={{ WebkitTapHighlightColor: "transparent" }}>
          <Clock className="h-3 w-3 shrink-0" />
          {newTime || "Horário"}
        </button>
        <button onClick={() => setActivePicker("responsavel")}
          className="col-span-2 h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-muted-foreground"
          style={{ WebkitTapHighlightColor: "transparent" }}>
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{newResponsible || "Responsável"}</span>
        </button>
      </div>
      <button
        onClick={handleAdd}
        disabled={!canAdd || adding}
        className="w-full h-10 rounded-full bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        style={{ WebkitTapHighlightColor: "transparent" }}>
        <Plus className="h-4 w-4" />
        Adicionar compromisso
      </button>

      <Drawer open={activePicker === "tipo"} onOpenChange={(o) => !o && setActivePicker(null)}>
        <DrawerContent>
          <div className="px-4 pb-6 pt-2">
            <p className="text-sm font-semibold mb-3">Tipo</p>
            {typeOptions.map((t) => (
              <button key={t.value} onClick={() => { setNewType(t.value); setActivePicker(null); }}
                className="w-full flex items-center justify-between h-12 px-3 rounded-xl hover:bg-muted/50 text-sm transition-colors">
                <div className="flex items-center gap-3">
                  {t.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />}
                  {t.label}
                </div>
                {newType === t.value && <Check className="h-4 w-4 text-accent" />}
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
              <button key={n} onClick={() => { setNewResponsible(n); setActivePicker(null); }}
                className="w-full flex items-center justify-between h-12 px-3 rounded-xl hover:bg-muted/50 text-sm transition-colors">
                {n}
                {newResponsible === n && <Check className="h-4 w-4 text-accent" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer open={activePicker === "horario"} onOpenChange={(o) => !o && setActivePicker(null)}>
        <DrawerContent>
          <div className="px-4 pb-6 pt-2 flex flex-col items-center">
            <p className="text-sm font-semibold mb-4 self-start">Horário</p>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="h-14 text-2xl text-center bg-transparent border border-border rounded-xl px-6 text-foreground"
            />
            <button
              onClick={() => setActivePicker(null)}
              className="mt-4 w-full h-10 rounded-full bg-accent text-accent-foreground text-sm font-semibold"
            >
              Confirmar
            </button>
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

export function CompromissosPanel() {
  const { appointments, addAppointment, updateAppointment, removeAppointment } = useAppointments();
  const config = useWorkspaceConfig();
  const { isAdmin } = useWorkspace();
  const { activeResponsibles, activeAppointmentTypes, appointmentTypes } = config;

  // Filters
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState<PeriodPreset>("1year");

  // Inline add form
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("");
  const [newStatus, setNewStatus] = useState<AppointmentStatus>("pendente");
  const [newResponsible, setNewResponsible] = useState("");
  const [newRecurrence, setNewRecurrence] = useState<AppointmentRecurrence>("nenhuma");
  const [newTime, setNewTime] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Quick edit modal
  const [editModal, setEditModal] = useState<"types" | "responsibles" | null>(null);

  const responsibleOptions = activeResponsibles.map((r) => r.name);

  // Auto-set default type
  useMemo(() => {
    if (!newType && activeAppointmentTypes.length > 0) setNewType(activeAppointmentTypes[0].name);
  }, [activeAppointmentTypes]);

  const typeOptions = useMemo(() =>
    activeAppointmentTypes.map((t) => ({ value: t.name, label: t.name, color: t.color })),
    [activeAppointmentTypes]
  );

  const typeNamesInUse = useMemo(() => new Set(appointments.map(a => a.type).filter(Boolean)), [appointments]);

  const canAdd = newTitle.trim() && newType && newStatus && newDate;

  const handleAdd = async () => {
    if (!canAdd) return;
    setAdding(true);
    try {
      await addAppointment({
        title: newTitle.trim(),
        type: newType,
        date: newDate,
        start_time: newTime || undefined,
        responsible: newResponsible || undefined,
        status: newStatus,
        recurrence: newRecurrence,
      });
      setNewTitle("");
      setNewTime("");
    } catch {}
    setAdding(false);
  };

  // Filtered + sorted by proximity to today
  const filtered = useMemo(() => {
    const startDate = getStartDate(period);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointments
      .filter((a) => new Date(a.date + "T00:00:00") >= startDate)
      .filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()))
      .filter((a) => statusFilter === "all" || a.status === statusFilter)
      .sort((a, b) => {
        const dateA = new Date(a.date + "T00:00:00");
        const dateB = new Date(b.date + "T00:00:00");
        const diffA = Math.abs(dateA.getTime() - today.getTime());
        const diffB = Math.abs(dateB.getTime() - today.getTime());
        return diffA - diffB;
      });
  }, [appointments, search, statusFilter, period]);

  const isOverdue = useCallback((a: Appointment) => {
    if (!a.date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(a.date + "T00:00:00");
    return d < today && a.status !== "concluído";
  }, []);

  // Get type info helper
  const getTypeInfo = useCallback((typeName: string) => {
    const t = activeAppointmentTypes.find(at => at.name === typeName);
    return t ? { color: t.color, icon_key: t.icon_key } : { color: "#9ca3af", icon_key: "calendar" };
  }, [activeAppointmentTypes]);

  // Columns by type
  const visibleColumns = useMemo(() => {
    if (showAll) {
      return [{ name: "Todos os compromissos", items: filtered, color: "", icon_key: "" }];
    }
    const typesToShow = selectedTypes.size > 0
      ? activeAppointmentTypes.filter((t) => selectedTypes.has(t.name))
      : activeAppointmentTypes;
    return typesToShow.map((t) => ({
      name: t.name,
      items: filtered.filter((a) => a.type === t.name),
      color: t.color,
      icon_key: t.icon_key,
    }));
  }, [filtered, showAll, selectedTypes, activeAppointmentTypes]);

  const renderRow = (a: Appointment) => {
    if (editingId === a.id) {
      return (
        <AppointmentInlineEditBar
          key={a.id}
          appointment={a}
          onSave={(changes) => {
            if (Object.keys(changes).length > 0) updateAppointment(a.id, changes);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
          responsibleOptions={responsibleOptions}
          typeOptions={typeOptions}
          onManageTypes={() => setEditModal("types")}
        />
      );
    }

    const overdue = isOverdue(a);
    const typeInfo = getTypeInfo(a.type);
    const TypeIcon = getIcon(typeInfo.icon_key);
    return (
      <div key={a.id} className={cn(
        "flex items-start gap-3 px-3 py-3.5 hover:bg-amber-500/[0.04] transition-colors duration-150",
        overdue && "bg-red-50 dark:bg-red-950/20",
      )} style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
        <span className={cn(
          "text-[11px] font-mono w-[72px] shrink-0 pt-0.5",
          overdue ? "text-red-600 font-semibold" : "text-muted-foreground",
        )}>
          {formatDate(a.date)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 flex-wrap">
            <p className="text-sm font-medium">{a.title}</p>
            {overdue && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-red-600 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded shrink-0">
                Atrasado
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {a.responsible && <span>{a.responsible}</span>}
            {a.responsible && a.start_time && " · "}
            {a.start_time && <span>🕐 {a.start_time}</span>}
            {(a.responsible || a.start_time) && a.local && " · "}
            {a.local && <span>📍 {a.local}</span>}
          </p>
        </div>
        {a.type && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1"
            style={{ backgroundColor: typeInfo.color + "25", color: typeInfo.color }}
          >
            {TypeIcon && <TypeIcon className="h-3 w-3" />}
            {a.type}
          </span>
        )}
        <StatusBadgeFilled status={a.status === "pendente" ? "Pendente" : a.status === "concluído" ? "Concluído" : "Cancelado"} color={STATUS_COLORS[a.status]} />
        {isAdmin && (
          <div className="flex gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingId(a.id)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(a.id)} title="Mover para lixeira">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderColumn = (title: string, items: Appointment[], color?: string, icon_key?: string) => {
    const ColIcon = icon_key ? getIcon(icon_key) : null;
    return (
      <div className="flex-1 md:min-w-[320px] min-w-0 glass-card rounded-2xl overflow-hidden">
        <div className="sticky top-0 z-10 px-4 py-3" style={{ background: "rgba(15,23,42,0.04)", borderBottom: "1px solid rgba(148,163,184,0.2)", borderRadius: "16px 16px 0 0" }}>
          <h3 className="text-sm font-bold font-heading uppercase tracking-[0.06em] flex items-center gap-2">
            {ColIcon && <ColIcon className="h-4 w-4" style={{ color: color }} />}
            {title}
          </h3>
          <p className="text-[11px] text-muted-foreground">{items.length} compromisso{items.length !== 1 ? "s" : ""}</p>
        </div>
        <ScrollArea className="h-[60vh]">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum compromisso encontrado.</p>
          ) : (
            items.map(renderRow)
          )}
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-heading tracking-tight">Compromissos</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} compromisso{filtered.length !== 1 ? "s" : ""}</p>
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
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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

      {/* Type chip filters — like Mídia */}
      {activeAppointmentTypes.length > 0 && (
        <div className="flex items-center gap-2 px-1 py-1" style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setShowAll(true); setSelectedTypes(new Set()); }}
                  className={cn(
                    "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border",
                    showAll
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "text-muted-foreground border-transparent hover:border-border"
                  )}
                >
                  Todos
                </button>
              </TooltipTrigger>
              <TooltipContent>Exibir todos os compromissos em uma lista</TooltipContent>
            </Tooltip>
            <div className="w-px h-4 bg-border/50 mx-1" />
            {activeAppointmentTypes.map((at) => {
              const isSelected = !showAll && selectedTypes.has(at.name);
              const TypeIcon = getIcon(at.icon_key);
              return (
                <Tooltip key={at.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (showAll) {
                          setShowAll(false);
                          setSelectedTypes(new Set([at.name]));
                        } else {
                          setSelectedTypes((prev) => {
                            const next = new Set(prev);
                            if (next.has(at.name)) next.delete(at.name);
                            else next.add(at.name);
                            if (next.size === 0) setShowAll(true);
                            return next;
                          });
                        }
                      }}
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border inline-flex items-center gap-1",
                        isSelected
                          ? "border-accent/30 shadow-sm"
                          : !showAll && selectedTypes.size > 0
                            ? "text-muted-foreground/40 border-transparent line-through"
                            : "text-muted-foreground border-transparent hover:border-border"
                      )}
                      style={isSelected ? { backgroundColor: at.color + "18", borderColor: at.color + "40", color: at.color } : undefined}
                    >
                      {TypeIcon && <TypeIcon className="h-3 w-3" style={{ color: isSelected ? at.color : undefined }} />}
                      {at.name}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{isSelected ? `Remover filtro ${at.name}` : `Filtrar por ${at.name}`}</TooltipContent>
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
            placeholder="Título do compromisso..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canAdd && handleAdd()}
            className="h-8 text-xs flex-1 min-w-[140px]"
          />
          <div className="flex items-center gap-1.5">
            <InlineChip icon={ClipboardList} chipColor="#f97316" label="Tipo" value={newType} onValueChange={(v) => setNewType(v)} options={typeOptions} onManage={() => setEditModal("types")} />
            <InlineChip icon={Circle} chipColor="#3b82f6" label="Status" value={newStatus} onValueChange={(v) => setNewStatus(v as AppointmentStatus)} options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label, color: STATUS_COLORS[s.value] }))} />
            <InlineChip icon={User} chipColor="#22c55e" label="Responsável" value={newResponsible} onValueChange={setNewResponsible} options={responsibleOptions.map((n) => ({ value: n, label: n }))} searchable />
            <InlineChip icon={Repeat} chipColor="#a855f7" label="Recorrência" value={newRecurrence} onValueChange={(v) => setNewRecurrence(v as AppointmentRecurrence)} options={RECURRENCE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))} />
            <TimeChip value={newTime} onValueChange={setNewTime} />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2 shrink-0">
                <CalendarIcon className="h-3.5 w-3.5" />
                {newDate ? new Date(newDate + "T00:00:00").toLocaleDateString("pt-BR") : "Data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={newDate ? new Date(newDate + "T00:00:00") : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0"); setNewDate(`${y}-${m}-${d}`); }}} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Button onClick={handleAdd} disabled={!canAdd || adding} size="sm" className="h-8 gap-1 text-xs px-3">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        {!canAdd && newTitle.trim() && (
          <p className="text-[10px] text-destructive">Preencha os campos obrigatórios: título, tipo, status e data.</p>
        )}
      </div>

      {/* Inline add bar — mobile */}
      <MobileAppointmentCreation
        newTitle={newTitle} setNewTitle={setNewTitle}
        newType={newType} setNewType={setNewType}
        newStatus={newStatus} setNewStatus={setNewStatus}
        newDate={newDate} setNewDate={setNewDate}
        newTime={newTime} setNewTime={setNewTime}
        newResponsible={newResponsible} setNewResponsible={setNewResponsible}
        typeOptions={typeOptions}
        responsibleOptions={responsibleOptions}
        canAdd={!!canAdd} adding={adding} handleAdd={handleAdd}
      />

      {/* Content — horizontal scrollable type columns */}
      <div className="md:overflow-x-auto overflow-x-hidden pb-2 md:-mx-2 md:px-2">
        <div className="flex flex-col md:flex-row gap-4" style={{ minWidth: visibleColumns.length > 1 ? undefined : "100%" }}>
          {visibleColumns.map((col) => renderColumn(col.name, col.items, col.color, col.icon_key))}
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para lixeira?</AlertDialogTitle>
            <AlertDialogDescription>O compromisso será movido para a lixeira e poderá ser restaurado depois.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { removeAppointment(deleteId); setDeleteId(null); } }}>Mover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick-edit modals */}
      <QuickEditModal
        open={editModal === "types"}
        onOpenChange={(o) => !o && setEditModal(null)}
        title="Gerenciar Tipos de Compromisso"
        items={appointmentTypes.map(t => ({
          id: t.id,
          name: t.name,
          color: t.color,
          icon_key: t.icon_key,
          is_active: t.is_active,
          sort_order: t.sort_order,
        }))}
        onAdd={config.addAppointmentType}
        onUpdate={config.updateAppointmentType}
        onDelete={config.deleteAppointmentType}
        inUseIds={typeNamesInUse}
        showColor
        showIconPicker
      />
      <QuickEditModal
        open={editModal === "responsibles"}
        onOpenChange={(o) => !o && setEditModal(null)}
        title="Gerenciar Responsáveis"
        items={config.responsibles.map(r => ({
          id: r.id,
          name: r.name,
          is_active: r.is_active,
          sort_order: r.sort_order,
        }))}
        onAdd={async (data) => { await config.addResponsible({ name: (data as any).name }); }}
        onUpdate={async (id, changes) => { await config.updateResponsible(id, changes as any); }}
        onDelete={async (id) => { await config.deleteResponsible(id); }}
        inUseIds={new Set(appointments.map(a => a.responsible).filter(Boolean) as string[])}
      />
    </div>
  );
}
