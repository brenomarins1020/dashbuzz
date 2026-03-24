import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Download, Upload, FileDown, FileUp, AlertCircle, CheckCircle2,
  Info, Loader2, Package, HardDrive, ChevronDown, ExternalLink, ClipboardPaste,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  generateFile, downloadFile, parseDelimited, todayStamp, detectCategory,
  CATEGORY_LABELS, type FileFormat,
} from "@/lib/csvUtils";
import { usePosts, type Post } from "@/hooks/usePosts";
import { useAppointments, type Appointment } from "@/hooks/useAppointments";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ── Headers ─────────────────────────────────────────────────
const PUB_HEADERS = ["id", "local", "data_postagem", "conteudo", "tipo_conteudo", "responsavel", "status", "link_canva"];
const APPT_HEADERS = ["id", "title", "type", "date", "start_time", "responsible", "local", "status", "recurrence", "notes"];

function postsToRows(posts: Post[]): string[][] {
  return posts.map((p) => [p.id, p.local, p.data_postagem, p.conteudo, p.tipo_conteudo, p.responsavel, p.status, p.link_canva]);
}
function appointmentsToRows(appointments: Appointment[]): string[][] {
  return appointments.map((a) => [a.id, a.title, a.type, a.date, a.start_time || "", a.responsible || "", a.local || "", a.status, a.recurrence, a.notes || ""]);
}

// ── Import parsers ──────────────────────────────────────────
interface ImportSummary {
  category: string;
  count: number;
  errors: string[];
  preview: string[][];
  headers: string[];
}

function parsePublications(headers: string[], rows: string[][]) {
  const items: Omit<Post, "created_at">[] = [];
  const errors: string[] = [];
  const idx = (n: string) => headers.indexOf(n);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const conteudo = r[idx("conteudo")] || "";
    if (!conteudo) { errors.push(`Linha ${i + 2}: conteudo vazio`); continue; }
    items.push({
      id: r[idx("id")] || crypto.randomUUID(),
      local: (r[idx("local")] || "Instagram") as Post["local"],
      data_postagem: r[idx("data_postagem")] || todayStamp(),
      conteudo,
      tipo_conteudo: (r[idx("tipo_conteudo")] || "institucional") as Post["tipo_conteudo"],
      responsavel: r[idx("responsavel")] || "",
      status: (r[idx("status")] || "não começada") as Post["status"],
      link_canva: r[idx("link_canva")] || "",
    });
  }
  return { items, errors };
}

function parseAppointments(headers: string[], rows: string[][]) {
  const items: Appointment[] = [];
  const errors: string[] = [];
  const idx = (n: string) => headers.indexOf(n);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const title = r[idx("title")] || "";
    if (!title) { errors.push(`Linha ${i + 2}: title vazio`); continue; }
    items.push({
      id: r[idx("id")] || crypto.randomUUID(),
      title,
      type: r[idx("type")] || "reunião",
      date: r[idx("date")] || todayStamp(),
      start_time: r[idx("start_time")] || undefined,
      responsible: r[idx("responsible")] || undefined,
      local: r[idx("local")] || undefined,
      status: (r[idx("status")] || "pendente") as Appointment["status"],
      recurrence: (r[idx("recurrence")] || "nenhuma") as Appointment["recurrence"],
      notes: r[idx("notes")] || undefined,
      created_at: new Date().toISOString(),
    });
  }
  return { items, errors };
}

// ── Google Sheets model URL storage ─────────────────────────
const MODEL_URL_KEY = "backup-sheets-model-url";

// ── Component ───────────────────────────────────────────────
export function BackupPanel() {
  const { posts, refresh: onRefreshPosts } = usePosts();
  const { appointments, refresh: onRefreshAppointments } = useAppointments();
  const { workspaceId } = useWorkspace();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [exportedRecently, setExportedRecently] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [importData, setImportData] = useState<{
    pubs: Omit<Post, "created_at">[];
    appts: Appointment[];
  } | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [modelUrl, setModelUrl] = useState(() => localStorage.getItem(MODEL_URL_KEY) || "");

  // ── Export ──

  function doExport(
    headers: string[], rows: string[][], baseName: string, format: FileFormat,
  ) {
    const ext = format === "tsv" ? "tsv" : "csv";
    const content = generateFile(headers, rows, format);
    downloadFile(content, `${baseName}_${todayStamp()}.${ext}`, format);
    setExportedRecently(true);
    setTimeout(() => setExportedRecently(false), 10000);
  }

  const exportPub = (f: FileFormat) => doExport(PUB_HEADERS, postsToRows(posts), "publicacoes", f);
  const exportApp = (f: FileFormat) => doExport(APPT_HEADERS, appointmentsToRows(appointments), "compromissos", f);
  const exportAll = (f: FileFormat) => {
    exportPub(f);
    setTimeout(() => exportApp(f), 200);
  };

  // ── Import processing ──

  function processImport(text: string) {
    const { headers, rows } = parseDelimited(text);
    if (headers.length === 0 || rows.length === 0) {
      setImportResult("Dados vazios ou formato não reconhecido.");
      return;
    }

    const category = detectCategory(headers);
    if (!category) {
      setImportResult("Não foi possível detectar a categoria pelos cabeçalhos. Verifique se os nomes das colunas estão corretos.");
      return;
    }

    let count = 0;
    let errors: string[] = [];
    let pubs: Omit<Post, "created_at">[] = [];
    let appts: Appointment[] = [];

    if (category === "publication") {
      const r = parsePublications(headers, rows);
      pubs = r.items; count = r.items.length; errors = r.errors;
    } else {
      const r = parseAppointments(headers, rows);
      appts = r.items; count = r.items.length; errors = r.errors;
    }

    const preview = rows.slice(0, 5);

    setImportData({ pubs, appts });
    setImportSummary({ category, count, errors, preview, headers });
    setImportDialog(true);
    setImportResult(null);
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    processImport(await file.text());
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    processImport(pasteText);
    setPasteText("");
    setShowPaste(false);
  };

  const executeImport = async () => {
    if (!importData || !importSummary || !workspaceId) return;
    setImporting(true);
    try {
      if (importData.pubs.length > 0) {
        const pubsWithWs = importData.pubs.map((p) => ({ ...p, workspace_id: workspaceId }));
        if (importMode === "replace") {
          await supabase.from("posts").delete().eq("workspace_id", workspaceId);
          const { error } = await supabase.from("posts").insert(pubsWithWs as any);
          if (error) throw error;
        } else {
          for (const pub of pubsWithWs) {
            const { id, ...rest } = pub;
            const { data: existing } = await supabase.from("posts").select("id").eq("id", id).maybeSingle();
            if (existing) await supabase.from("posts").update(rest).eq("id", id);
            else await supabase.from("posts").insert(pub as any);
          }
        }
        onRefreshPosts();
      }
      if (importData.appts.length > 0) {
        const apptsWithWs = importData.appts.map((a) => ({ ...a, workspace_id: workspaceId }));
        if (importMode === "replace") {
          await supabase.from("appointments").delete().eq("workspace_id", workspaceId);
          const { error } = await supabase.from("appointments").insert(apptsWithWs as any);
          if (error) throw error;
        } else {
          for (const a of apptsWithWs) {
            const { id, ...rest } = a;
            const { data: existing } = await supabase.from("appointments").select("id").eq("id", id).maybeSingle();
            if (existing) await supabase.from("appointments").update(rest as any).eq("id", id);
            else await supabase.from("appointments").insert(a as any);
          }
        }
        onRefreshAppointments();
      }
      setImportResult("✅ Importação concluída com sucesso!");
      setImportDialog(false);
    } catch (err: any) {
      setImportResult(`Erro: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const totalItems = posts.length + appointments.length;
  const sheetsImportUrl = "https://sheets.google.com/create";
  const openSheetsUrl = modelUrl.trim() || sheetsImportUrl;

  function handleModelUrlChange(val: string) {
    setModelUrl(val);
    localStorage.setItem(MODEL_URL_KEY, val);
  }

  // ── Render ──
  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-accent" />
            <div className="text-left">
              <p className="text-sm font-semibold">Backup</p>
              <p className="text-xs text-muted-foreground">Exportar e importar dados via CSV/TSV</p>
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 glass-card rounded-b-xl px-5 py-5 -mt-2 pt-6 border-t-0">

            {/* Summary */}
            <div className="rounded-lg border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold">Resumo dos dados</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{posts.length}</p>
                  <p className="text-xs text-muted-foreground">Mídia</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{appointments.length}</p>
                  <p className="text-xs text-muted-foreground">Compromissos</p>
                </div>
              </div>
            </div>

            {/* ── EXPORT ── */}
            <div className="rounded-lg border border-border/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold">Exportar</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Recomendamos <strong className="text-foreground">TSV</strong> para Google Sheets (evita problemas de vírgula/locale).
              </p>

              {/* TSV buttons */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">TSV (recomendado)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="default" size="sm" onClick={() => exportAll("tsv")} disabled={totalItems === 0} className="gap-1.5">
                    <FileDown className="h-3.5 w-3.5" /> Tudo ({totalItems})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportPub("tsv")} disabled={posts.length === 0} className="gap-1.5">
                     <FileDown className="h-3.5 w-3.5" /> Mídia
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportApp("tsv")} disabled={appointments.length === 0} className="gap-1.5">
                    <FileDown className="h-3.5 w-3.5" /> Compromissos
                  </Button>
                </div>
              </div>

              {/* CSV buttons */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">CSV</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportAll("csv")} disabled={totalItems === 0} className="gap-1.5">
                    <FileDown className="h-3.5 w-3.5" /> Tudo ({totalItems})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportPub("csv")} disabled={posts.length === 0} className="gap-1.5">
                    <FileDown className="h-3.5 w-3.5" /> Mídia
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportApp("csv")} disabled={appointments.length === 0} className="gap-1.5">
                    <FileDown className="h-3.5 w-3.5" /> Compromissos
                  </Button>
                </div>
              </div>

              {/* Post-export: open in Sheets */}
              {exportedRecently && (
                <div className="mt-3 p-3 rounded-lg border border-accent/30 bg-accent/5 space-y-2">
                  <p className="text-sm font-medium text-foreground">📥 Arquivo baixado!</p>
                  <a
                    href={openSheetsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full justify-center rounded-lg bg-accent text-accent-foreground font-medium py-2.5 px-4 text-sm hover:opacity-90 transition-opacity"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {modelUrl.trim() ? "Abrir Sheets Modelo" : "Abrir Google Sheets"}
                  </a>
                  <p className="text-[11px] text-muted-foreground text-center">
                    No Sheets: <strong>Arquivo → Importar → Upload</strong> → selecione o arquivo baixado.
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 text-center">
                    O app não controla qual programa abre o arquivo; isso depende do padrão do seu PC.
                  </p>
                </div>
              )}
            </div>

            {/* Sheets model URL */}
            <div className="rounded-lg border border-border/50 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Link do Sheets Modelo (opcional)</p>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={modelUrl}
                onChange={(e) => handleModelUrlChange(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Se preenchido, o botão "Abrir Google Sheets" levará direto para esta planilha.
              </p>
            </div>

            {/* ── IMPORT ── */}
            <div className="rounded-lg border border-border/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold">Importar</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Aceita CSV e TSV. O app detecta automaticamente o formato e a categoria pelos cabeçalhos.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Do Google Sheets:</strong> Arquivo → Fazer download → CSV (.csv) → envie aqui.
              </p>

              <div className="flex gap-2 flex-wrap">
                <input ref={fileRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="hidden" onChange={handleFileSelect} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                  <FileUp className="h-3.5 w-3.5" /> Enviar arquivo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaste(!showPaste)}
                  className="gap-1.5"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" /> Colar dados
                </Button>
              </div>

              {showPaste && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Copie a tabela do Google Sheets e cole aqui... (Ctrl+V)"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="min-h-[100px] text-xs font-mono"
                  />
                  <Button size="sm" onClick={handlePasteImport} disabled={!pasteText.trim()} className="gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> Processar dados colados
                  </Button>
                </div>
              )}

              {importResult && (
                <div className={cn(
                  "flex items-start gap-2 p-3 rounded-lg text-sm",
                  importResult.startsWith("Erro") || importResult.startsWith("Não") || importResult.startsWith("Dados")
                    ? "bg-destructive/10 text-destructive"
                    : "bg-status-published/10 text-status-published"
                )}>
                  {importResult.startsWith("✅")
                    ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <p>{importResult}</p>
                </div>
              )}
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2 p-3 rounded-lg border border-accent/20 bg-accent/5 text-xs">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
              <p className="text-muted-foreground">
                <strong className="text-foreground">Dica:</strong> Copie direto do Sheets (Ctrl+C na tabela) e use "Colar dados" acima — o app detecta colunas por tab automaticamente.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Import confirmation dialog ── */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
            <DialogDescription>
              {importSummary && (
                <>
                  Categoria detectada: <strong>{CATEGORY_LABELS[importSummary.category] || importSummary.category}</strong> — {importSummary.count} itens
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {importSummary && (
            <div className="space-y-4">
              {/* Preview table */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Prévia (primeiras {Math.min(importSummary.preview.length, 5)} linhas):</p>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-muted/50">
                        {importSummary.headers.map((h, i) => (
                          <th key={i} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importSummary.preview.map((row, ri) => (
                        <tr key={ri} className="border-t border-border/50">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-2 py-1 whitespace-nowrap max-w-[150px] truncate">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-xs space-y-1">
                  <p className="font-semibold">⚠️ {importSummary.errors.length} avisos:</p>
                  {importSummary.errors.slice(0, 5).map((e, i) => <p key={i}>{e}</p>)}
                  {importSummary.errors.length > 5 && <p>...e mais {importSummary.errors.length - 5}</p>}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Modo de importação:</p>
                <div className="flex gap-2">
                  <Button variant={importMode === "merge" ? "default" : "outline"} size="sm" onClick={() => setImportMode("merge")}>
                    Mesclar (merge)
                  </Button>
                  <Button variant={importMode === "replace" ? "destructive" : "outline"} size="sm" onClick={() => setImportMode("replace")}>
                    Substituir tudo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {importMode === "merge"
                    ? "IDs existentes serão atualizados, novos serão inseridos."
                    : "⚠️ Todos os dados da categoria serão substituídos."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog(false)}>Cancelar</Button>
            <Button onClick={executeImport} disabled={importing} className="gap-2">
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar {importSummary?.count} itens
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
