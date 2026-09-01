import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "github";
const GITHUB_SCOPES = ["read:user", "repo"];

function clientKey(): string | null {
  return process.env["GITHUB_APP_USER_CONNECTOR_CLIENT_API_KEY"] ?? null;
}

export const getGithubStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!clientKey()) return { configured: false, connected: false, account: null as string | null };
    const { getConnectionMetaForUser } = await import("@/server/appUserConnections.server");
    const meta = await getConnectionMetaForUser(context.userId, CONNECTOR_ID);
    return { configured: true, connected: Boolean(meta), account: meta?.account_label ?? null };
  });

export const startGithubConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = clientKey();
    if (!key) throw new Error("GitHub integration is not configured by the administrator yet.");

    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");

    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    const url = new URL(request.url);
    const sandboxHost =
      url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/github/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const existing = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: key,
      returnUrl,
      ...(existing ? { connectionAPIKey: existing } : {}),
      credentialsConfiguration: { scopes: GITHUB_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeGithubConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode, callAsAppUser } = await import(
      "@/integrations/lovable/appUserConnector"
    );
    const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");

    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== CONNECTOR_ID) throw new Error("OAuth returned the wrong connector");

    let login: string | undefined;
    try {
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey,
        connectorId: CONNECTOR_ID,
        path: "/user",
        init: { headers: { Accept: "application/vnd.github+json" } },
      });
      if (res.ok) login = ((await res.json()) as { login?: string }).login;
    } catch {
      // account label is optional
    }

    await saveConnectionKeyForUser(context.userId, CONNECTOR_ID, connectionAPIKey, login);
    return { ok: true, account: login ?? null };
  });

export const disconnectGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import(
      "@/server/appUserConnections.server"
    );
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (key) {
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: CONNECTOR_ID,
        });
      } catch {
        // still drop the local record
      }
    }
    await deleteConnectionForUser(context.userId, CONNECTOR_ID);
    return { ok: true };
  });

async function githubFetch(userId: string, path: string, init?: RequestInit) {
  const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
  const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
  const key = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (!key) throw new Error("GitHub is not connected for this account.");
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey: key,
    connectorId: CONNECTOR_ID,
    path,
    init: {
      ...init,
      headers: { Accept: "application/vnd.github+json", ...(init?.headers ?? {}) },
    },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`GitHub request failed [${res.status}]: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

export const listRepos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const repos = (await githubFetch(
      context.userId,
      "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator",
    )) as Array<{
      full_name: string;
      description: string | null;
      default_branch: string;
      private: boolean;
      updated_at: string;
    }>;
    return repos.map((r) => ({
      full_name: r.full_name,
      description: r.description,
      default_branch: r.default_branch,
      private: r.private,
      updated_at: r.updated_at,
    }));
  });

export const listRepoTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ repo: z.string().min(3), branch: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tree = (await githubFetch(
      context.userId,
      `/repos/${data.repo}/git/trees/${encodeURIComponent(data.branch)}?recursive=1`,
    )) as { tree?: Array<{ path: string; type: string; size?: number }> };
    return (tree.tree ?? [])
      .filter((n) => n.type === "blob")
      .slice(0, 400)
      .map((n) => ({ path: n.path, size: n.size ?? 0 }));
  });

export const readRepoFile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ repo: z.string().min(3), branch: z.string().min(1), path: z.string().min(1) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const file = (await githubFetch(
      context.userId,
      `/repos/${data.repo}/contents/${data.path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(data.branch)}`,
    )) as { content?: string; encoding?: string; sha?: string };
    const content =
      file.content && file.encoding === "base64"
        ? Buffer.from(file.content, "base64").toString("utf8")
        : "";
    return { path: data.path, content, sha: file.sha ?? null };
  });

export const createRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(100),
        description: z.string().max(300).optional(),
        isPrivate: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const repo = (await githubFetch(context.userId, "/user/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        description: data.description ?? "Created with the AI development platform",
        private: data.isPrivate,
        auto_init: true,
      }),
    })) as { full_name: string; default_branch: string };
    return { full_name: repo.full_name, default_branch: repo.default_branch ?? "main" };
  });

export const pushProjectToGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        message: z.string().min(1).max(200).default("Update from AI platform"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase
      .from("projects")
      .select("repo_full_name, repo_branch")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project?.repo_full_name) throw new Error("This project has no GitHub repository linked.");

    const { data: files } = await context.supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId);
    if (!files?.length) throw new Error("There are no generated files to push yet.");

    const repo = project.repo_full_name;
    const branch = project.repo_branch || "main";
    const pushed: string[] = [];

    for (const file of files) {
      let sha: string | undefined;
      try {
        const existing = (await githubFetch(
          context.userId,
          `/repos/${repo}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`,
        )) as { sha?: string };
        sha = existing?.sha;
      } catch {
        sha = undefined;
      }
      await githubFetch(
        context.userId,
        `/repos/${repo}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `${data.message}: ${file.path}`,
            content: Buffer.from(file.content, "utf8").toString("base64"),
            branch,
            ...(sha ? { sha } : {}),
          }),
        },
      );
      pushed.push(file.path);
    }
    return { pushed };
  });

export const importRepoFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), paths: z.array(z.string()).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase
      .from("projects")
      .select("repo_full_name, repo_branch")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project?.repo_full_name) throw new Error("This project has no GitHub repository linked.");

    const rows: Array<{ project_id: string; user_id: string; path: string; content: string }> = [];
    for (const path of data.paths) {
      const file = (await githubFetch(
        context.userId,
        `/repos/${project.repo_full_name}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(project.repo_branch || "main")}`,
      )) as { content?: string; encoding?: string };
      const content =
        file.content && file.encoding === "base64"
          ? Buffer.from(file.content, "base64").toString("utf8")
          : "";
      rows.push({ project_id: data.projectId, user_id: context.userId, path, content });
    }
    if (rows.length) {
      const { error } = await context.supabase
        .from("project_files")
        .upsert(rows, { onConflict: "project_id,path" });
      if (error) throw new Error(error.message);
    }
    return { imported: rows.map((r) => r.path) };
  });
