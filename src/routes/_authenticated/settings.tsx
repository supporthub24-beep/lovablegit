import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Github,
  ShieldCheck,
  Coins,
  GitBranch,
  FolderGit2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Plug,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getMyAccount } from "@/lib/projects.functions";
import {
  getGithubStatus,
  startGithubConnect,
  completeGithubConnect,
  disconnectGithub,
  listRepos,
} from "@/lib/github.functions";
import { claimAdminRole, adminExists } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — Forge" },
      {
        name: "description",
        content:
          "Connect your GitHub account, choose a repository and branch, and set the permissions the AI workspace may use.",
      },
      { property: "og:title", content: "Account settings — Forge" },
      {
        property: "og:description",
        content: "GitHub connection, repository permissions and AI credit usage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = (event.data as { type?: string })?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        (event.data as { connectorId?: string })?.connectorId !== "github" ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      ) {
        return;
      }
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        const code = (event.data as { code?: string })?.code;
        resolve(typeof code === "string" ? code : null);
        return;
      }
      popup.close();
      reject(new Error("GitHub connection failed."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The connection window was closed before finishing."));
    }, 500);
  });
}

function SettingsPage() {
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchStatus = useServerFn(getGithubStatus);
  const start = useServerFn(startGithubConnect);
  const complete = useServerFn(completeGithubConnect);
  const disconnect = useServerFn(disconnectGithub);
  const fetchRepos = useServerFn(listRepos);
  const claim = useServerFn(claimAdminRole);
  const hasAdmin = useServerFn(adminExists);

  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const status = useQuery({ queryKey: ["github-status"], queryFn: () => fetchStatus() });
  const adminState = useQuery({ queryKey: ["admin-exists"], queryFn: () => hasAdmin() });

  const connected = status.data?.connected === true;
  const configured = status.data?.configured !== false;

  const repos = useQuery({
    queryKey: ["github-repos"],
    queryFn: () => fetchRepos(),
    enabled: connected,
  });

  const [disconnecting, setDisconnecting] = useState(false);

  async function connect() {
    const popup = window.open("", "forge-github-oauth", "width=600,height=720");
    if (!popup) {
      toast.error("Popup blocked. Allow popups and try again.");
      return;
    }
    try {
      const { authorizationUrl } = await start();
      const completion = waitForOAuthCompletion(popup);
      popup.location.href = authorizationUrl;
      const code = await completion;
      if (code) await complete({ data: { code } });
      toast.success("GitHub connected.");
      await qc.invalidateQueries({ queryKey: ["github-status"] });
      await qc.invalidateQueries({ queryKey: ["github-repos"] });
    } catch (error) {
      popup.close();
      toast.error(error instanceof Error ? error.message : "Could not connect GitHub");
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnect();
      await qc.invalidateQueries({ queryKey: ["github-status"] });
      await qc.invalidateQueries({ queryKey: ["github-repos"] });
      toast.success("GitHub disconnected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect GitHub");
    } finally {
      setDisconnecting(false);
    }
  }

  const repoOptions = repos.data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader isAdmin={account.data?.isAdmin} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-medium">
                <Github className="size-4" /> GitHub
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {!configured
                  ? "GitHub is not configured on this platform yet. An administrator needs to set up the GitHub connector."
                  : connected
                    ? `Connected as ${status.data?.account ?? "your GitHub account"}.`
                    : "Connect your GitHub account to import repositories and push AI-generated code."}
              </p>
            </div>
            {configured &&
              (connected ? (
                <Button variant="secondary" onClick={handleDisconnect} disabled={disconnecting}>
                  {disconnecting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                  Disconnect
                </Button>
              ) : (
                <Button onClick={connect}>Connect GitHub</Button>
              ))}
          </div>
        </section>

        {configured && !connected && (
          <section className="rounded-xl border border-dashed border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <Plug className="size-4 text-muted-foreground" /> Repository connection
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your GitHub account first. Once connected you can choose the repository,
              branch and permissions the AI workspace is allowed to use.
            </p>
          </section>
        )}

        {connected && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <FolderGit2 className="size-4" /> Repository
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The AI chat and preview read this repository and branch as their working context.
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-repo">Repository</Label>
                <Input
                  id="github-repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="owner/name"
                  list="github-repo-options"
                  autoComplete="off"
                />
                <datalist id="github-repo-options">
                  {repoOptions.map((r) => (
                    <option key={r.full_name} value={r.full_name}>
                      {r.private ? "Private" : "Public"} · default branch {r.default_branch}
                    </option>
                  ))}
                </datalist>
                {repos.isPending && (
                  <p className="text-xs text-muted-foreground">Loading your repositories…</p>
                )}
                {repos.isError && (
                  <p className="text-xs text-destructive">
                    Could not load your repositories. You can still type the owner/name manually.
                  </p>
                )}
                {!repos.isPending && !repos.isError && repoOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No repositories were returned for this account. Type the owner/name manually.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="github-branch">Branch</Label>
                <Input
                  id="github-branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  autoComplete="off"
                />
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <GitBranch className="size-3" aria-hidden="true" />
                  Commits and file reads use this branch.
                </p>
              </div>

              <fieldset className="space-y-3 rounded-lg border border-border p-4">
                <legend className="px-1 text-sm font-medium">Permissions</legend>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="perm-read" className="font-normal">
                      Read files
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Let the AI read files from the connected repository.
                    </p>
                  </div>
                  <Switch
                    id="perm-read"
                    checked={canRead}
                    onCheckedChange={setCanRead}
                    aria-label="Allow reading files"
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="perm-write" className="font-normal">
                      Write files
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Let the AI push generated files to the branch.
                    </p>
                  </div>
                  <Switch
                    id="perm-write"
                    checked={canWrite}
                    onCheckedChange={setCanWrite}
                    aria-label="Allow writing files"
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="perm-pr" className="font-normal">
                      Open pull requests
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Let the AI propose changes as a pull request instead of a direct commit.
                    </p>
                  </div>
                  <Switch
                    id="perm-pr"
                    checked={canOpenPr}
                    onCheckedChange={setCanOpenPr}
                    aria-label="Allow opening pull requests"
                  />
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                  Save connection
                </Button>
                {connection.data && (
                  <Button variant="ghost" onClick={handleRemoveConnection} disabled={saving}>
                    Remove connection
                  </Button>
                )}
                {connection.data && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
                    Saved for this workspace
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-medium">
            <Coins className="size-4 text-highlight" /> AI credits
          </h2>
          <p className="mt-1 text-3xl font-semibold">{account.data?.profile?.credits ?? 0}</p>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {(account.data?.usage ?? []).slice(0, 8).map((u, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {u.kind} · {u.model}
                </span>
                <span>-{u.credits}</span>
              </li>
            ))}
            {(account.data?.usage ?? []).length === 0 && <li>No usage yet.</li>}
          </ul>
        </section>

        {!adminState.data?.exists && (
          <section className="rounded-xl border border-highlight/40 bg-card p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <ShieldCheck className="size-4 text-highlight" /> Platform setup
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No administrator has been assigned yet. Claim the admin role to configure AI models,
              features and customer limits.
            </p>
            <Button
              className="mt-4"
              onClick={async () => {
                try {
                  await claim();
                  toast.success("You are now an administrator.");
                  await qc.invalidateQueries();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not claim admin");
                }
              }}
            >
              Become administrator
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
