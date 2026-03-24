import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Plus, Trash2, Mail, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailValidation } from "@/hooks/useEmailValidation";
import type { Post } from "@/hooks/usePosts";

interface PersonEmail {
  id: string;
  name: string;
  email: string;
  workspace_id?: string;
}

interface NotificationsConfigProps {
  posts: Post[];
}

export function NotificationsConfig({ posts }: NotificationsConfigProps) {
  const { workspaceId } = useWorkspace();
  const [people, setPeople] = useState<PersonEmail[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [savingPerson, setSavingPerson] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const { validateEmail, validating } = useEmailValidation();
  const [emailError, setEmailError] = useState("");

  useEffect(() => { if (workspaceId) fetchPeople(); }, [workspaceId]);

  async function fetchPeople() {
    if (!workspaceId) return;
    setLoadingPeople(true);
    const { data } = await supabase.from("person_emails").select("*").eq("workspace_id", workspaceId).order("name");
    setPeople((data ?? []) as PersonEmail[]);
    setLoadingPeople(false);
  }

  async function handleAddPerson() {
    if (!workspaceId || !newName.trim() || !newEmail.trim()) return;
    const result = await validateEmail(newEmail.trim());
    if (!result.valid) { setEmailError(result.reason); return; }
    setSavingPerson(true);
    await supabase.from("person_emails").upsert(
      { name: newName.trim(), email: newEmail.trim().toLowerCase(), workspace_id: workspaceId },
      { onConflict: "name,workspace_id" }
    );
    setNewName("");
    setNewEmail("");
    setEmailError("");
    await fetchPeople();
    setSavingPerson(false);
  }

  async function handleRemovePerson(id: string) {
    await supabase.from("person_emails").delete().eq("id", id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSendReminders() {
    if (!workspaceId) return;
    setSendingTest(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-reminders", {
        body: { items: posts, stories: [], workspace_id: workspaceId },
      });
      if (error) throw error;
      const { sent = 0, errors: errs = [] } = data || {};
      if (errs.length > 0) {
        setFeedback({ type: "error", message: `${errs.length} erro(s): ${errs.join("; ")}` });
      } else {
        setFeedback({ type: "success", message: `${sent} email(s) enviado(s) com sucesso!` });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Erro ao enviar lembretes." });
    }
    setSendingTest(false);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const dueTomorrow = posts.filter((p) => p.data_postagem === tomorrowStr && p.responsavel);

  return (
    <div className="space-y-8">
      <div className="glass-card rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Como funciona</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Um dia antes de cada post, a pessoa responsável recebe um email de lembrete automático.
        </p>
        {dueTomorrow.length > 0 && (
          <div className="mt-3 p-3 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium text-primary">⏰ {dueTomorrow.length} conteúdo(s) agendado(s) para amanhã</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Mapeamento de Pessoas → Email</h3>
        <div className="glass-card rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">Adicionar pessoa</p>
          <Input placeholder="Nome (ex: Urso)" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddPerson()} />
          <div className="space-y-1">
            <Input placeholder="Email (ex: urso@projec.com)" type="email" value={newEmail} onChange={(e) => { setNewEmail(e.target.value); setEmailError(""); }} onKeyDown={(e) => e.key === "Enter" && handleAddPerson()} />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          <Button onClick={handleAddPerson} disabled={!newName.trim() || !newEmail.trim() || savingPerson || validating} className="w-full gap-2">
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : savingPerson ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {validating ? "Verificando email..." : "Adicionar"}
          </Button>
        </div>

        {loadingPeople ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : people.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pessoa cadastrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {people.map((person) => (
              <div key={person.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{person.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{person.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemovePerson(person.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Button onClick={handleSendReminders} disabled={sendingTest || people.length === 0} className="w-full gap-2" variant="outline">
          {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sendingTest ? "Enviando..." : "Enviar lembretes agora"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">Envia lembretes para conteúdos com data de amanhã</p>
        {feedback && (
          <div className={cn("flex items-start gap-2 p-3 rounded-lg text-sm", feedback.type === "success" ? "bg-status-published/10 text-status-published" : "bg-destructive/10 text-destructive")}>
            {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            <p>{feedback.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
