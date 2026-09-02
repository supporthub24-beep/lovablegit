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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Chat with AI, generate code, preview instantly, push to GitHub.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
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

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(projects.data ?? []).map((p) => (
            <div
              key={p.id}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
            >
              <Link
                to="/workspace/$projectId"
                params={{ projectId: p.id }}
                className="block space-y-2"
              >
                <div className="flex items-center gap-2">
                  <FolderGit2 className="size-4 text-primary" />
                  <h2 className="truncate font-medium">{p.name}</h2>
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
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(p.updated_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
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
            <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No projects yet. Create your first one to start chatting with the AI.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
