import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageCircle, ChevronRight, ChevronLeft, Copy, Check,
  Sparkles, Clock, Lightbulb, RefreshCw, ChevronDown, ChevronUp,
  Utensils, Stethoscope, Heart, Building2, Dumbbell, ShoppingBag, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

const NICHES = [
  { id: "restaurante", label: "Restaurante e Bar", icon: Utensils, color: "from-orange-500/20 to-red-500/20", border: "border-orange-500/30", iconColor: "text-orange-400" },
  { id: "clinica", label: "Clínica e Consultório", icon: Stethoscope, color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30", iconColor: "text-blue-400" },
  { id: "estetica", label: "Saúde e Estética", icon: Heart, color: "from-pink-500/20 to-rose-500/20", border: "border-pink-500/30", iconColor: "text-pink-400" },
  { id: "coworking", label: "Coworking e Escritório", icon: Building2, color: "from-purple-500/20 to-violet-500/20", border: "border-purple-500/30", iconColor: "text-purple-400" },
  { id: "pilates", label: "Pilates e Academia", icon: Dumbbell, color: "from-green-500/20 to-emerald-500/20", border: "border-green-500/30", iconColor: "text-green-400" },
  { id: "loja", label: "Loja de Roupas", icon: ShoppingBag, color: "from-amber-500/20 to-yellow-500/20", border: "border-amber-500/30", iconColor: "text-amber-400" },
  { id: "outros", label: "Outros", icon: MoreHorizontal, color: "from-slate-500/20 to-zinc-500/20", border: "border-slate-500/30", iconColor: "text-slate-400" },
];

interface FluxoMensagem {
  id: number;
  titulo: string;
  quando: string;
  descricao: string;
  mensagem: string;
  dica: string;
}

interface FluxoResult {
  fluxo: FluxoMensagem[];
  resumo: string;
}

export function WhatsappAgente() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedNiche, setSelectedNiche] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FluxoResult | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    meuNome: "",
    minhaEmpresa: "",
    servico: "",
    diferencial: "",
    publicoAlvo: "",
    cidade: "",
  });

  const selectedNicheData = NICHES.find(n => n.id === selectedNiche);

  const handleGenerate = async () => {
    if (!form.meuNome || !form.minhaEmpresa || !form.servico) {
      toast.error("Preencha pelo menos seu nome, empresa e serviço.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-whatsapp-flow", {
        body: { niche: selectedNiche, ...form },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data);
      setStep(3);
      setExpandedId(1);
    } catch (err: any) {
      toast.error("Erro ao gerar fluxo: " + (err.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async (msg: FluxoMensagem) => {
    await navigator.clipboard.writeText(msg.mensagem);
    setCopiedId(msg.id);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = async () => {
    if (!result) return;
    const text = result.fluxo.map(m =>
      `📌 ${m.titulo}\n⏰ ${m.quando}\n\n${m.mensagem}\n\n${"─".repeat(40)}\n`
    ).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Fluxo completo copiado!");
  };

  const reset = () => {
    setStep(1);
    setSelectedNiche("");
    setResult(null);
    setForm({ meuNome: "", minhaEmpresa: "", servico: "", diferencial: "", publicoAlvo: "", cidade: "" });
  };

  // STEP 1: Niche selection
  if (step === 1) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold font-heading tracking-wide uppercase text-white">Agente WhatsApp</h2>
          </div>
          <p className="text-sm text-white/50">Gere fluxos profissionais de cold outreach personalizados para o seu nicho.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn("flex items-center gap-2", s < 3 && "flex-1")}>
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2",
                step >= s ? "bg-amber-500 border-amber-500 text-slate-900" : "border-white/20 text-white/30"
              )}>{s}</div>
              {s < 3 && <div className={cn("flex-1 h-0.5 rounded", step > s ? "bg-amber-500" : "bg-white/10")} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-white/40 -mt-2">
          <span>Nicho</span>
          <span>Seus dados</span>
          <span>Fluxo pronto</span>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Selecione o nicho do seu cliente:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {NICHES.map(niche => {
              const Icon = niche.icon;
              const isSelected = selectedNiche === niche.id;
              return (
                <button
                  key={niche.id}
                  onClick={() => setSelectedNiche(niche.id)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-left transition-all duration-150 group",
                    "bg-white/[0.03] hover:bg-white/[0.06]",
                    isSelected
                      ? `border-amber-500 bg-gradient-to-br ${niche.color}`
                      : `${niche.border} hover:border-white/30`
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-slate-900" />
                    </div>
                  )}
                  <Icon className={cn("h-6 w-6 mb-2", isSelected ? niche.iconColor : "text-white/40 group-hover:text-white/60")} />
                  <p className={cn("text-xs font-semibold leading-tight", isSelected ? "text-white" : "text-white/60")}>{niche.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => setStep(2)}
            disabled={!selectedNiche}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold gap-2"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // STEP 2: Form
  if (step === 2) {
    const NicheIcon = selectedNicheData?.icon || MessageCircle;
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold font-heading tracking-wide uppercase text-white">Agente WhatsApp</h2>
          </div>
          <p className="text-sm text-white/50">Preencha seus dados para personalizar o fluxo.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn("flex items-center gap-2", s < 3 && "flex-1")}>
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2",
                step >= s ? "bg-amber-500 border-amber-500 text-slate-900" : "border-white/20 text-white/30"
              )}>{s}</div>
              {s < 3 && <div className={cn("flex-1 h-0.5 rounded", step > s ? "bg-amber-500" : "bg-white/10")} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-white/40 -mt-2">
          <span>Nicho</span>
          <span>Seus dados</span>
          <span>Fluxo pronto</span>
        </div>

        {/* Selected niche badge */}
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border bg-gradient-to-r w-fit", selectedNicheData?.color, selectedNicheData?.border)}>
          <NicheIcon className={cn("h-4 w-4", selectedNicheData?.iconColor)} />
          <span className="text-xs font-semibold text-white">{selectedNicheData?.label}</span>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60 uppercase tracking-wide">Seu nome *</Label>
              <Input
                placeholder="Ex: João Silva"
                value={form.meuNome}
                onChange={e => setForm(f => ({ ...f, meuNome: e.target.value }))}
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60 uppercase tracking-wide">Sua empresa/marca *</Label>
              <Input
                placeholder="Ex: Agência Digital XYZ"
                value={form.minhaEmpresa}
                onChange={e => setForm(f => ({ ...f, minhaEmpresa: e.target.value }))}
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-white/60 uppercase tracking-wide">O que você oferece? *</Label>
            <Textarea
              placeholder="Ex: Gestão de redes sociais, criação de conteúdo e anúncios pagos para restaurantes aumentarem o movimento durante a semana"
              value={form.servico}
              onChange={e => setForm(f => ({ ...f, servico: e.target.value }))}
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-white/60 uppercase tracking-wide">Seu diferencial (opcional)</Label>
            <Input
              placeholder="Ex: Atendo apenas restaurantes, tenho casos de sucesso comprovados"
              value={form.diferencial}
              onChange={e => setForm(f => ({ ...f, diferencial: e.target.value }))}
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60 uppercase tracking-wide">Público-alvo (opcional)</Label>
              <Input
                placeholder="Ex: Donos de restaurantes médios"
                value={form.publicoAlvo}
                onChange={e => setForm(f => ({ ...f, publicoAlvo: e.target.value }))}
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60 uppercase tracking-wide">Cidade/região (opcional)</Label>
              <Input
                placeholder="Ex: São Paulo - SP"
                value={form.cidade}
                onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(1)}
            className="text-white/50 hover:text-white gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || !form.meuNome || !form.minhaEmpresa || !form.servico}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold gap-2 min-w-[160px]"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Fluxo
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // STEP 3: Results
  if (step === 3 && result) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold font-heading tracking-wide uppercase text-white">Seu Fluxo de WhatsApp</h2>
            </div>
            <p className="text-sm text-white/50">{result.resumo}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={copyAll}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/10 gap-1.5 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar tudo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/10 gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Novo fluxo
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-white/40 px-1">
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> Obrigatória</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-blue-400" /> Situacional</span>
          <span>Toque em cada mensagem para expandir e copiar</span>
        </div>

        <div className="space-y-3">
          {result.fluxo.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const isCopied = copiedId === msg.id;
            const isSituational = msg.id >= 4;

            return (
              <div
                key={msg.id}
                className={cn(
                  "rounded-2xl border overflow-hidden transition-all duration-200",
                  isExpanded
                    ? "border-amber-500/40 bg-amber-500/[0.04]"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                )}
              >
                {/* Header */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    isSituational ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                  )}>
                    {msg.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{msg.titulo}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3 text-white/30" />
                      <span className="text-xs text-white/40">{msg.quando}</span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-white/30 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-white/30 shrink-0" />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-xs text-white/50 italic">{msg.descricao}</p>

                    {/* Message box */}
                    <div className="relative">
                      <div className="rounded-xl bg-[#1a2332] border border-white/10 p-4">
                        {/* WhatsApp-like header */}
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                          <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <MessageCircle className="h-3.5 w-3.5 text-green-400" />
                          </div>
                          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Mensagem WhatsApp</span>
                        </div>
                        <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed font-mono">
                          {msg.mensagem}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => copyMessage(msg)}
                        className={cn(
                          "absolute top-3 right-3 h-7 gap-1.5 text-xs",
                          isCopied
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-amber-500 hover:bg-amber-400 text-slate-900"
                        )}
                      >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {isCopied ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>

                    {/* Tip */}
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-200/70">{msg.dica}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* How to use guide */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Como usar este fluxo
          </h3>
          <div className="space-y-2 text-xs text-white/60">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold mt-0.5">1.</span>
              <span>Substitua tudo que estiver entre <code className="text-amber-300/80 bg-amber-500/10 px-1 rounded">[COLCHETES]</code> com as informações reais do prospect antes de enviar.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold mt-0.5">2.</span>
              <span>Comece sempre pela <strong className="text-white/80">1ª mensagem</strong>. Só avance para os follow-ups se não houver resposta no prazo indicado.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold mt-0.5">3.</span>
              <span>As mensagens <span className="text-blue-400 font-medium">azuis (4-7)</span> são situacionais — use de acordo com a reação do prospect.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold mt-0.5">4.</span>
              <span>Nunca envie mais de 3 mensagens sem resposta para o mesmo prospect. Respeite o "não".</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold mt-0.5">5.</span>
              <span>Personalize levemente cada mensagem adicionando o nome e algo específico da empresa do prospect — isso dobra a taxa de resposta.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
