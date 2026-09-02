import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProjectIntegration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("project_integrations")
      .select("supabase_url, supabase_anon_key, updated_at")
      .eq("project_id", data.projectId)
      .maybeSingle();
    return row ?? null;
  });

export const saveProjectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        supabaseUrl: z.string().url().max(300),
        supabaseAnonKey: z.string().min(10).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_integrations").upsert(
      {
        project_id: data.projectId,
        user_id: context.userId,
        supabase_url: data.supabaseUrl.replace(/\/$/, ""),
        supabase_anon_key: data.supabaseAnonKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearProjectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_integrations")
      .delete()
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
