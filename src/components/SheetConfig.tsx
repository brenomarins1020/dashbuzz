import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Settings2, RefreshCw, CheckCircle2, AlertCircle, Loader2, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetConfigProps {
  sheetId: string;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  onSave: (id: string) => void;
  onRefresh: () => void;
}

function extractSheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input.trim();
}

export function SheetConfig({ sheetId, isConnected, loading, error, onSave, onRefresh }: SheetConfigProps) {
  const [inputValue, setInputValue] = useState(sheetId);

  const handleSave = () => {
    const id = extractSheetId(inputValue);
    setInputValue(id);
    onSave(id);
  };

  const handleDisconnect = () => {
    setInputValue("");
    onSave("");
  };

  return (
    <div className="flex items-center gap-2">
      {isConnected && (
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="h-8 w-8">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      )}

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {isConnected ? (
              <CheckCircle2 className="h-4 w-4 text-status-published" />
            ) : (
              <Settings2 className="h-4 w-4" />
            )}
            {isConnected ? "Conectado" : "Conectar Planilha"}
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-y-auto w-[400px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle>Conectar Planilha</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Para conectar sua planilha:
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
                <li>Abra sua planilha no Google Sheets</li>
                <li>
                  Vá em <strong className="text-foreground">Arquivo → Compartilhar → Publicar na Web</strong>
                </li>
                <li>Selecione a aba correta e clique em Publicar</li>
                <li>Cole abaixo o link da planilha ou apenas o ID</li>
              </ol>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Link ou ID da Planilha</label>
              <Input
                placeholder="Cole o link ou ID aqui..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={!inputValue.trim() || loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Conectar
                </Button>
                {isConnected && (
                  <Button variant="outline" onClick={handleDisconnect} className="gap-2">
                    <Unplug className="h-4 w-4" />
                    Desconectar
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {isConnected && !error && (
              <div className="flex items-center gap-2 p-3 bg-status-published/10 rounded-lg text-sm text-status-published">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <p>Planilha conectada com sucesso!</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
