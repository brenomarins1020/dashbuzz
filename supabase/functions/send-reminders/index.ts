import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://dashbuzz.lovable.app",
  "https://id-preview--71283dbc-cec4-4e66-ba20-47e2528e6762.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

interface ContentItem {
  title: string;
  type: string;
  responsible: string;
  date: string;
  status: string;
}

interface StoryItem {
  title: string;
  status: string;
  date: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- JWT validation ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;

  // --- Parse body ---
  let items: ContentItem[] = [];
  let stories: StoryItem[] = [];
  let workspace_id: string | null = null;
  try {
    const body = await req.json();
    items = body.items || [];
    stories = body.stories || [];
    workspace_id = body.workspace_id || null;
  } catch {
    // ignore
  }

  if (!workspace_id) {
    return new Response(JSON.stringify({ error: "workspace_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Service role client for DB ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // --- Membership check: caller must belong to the workspace ---
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("workspace_id", workspace_id)
    .maybeSingle();

  if (membershipError || !membership) {
    return new Response(JSON.stringify({ error: "Forbidden: not a member of this workspace" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Resend API key ---
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Person→email mappings scoped to workspace ---
  const { data: personEmails, error: peError } = await supabase
    .from("person_emails")
    .select("*")
    .eq("workspace_id", workspace_id);

  if (peError) {
    return new Response(JSON.stringify({ error: peError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const emailMap: Record<string, string> = {};
  (personEmails || []).forEach((p: { name: string; email: string }) => {
    emailMap[p.name.toLowerCase().trim()] = p.email;
  });

  // Tomorrow date string YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const results: { sent: string[]; skipped: string[]; errors: string[] } = {
    sent: [],
    skipped: [],
    errors: [],
  };

  const typeLabel = (type: string) => {
    if (type === "instagram" || type === "Instagram") return "Instagram";
    if (type === "Blog") return "Blog";
    if (type === "story") return "Story";
    return type;
  };

  function esc(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function sendEmail(to: string, name: string, contentTitle: string, contentType: string, contentDate: string) {
    const formattedDate = new Date(contentDate + "T12:00:00").toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });

    const safeName = esc(name);
    const safeTitle = esc(contentTitle);
    const safeType = esc(typeLabel(contentType));

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">📅 Lembrete de Conteúdo</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Marketing Calendar</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#374151;">Olá, <strong>${safeName}</strong>! 👋</p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              Este é um lembrete amigável: você tem um conteúdo agendado para <strong style="color:#111827;">amanhã</strong>!
            </p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid #f97316;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">${safeType}</p>
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">${safeTitle}</p>
              <p style="margin:0;font-size:14px;color:#6b7280;">📆 ${formattedDate}</p>
            </div>
            <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
              Lembre-se de finalizar o material com antecedência para garantir uma publicação tranquila. Qualquer dúvida, fale com a equipe de marketing!
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Marketing Calendar · Este email foi enviado automaticamente.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Marketing Calendar <marketing@projecjunior.com.br>",
        to: [to],
        subject: `⏰ Lembrete: "${safeTitle}" é amanhã!`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error [${res.status}]: ${err}`);
    }
  }

  // Process content items due tomorrow
  for (const item of items) {
    if (item.date !== tomorrowStr) continue;
    if (!item.responsible?.trim()) continue;

    const email = emailMap[item.responsible.toLowerCase().trim()];
    if (!email) {
      results.skipped.push(`${item.title} (${item.responsible} sem email)`);
      continue;
    }

    const { data: existing } = await supabase
      .from("email_logs")
      .select("id")
      .eq("content_title", item.title)
      .eq("content_date", item.date)
      .eq("content_type", item.type)
      .eq("workspace_id", workspace_id)
      .single();

    if (existing) {
      results.skipped.push(`${item.title} (já enviado)`);
      continue;
    }

    try {
      await sendEmail(email, item.responsible, item.title, item.type, item.date);
      await supabase.from("email_logs").insert({
        content_title: item.title,
        content_date: item.date,
        content_type: item.type,
        responsible_name: item.responsible,
        workspace_id: workspace_id,
      });
      results.sent.push(`${item.title} → ${email}`);
    } catch (e: any) {
      results.errors.push(`${item.title}: ${e.message}`);
    }
  }

  // Process stories due tomorrow
  for (const story of stories) {
    if (story.date !== tomorrowStr) continue;

    if (Object.keys(emailMap).length === 0) {
      results.skipped.push(`Story: ${story.title} (nenhum email configurado)`);
      continue;
    }

    const { data: existing } = await supabase
      .from("email_logs")
      .select("id")
      .eq("content_title", story.title)
      .eq("content_date", story.date)
      .eq("content_type", "story")
      .eq("workspace_id", workspace_id)
      .single();

    if (existing) {
      results.skipped.push(`Story: ${story.title} (já enviado)`);
      continue;
    }

    try {
      for (const [name, email] of Object.entries(emailMap)) {
        await sendEmail(email, name, story.title, "story", story.date);
      }
      await supabase.from("email_logs").insert({
        content_title: story.title,
        content_date: story.date,
        content_type: "story",
        responsible_name: "equipe",
        workspace_id: workspace_id,
      });
      results.sent.push(`Story: ${story.title}`);
    } catch (e: any) {
      results.errors.push(`Story ${story.title}: ${e.message}`);
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
