import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseAiResponse, type GeneratedFile } from "@/lib/codegen";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";

const workspaceRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters").max(80),
});

const inviteMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().trim().email("Enter a valid email address"),
  role: workspaceRoleSchema.default("member"),
});

const updateMemberSchema = z.object({
  memberId: z.string().uuid(),
  role: workspaceRoleSchema.optional(),
  status: z.enum(["active", "invited", "suspended"]).optional(),
});

const removeMemberSchema = z.object({
  memberId: z.string().uuid(),
});

const workspaceIdSchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "invited" | "suspended";
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    email: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type WorkspaceOverview = {
  workspace: WorkspaceSummary;
  plan: {
    id: string | null;
    name: string;
    slug: string;
    monthly_price_cents: number;
    currency: string;
    limits: Record<string, string | number | boolean | null>;
    features: Record<string, string | number | boolean | null>;
  };
  subscription: {
    id: string | null;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  };
  usage: {
    messages_used: number;
    projects_used: number;
    members_used: number;
    period_start: string | null;
    period_end: string | null;
  };
  members: WorkspaceMemberRow[];
  role: "owner" | "admin" | "member" | "viewer";
  isAdmin: boolean;
};

/**
 * Ensures the signed-in user has a profile row and a personal workspace.
 * Idempotent: safe to call on every dashboard load.
 */
export const ensureWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  const { supabase: authenticatedSupabase, userId, claims } = context;
  const supabase = authenticatedSupabase as SupabaseClient<any>;

  const email = typeof claims?.email === "string" ? claims.email : null;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("profiles").insert({
      id: userId,
      email,
      display_name: email ? (email.split("@")[0] ?? null) : null,
      credits: 0,
    });
  }

  const { data: owned } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned) return { workspaceId: owned.id as string };

  const baseName = email ? `${email.split("@")[0]}'s workspace` : "Personal workspace";
  const slug = `${slugify(baseName)}-${userId.slice(0, 8)}`;

  const { data: created, error } = await supabase
    .from("workspaces")
    .insert({ name: baseName, slug, owner_id: userId })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Could not create workspace");
  }

  await supabase.from("workspace_members").insert({
    workspace_id: created.id,
    user_id: userId,
    role: "owner",
    status: "active",
  });

  return { workspaceId: created.id as string };
  });

export const getWorkspaceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workspaceIdSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<WorkspaceOverview> => {
    const { supabase: authenticatedSupabase, userId } = context;
    const supabase = authenticatedSupabase as SupabaseClient<any>;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    let workspaceQuery = supabase
      .from("workspaces")
      .select("id, name, slug, owner_id, plan_id, status, created_at, updated_at")
      .order("created_at", { ascending: true })
      .limit(1);

    if (data.workspaceId) workspaceQuery = workspaceQuery.eq("id", data.workspaceId);

    const { data: workspace, error: workspaceError } = await workspaceQuery.maybeSingle();

    if (workspaceError) throw new Error(workspaceError.message);
    if (!workspace) throw new Error("No workspace found for this account");

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .maybeSingle();

    const role =
      workspace.owner_id === userId
        ? ("owner" as const)
        : ((membership?.role as WorkspaceOverview["role"] | undefined) ?? "viewer");

    const { data: planRow } = workspace.plan_id
      ? await supabase
          .from("plans")
          .select("id, name, slug, monthly_price_cents, currency, limits_json, features_json")
          .eq("id", workspace.plan_id)
          .maybeSingle()
      : await supabase
          .from("plans")
          .select("id, name, slug, monthly_price_cents, currency, limits_json, features_json")
          .eq("slug", "free")
          .maybeSingle();

    const { data: subscriptionRow } = await supabase
      .from("subscriptions")
      .select("id, status, current_period_end, cancel_at_period_end")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: memberRows } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, user_id, role, status, created_at, updated_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true });

    const { data: usageRow } = await supabase
      .from("workspace_usage")
      .select("messages_used, projects_used, members_used, period_start, period_end")
      .eq("workspace_id", workspace.id)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: projectCount } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id);

    const memberIds = (memberRows ?? []).map((m: { user_id: string }) => m.user_id);
    const { data: profileRows } = memberIds.length
      ? await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .in("id", memberIds)
      : { data: [] as { id: string; email: string | null; display_name: string | null; avatar_url: string | null }[] };

    const profileById = new Map(
      (profileRows ?? []).map(
        (p: { id: string; email: string | null; display_name: string | null; avatar_url: string | null }) => [p.id, p],
      ),
    );

    const members: WorkspaceMemberRow[] = (memberRows ?? []).map((m: {
      id: string;
      workspace_id: string;
      user_id: string;
      role: string;
      status: string;
      created_at: string;
      updated_at: string;
    }) => ({
      id: m.id,
      workspace_id: m.workspace_id,
      user_id: m.user_id,
      role: m.role as WorkspaceMemberRow["role"],
      status: m.status as WorkspaceMemberRow["status"],
      created_at: m.created_at,
      updated_at: m.updated_at,
      profile: profileById.get(m.user_id) ?? null,
    }));

    return {
      workspace: workspace as WorkspaceSummary,
      plan: {
        id: planRow?.id ?? null,
        name: planRow?.name ?? "Free",
        slug: planRow?.slug ?? "free",
        monthly_price_cents: planRow?.monthly_price_cents ?? 0,
        currency: planRow?.currency ?? "usd",
        limits:
          (planRow?.limits_json as Record<string, string | number | boolean | null> | null) ?? {},
        features:
          (planRow?.features_json as Record<string, string | number | boolean | null> | null) ?? {},
      },
      subscription: {
        id: subscriptionRow?.id ?? null,
        status: subscriptionRow?.status ?? "not_configured",
        current_period_end: subscriptionRow?.current_period_end ?? null,
        cancel_at_period_end: subscriptionRow?.cancel_at_period_end ?? false,
      },
      usage: {
        messages_used: usageRow?.messages_used ?? 0,
        projects_used: usageRow?.projects_used ?? projectCount ?? 0,
        members_used: usageRow?.members_used ?? members.length,
        period_start: usageRow?.period_start ?? null,
        period_end: usageRow?.period_end ?? null,
      },
      members,
      role,
      isAdmin: Boolean(isAdmin),
    };
  });

export const createWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createWorkspaceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: authenticatedSupabase, userId } = context;
    const supabase = authenticatedSupabase as SupabaseClient<any>;

    const slug = `${slugify(data.name)}-${userId.slice(0, 8)}`;

    const { data: created, error } = await supabase
      .from("workspaces")
      .insert({ name: data.name, slug, owner_id: userId })
      .select("id, name, slug, owner_id, plan_id, status, created_at, updated_at")
      .single();

    if (error || !created) throw new Error(error?.message ?? "Could not create workspace");

    await supabase.from("workspace_members").insert({
      workspace_id: created.id,
      user_id: userId,
      role: "owner",
      status: "active",
    });

    return created as WorkspaceSummary;
  });

export const inviteWorkspaceMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: authenticatedSupabase, userId } = context;
    const supabase = authenticatedSupabase as SupabaseClient<any>;

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", data.workspaceId)
      .maybeSingle();

    if (!workspace) throw new Error("Workspace not found");

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role, status")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    const canManage =
      workspace.owner_id === userId ||
      (membership?.status === "active" &&
        (membership.role === "owner" || membership.role === "admin"));

    if (!canManage) throw new Error("You do not have permission to invite members");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (!profile) {
      throw new Error(
        "No Forge account uses that email yet. Ask them to sign up first, then invite them.",
      );
    }

    const { data: existing } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existing) throw new Error("That person is already a member of this workspace");

    const { data: created, error } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: data.workspaceId,
        user_id: profile.id,
        role: data.role,
        status: "invited",
      })
      .select("id, workspace_id, user_id, role, status, created_at, updated_at")
      .single();

    if (error || !created) throw new Error(error?.message ?? "Could not invite member");

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      workspace_id: data.workspaceId,
      action: "workspace.member.invited",
      target_type: "workspace_member",
      target_id: created.id,
      metadata_json: { role: data.role },
    });

    return created;
  });

export const updateWorkspaceMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: authenticatedSupabase, userId } = context;
    const supabase = authenticatedSupabase as SupabaseClient<any>;

    const { data: member } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, user_id, role")
      .eq("id", data.memberId)
      .maybeSingle();

    if (!member) throw new Error("Member not found");

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", member.workspace_id)
      .maybeSingle();

    if (!workspace) throw new Error("Workspace not found");

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role, status")
      .eq("workspace_id", member.workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    const canManage =
      workspace.owner_id === userId ||
      (membership?.status === "active" &&
        (membership.role === "owner" || membership.role === "admin"));

    if (!canManage) throw new Error("You do not have permission to manage members");

    if (member.user_id === workspace.owner_id && data.role && data.role !== "owner") {
      throw new Error("The workspace owner must keep the owner role");
    }

    const patch: { role?: string; status?: string } = {};
    if (data.role) patch.role = data.role;
    if (data.status) patch.status = data.status;

    if (Object.keys(patch).length === 0) throw new Error("Nothing to update");

    const { data: updated, error } = await supabase
      .from("workspace_members")
      .update(patch)
      .eq("id", data.memberId)
      .select("id, workspace_id, user_id, role, status, created_at, updated_at")
      .single();

    if (error || !updated) throw new Error(error?.message ?? "Could not update member");

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      workspace_id: member.workspace_id,
      action: "workspace.member.updated",
      target_type: "workspace_member",
      target_id: member.id,
      metadata_json: patch,
    });

    return updated;
  });

export const removeWorkspaceMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: authenticatedSupabase, userId } = context;
    const supabase = authenticatedSupabase as SupabaseClient<any>;

    const { data: member } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, user_id")
      .eq("id", data.memberId)
      .maybeSingle();

    if (!member) throw new Error("Member not found");

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", member.workspace_id)
      .maybeSingle();

    if (!workspace) throw new Error("Workspace not found");

    if (member.user_id === workspace.owner_id) {
      throw new Error("The workspace owner cannot be removed");
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role, status")
      .eq("workspace_id", member.workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    const canManage =
      workspace.owner_id === userId ||
      (membership?.status === "active" &&
        (membership.role === "owner" || membership.role === "admin"));

    if (!canManage) throw new Error("You do not have permission to remove members");

    const { error } = await supabase.from("workspace_members").delete().eq("id", data.memberId);

    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      workspace_id: member.workspace_id,
      action: "workspace.member.removed",
      target_type: "workspace_member",
      target_id: member.id,
      metadata_json: {},
    });

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Project file store — the single source of truth shared by the workspace
// shell, the code editor and the live preview.
// ---------------------------------------------------------------------------

const projectIdSchema = z.object({ projectId: z.string().uuid() });

const writeFilesSchema = z.object({
  projectId: z.string().uuid(),
  files: z
    .array(
      z.object({
        path: z.string().trim().min(1).max(400),
        content: z.string().max(400_000),
      }),
    )
    .min(1)
    .max(60),
  label: z.string().trim().max(120).optional(),
});

const deleteFileSchema = z.object({
  projectId: z.string().uuid(),
  path: z.string().trim().min(1).max(400),
});

const applyActionsSchema = z.object({
  projectId: z.string().uuid(),
  raw: z.string().min(1).max(400_000),
  label: z.string().trim().max(120).optional(),
});

export type ProjectFileRow = { path: string; content: string };

export type FileAction =
  | { kind: "create" | "update"; path: string; content: string }
  | { kind: "delete"; path: string };

/**
 * Normalises a path coming from the model or the editor so the same file is
 * never stored twice under "./src/App.tsx" and "src/App.tsx".
 */
export function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/^\.?\//, "")
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/");
}

/**
 * Turns a raw model response into concrete file actions. `<lov-file>` blocks
 * become create/update actions; `<lov-delete path="…" />` blocks become
 * delete actions. This is the artifact/file-action layer of the workspace.
 */
export function parseFileActions(raw: string): { message: string; actions: FileAction[] } {
  const { message, files } = parseAiResponse(raw);
  const actions: FileAction[] = files.map((file: GeneratedFile) => ({
    kind: "update" as const,
    path: normalizePath(file.path),
    content: file.content,
  }));

  const deleteRe = /<lov-delete\s+path="([^"]+)"\s*\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = deleteRe.exec(raw)) !== null) {
    const path = normalizePath(match[1] ?? "");
    if (path) actions.push({ kind: "delete", path });
  }

  return { message, actions };
}

async function assertProjectAccess(
  supabase: SupabaseClient<any>,
  projectId: string,
  userId: string,
) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("Project not found");
  if (project.user_id !== userId) throw new Error("You do not have access to this project");
  return project as { id: string; user_id: string };
}

/** Reads every file of a project — the workspace's source of truth. */
export const listProjectFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<ProjectFileRow[]> => {
    const supabase = context.supabase as SupabaseClient<any>;
    await assertProjectAccess(supabase, data.projectId, context.userId);
    const { data: rows, error } = await supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId)
      .order("path");
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProjectFileRow[];
  });

/**
 * Applies a batch of file actions to the project store. A version snapshot is
 * taken before the write so the change can be rolled back from History.
 */
export const applyFileActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => applyActionsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as SupabaseClient<any>;
    await assertProjectAccess(supabase, data.projectId, context.userId);

    const { message, actions } = parseFileActions(data.raw);
    if (actions.length === 0) {
      return { message, changedFiles: [] as string[], deletedFiles: [] as string[] };
    }

    const { data: existing } = await supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId);

    await supabase.from("project_versions").insert({
      project_id: data.projectId,
      user_id: context.userId,
      label: (data.label ?? message).slice(0, 80),
      files: (existing ?? []) as unknown as never,
    });

    const writes = actions.filter(
      (action): action is Extract<FileAction, { kind: "create" | "update" }> =>
        action.kind !== "delete",
    );
    const deletes = actions.filter(
      (action): action is Extract<FileAction, { kind: "delete" }> => action.kind === "delete",
    );

    if (writes.length) {
      const { error } = await supabase.from("project_files").upsert(
        writes.map((file) => ({
          project_id: data.projectId,
          user_id: context.userId,
          path: file.path,
          content: file.content,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "project_id,path" },
      );
      if (error) throw new Error(error.message);
    }

    if (deletes.length) {
      const { error } = await supabase
        .from("project_files")
        .delete()
        .eq("project_id", data.projectId)
        .in(
          "path",
          deletes.map((file) => file.path),
        );
      if (error) throw new Error(error.message);
    }

    return {
      message,
      changedFiles: writes.map((file) => file.path),
      deletedFiles: deletes.map((file) => file.path),
    };
  });

/** Writes one or more files directly (editor saves, imports, scaffolding). */
export const writeProjectFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => writeFilesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as SupabaseClient<any>;
    await assertProjectAccess(supabase, data.projectId, context.userId);

    const files = data.files.map((file) => ({
      path: normalizePath(file.path),
      content: file.content,
    }));

    const { data: existing } = await supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId);

    await supabase.from("project_versions").insert({
      project_id: data.projectId,
      user_id: context.userId,
      label: (data.label ?? "Manual file edit").slice(0, 80),
      files: (existing ?? []) as unknown as never,
    });

    const { error } = await supabase.from("project_files").upsert(
      files.map((file) => ({
        project_id: data.projectId,
        user_id: context.userId,
        path: file.path,
        content: file.content,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "project_id,path" },
    );
    if (error) throw new Error(error.message);

    return { changedFiles: files.map((file) => file.path) };
  });

/** Deletes a single file from the project store. */
export const deleteProjectFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteFileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as SupabaseClient<any>;
    await assertProjectAccess(supabase, data.projectId, context.userId);

    const path = normalizePath(data.path);
    const { data: existing } = await supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId);

    await supabase.from("project_versions").insert({
      project_id: data.projectId,
      user_id: context.userId,
      label: `Delete ${path}`.slice(0, 80),
      files: (existing ?? []) as unknown as never,
    });

    const { error } = await supabase
      .from("project_files")
      .delete()
      .eq("project_id", data.projectId)
      .eq("path", path);
    if (error) throw new Error(error.message);

    return { ok: true, path };
  });
