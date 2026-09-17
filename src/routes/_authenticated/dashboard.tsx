import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Plus, Github, Trash2, FolderGit2, Coins } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listProjects, createProject, deleteProject, getMyAccount } from "@/lib/projects.functions";
import {
  getGithubStatus,
  listRepos,
  listRepoTree,
  importRepoFiles,
} from "@/lib/github.functions";
import { getWorkspaceOverview } from "@/lib/workspaces.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your projects — Forge" },
      {
        name: "description",
        content: "All your AI-built projects, GitHub repositories and credit usage in one place.",
      },
      { property: "og:title", content: "Your projects — Forge" },
      { property: "og:description", content: "Manage AI-built projects and GitHub repositories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProjects = useServerFn(listProjects);
  const fetchAccount = useServerFn(getMyAccount);
  const fetchGithub = useServerFn(getGithubStatus);
  const fetchRepos = useServerFn(listRepos);
  const fetchWorkspace = useServerFn(getWorkspaceOverview);
  const create = useServerFn(createProject);
  const remove = useServerFn(deleteProject);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [repo, setRepo] = useState<string>("none");

  // Idea typed on the landing page: open the create dialog pre-filled.
  useEffect(() => {
    const pending = window.localStorage.getItem("forge:pending-prompt");
    if (!pending) return;
    window.localStorage.removeItem("forge:pending-prompt");
    setName(pending.slice(0, 60));
    setOpen(true);
  }, []);

  const projects = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const workspace = useQuery({
    queryKey: ["workspace-overview"],
    queryFn: () => fetchWorkspace(),
    retry: false,
  });
  const github = useQuery({ queryKey: ["github-status"], queryFn: () => fetchGithub() });
  const repos = useQuery({
    queryKey: ["repos"],
    queryFn: () => fetchRepos(),
    enabled: Boolean(github.data?.connected),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const selected = repos.data?.find((r) => r.full_name === repo);
      return create({
        data: {
          name,
          repo_full_name: repo === "none" ? undefined : repo,
          repo_branch: selected?.default_branch ?? "main",
        },
      });
    },
    onSuccess: (project) => {
      setOpen(false);
      setName("");
      setRepo("none");
      void qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/workspace/$projectId", params: { projectId: project.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create project"),
  });

  const tree = useServerFn(listRepoTree);
  const importFiles = useServerFn(importRepoFiles);
  const [importing, setImporting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const importMutation = useMutation({
    mutationFn: async (r: { full_name: string; default_branch: string }) => {
      setImporting(r.full_name);
      const project = await create({
        data: {
          name: r.full_name.split("/")[1] ?? r.full_name,
          repo_full_name: r.full_name,
          repo_branch: r.default_branch || "main",
        },
      });
      const nodes = await tree({
        data: { repo: r.full_name, branch: r.default_branch || "main" },
      });
      const paths = nodes
        .filter((n) => /\.(html|css|js|jsx|ts|tsx|json|md)$/.test(n.path) && n.size < 120000)
        .slice(0, 20)
        .map((n) => n.path);
      if (paths.length) await importFiles({ data: { projectId: project.id, paths } });
      return { project, count: paths.length };
    },
    onSuccess: ({ project, count }) => {
      setImporting(null);
      toast.success(`Imported ${count} file(s). Opening workspace…`);
      void qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/workspace/$projectId", params: { projectId: project.id } });
    },
    onError: (e) => {
      setImporting(null);
      toast.error(e instanceof Error ? e.message : "Import failed");
    },
  });

  const visibleRepos = (repos.data ?? []).filter((r) =>
    r.full_name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader isAdmin={account.data?.isAdmin} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              Workspace
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Projects
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Chat with AI, generate code, preview instantly, push to GitHub.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
              <Coins className="size-4 text-highlight" />
              {account.data?.profile?.credits ?? 0} credits
            </span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" /> New project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a project</DialogTitle>
                  <DialogDescription>
                    Optionally link a GitHub repository so the AI can read and commit code.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="project-name">Project name</Label>
                    <Input
                      id="project-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Coffee shop landing page"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>GitHub repository</Label>
                    {github.data?.connected ? (
                      <Select value={repo} onValueChange={setRepo}>
                        <SelectTrigger>
                          <SelectValue placeholder="No repository" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No repository</SelectItem>
                          {(repos.data ?? []).map((r) => (
                            <SelectItem key={r.full_name} value={r.full_name}>
                              {r.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        <Link to="/settings" className="text-primary hover:underline">
                          Connect GitHub
                        </Link>{" "}
                        to link a repository.
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!name.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating…" : "Create project"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <section aria-label="Workspace overview" className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Workspace
              </p>
              <p className="mt-2 truncate text-lg font-bold tracking-tight">
                {workspace.isPending
                  ? "Loading…"
                  : workspace.isError
                    ? "Unavailable"
                    : (workspace.data?.workspace.name ?? "—")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {workspace.data?.workspace.slug
                  ? `/${workspace.data.workspace.slug}`
                  : "Personal workspace"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Plan
              </p>
              <p className="mt-2 truncate text-lg font-bold tracking-tight">
                {workspace.isPending
                  ? "Loading…"
                  : workspace.isError
                    ? "Unavailable"
                    : (workspace.data?.plan.name ?? "Free")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {workspace.data?.subscription.status === "not_configured"
                  ? "Billing not configured"
                  : (workspace.data?.subscription.status ?? "Billing not configured")}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Members
              </p>
              <p className="mt-2 text-lg font-bold tracking-tight">
                {workspace.isPending
                  ? "Loading…"
                  : workspace.isError
                    ? "Unavailable"
                    : (workspace.data?.members.length ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Active workspace members</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Projects
              </p>
              <p className="mt-2 text-lg font-bold tracking-tight">
                {projects.isPending ? "Loading…" : (projects.data?.length ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">In this workspace</p>
            </div>
          </div>
          {workspace.isError && (
            <p className="mt-3 text-xs text-muted-foreground">
              Workspace details could not be loaded. Projects and repositories below are still
              available.
            </p>
          )}
        </section>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(projects.data ?? []).map((p) => (
            <div
              key={p.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl hover:shadow-primary/15 focus-within:border-primary focus-within:shadow-xl focus-within:shadow-primary/15"
            >
              <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Link
                to="/workspace/$projectId"
                params={{ projectId: p.id }}
                className="block space-y-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface transition-colors duration-300 group-hover:border-primary group-hover:bg-primary/10">
                    <FolderGit2 className="size-4 text-primary" />
                  </span>
                  <h2 className="truncate font-semibold tracking-tight">{p.name}</h2>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {p.repo_full_name ? (
                    <span className="inline-flex items-center gap-1">
                      <Github className="size-3" /> {p.repo_full_name}
                    </span>
                  ) : (
                    "No repository linked"
                  )}
                </p>
              </Link>
              <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(p.updated_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete project ${p.name}`}
                  onClick={async () => {
                    await remove({ data: { id: p.id } });
                    void qc.invalidateQueries({ queryKey: ["projects"] });
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {projects.isSuccess && (projects.data ?? []).length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-sm text-muted-foreground">
              No projects yet. Create your first one to start chatting with the AI.
            </div>
          )}
        </div>

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Github className="size-5 text-primary" /> GitHub repositories
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Import a repository to chat, edit and preview it here.
              </p>
            </div>
            {github.data?.connected && (
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repositories…"
                aria-label="Search repositories"
                className="w-full sm:w-64"
              />
            )}
          </div>

          {!github.data?.connected ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              <Link to="/settings" className="text-primary hover:underline">
                Connect GitHub
              </Link>{" "}
              to see all your repositories here.
            </div>
          ) : repos.isLoading ? (
            <div className="mt-5 rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Loading repositories…
            </div>
          ) : visibleRepos.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              No repositories found.
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRepos.map((r) => (
                <div
                  key={r.full_name}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl hover:shadow-primary/15 focus-within:border-primary focus-within:shadow-xl focus-within:shadow-primary/15"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface transition-colors duration-300 group-hover:border-primary group-hover:bg-primary/10">
                      <Github className="size-4 text-primary" />
                    </span>
                    <h3 className="truncate text-sm font-semibold tracking-tight">
                      {r.full_name}
                    </h3>
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {r.description ?? "No description"}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <span className="text-xs text-muted-foreground">
                      {r.private ? "Private" : "Public"} · {r.default_branch}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={importMutation.isPending}
                      onClick={() =>
                        importMutation.mutate({
                          full_name: r.full_name,
                          default_branch: r.default_branch,
                        })
                      }
                    >
                      {importing === r.full_name ? "Importing…" : "Import & open"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
