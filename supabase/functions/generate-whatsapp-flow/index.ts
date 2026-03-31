import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { niche, meuNome, minhaEmpresa, servico, diferencial, publicoAlvo, cidade } = await req.json();

    const nichePrompts: Record<string, string> = {
      restaurante: `Você é um especialista em prospecção para restaurantes e bares. O cliente prospectado é dono/gestor de um restaurante ou bar. Foque em: aumento de movimento em dias fracos, delivery, eventos e reservas, fidelização de clientes, happy hour, datas comemorativas. Use linguagem informal mas profissional. O pain point principal é: mesas vazias, faturamento inconsistente, dependência do iFood.`,
      clinica: `Você é um especialista em prospecção para clínicas médicas e consultórios. O cliente prospectado é médico, dentista, psicólogo ou gestor de clínica. Foque em: agenda com horários vagos, captação de novos pacientes, redução de faltas e no-shows, marketing médico ético, diferenciação no atendimento. Use linguagem respeitosa e profissional. O pain point principal é: agenda com horários ociosos, dificuldade de captar pacientes sem indicação.`,
      estetica: `Você é um especialista em prospecção para clínicas de saúde e estética (salões, clínicas de estética, nutrição, etc). O cliente prospectado é dono de salão, clínica estética, nutricionista, etc. Foque em: sazonalidade (verão, festas), resultados e transformação, pacotes, fidelização, avaliações gratuitas. Use linguagem descontraída e inspiradora. O pain point principal é: agenda irregular, dependência de clientes antigos, dificuldade de vender pacotes.`,
      coworking: `Você é um especialista em prospecção para coworkings e escritórios compartilhados. O cliente prospectado é dono/gestor de espaço de coworking. Foque em: redução de custos fixos vs escritório próprio, flexibilidade, networking, infraestrutura completa, planos mensais/diários. Use linguagem corporativa e objetiva. O pain point principal é: salas vazias, alta taxa de churn, dificuldade de justificar o valor vs home office.`,
      pilates: `Você é um especialista em prospecção para estúdios de pilates e academias. O cliente prospectado é dono/gestor de estúdio de pilates ou academia. Foque em: saúde e bem-estar, modalidades diferenciadas, turmas flexíveis, resultados comprovados, avaliação física gratuita. Use linguagem motivacional e acolhedora. O pain point principal é: turmas com poucas pessoas, alta rotatividade de alunos, dificuldade de reter.`,
      loja: `Você é um especialista em prospecção para lojas de roupas e moda. O cliente prospectado é dono/gestor de loja de roupas. Foque em: coleção nova, liquidação, datas comemorativas, atendimento personalizado, lookbooks, parcerias B2B. Use linguagem fashion e dinâmica. O pain point principal é: fluxo irregular na loja, estoque parado, concorrência do e-commerce.`,
      outros: `Você é um especialista em prospecção no WhatsApp. Foque em: apresentação clara do valor, criação de curiosidade, sem ser invasivo, construção de rapport rápida. Use linguagem profissional e direta. O pain point principal é: dificuldade de conseguir atenção do prospect.`,
    };

    const nicheContext = nichePrompts[niche] || nichePrompts.outros;

    const systemPrompt = `${nicheContext}

Você vai criar um fluxo completo de cold outreach no WhatsApp com 7 mensagens. Cada mensagem deve:
- Ser CURTA (máximo 150 palavras cada)
- Ser NATURAL, sem parecer robótica
- Usar linguagem conversacional
- Ter emojis estratégicos (não excessivos)
- Indicar claramente onde o usuário deve personalizar com [COLCHETES]

Retorne APENAS um JSON válido neste formato exato:
{
  "fluxo": [
    {
      "id": 1,
      "titulo": "1ª Mensagem — Primeiro Contato",
      "quando": "Envie no primeiro contato",
      "descricao": "Apresentação inicial, desperte curiosidade sem vender",
      "mensagem": "texto da mensagem aqui",
      "dica": "dica de ouro para esta mensagem"
    },
    {
      "id": 2,
      "titulo": "2ª Mensagem — Follow-up (sem resposta)",
      "quando": "Envie 24-48h depois se não respondeu",
      "descricao": "Traz valor ou informação relevante para o nicho",
      "mensagem": "texto da mensagem aqui",
      "dica": "dica de ouro para esta mensagem"
    },
    {
      "id": 3,
      "titulo": "3ª Mensagem — Último Follow-up",
      "quando": "Envie 3-4 dias depois se ainda sem resposta",
      "descricao": "Curta, direta, cria urgência sutil e abre saída honrosa",
      "mensagem": "texto da mensagem aqui",
      "dica": "dica de ouro para esta mensagem"
    },
    {
      "id": 4,
      "titulo": "4ª Mensagem — Respondeu com interesse",
      "quando": "Use quando demonstrar qualquer interesse",
      "descricao": "Qualifica e avança para próximo passo",
      "mensagem": "texto da mensagem aqui",
      "dica": "dica de ouro para esta mensagem"
    },
    {
      "id": 5,
      "titulo": "5ª Mensagem — Contorno: 'Sem interesse'",
      "quando": "Use quando disser não está interessado",
      "descricao": "Não insiste, mas planta semente para futuro",
      "mensagem": "texto da mensagem aqui",
      "dica": "dica de ouro para esta mensagem"
    },
    {
      "id": 6,
      "titulo": "6ª Mensagem — Fechamento (Agendamento)",
      "quando": "Use quando o prospect demonstrar interesse real",
      "descricao": "Propõe reunião/call de forma leve e sem pressão",
      "mensagem": "texto da mensagem aqui",
      "dica": "dica de ouro para esta mensagem"
    },
    {
      "id": 7,
      "titulo": "7ª Mensagem — Confirmação do encontro",
      "quando": "Envie 2h antes do horário agendado",
      "descricao": "Confirma o compromisso e reduz no-show",
      "mensagem": "texto da mensagem aqui",
      "dica": "dica de ouro para esta mensagem"
    }
  ],
  "resumo": "Uma frase resumindo a estratégia do fluxo para este nicho"
}`;

    const userPrompt = `Crie o fluxo de WhatsApp com estas informações:
- Meu nome: ${meuNome}
- Minha empresa/marca: ${minhaEmpresa}
- O que ofereço: ${servico}
- Meu diferencial: ${diferencial || "não informado"}
- Público-alvo: ${publicoAlvo || niche}
- Cidade/região: ${cidade || "não informado"}

Use [MEU NOME], [MINHA EMPRESA], [NOME DO PROSPECT], [NOME DA EMPRESA DELES] nos locais corretos para facilitar a personalização.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
