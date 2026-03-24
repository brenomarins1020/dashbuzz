import { useState, useMemo } from "react";
import {
  Tag, Circle, CheckCircle2, Clock, Plus, Search,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getIcon, getIconColor } from "@/lib/icons";

/* ── helpers ─────────────────────────────────────────────── */

function getStatusIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("publicad")) return CheckCircle2;
  if (lower.includes("pronto")) return CheckCircle2;
  if (lower.includes("andamento")) return Clock;
  return Circle;
}

/** Generate a deterministic pastel colour from a string */
function autoColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 60%, 65%)`;
}

/* ── types ───────────────────────────────────────────────── */

export type ChipVariant = "profile" | "category" | "status" | "member";

export interface ChipOption {
  value: string;
  label: string;
  color?: string | null;
  icon_key?: string | null;
  foto?: string | null;
}

interface ChipSelectProps {
  variant: ChipVariant;
  value: string;
  onValueChange: (v: string) => void;
  options: ChipOption[];
  onManage?: () => void;
  emptyLabel?: string;
  searchable?: boolean;
}

/* ── component ───────────────────────────────────────────── */

export function ChipSelect({
  variant,
  value,
  onValueChange,
  options,
  onManage,
  emptyLabel,
  searchable,
}: ChipSelectProps) {
  const [selectOpen, setSelectOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((o) => o.value === value);
  const hasValue = !!selected;

  // Auto-enable search for member variant with 5+ options
  const isSearchable = searchable ?? (variant === "member" && options.length >= 5);

  // Determine color based on variant
  let color: string | undefined;
  if (variant === "profile" && hasValue) {
    color = getIconColor(selected!.icon_key);
  } else if (variant === "member" && hasValue) {
    color = autoColor(selected!.label);
  } else if (hasValue) {
    color = selected?.color || autoColor(selected!.label);
  }

  /* chip label */
  const chipLabels: Record<ChipVariant, string> = {
    profile: "Perfil",
    category: "Tipo",
    status: "Status",
    member: "Responsável",
  };

  /* tooltip text */
  const tooltipText = hasValue
    ? `${chipLabels[variant]}: ${selected!.label}`
    : `Selecionar ${chipLabels[variant].toLowerCase()}`;

  /* chip inner content */
  const renderIcon = () => {
    if (!hasValue) return <Plus className="h-4 w-4" />;

    switch (variant) {
      case "profile": {
        const Icon = getIcon(selected!.icon_key);
        return <Icon className="h-4 w-4" />;
      }
      case "category": {
        const catColor = selected?.color || autoColor(selected!.label);
        return <span className="inline-block h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />;
      }
      case "status": {
        const Icon = getStatusIcon(selected!.label);
        return <Icon className="h-4 w-4" />;
      }
      case "member":
        return <span className="text-sm leading-none">👤</span>;
    }
  };

  const chipBg = hasValue && color
    ? { backgroundColor: color + "22", borderColor: color }
    : undefined;
  const chipTextColor = hasValue && color ? { color } : undefined;

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const chipTrigger = (
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
        {renderIcon()}
        <span className="text-xs font-medium whitespace-nowrap leading-none max-w-[120px] truncate">
          {hasValue ? selected!.label : chipLabels[variant]}
        </span>
      </span>
    </button>
  );

  // Searchable version uses Popover instead of Select
  if (isSearchable) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">
              <Popover open={selectOpen} onOpenChange={(o) => { setSelectOpen(o); if (!o) setSearch(""); }}>
                <PopoverTrigger asChild>
                  {chipTrigger}
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0 z-[999999]" align="start">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar..."
                        className="h-8 pl-8 text-xs"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-1">
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((o) => {
                        const itemColor = variant === "member"
                          ? autoColor(o.label)
                          : o.color || undefined;
                        const isSelected = o.value === value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors text-left",
                              isSelected && "bg-accent"
                            )}
                            onClick={() => { onValueChange(o.value); setSelectOpen(false); setSearch(""); }}
                          >
                            {itemColor && (
                              <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: itemColor }} />
                            )}
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
                        onClick={() => { setSelectOpen(false); setSearch(""); setTimeout(() => onManage(), 50); }}
                      >
                        Gerenciar...
                      </button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {tooltipText}
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
                style={chipBg}
              >
                <span style={chipTextColor} className="inline-flex flex-row items-center gap-1.5">
                  {renderIcon()}
                  <span className="text-xs font-medium whitespace-nowrap leading-none max-w-[120px] truncate">
                    {hasValue ? selected!.label : chipLabels[variant]}
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent className="z-[999999]">
                {options.length > 0 ? (
                  options.map((o) => {
                    const itemIconKey = o.icon_key;
                    const ItemIcon = variant === "profile" && itemIconKey ? getIcon(itemIconKey) : null;
                    const itemColor = variant === "member"
                      ? autoColor(o.label)
                      : variant === "profile" && itemIconKey
                        ? getIconColor(itemIconKey)
                        : o.color || undefined;
                    return (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2 w-full">
                          {itemColor && !ItemIcon && (
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: itemColor }}
                            />
                          )}
                          <span className="flex-1">{o.label}</span>
                          {ItemIcon && (
                            <ItemIcon className="h-4 w-4 shrink-0 ml-auto" style={{ color: itemColor }} />
                          )}
                        </span>
                      </SelectItem>
                    );
                  })
                ) : (
                  <div className="px-2 py-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      {emptyLabel ?? "Nenhum cadastrado"}
                    </p>
                  </div>
                )}
                {onManage && (
                  <div className="border-t border-border mt-1 pt-1 px-2 pb-1">
                    <button
                      type="button"
                      className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 px-1 rounded transition-colors hover:bg-secondary/50"
                      onMouseDown={(e) => { e.preventDefault(); setSelectOpen(false); setTimeout(() => onManage(), 50); }}
                    >
                      Gerenciar...
                    </button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
