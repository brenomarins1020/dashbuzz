import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspaceConfig } from "@/hooks/useWorkspaceConfig";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings2 } from "lucide-react";
import { IconPicker } from "@/components/IconPicker";
import { getIcon, getIconColor } from "@/lib/icons";
import { toast } from "sonner";

export function WorkspaceConfigPanel() {
  const config = useWorkspaceConfig();
  const taskCats = useTaskCategories();
  const { taskCat1Label, taskCat2Label, updateCategoryLabels } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (config.loading) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-accent" />
          <div className="text-left">
            <p className="text-sm font-semibold">Personalização do Workspace</p>
            <p className="text-xs text-muted-foreground">Perfis, categorias, status, cargos e responsáveis</p>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="glass-card rounded-b-xl px-4 py-4 -mt-2 pt-6 border-t-0">
          <Tabs defaultValue="responsibles" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide bg-muted/50 h-9">
              <TabsTrigger value="responsibles" className="text-[11px]">Responsáveis</TabsTrigger>
              <TabsTrigger value="profiles" className="text-[11px]">Perfis</TabsTrigger>
              <TabsTrigger value="categories" className="text-[11px]">Categorias</TabsTrigger>
              <TabsTrigger value="statuses" className="text-[11px]">Status</TabsTrigger>
              <TabsTrigger value="roles" className="text-[11px]">Cargos</TabsTrigger>
              <TabsTrigger value="taskcat1" className="text-[11px]">{taskCat1Label}</TabsTrigger>
              <TabsTrigger value="taskcat2" className="text-[11px]">{taskCat2Label}</TabsTrigger>
            </TabsList>

            <TabsContent value="responsibles" className="mt-3">
              <ResponsiblesTab config={config} />
            </TabsContent>
            <TabsContent value="profiles" className="mt-3">
              <ProfilesTab config={config} />
            </TabsContent>
            <TabsContent value="categories" className="mt-3">
              <CategoriesTab config={config} />
            </TabsContent>
            <TabsContent value="statuses" className="mt-3">
              <StatusesTab config={config} />
            </TabsContent>
            <TabsContent value="roles" className="mt-3">
              <RolesTab config={config} />
            </TabsContent>
            <TabsContent value="taskcat1" className="mt-3">
              <TaskCategoryTab groupNumber={1} label={taskCat1Label} taskCats={taskCats} onRenameLabel={(newLabel) => updateCategoryLabels(newLabel, taskCat2Label)} />
            </TabsContent>
            <TabsContent value="taskcat2" className="mt-3">
              <TaskCategoryTab groupNumber={2} label={taskCat2Label} taskCats={taskCats} onRenameLabel={(newLabel) => updateCategoryLabels(taskCat1Label, newLabel)} />
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Responsibles Tab ───

function ResponsiblesTab({ config }: { config: ReturnType<typeof useWorkspaceConfig> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleAdd = async () => {
    if (!name.trim()) return;
    await config.addResponsible({ name: name.trim(), email: email.trim() || undefined });
    setName("");
    setEmail("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Nome do responsável..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="h-8 text-xs flex-1" />
        <Input placeholder="Email (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="h-8 text-xs w-[160px]" />
        <Button onClick={handleAdd} disabled={!name.trim()} size="sm" className="h-8 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
      {config.responsibles.length === 0 ? (
        <EmptyState message="Você ainda não cadastrou responsáveis." />
      ) : (
        <div className="space-y-1">
          {config.responsibles.map((r) => (
            <ConfigRow
              key={r.id}
              name={r.name}
              subtitle={r.email || undefined}
              isActive={r.is_active}
              onToggle={() => config.updateResponsible(r.id, { is_active: !r.is_active })}
              onDelete={() => config.deleteResponsible(r.id)}
              onRename={(n) => config.updateResponsible(r.id, { name: n })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Profiles Tab (CRUD with name + icon picker) ───

function ProfilesTab({ config }: { config: ReturnType<typeof useWorkspaceConfig> }) {
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState("instagram");
  const MAX_ACTIVE = 6;
  const activeCount = config.profiles.filter(p => p.is_active).length;

  const handleAdd = async () => {
    if (!name.trim()) return;
    await config.addProfile({ name: name.trim(), icon_key: iconKey });
    setName("");
  };

  const handleToggle = async (profile: typeof config.profiles[0]) => {
    if (!profile.is_active && activeCount >= MAX_ACTIVE) {
      toast.error(`Máximo de ${MAX_ACTIVE} perfis ativos. Desative um para ativar outro.`);
      return;
    }
    await config.updateProfile(profile.id, { is_active: !profile.is_active });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input placeholder="Nome do perfil..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="h-8 text-xs flex-1" />
          <Button onClick={handleAdd} disabled={!name.trim()} size="sm" className="h-8 gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        <IconPicker value={iconKey} onChange={setIconKey} size="sm" />
      </div>
      <p className="text-[10px] text-muted-foreground">{activeCount}/{MAX_ACTIVE} perfis ativos</p>
      {config.profiles.length === 0 ? (
        <EmptyState message="Você ainda não criou perfis de mídia." />
      ) : (
        <div className="space-y-1">
          {config.profiles.map((p) => {
            const Icon = getIcon(p.icon_key);
            const iconColor = getIconColor(p.icon_key);
            return (
              <ConfigRow
                key={p.id}
                name={p.name}
                isActive={p.is_active}
                onToggle={() => handleToggle(p)}
                onDelete={() => config.deleteProfile(p.id)}
                onRename={(n) => config.updateProfile(p.id, { name: n })}
                iconElement={<Icon className="h-4 w-4 shrink-0" style={{ color: iconColor }} />}
                onEditIconKey={(key) => config.updateProfile(p.id, { icon_key: key } as any)}
                currentIconKey={p.icon_key}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Categories Tab ───

function CategoriesTab({ config }: { config: ReturnType<typeof useWorkspaceConfig> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [iconKey, setIconKey] = useState("instagram");

  const handleAdd = async () => {
    if (!name.trim()) return;
    await config.addCategory({ name: name.trim(), color, icon_key: iconKey });
    setName("");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input placeholder="Nome da categoria..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="h-8 text-xs flex-1" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 rounded border border-border cursor-pointer" />
          <Button onClick={handleAdd} disabled={!name.trim()} size="sm" className="h-8 gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        <IconPicker value={iconKey} onChange={setIconKey} size="sm" />
      </div>
      {config.categories.length === 0 ? (
        <EmptyState message="Você ainda não criou categorias de conteúdo." />
      ) : (
        <div className="space-y-1">
          {config.categories.map((c) => {
            const Icon = getIcon(c.icon_key);
            const iconColor = getIconColor(c.icon_key);
            return (
              <ConfigRow
                key={c.id}
                name={c.name}
                color={c.color || undefined}
                isActive={c.is_active}
                onToggle={() => config.updateCategory(c.id, { is_active: !c.is_active })}
                onDelete={() => config.deleteCategory(c.id)}
                onRename={(n) => config.updateCategory(c.id, { name: n })}
                iconElement={<Icon className="h-4 w-4 shrink-0" style={{ color: iconColor }} />}
                onEditIconKey={(key) => config.updateCategory(c.id, { icon_key: key } as any)}
                currentIconKey={c.icon_key}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Statuses Tab ───

function StatusesTab({ config }: { config: ReturnType<typeof useWorkspaceConfig> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#eab308");

  const handleAdd = async () => {
    if (!name.trim()) return;
    await config.addStatus({ name: name.trim(), color });
    setName("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Nome do status..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="h-8 text-xs flex-1" />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 rounded border border-border cursor-pointer" />
        <Button onClick={handleAdd} disabled={!name.trim()} size="sm" className="h-8 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
      {config.statuses.length === 0 ? (
        <EmptyState message="Você ainda não criou status do workflow." />
      ) : (
        <div className="space-y-1">
          {config.statuses.map((s) => (
            <ConfigRow
              key={s.id}
              name={s.name}
              color={s.color || undefined}
              isActive={s.is_active}
              onToggle={() => config.updateStatus(s.id, { is_active: !s.is_active })}
              onDelete={() => config.deleteStatus(s.id)}
              onRename={(n) => config.updateStatus(s.id, { name: n })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Roles Tab ───

function RolesTab({ config }: { config: ReturnType<typeof useWorkspaceConfig> }) {
  const [name, setName] = useState("");

  const handleAdd = async () => {
    if (!name.trim()) return;
    await config.addRole({ name: name.trim() });
    setName("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Nome do cargo..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="h-8 text-xs flex-1" />
        <Button onClick={handleAdd} disabled={!name.trim()} size="sm" className="h-8 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
      {config.roles.length === 0 ? (
        <EmptyState message="Você ainda não configurou cargos do time." />
      ) : (
        <div className="space-y-1">
          {config.roles.map((r) => (
            <ConfigRow
              key={r.id}
              name={r.name}
              isActive={r.is_active}
              onToggle={() => config.updateRole(r.id, { is_active: !r.is_active })}
              onDelete={() => config.deleteRole(r.id)}
              onRename={(n) => config.updateRole(r.id, { name: n })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task Category Tab ───

function TaskCategoryTab({ groupNumber, label, taskCats, onRenameLabel }: { groupNumber: number; label: string; taskCats: ReturnType<typeof useTaskCategories>; onRenameLabel: (newLabel: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(label);

  const group = groupNumber === 1 ? taskCats.group1 : taskCats.group2;

  const handleAdd = async () => {
    if (!name.trim()) return;
    await taskCats.addOption(groupNumber, { name: name.trim(), color });
    setName("");
  };

  const handleSaveLabel = async () => {
    if (labelDraft.trim() && labelDraft.trim() !== label) {
      await onRenameLabel(labelDraft.trim());
      toast.success("Nome da categoria atualizado!");
    }
    setEditingLabel(false);
  };

  return (
    <div className="space-y-3">
      {/* Editable category type name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Nome do tipo:</span>
        {editingLabel ? (
          <Input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveLabel(); if (e.key === "Escape") { setLabelDraft(label); setEditingLabel(false); } }}
            onBlur={handleSaveLabel}
            autoFocus
            className="h-7 text-xs w-[180px]"
          />
        ) : (
          <button onClick={() => { setLabelDraft(label); setEditingLabel(true); }} className="text-sm font-semibold hover:underline underline-offset-2">
            {label}
          </button>
        )}
      </div>

      {/* Add subcategory */}
      <div className="flex gap-2">
        <Input placeholder={`Nova subcategoria...`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="h-8 text-xs flex-1" />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 rounded border border-border cursor-pointer" />
        <Button onClick={handleAdd} disabled={!name.trim()} size="sm" className="h-8 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
      {group.length === 0 ? (
        <EmptyState message={`Nenhuma subcategoria criada para ${label}.`} />
      ) : (
        <div className="space-y-1">
          {group.map((o) => (
            <ConfigRow
              key={o.id}
              name={o.name}
              color={o.color}
              isActive={o.is_active}
              onToggle={() => taskCats.updateOption(o.id, { is_active: !o.is_active })}
              onDelete={() => taskCats.deleteOption(o.id)}
              onRename={(n) => taskCats.updateOption(o.id, { name: n })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared components ───

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ConfigRow({ name, subtitle, color, isActive, onToggle, onDelete, onRename, iconElement, onEditIconKey, currentIconKey }: {
  name: string;
  subtitle?: string;
  color?: string;
  isActive: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  iconElement?: React.ReactNode;
  onEditIconKey?: (key: string) => void;
  currentIconKey?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editIconKey, setEditIconKey] = useState(currentIconKey || "instagram");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    if (editName.trim() && editName.trim() !== name) {
      onRename(editName.trim());
    }
    if (onEditIconKey && editIconKey !== currentIconKey) {
      onEditIconKey(editIconKey);
    }
    setEditing(false);
  };

  return (
    <>
      <div className="space-y-1">
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border border-border transition-colors", !isActive && "opacity-50")}>
          {iconElement}
          {color && !iconElement && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />}
          {editing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
              onBlur={handleSave}
              autoFocus
              className="h-7 text-xs flex-1"
            />
          ) : (
            <button onClick={() => { setEditName(name); setEditIconKey(currentIconKey || "instagram"); setEditing(true); }} className="flex-1 text-left min-w-0">
              <span className="text-sm font-medium truncate block">{name}</span>
              {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
            </button>
          )}
          <Switch checked={isActive} onCheckedChange={onToggle} className="scale-75" />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {editing && onEditIconKey && (
          <div className="pl-3 pb-1">
            <IconPicker value={editIconKey} onChange={setEditIconKey} size="sm" />
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Considere desativar em vez de excluir se houver registros usando este item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
