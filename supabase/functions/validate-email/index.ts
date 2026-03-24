import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ valid: false, reason: "Formato de email inválido." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Abstract API
    const apiKey = Deno.env.get("ABSTRACT_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ABSTRACT_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodedEmail}`;
    const apiRes = await fetch(url);

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error("Abstract API error:", apiRes.status, text);
      return new Response(
        JSON.stringify({ error: "Email validation service unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await apiRes.json();

    // Evaluate result
    const isDisposable = result.is_disposable_email?.value === true;
    const isUndeliverable = result.deliverability === "UNDELIVERABLE";
    const smtpInvalid = result.is_smtp_valid?.value === false;

    let valid = true;
    let reason = "";

    if (isDisposable) {
      valid = false;
      reason = "Este email é descartável/temporário e não pode ser utilizado.";
    } else if (isUndeliverable) {
      valid = false;
      reason = "Este email não existe ou não pode receber mensagens.";
    } else if (smtpInvalid) {
      valid = false;
      reason = "O servidor de email não reconhece este endereço.";
    }

    return new Response(
      JSON.stringify({ valid, reason, deliverability: result.deliverability }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("validate-email error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
