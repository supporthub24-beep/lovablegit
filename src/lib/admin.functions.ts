import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Admin access required.");
    

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [settings, customers, usage, projects] = await Promise.all([
      supabaseAdmin.from("platform_settings").select("key, value"),
      supabaseAdmin
        .from("profiles")
        .select("id, email, display_name, credits, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("usage_events")
        .select("kind, credits, model, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin.from("projects").select("id", { count: "exact", head: true }),
    ]);

    const settingsMap: Record<string, Record<string, string | number | boolean | null>> = {};
    for (const row of settings.data ?? []) {
      settingsMap[row.key] = (row.value ?? {}) as Record<string, string | number | boolean | null>;
    }

    const usageRows = usage.data ?? [];
    return {
      settings: settingsMap,
      customers: customers.data ?? [],
      usage: usageRows,
      totals: {
        customers: (customers.data ?? []).length,
        projects: projects.count ?? 0,
        creditsUsed: usageRows.reduce((sum, u) => sum + (u.credits ?? 0), 0),
        githubConfigured: Boolean(process.env["GITHUB_APP_USER_CONNECTOR_CLIENT_API_KEY"]),
      },
    };
  });

export const updatePlatformSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        key: z.enum(["models", "features", "limits"]),
        value: z.record(z.string(), z.any()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin access required.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("platform_settings")
      .upsert(
        { key: data.key, value: data.value as never, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCustomerCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), credits: z.number().int().min(0).max(100000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin access required.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ credits: data.credits })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Bootstrap: the first signed-in user can claim the admin role when none exists. */
export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An administrator already exists.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});
