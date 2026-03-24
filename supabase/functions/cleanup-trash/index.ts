import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Validate shared secret — only pg_cron should call this
  const secret = req.headers.get("x-cleanup-secret");
  if (!secret || secret !== Deno.env.get("CLEANUP_SECRET")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count: postsDeleted } = await sb
      .from("posts")
      .delete({ count: "exact" })
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff);

    const { count: storiesDeleted } = await sb
      .from("stories")
      .delete({ count: "exact" })
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff);

    const { count: appointmentsDeleted } = await sb
      .from("appointments")
      .delete({ count: "exact" })
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff);

    const summary = {
      postsDeleted: postsDeleted ?? 0,
      storiesDeleted: storiesDeleted ?? 0,
      appointmentsDeleted: appointmentsDeleted ?? 0,
      cutoff,
    };

    console.log("Trash cleanup completed:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Trash cleanup error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
