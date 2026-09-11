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

/* ---- Built-in provider API keys (OpenAI / Google Gemini) ---- */

const KEY_PROVIDERS = {
  openai: {
    label: "OpenAI",
    kind: "openai_compatible" as const,
    base_url: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini"],
  },
  google: {
    label: "Google Gemini",
    kind: "google" as const,
    base_url: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.0-flash", "gemini-1.5-pro"],
  },
};

async function assertAdminRole(context: { supabase: any; userId: string }) {
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (!(roles ?? []).some((r: { role: string }) => r.role === "admin"))
    throw new Error("Admin access required.");
}

export const getAiKeyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_providers")
      .select("label, api_key, updated_at");
    const rows = data ?? [];
    return (Object.keys(KEY_PROVIDERS) as Array<keyof typeof KEY_PROVIDERS>).map((provider) => {
      const meta = KEY_PROVIDERS[provider];
      const row = rows.find((r) => r.label === meta.label);
      return {
        provider,
        label: meta.label,
        configured: Boolean(row?.api_key),
        updatedAt: (row?.updated_at as string | null) ?? null,
      };
    });
  });

export const saveAiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        provider: z.enum(["openai", "google"]),
        apiKey: z.string().min(10).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminRole(context as never);
    const meta = KEY_PROVIDERS[data.provider];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("ai_providers")
      .select("id")
      .eq("label", meta.label)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("ai_providers")
        .update({ api_key: data.apiKey.trim(), updated_at: new Date().toISOString() } as never)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("ai_providers").insert({
        label: meta.label,
        kind: meta.kind,
        base_url: meta.base_url,
        api_key: data.apiKey.trim(),
        models: meta.models,
        enabled: true,
      } as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
