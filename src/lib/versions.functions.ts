import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { GeneratedFile } from "./codegen";

export const listVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_versions")
      .select("id, label, created_at, files")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      created_at: r.created_at,
      fileCount: Array.isArray(r.files) ? r.files.length : 0,
    }));
  });

export const restoreVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), versionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: version } = await context.supabase
      .from("project_versions")
      .select("id, label, files")
      .eq("id", data.versionId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (!version) throw new Error("Version not found");

    // Snapshot the current state first so a rollback is itself reversible.
    const { data: current } = await context.supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId);
    await context.supabase.from("project_versions").insert({
      project_id: data.projectId,
      user_id: context.userId,
      label: "Before rollback",
      files: (current ?? []) as unknown as never,
    });

    const files = (version.files ?? []) as unknown as GeneratedFile[];
    await context.supabase.from("project_files").delete().eq("project_id", data.projectId);
    if (files.length) {
      const { error } = await context.supabase.from("project_files").insert(
        files.map((f) => ({
          project_id: data.projectId,
          user_id: context.userId,
          path: f.path,
          content: f.content,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true, restored: files.length };
  });

export const deleteVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ versionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_versions")
      .delete()
      .eq("id", data.versionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
