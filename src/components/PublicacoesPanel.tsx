import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Search, Plus, Trash2, CalendarIcon, Settings, Check, X as XIcon, Globe, Circle, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePosts, type Post } from "@/hooks/usePosts";
import { useWorkspaceConfig } from "@/hooks/useWorkspaceConfig";
import { useWorkspace } from "@/hooks/useWorkspace";
import { StatusBadgeFilled } from "@/components/StatusBadgeFilled";
import { QuickEditModal, type QuickEditItem } from "@/components/QuickEditModal";
import { ChipSelect, type ChipOption } from "@/components/ChipSelect";
import { getIcon, getIconColor } from "@/lib/icons";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer, DrawerContent,
} from "@/components/ui/drawer";



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

/* ── Mobile creation component ─────────────────── */

function MobileMediaCreation({ newConteudo, setNewConteudo, newLocal, setNewLocal, newStatus, setNewStatus, newData, setNewData, newResponsavel, setNewResponsavel, activeProfiles, activeStatuses, responsibleOptions, canAdd, adding, handleAdd }: {
  newConteudo: string; setNewConteudo: (v: string) => void;
  newLocal: string; setNewLocal: (v: string) => void;
  newStatus: string; setNewStatus: (v: string) => void;
  newData: string; setNewData: (v: string) => void;
  newResponsavel: string; setNewResponsavel: (v: string) => void;
  activeProfiles: { name: string; icon_key: string }[];
  activeStatuses: { name: string; color: string | null }[];
  responsibleOptions: string[];
  canAdd: boolean; adding: boolean; handleAdd: () => void;
}) {
  const [activePicker, setActivePicker] = useState<string | null>(null);

  return (
    <div className="md:hidden glass-card rounded-2xl p-4 space-y-3 mb-4">
      <input
        value={newConteudo}
        onChange={(e) => setNewConteudo(e.target.value)}
        placeholder="Conteúdo do post..."
        className="w-full bg-transparent border-b border-border pb-2 text-sm focus:outline-none focus:border-accent text-foreground placeholder:text-muted-foreground"
      />
      <div className="grid grid-cols-2 gap-2 pb-1">
        <button onClick={() => setActivePicker("perfil")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-muted-foreground"
          style={{ WebkitTapHighlightColor: "transparent" }}>
          <Globe className="h-3 w-3 shrink-0" />
          <span className="truncate">{newLocal || "Plataforma"}</span>
        </button>
        <button onClick={() => setActivePicker("status")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-muted-foreground"
          style={{ WebkitTapHighlightColor: "transparent" }}>
          <Circle className="h-3 w-3 shrink-0" />
          <span className="truncate">{newStatus || "Status"}</span>
        </button>
        <button onClick={() => setActivePicker("data")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-muted-foreground"
          style={{ WebkitTapHighlightColor: "transparent" }}>
          <CalendarIcon className="h-3 w-3 shrink-0" />
          {newData ? new Date(newData + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Data"}
        </button>
        <button onClick={() => setActivePicker("responsavel")}
          className="h-9 px-3 rounded-full border border-border text-xs whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-muted-foreground"
          style={{ WebkitTapHighlightColor: "transparent" }}>
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{newResponsavel || "Responsável"}</span>
        </button>
      </div>
      <button
        onClick={handleAdd}
        disabled={!canAdd || adding}
        className="w-full h-10 rounded-full bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        style={{ WebkitTapHighlightColor: "transparent" }}>
        <Plus className="h-4 w-4" />
        Adicionar mídia
      </button>

      <Drawer open={activePicker === "perfil"} onOpenChange={(o) => !o && setActivePicker(null)}>
        <DrawerContent>
          <div className="px-4 pb-6 pt-2">
            <p className="text-sm font-semibold mb-3">Plataforma</p>
            {activeProfiles.map((p) => {
              const PIcon = getIcon(p.icon_key);
              return (
                <button key={p.name} onClick={() => { setNewLocal(p.name); setActivePicker(null); }}
                  className="w-full flex items-center justify-between h-12 px-3 rounded-xl hover:bg-muted/50 text-sm transition-colors">
                  <div className="flex items-center gap-3">
                    {PIcon && <PIcon className="h-4 w-4" style={{ color: getIconColor(p.icon_key) }} />}
                    {p.name}
                  </div>
                  {newLocal === p.name && <Check className="h-4 w-4 text-accent" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer open={activePicker === "status"} onOpenChange={(o) => !o && setActivePicker(null)}>
        <DrawerContent>
          <div className="px-4 pb-6 pt-2">
            <p className="text-sm font-semibold mb-3">Status</p>
            {activeStatuses.map((s) => (
              <button key={s.name} onClick={() => { setNewStatus(s.name); setActivePicker(null); }}
                className="w-full flex items-center justify-between h-12 px-3 rounded-xl hover:bg-muted/50 text-sm transition-colors">
                <div className="flex items-center gap-3">
                  {s.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />}
                  {s.name}
                </div>
                {newStatus === s.name && <Check className="h-4 w-4 text-accent" />}
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
              <button key={n} onClick={() => { setNewResponsavel(n); setActivePicker(null); }}
                className="w-full flex items-center justify-between h-12 px-3 rounded-xl hover:bg-muted/50 text-sm transition-colors">
                {n}
                {newResponsavel === n && <Check className="h-4 w-4 text-accent" />}
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
              selected={newData ? new Date(newData + "T00:00:00") : undefined}
              onSelect={(date) => {
                if (date) {
                  setNewData(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`);
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

export function PublicacoesPanel() {
  const { posts, addPost: onAdd, updatePost: onUpdate, deletePost: onDelete } = usePosts();
  const config = useWorkspaceConfig();
  const { isAdmin } = useWorkspace();
  const { activeProfiles, activeCategories, activeStatuses, profiles, categories, statuses, roles } = config;

  const [search, setSearch] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(true);
  const [tipoFilter, setTipoFilter] = useState("all");
  const [respFilter, setRespFilter] = useState("all");
  const [period, setPeriod] = useState<PeriodPreset>("1year");
  const [viewPost, setViewPost] = useState<Post | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Inline add form state
  const [newConteudo, setNewConteudo] = useState("");
  const [newLocal, setNewLocal] = useState("");
  const [newResponsavel, setNewResponsavel] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newData, setNewData] = useState(() => new Date().toISOString().slice(0, 10));
  const [newTipo, setNewTipo] = useState("");
  const [newLinkCanva, setNewLinkCanva] = useState("");
  const [adding, setAdding] = useState(false);

  // Quick edit modals
  const [editModal, setEditModal] = useState<"profiles" | "categories" | "statuses" | "members" | null>(null);

  const responsibleOptions = config.activeResponsibles.map((r) => r.name);

  const isPostOverdue = useCallback((post: Post) => {
    if (!post.data_postagem) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(post.data_postagem + "T00:00:00");
    return d < today && !post.status.toLowerCase().includes("publicad");
  }, []);

  // In-use detection
  const profileNamesInUse = useMemo(() => new Set(posts.map(p => p.local).filter(Boolean)), [posts]);
  const categoryNamesInUse = useMemo(() => new Set(posts.map(p => p.tipo_conteudo).filter(Boolean)), [posts]);
  const statusNamesInUse = useMemo(() => new Set(posts.map(p => p.status).filter(Boolean)), [posts]);

  // Auto-set defaults when config loads
  useMemo(() => {
    if (!newLocal && activeProfiles.length > 0) setNewLocal(activeProfiles[0].name);
    if (!newStatus && activeStatuses.length > 0) setNewStatus(activeStatuses[0].name);
    if (!newTipo && activeCategories.length > 0) setNewTipo(activeCategories[0].name);
  }, [activeProfiles, activeStatuses, activeCategories]);

  const canAdd = newConteudo.trim() && newLocal && newTipo && newStatus && newResponsavel && newData;

  const handleAdd = async () => {
    if (!canAdd) return;
    setAdding(true);
    try {
      await onAdd({
        conteudo: newConteudo.trim(),
        local: newLocal,
        responsavel: newResponsavel,
        status: newStatus,
        data_postagem: newData,
        link_canva: newLinkCanva.trim(),
        tipo_conteudo: newTipo,
      });
      setNewConteudo("");
      setNewLinkCanva("");
    } catch {}
    setAdding(false);
  };

  const filtered = useMemo(() => {
    const startDate = getStartDate(period);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return posts
      .filter((p) => new Date(p.data_postagem + "T00:00:00") >= startDate)
      .filter((p) => !search || p.conteudo.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => tipoFilter === "all" || p.tipo_conteudo === tipoFilter)
      .filter((p) => respFilter === "all" || p.responsavel === respFilter)
      .sort((a, b) => {
        const dateA = new Date(a.data_postagem + "T00:00:00");
        const dateB = new Date(b.data_postagem + "T00:00:00");
        const diffA = Math.abs(dateA.getTime() - today.getTime());
        const diffB = Math.abs(dateB.getTime() - today.getTime());
        return diffA - diffB;
      });
  }, [posts, search, showAll, selectedProfiles, tipoFilter, respFilter, period]);

  const getCategoryColor = (cat: string) => activeCategories.find((c) => c.name === cat)?.color || undefined;
  const getStatusColor = (statusName: string) => activeStatuses.find((s) => s.name === statusName)?.color || undefined;

  const visibleColumns = useMemo(() => {
    if (showAll) {
      return [{ name: "Todas as mídias", icon_key: "", posts: filtered }];
    }
    if (activeProfiles.length === 0) return [{ name: "Todas as mídias", icon_key: "", posts: filtered }];
    const profilesToShow = selectedProfiles.size > 0
      ? activeProfiles.filter((p) => selectedProfiles.has(p.name))
      : activeProfiles;
    return profilesToShow.map((p) => ({
      name: p.name,
      icon_key: p.icon_key,
      posts: filtered.filter((post) => post.local === p.name),
    }));
  }, [activeProfiles, filtered, showAll, selectedProfiles]);

  const resolveResp = (name: string) => {
    if (!name) return "—";
    const found = config.responsibles.find((r) => r.name === name);
    return found ? found.name : "Responsável removido";
  };

  // Helper: render a select with gear button for quick-edit
  const renderSelectWithGear = (
    value: string,
    onValueChange: (v: string) => void,
    placeholder: string,
    options: { value: string; label: string }[],
    onManage: () => void,
    width = "w-[130px]"
  ) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`h-8 text-xs ${width}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length > 0 ? (
          options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)
        ) : (
          <div className="px-2 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-2">Nenhum cadastrado</p>
          </div>
        )}
        <div className="border-t border-border mt-1 pt-1 px-2 pb-1">
          <button
            type="button"
            className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 px-1 rounded transition-colors hover:bg-secondary/50"
            onMouseDown={(e) => { e.preventDefault(); onManage(); }}
          >
            <Settings className="h-3 w-3" /> Gerenciar...
          </button>
        </div>
      </SelectContent>
    </Select>
  );

  const renderRow = (post: Post) => {
    if (editingId === post.id) {
      return (
        <PostInlineEditBar
          key={post.id}
          post={post}
          onSave={(changes) => {
            if (Object.keys(changes).length > 0) onUpdate(post.id, changes);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
          profiles={activeProfiles}
          categories={activeCategories}
          statuses={activeStatuses}
          responsibles={responsibleOptions}
        />
      );
    }
    const overdue = isPostOverdue(post);
    return (
      <div key={post.id} className={cn("flex items-center gap-3 px-3 py-3.5 hover:bg-amber-500/[0.04] transition-colors duration-150", overdue && "bg-red-50 dark:bg-red-950/20")} style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
        <span className={cn("text-[11px] font-mono w-[72px] shrink-0 pt-0.5", overdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
          {new Date(post.data_postagem + "T00:00:00").toLocaleDateString("pt-BR")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 flex-wrap">
            <p className="text-sm font-medium">{post.conteudo}</p>
            {overdue && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-red-600 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded shrink-0">
                Atrasado
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {post.local && <span className="font-medium">{post.local}</span>}
            {post.local && post.responsavel && " · "}
            {resolveResp(post.responsavel)}
          </p>
        </div>
        <div className="w-[100px] shrink-0 flex justify-end">
          {post.tipo_conteudo && (() => {
            const catDef = activeCategories.find(c => c.name === post.tipo_conteudo);
            const CatIcon = catDef ? getIcon(catDef.icon_key) : null;
            const catIconColor = catDef ? getIconColor(catDef.icon_key) : undefined;
            return (
              <span
                className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1"
                style={getCategoryColor(post.tipo_conteudo)
                  ? { backgroundColor: getCategoryColor(post.tipo_conteudo) + "25", color: getCategoryColor(post.tipo_conteudo) }
                  : undefined}
              >
                {CatIcon && <CatIcon className="h-3 w-3" style={{ color: catIconColor }} />}
                {post.tipo_conteudo}
              </span>
            );
          })()}
        </div>
        <div className="w-[110px] shrink-0 flex justify-end">
          <StatusBadgeFilled status={post.status} color={getStatusColor(post.status) || undefined} />
        </div>
        <div className="flex gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setViewPost(post)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {isAdmin && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingId(post.id)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(post.id)} title="Mover para lixeira">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderColumn = (title: string, items: Post[]) => (
    <div className="flex-1 md:min-w-[320px] min-w-0 glass-card rounded-2xl overflow-hidden">
      <div className="sticky top-0 z-10 px-4 py-3" style={{ background: "rgba(15,23,42,0.04)", borderBottom: "1px solid rgba(148,163,184,0.2)", borderRadius: "16px 16px 0 0" }}>
        <h3 className="text-sm font-bold font-heading uppercase tracking-[0.06em]">{title}</h3>
        <p className="text-[11px] text-muted-foreground">{items.length} mídia{items.length !== 1 ? "s" : ""}</p>
      </div>
      <ScrollArea className="h-[60vh]">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mídia encontrada.</p>
        ) : (
          items.map(renderRow)
        )}
      </ScrollArea>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold font-heading tracking-[-0.02em]">Mídia</h2>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} mídia{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end overflow-x-hidden">
        <div className="relative flex-1 min-w-0 md:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título/tema..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {activeCategories.length > 0 && (
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {activeCategories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={respFilter} onValueChange={setRespFilter}>
          <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {responsibleOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
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

      {/* Profile chip filters — like calendar */}
      {activeProfiles.length > 0 && (
        <div className="flex items-center gap-2 px-1 py-1" style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setShowAll(true); setSelectedProfiles(new Set()); }}
                  className={cn(
                    "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border",
                    showAll
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "text-muted-foreground border-transparent hover:border-border"
                  )}
                >
                  Todas
                </button>
              </TooltipTrigger>
              <TooltipContent>Exibir todas as mídias em uma lista</TooltipContent>
            </Tooltip>
            <div className="w-px h-4 bg-border/50 mx-1" />
            {activeProfiles.map((profile) => {
              const isSelected = !showAll && selectedProfiles.has(profile.name);
              const ProfileIcon = getIcon(profile.icon_key);
              const iconColor = getIconColor(profile.icon_key);
              return (
                <Tooltip key={profile.name}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (showAll) {
                          setShowAll(false);
                          setSelectedProfiles(new Set([profile.name]));
                        } else {
                          setSelectedProfiles((prev) => {
                            const next = new Set(prev);
                            if (next.has(profile.name)) next.delete(profile.name);
                            else next.add(profile.name);
                            if (next.size === 0) setShowAll(true);
                            return next;
                          });
                        }
                      }}
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border inline-flex items-center gap-1",
                        isSelected
                          ? "border-accent/30 shadow-sm"
                          : !showAll && selectedProfiles.size > 0
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
          </TooltipProvider>
        </div>
      )}

      {/* Inline add form — desktop */}
      <div className="hidden md:block glass-card rounded-2xl p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Conteúdo do post..."
            value={newConteudo}
            onChange={(e) => setNewConteudo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canAdd && handleAdd()}
            className="h-8 text-xs flex-1 min-w-[140px]"
          />
          <div className="flex items-center gap-1.5">
            <ChipSelect variant="profile" value={newLocal} onValueChange={setNewLocal} options={activeProfiles.map((p) => ({ value: p.name, label: p.name, icon_key: p.icon_key || null }))} onManage={() => setEditModal("profiles")} />
            <ChipSelect variant="category" value={newTipo} onValueChange={setNewTipo} options={activeCategories.map((c) => ({ value: c.name, label: c.name, color: c.color || null }))} onManage={() => setEditModal("categories")} />
            <ChipSelect variant="status" value={newStatus} onValueChange={setNewStatus} options={activeStatuses.map((s) => ({ value: s.name, label: s.name, color: s.color || null }))} onManage={() => setEditModal("statuses")} />
            <ChipSelect variant="member" value={newResponsavel} onValueChange={setNewResponsavel} options={responsibleOptions.map((n) => ({ value: n, label: n }))} searchable />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2 shrink-0">
                <CalendarIcon className="h-3.5 w-3.5" />
                {newData ? new Date(newData + "T00:00:00").toLocaleDateString("pt-BR") : "Data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={newData ? new Date(newData + "T00:00:00") : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0"); setNewData(`${y}-${m}-${d}`); }}} initialFocus />
            </PopoverContent>
          </Popover>
          <Button onClick={handleAdd} disabled={!canAdd || adding} size="sm" className="h-8 gap-1 text-xs px-3">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        {!canAdd && newConteudo.trim() && (
          <p className="text-[10px] text-destructive">Preencha todos os campos: perfil, tipo, status e responsável.</p>
        )}
      </div>

      {/* Inline add form — mobile */}
      <MobileMediaCreation
        newConteudo={newConteudo} setNewConteudo={setNewConteudo}
        newLocal={newLocal} setNewLocal={setNewLocal}
        newStatus={newStatus} setNewStatus={setNewStatus}
        newData={newData} setNewData={setNewData}
        newResponsavel={newResponsavel} setNewResponsavel={setNewResponsavel}
        activeProfiles={activeProfiles}
        activeStatuses={activeStatuses}
        responsibleOptions={responsibleOptions}
        canAdd={!!canAdd} adding={adding} handleAdd={handleAdd}
      />

      {/* Content — horizontal scrollable profile columns */}
      <div className="md:overflow-x-auto overflow-x-hidden pb-2 md:-mx-2 md:px-2">
        <div className="flex flex-col md:flex-row gap-4" style={{ minWidth: visibleColumns.length > 1 ? undefined : "100%" }}>
          {visibleColumns.map((col) => renderColumn(col.name, col.posts))}
        </div>
      </div>

      {/* View dialog */}
      <Dialog open={!!viewPost} onOpenChange={(o) => !o && setViewPost(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Detalhes do Post</DialogTitle></DialogHeader>
          {viewPost && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{viewPost.conteudo}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Perfil: <span className="text-foreground">{viewPost.local || "—"}</span></div>
                <div>Tipo: <span className="text-foreground capitalize">{viewPost.tipo_conteudo || "—"}</span></div>
                <div>Responsável: <span className="text-foreground">{resolveResp(viewPost.responsavel)}</span></div>
                <div>Status: <StatusBadgeFilled status={viewPost.status} color={getStatusColor(viewPost.status) || undefined} /></div>
                <div>Data: <span className="text-foreground">{new Date(viewPost.data_postagem + "T00:00:00").toLocaleDateString("pt-BR")}</span></div>
              </div>
              {viewPost.link_canva && (
                <a href={viewPost.link_canva} target="_blank" rel="noreferrer" className="text-xs text-accent underline">Abrir no Canva</a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit is now inline - no modal needed */}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para lixeira?</AlertDialogTitle>
            <AlertDialogDescription>O post será movido para a lixeira e poderá ser restaurado depois.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>Mover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick-edit modals */}
      <QuickEditModal
        open={editModal === "profiles"}
        onOpenChange={(o) => !o && setEditModal(null)}
        title="Gerenciar Perfis"
        items={profiles as QuickEditItem[]}
        onAdd={config.addProfile}
        onUpdate={config.updateProfile}
        onDelete={config.deleteProfile}
        inUseIds={profileNamesInUse}
        showIconPicker
        maxActive={6}
      />
      <QuickEditModal
        open={editModal === "categories"}
        onOpenChange={(o) => !o && setEditModal(null)}
        title="Gerenciar Categorias"
        items={categories as QuickEditItem[]}
        onAdd={config.addCategory}
        onUpdate={config.updateCategory}
        onDelete={config.deleteCategory}
        inUseIds={categoryNamesInUse}
        showColor
      />
      <QuickEditModal
        open={editModal === "statuses"}
        onOpenChange={(o) => !o && setEditModal(null)}
        title="Gerenciar Status"
        items={statuses as QuickEditItem[]}
        onAdd={config.addStatus}
        onUpdate={config.updateStatus}
        onDelete={config.deleteStatus}
        inUseIds={statusNamesInUse}
        showColor
      />
      <QuickEditModal
        open={editModal === "members"}
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
        inUseIds={new Set(posts.map(p => p.responsavel).filter(Boolean))}
      />
    </div>
  );
}

/* ── Inline Edit Bar for Posts ───────────────────── */

function PostInlineEditBar({ post, onSave, onCancel, profiles, categories, statuses, responsibles }: {
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
  const barRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    const changes: Partial<Omit<Post, "id" | "created_at">> = {};
    if (title.trim() && title.trim() !== post.conteudo) changes.conteudo = title.trim();
    if (local !== (post.local || "")) changes.local = local;
    if (tipo !== (post.tipo_conteudo || "")) changes.tipo_conteudo = tipo;
    if (status !== post.status) changes.status = status;
    if (resp !== (post.responsavel || "")) changes.responsavel = resp;
    if (date !== post.data_postagem) changes.data_postagem = date;
    onSave(changes);
  }, [title, local, tipo, status, resp, date, post, onSave]);

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
    <div ref={barRef} className="p-3 ring-2 ring-primary/30 shadow-lg rounded-lg bg-card" style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
      <div className="flex items-center gap-2 flex-wrap">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }} className="h-8 text-xs flex-1 min-w-[140px]" autoFocus />
        <div className="flex items-center gap-1.5">
          <ChipSelect variant="profile" value={local} onValueChange={setLocal} options={profiles.map(p => ({ value: p.name, label: p.name, icon_key: p.icon_key || null }))} />
          <ChipSelect variant="category" value={tipo} onValueChange={setTipo} options={categories.map(c => ({ value: c.name, label: c.name, color: c.color || null }))} />
          <ChipSelect variant="status" value={status} onValueChange={setStatus} options={statuses.map(s => ({ value: s.name, label: s.name, color: s.color || null }))} />
          <ChipSelect variant="member" value={resp} onValueChange={setResp} options={responsibles.map(n => ({ value: n, label: n }))} searchable />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2"><CalendarIcon className="h-3.5 w-3.5" />{date ? new Date(date + "T00:00:00").toLocaleDateString("pt-BR") : "Data"}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={date ? new Date(date + "T00:00:00") : undefined} onSelect={(d) => { if (d) { setDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`); }}} initialFocus /></PopoverContent>
        </Popover>
        <div className="flex gap-1">
          <Button onClick={handleSave} size="sm" className="h-8 gap-1 text-xs px-2.5"><Check className="h-3.5 w-3.5" /> Salvar</Button>
          <Button onClick={onCancel} variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground"><XIcon className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}
