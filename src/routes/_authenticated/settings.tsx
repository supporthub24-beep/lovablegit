import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Github, ShieldCheck, Coins } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { getMyAccount } from "@/lib/projects.functions";
import {
  getGithubStatus,
  startGithubConnect,
  completeGithubConnect,
  disconnectGithub,
} from "@/lib/github.functions";
import { claimAdminRole, adminExists } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — Forge" },
      {
        name: "description",
        content: "Connect or disconnect your GitHub account and review your AI credit usage.",
      },
      { property: "og:title", content: "Account settings — Forge" },
      { property: "og:description", content: "GitHub connection and AI credit usage." },
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
  const claim = useServerFn(claimAdminRole);
  const hasAdmin = useServerFn(adminExists);

  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const status = useQuery({ queryKey: ["github-status"], queryFn: () => fetchStatus() });
  const adminState = useQuery({ queryKey: ["admin-exists"], queryFn: () => hasAdmin() });

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
    } catch (error) {
      popup.close();
      toast.error(error instanceof Error ? error.message : "Could not connect GitHub");
    }
  }

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
                {status.data?.configured === false
                  ? "GitHub is not configured on this platform yet. An administrator needs to set up the GitHub connector."
                  : status.data?.connected
                    ? `Connected as ${status.data.account ?? "your GitHub account"}.`
                    : "Connect your GitHub account to import repositories and push AI-generated code."}
              </p>
            </div>
            {status.data?.configured &&
              (status.data.connected ? (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await disconnect();
                    await qc.invalidateQueries({ queryKey: ["github-status"] });
                    toast.success("GitHub disconnected.");
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button onClick={connect}>Connect GitHub</Button>
              ))}
          </div>
        </section>

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
