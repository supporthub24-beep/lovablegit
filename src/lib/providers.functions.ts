import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULT_BASE_URL: Record<string, string> = {
  openai_compatible: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
};

async function assertAdmin(context: { supabase: { from: (t: string) => never }; userId: string }) {
  const { data: roles } = await (context.supabase as never as {
    from: (t: string) => {
      select: (c: string) => { eq: (a: string, b: string) => Promise<{ data: { role: string }[] | null }> };
    };
  })
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin access required.");
}

/** Models every signed-in customer can pick from (no secrets exposed). */
export const listChatModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: providers }, { data: settings }] = await Promise.all([
      supabaseAdmin
        .from("ai_providers")
        .select("id, label, kind, models, enabled")
        .eq("enabled", true)
        .order("created_at"),
      supabaseAdmin.from("platform_settings").select("key, value").eq("key", "models").maybeSingle(),
    ]);

    const configuredChat = (settings?.value as { chat?: string } | null)?.chat?.trim();

    const options: { id: string; label: string; group: string }[] = [];

    // The admin-configured default chat model is the single source of truth.
    // Only surface it when the administrator has actually saved one.
    if (configuredChat) {
      options.push({
        id: `gateway::${configuredChat}`,
        label: `${configuredChat} (default)`,
        group: "Built-in AI",
      });
    }

    for (const p of providers ?? []) {
      for (const m of (p.models ?? []) as string[]) {
        options.push({ id: `${p.id}::${m}`, label: `${m}`, group: p.label });
      }
    }

    return { options, defaultId: options[0]?.id ?? "" };
  });

export const listAiProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_providers")
      .select("id, label, kind, base_url, models, enabled, created_at")
      .order("created_at");
    return data ?? [];
  });

export const saveAiProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        label: z.string().min(1).max(60),
        kind: z.enum(["openai_compatible", "anthropic", "google"]),
        base_url: z.string().optional(),
        api_key: z.string().optional(),
        models: z.string(),
        enabled: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const models = data.models
      .split(/[\n,]/)
      .map((m) => m.trim())
      .filter(Boolean);
    const base_url = (data.base_url?.trim() || DEFAULT_BASE_URL[data.kind]) as string;

    if (data.id) {
      const patch: Record<string, unknown> = {
        label: data.label,
        kind: data.kind,
        base_url,
        models,
        enabled: data.enabled,
        updated_at: new Date().toISOString(),
      };
      if (data.api_key?.trim()) patch['api_key'] = data.api_key.trim();
      const { error } = await supabaseAdmin.from("ai_providers").update(patch as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    if (!data.api_key?.trim()) throw new Error("An API key is required for a new provider.");
    const { data: row, error } = await supabaseAdmin
      .from("ai_providers")
      .insert({
        label: data.label,
        kind: data.kind,
        base_url,
        api_key: data.api_key.trim(),
        models,
        enabled: data.enabled,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteAiProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_providers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
