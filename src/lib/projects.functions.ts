import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [project, files, messages] = await Promise.all([
      context.supabase.from("projects").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("project_files")
        .select("path, content")
        .eq("project_id", data.id)
        .order("path"),
      context.supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("project_id", data.id)
        .order("created_at"),
    ]);
    if (!project.data) throw new Error("Project not found");
    return {
      project: project.data,
      files: files.data ?? [],
      messages: messages.data ?? [],
    };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(80),
        description: z.string().max(400).optional(),
        repo_full_name: z.string().max(200).optional(),
        repo_branch: z.string().max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        repo_full_name: data.repo_full_name ?? null,
        repo_branch: data.repo_branch || "main",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles, usage] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase
        .from("usage_events")
        .select("kind, credits, model, created_at")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    return {
      profile: profile.data,
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      usage: usage.data ?? [],
    };
  });

export const getConnectedProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, repo_full_name, repo_branch, updated_at, status")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

// ---------------------------------------------------------------------------
// Project file store — the single source of truth shared by the workspace
// shell, the code editor and the live preview. Mirrors bolt.diy's file-action
// model: create / update / delete actions applied atomically to project_files.
// ---------------------------------------------------------------------------

export type ProjectFile = { path: string; content: string };

export type FileAction =
  | { type: "create"; path: string; content: string }
  | { type: "update"; path: string; content: string }
  | { type: "delete"; path: string };

const filePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(400)
  .refine((value) => !value.startsWith("/") && !value.includes(".."), {
    message: "File paths must be relative and cannot traverse directories.",
  });

const fileActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), path: filePathSchema, content: z.string() }),
  z.object({ type: z.literal("update"), path: filePathSchema, content: z.string() }),
  z.object({ type: z.literal("delete"), path: filePathSchema }),
]);

/** Reads the full file set for a project — the workspace's source of truth. */
export const listProjectFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ProjectFile[]> => {
    const { data: rows, error } = await context.supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId)
      .order("path");
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProjectFile[];
  });

/**
 * Applies a batch of file actions (create / update / delete) to the project
 * file store. Snapshots the previous state into project_versions first so the
 * change can be rolled back, then returns the resulting file set.
 */
export const applyFileActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        label: z.string().max(120).optional(),
        actions: z.array(fileActionSchema).min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as SupabaseClient<any>;

    const { data: existing, error: readError } = await supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId);
    if (readError) throw new Error(readError.message);

    const before = (existing ?? []) as ProjectFile[];

    await supabase.from("project_versions").insert({
      project_id: data.projectId,
      user_id: context.userId,
      label: data.label ?? "File actions",
      files: before as unknown as never,
    });

    const upserts = data.actions
      .filter((action): action is Extract<FileAction, { content: string }> => action.type !== "delete")
      .map((action) => ({
        project_id: data.projectId,
        user_id: context.userId,
        path: action.path,
        content: action.content,
        updated_at: new Date().toISOString(),
      }));

    if (upserts.length) {
      const { error } = await supabase
        .from("project_files")
        .upsert(upserts, { onConflict: "project_id,path" });
      if (error) throw new Error(error.message);
    }

    const deletions = data.actions
      .filter((action): action is Extract<FileAction, { type: "delete" }> => action.type === "delete")
      .map((action) => action.path);

    if (deletions.length) {
      const { error } = await supabase
        .from("project_files")
        .delete()
        .eq("project_id", data.projectId)
        .in("path", deletions);
      if (error) throw new Error(error.message);
    }

    const { data: rows, error: afterError } = await supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId)
      .order("path");
    if (afterError) throw new Error(afterError.message);

    return {
      files: (rows ?? []) as ProjectFile[],
      applied: data.actions.map((action) => ({ type: action.type, path: action.path })),
    };
  });

/** Writes a single file (used by the editor's save action). */
export const saveProjectFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        path: filePathSchema,
        content: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as SupabaseClient<any>;
    const { error } = await supabase.from("project_files").upsert(
      {
        project_id: data.projectId,
        user_id: context.userId,
        path: data.path,
        content: data.content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, path: data.path };
  });

/** Deletes a single file from the project store. */
export const deleteProjectFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), path: filePathSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_files")
      .delete()
      .eq("project_id", data.projectId)
      .eq("path", data.path);
    if (error) throw new Error(error.message);
    return { ok: true, path: data.path };
  });

/** Lists the saved snapshots for a project so the user can roll back. */
export const listProjectVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_versions")
      .select("id, label, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Restores a snapshot back into the project file store. */
export const restoreProjectVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ versionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as SupabaseClient<any>;

    const { data: version, error: versionError } = await supabase
      .from("project_versions")
      .select("id, project_id, files")
      .eq("id", data.versionId)
      .maybeSingle();
    if (versionError) throw new Error(versionError.message);
    if (!version) throw new Error("That version could not be found.");

    const snapshot = (version.files ?? []) as ProjectFile[];

    const { data: current } = await supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", version.project_id);

    await supabase.from("project_versions").insert({
      project_id: version.project_id,
      user_id: context.userId,
      label: "Before restore",
      files: (current ?? []) as unknown as never,
    });

    const { error: clearError } = await supabase
      .from("project_files")
      .delete()
      .eq("project_id", version.project_id);
    if (clearError) throw new Error(clearError.message);

    if (snapshot.length) {
      const { error } = await supabase.from("project_files").insert(
        snapshot.map((file) => ({
          project_id: version.project_id,
          user_id: context.userId,
          path: file.path,
          content: file.content,
          updated_at: new Date().toISOString(),
        })),
      );
      if (error) throw new Error(error.message);
    }

    return { ok: true, files: snapshot };
  });
