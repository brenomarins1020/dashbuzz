import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { usePosts, type Post } from "@/hooks/usePosts";
import { useWorkspaceConfig } from "@/hooks/useWorkspaceConfig";
import { useTeam } from "@/hooks/useTeam";
import { getIcon, getIconColor } from "@/lib/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function SearchableResponsibleField({ value, onValueChange, options }: { value: string; onValueChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(n => n.toLowerCase().includes(q));
  }, [options, search]);

  if (options.length === 0) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsável</label>
        <p className="text-xs text-muted-foreground italic">Sem responsáveis. Adicione pessoas na aba Gestão.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsável</label>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              !value && "text-muted-foreground"
            )}
          >
            {value || "Selecione um responsável..."}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar responsável..."
                className="h-8 pl-8 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length > 0 ? filtered.map(name => (
              <button
                key={name}
                type="button"
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors",
                  name === value && "bg-accent"
                )}
                onClick={() => { onValueChange(name); setOpen(false); setSearch(""); }}
              >
                {name}
              </button>
            )) : (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum encontrado</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface PostFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: Post | null;
  onSave?: (data: Omit<Post, "id" | "created_at">) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Omit<Post, "id" | "created_at">>) => Promise<void>;
}

export function PostFormModal({ open, onOpenChange, post, onSave: onSaveProp, onUpdate: onUpdateProp }: PostFormModalProps) {
  const { activeResponsibles } = useWorkspaceConfig();
  const { members } = useTeam();
  const { addPost, updatePost } = usePosts();
  const onSave = onSaveProp ?? addPost;
  const onUpdate = onUpdateProp ?? updatePost;
  const { activeProfiles, activeCategories, activeStatuses } = useWorkspaceConfig();
  const [conteudo, setConteudo] = useState("");
  const [local, setLocal] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState("");
  const [dataPostagem, setDataPostagem] = useState(() => new Date().toISOString().slice(0, 10));
  const [linkCanva, setLinkCanva] = useState("");
  const [tipoConteudo, setTipoConteudo] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = !!post;
  const responsibleOptions = useMemo(() => {
    const fromConfig = activeResponsibles.map((r) => r.name);
    const fromMembers = members.map((m) => m.nome);
    return [...new Set([...fromConfig, ...fromMembers])];
  }, [activeResponsibles, members]);

  useEffect(() => {
    if (open && post) {
      setConteudo(post.conteudo);
      setLocal(post.local);
      setResponsavel(post.responsavel);
      setStatus(post.status);
      setDataPostagem(post.data_postagem);
      setLinkCanva(post.link_canva);
      setTipoConteudo(post.tipo_conteudo);
    } else if (open && !post) {
      setConteudo("");
      setLocal(activeProfiles[0]?.name || "");
      setResponsavel("");
      setStatus(activeStatuses[0]?.name || "");
      setDataPostagem(new Date().toISOString().slice(0, 10));
      setLinkCanva("");
      setTipoConteudo(activeCategories[0]?.name || "");
    }
  }, [open, post, activeProfiles, activeStatuses, activeCategories]);

  const handleSubmit = async () => {
    if (!conteudo.trim()) return;
    setSaving(true);
    const payload = {
      conteudo: conteudo.trim(),
      local,
      responsavel,
      status,
      data_postagem: dataPostagem,
      link_canva: linkCanva.trim(),
      tipo_conteudo: tipoConteudo,
    };
    try {
      if (isEditing && onUpdate) {
        await onUpdate(post.id, payload);
      } else {
        await onSave(payload);
      }
      onOpenChange(false);
    } catch {}
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEditing ? "Editar Post" : "Novo Post"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conteúdo *</label>
              <span className={`text-xs tabular-nums ${conteudo.length > 2000 ? "text-destructive" : "text-muted-foreground"}`}>
                {conteudo.length}/2200
              </span>
            </div>
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Descreva o conteúdo do post..."
              rows={3}
              autoFocus
              maxLength={2200}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (conteudo.trim() && !saving) handleSubmit();
                }
              }}
            />
            {!conteudo.trim() && conteudo.length > 0 && (
              <p className="text-xs text-destructive">O conteúdo não pode estar em branco.</p>
            )}
          </div>

          {activeProfiles.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Perfil</label>
              <Select value={local} onValueChange={setLocal}>
                <SelectTrigger><SelectValue placeholder="Selecione um perfil..." /></SelectTrigger>
                <SelectContent>
                  {activeProfiles.map((p) => {
                    const Icon = getIcon(p.icon_key);
                    const iconColor = getIconColor(p.icon_key);
                    return (
                      <SelectItem key={p.id} value={p.name}>
                        <span className="flex items-center gap-2 w-full">
                          <span className="flex-1">{p.name}</span>
                          <Icon className="h-4 w-4 shrink-0" style={{ color: iconColor }} />
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <SearchableResponsibleField
            value={responsavel}
            onValueChange={setResponsavel}
            options={responsibleOptions}
          />

          {activeStatuses.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {activeStatuses.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de Postagem</label>
            <Input type="date" value={dataPostagem} onChange={(e) => setDataPostagem(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Link Canva</label>
            <Input value={linkCanva} onChange={(e) => setLinkCanva(e.target.value)} placeholder="https://www.canva.com/..." />
          </div>

          {activeCategories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria</label>
              <Select value={tipoConteudo} onValueChange={setTipoConteudo}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {activeCategories.map((c) => {
                    const Icon = getIcon(c.icon_key);
                    const iconColor = getIconColor(c.icon_key);
                    return (
                      <SelectItem key={c.id} value={c.name}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: iconColor }} />
                          {c.name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Button onClick={handleSubmit} disabled={!conteudo.trim() || saving} className="w-full gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Adicionar Post"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Pressione <kbd className="px-1 py-0.5 rounded text-[10px] bg-muted border border-border">Ctrl+Enter</kbd> para salvar rapidamente
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
