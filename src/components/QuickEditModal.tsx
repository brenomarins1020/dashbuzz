import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconPicker } from "@/components/IconPicker";
import { getIcon, getIconColor } from "@/lib/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
];

export interface QuickEditItem {
  id: string;
  name: string;
  color?: string | null;
  icon_key?: string | null;
  is_active: boolean;
  sort_order: number;
}

interface QuickEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: QuickEditItem[];
  onAdd: (data: { name: string; color?: string; icon_key?: string }) => Promise<void>;
  onUpdate: (id: string, changes: Partial<QuickEditItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  inUseIds?: Set<string>;
  showColor?: boolean;
  showIconPicker?: boolean;
  /** Max active items allowed (0 = unlimited) */
  maxActive?: number;
}

export function QuickEditModal({
  open, onOpenChange, title, items, onAdd, onUpdate, onDelete,
  inUseIds = new Set(), showColor = false, showIconPicker = false,
  maxActive = 0,
}: QuickEditModalProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [newIconKey, setNewIconKey] = useState("instagram");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIconKey, setEditIconKey] = useState("instagram");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const activeCount = items.filter(i => i.is_active).length;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await onAdd({
      name: newName.trim(),
      ...(showColor ? { color: newColor } : {}),
      ...(showIconPicker ? { icon_key: newIconKey } : {}),
    });
    setNewName("");
    setSaving(false);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const changes: Partial<QuickEditItem> = { name: editName.trim() };
    if (showIconPicker) changes.icon_key = editIconKey;
    await onUpdate(id, changes);
    setEditingId(null);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    if (!currentActive && maxActive > 0 && activeCount >= maxActive) {
      toast.error(`Máximo de ${maxActive} perfis ativos. Desative um para ativar outro.`);
      return;
    }
    await onUpdate(id, { is_active: !currentActive });
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const idx = sorted.findIndex((i) => i.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const current = sorted[idx];
    const swap = sorted[swapIdx];
    await Promise.all([
      onUpdate(current.id, { sort_order: swap.sort_order }),
      onUpdate(swap.id, { sort_order: current.sort_order }),
    ]);
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    setDeleteConfirmId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">{title}</DialogTitle>
          </DialogHeader>

          {/* Add new */}
          <div className="space-y-2.5 pt-2">
            {showColor && (
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all shrink-0",
                      newColor === c ? "border-foreground scale-110 ring-2 ring-foreground/20" : "border-transparent hover:scale-110"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nome..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="h-9 text-xs flex-1 min-w-0"
              />
              <Button size="sm" className="h-9 gap-1.5 text-xs shrink-0 px-4" onClick={handleAdd} disabled={!newName.trim() || saving}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            {showIconPicker && (
              <IconPicker value={newIconKey} onChange={setNewIconKey} size="sm" />
            )}
          </div>

          {/* List */}
          <ScrollArea className="flex-1 min-h-0 mt-2">
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum item cadastrado.</p>
            ) : (
              <div className="space-y-1">
                {sorted.map((item, idx) => {
                  const isInUse = inUseIds.has(item.id) || inUseIds.has(item.name);
                  const isEditing = editingId === item.id;
                  const ItemIcon = showIconPicker && item.icon_key ? getIcon(item.icon_key) : null;
                  const itemIconColor = showIconPicker && item.icon_key ? getIconColor(item.icon_key) : undefined;

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-secondary/40 transition-colors group">
                        {showColor && item.color && (
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        )}
                        {ItemIcon && !isEditing && (
                          <span className="shrink-0" style={{ color: itemIconColor }}>
                            <ItemIcon className="h-4 w-4" />
                          </span>
                        )}
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleRename(item.id); if (e.key === "Escape") setEditingId(null); }}
                              className="h-7 text-xs flex-1"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRename(item.id)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className={`text-xs flex-1 ${!item.is_active ? "line-through text-muted-foreground" : ""}`}>
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(item.id); setEditName(item.name); setEditIconKey(item.icon_key || "instagram"); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === 0} onClick={() => handleReorder(item.id, "up")}>
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === sorted.length - 1} onClick={() => handleReorder(item.id, "down")}>
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => handleToggle(item.id, item.is_active)}
                              className="scale-75"
                            />
                            {isInUse ? (
                              <span className="text-[9px] text-muted-foreground whitespace-nowrap">Em uso</span>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteConfirmId(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      {isEditing && showIconPicker && (
                        <div className="pl-2 pb-1">
                          <IconPicker value={editIconKey} onChange={setEditIconKey} size="sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Se preferir, desative o item.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
