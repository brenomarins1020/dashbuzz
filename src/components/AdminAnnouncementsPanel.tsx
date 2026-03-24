import { useState } from "react";
import { useIsSystemAdmin, useAdminAnnouncements } from "@/hooks/useAdminAnnouncements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Megaphone, AlertTriangle, Info, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/hooks/useAnnouncements";

const STYLE_ICON: Record<string, React.ElementType> = { info: Info, warning: AlertTriangle, urgent: AlertCircle };
const STYLE_COLORS: Record<string, string> = {
  info: "bg-primary/10 text-primary border-primary/30",
  warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  urgent: "bg-destructive/10 text-destructive border-destructive/30",
};

export function AdminAnnouncementsPanel() {
  const { isAdmin, loading: adminLoading } = useIsSystemAdmin();
  const { announcements, loading, create, update, remove } = useAdminAnnouncements();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [style, setStyle] = useState<"info" | "warning" | "urgent">("info");
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [requireAck, setRequireAck] = useState(true);
  const [linkUrl, setLinkUrl] = useState("");
  const [endAt, setEndAt] = useState("");

  if (adminLoading || loading) return null;
  if (!isAdmin) return null;

  const resetForm = () => {
    setTitle(""); setMessage(""); setStyle("info"); setPriority(0);
    setIsActive(true); setRequireAck(true); setLinkUrl(""); setEndAt("");
    setEditingId(null);
  };

  const openNew = () => { resetForm(); setModalOpen(true); };

  const openEdit = (a: Announcement) => {
    setTitle(a.title); setMessage(a.message); setStyle(a.style);
    setPriority(a.priority); setIsActive(a.is_active); setRequireAck(a.require_ack);
    setLinkUrl(a.link_url || ""); setEndAt(a.end_at ? a.end_at.slice(0, 16) : "");
    setEditingId(a.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) return;
    setSaving(true);
    const payload: any = {
      title: title.trim(), message: message.trim(), style, priority,
      is_active: isActive, require_ack: requireAck,
      link_url: linkUrl.trim() || null,
      end_at: endAt ? new Date(endAt).toISOString() : null,
    };
    try {
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setModalOpen(false); resetForm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading tracking-tight flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Anúncios Globais
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie pop-ups visíveis para todos os usuários.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Anúncio
        </Button>
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum anúncio criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => {
            const Icon = STYLE_ICON[a.style] || Info;
            return (
              <div key={a.id} className={cn("rounded-lg border p-4 transition-colors", STYLE_COLORS[a.style] || "bg-card border-border", !a.is_active && "opacity-50")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-bold">{a.title}</span>
                      {!a.is_active && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Inativo</span>}
                      <span className="text-[10px] uppercase font-semibold opacity-70">P{a.priority}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                    <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span>Criado: {new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
                      {a.end_at && <span>Expira: {new Date(a.end_at).toLocaleDateString("pt-BR")}</span>}
                      {a.require_ack && <span>✓ Requer confirmação</span>}
                      {a.link_url && <span>🔗 Com link</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(a)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent/20 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(a.id)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-destructive/20 text-destructive transition-colors" aria-label="Excluir anúncio">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? "Editar Anúncio" : "Novo Anúncio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Manutenção programada" />
            </div>
            <div>
              <Label>Mensagem *</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Texto do anúncio..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estilo</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} min={0} max={100} />
              </div>
            </div>
            <div>
              <Label>Expira em (opcional)</Label>
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
            <div>
              <Label>Link (opcional)</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Requer confirmação ("Entendi")</Label>
              <Switch checked={requireAck} onCheckedChange={setRequireAck} />
            </div>
            <Button onClick={handleSave} disabled={!title.trim() || !message.trim() || saving} className="w-full gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Salvando..." : editingId ? "Salvar" : "Criar Anúncio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O anúncio será removido permanentemente para todos os usuários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { remove(deleteId); setDeleteId(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
