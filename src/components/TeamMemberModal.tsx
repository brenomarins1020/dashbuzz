import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceConfig } from "@/hooks/useWorkspaceConfig";
import { useEmailValidation } from "@/hooks/useEmailValidation";
import type { TeamMember } from "@/hooks/useTeam";

interface TeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMember | null;
  onSave: (data: Omit<TeamMember, "id">) => void;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function TeamMemberModal({ open, onOpenChange, member, onSave }: TeamMemberModalProps) {
  const { activeRoles } = useWorkspaceConfig();
  const roleNames = activeRoles.map((r) => r.name);
  const { validateEmail, validating } = useEmailValidation();

  const [nome, setNome] = useState(member?.nome ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [ano, setAno] = useState(member?.ano_entrada?.toString() ?? new Date().getFullYear().toString());
  const [cargo, setCargo] = useState(member?.cargo ?? "");
  const [foto, setFoto] = useState<string | undefined>(member?.foto);
  const [uploading, setUploading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && member) {
      setNome(member.nome);
      setEmail(member.email);
      setAno(member.ano_entrada.toString());
      setCargo(member.cargo);
      setFoto(member.foto);
    } else if (open && !member) {
      setNome("");
      setEmail("");
      setAno(new Date().getFullYear().toString());
      setCargo(roleNames[0] ?? "");
      setFoto(undefined);
    }
  }, [open, member]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".heic") || name.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif") {
      toast({ title: "Formato não suportado", description: "Envie a foto em JPG ou PNG.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const dataUrl = await fileToDataUrl(file);
    setFoto(dataUrl);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !ano.trim()) return;
    const anoNum = parseInt(ano, 10);
    if (isNaN(anoNum)) return;

    setEmailError("");

    // Only validate email if provided and not synthetic
    if (email.trim() && !email.includes("@member.dashbuzz.app")) {
      const validation = await validateEmail(email);
      if (!validation.valid) {
        setEmailError(validation.reason);
        return;
      }
    }

    onSave({ nome: nome.trim(), email: email.trim().toLowerCase() || "", ano_entrada: anoNum, cargo, foto });
    onOpenChange(false);
  };

  const isValid = nome.trim() && ano.trim() && !isNaN(parseInt(ano, 10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{member ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
              {foto ? <img src={foto} alt="Foto" className="h-full w-full object-cover" /> : <User className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="flex-1 space-y-1">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Processando..." : "Upload de Foto"}
              </Button>
              <p className="text-[10px] text-muted-foreground">Opcional.</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email (opcional)</Label>
            <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(""); }} placeholder="nome@empresa.com" />
            {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ano de entrada *</Label>
            <Input type="number" value={ano} onChange={(e) => setAno(e.target.value)} placeholder="2024" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cargo *</Label>
            {roleNames.length > 0 ? (
              <Select value={cargo} onValueChange={setCargo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Analista de Marketing" />
            )}
          </div>
          <Button onClick={handleSubmit} disabled={!isValid || validating} className="w-full gap-2">
            {validating && <Loader2 className="h-4 w-4 animate-spin" />}
            {validating ? "Verificando email..." : member ? "Salvar Alterações" : "Adicionar Membro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
