import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Github,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileX2,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { CodePanel } from "@/components/CodePanel";
import { AssetPanel } from "@/components/AssetPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { DataPanel } from "@/components/DataPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { getProject, getMyAccount } from "@/lib/projects.functions";
import { sendChatMessage, generateAsset, listAssets } from "@/lib/ai.functions";
import { pushProjectToGithub, listRepoTree, importRepoFiles } from "@/lib/github.functions";
import { getProjectIntegration } from "@/lib/integrations.functions";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated/workspace/$projectId")({
  head: () => ({
    meta: [
      { title: "Workspace — Forge" },
      {
        name: "description",
        content:
          "AI chat, live preview and generated code side by side for your GitHub-connected project.",
      },
      { property: "og:title", content: "Workspace — Forge" },
      { property: "og:description", content: "AI chat, live preview and generated code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});

const IMPORTABLE_EXTENSIONS = /\.(html|css|js|jsx|ts|tsx|json|md)$/;
const MAX_IMPORT_BYTES = 120_000;
const MAX_IMPORT_FILES = 15;

type FileStatusEntry = {
  path: string;
  status: "loaded" | "skipped" | "failed";
  detail: string;
};

type ImportReport = {
  imported: string[];
  skipped: FileStatusEntry[];
  failed: FileStatusEntry[];
  requested: number;
};

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown error";
}

function FileStatusList({ report }: { report: ImportReport }) {
  const loadedCount = report.imported.length;
  const skippedCount = report.skipped.length;
  const failedCount = report.failed.length;

  return (
    <div className="border-b border-border bg-surface px-4 py-3 text-xs">
      <p className="font-medium text-foreground">
        Import finished — {loadedCount} of {report.requested} file(s) loaded.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-1 font-medium text-foreground">
            <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
            Loaded into the project ({loadedCount})
          </p>
          {loadedCount === 0 ? (
            <p className="mt-1 text-muted-foreground">No files were loaded from this import.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {report.imported.map((path) => (
                <li key={path} className="truncate font-mono">
                  {path}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="flex items-center gap-1 font-medium text-foreground">
            <FileX2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
            Skipped ({skippedCount})
          </p>
          {skippedCount === 0 ? (
            <p className="mt-1 text-muted-foreground">Nothing was skipped.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {report.skipped.map((entry) => (
                <li key={entry.path} className="truncate">
                  <span className="font-mono">{entry.path}</span> — {entry.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="flex items-center gap-1 font-medium text-foreground">
            <AlertTriangle className="size-3.5 text-destructive" aria-hidden="true" />
            Not loaded ({failedCount})
          </p>
          {failedCount === 0 ? (
            <p className="mt-1 text-muted-foreground">No errors while importing.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-destructive">
              {report.failed.map((entry) => (
                <li key={entry.path} className="truncate">
                  <span className="font-mono">{entry.path}</span> — {entry.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Workspace() {
  const { projectId } = Route.useParams();
  const isMobile = useIsMobile();

  const qc = useQueryClient();
  const fetchProject = useServerFn(getProject);
  const fetchAccount = useServerFn(getMyAccount);
  const fetchAssets = useServerFn(listAssets);
  const fetchIntegration = useServerFn(getProjectIntegration);
  const chat = useServerFn(sendChatMessage);
  const image = useServerFn(generateAsset);
  const push = useServerFn(pushProjectToGithub);
  const tree = useServerFn(listRepoTree);
  const importFiles = useServerFn(importRepoFiles);
  const [busy, setBusy] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject({ data: { id: projectId } }),
  });
  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const integration = useQuery({
    queryKey: ["integration", projectId],
    queryFn: () => fetchIntegration({ data: { projectId } }),
  });
  const assets = useQuery({
    queryKey: ["assets", projectId],
    queryFn: () => fetchAssets({ data: { projectId } }),
  });

  const pushMutation = useMutation({
    mutationFn: () => push({ data: { projectId, message: "Update from Forge AI" } }),
    onSuccess: (r) => toast.success(`Pushed ${r.pushed.length} file(s) to GitHub.`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Push failed"),
  });

  const importMutation = useMutation({
    mutationFn: async (): Promise<ImportReport> => {
      const repo = project.data?.project.repo_full_name;
      if (!repo) throw new Error("No repository linked to this project.");

      const nodes = await tree({
        data: { repo, branch: project.data?.project.repo_branch || "main" },
      });
      if (nodes.length === 0) {
        throw new Error(
          "The repository tree came back empty. Check the branch name and that the GitHub connector can read this repository.",
        );
      }

      const skipped: FileStatusEntry[] = [];
      const selected: string[] = [];

      for (const node of nodes) {
        if (!IMPORTABLE_EXTENSIONS.test(node.path)) {
          skipped.push({ path: node.path, status: "skipped", detail: "unsupported file type" });
          continue;
        }
        if (typeof node.size === "number" && node.size > MAX_IMPORT_BYTES) {
          skipped.push({
            path: node.path,
            status: "skipped",
            detail: `too large (${Math.round(node.size / 1024)} KB, limit ${Math.round(
              MAX_IMPORT_BYTES / 1024,
            )} KB)`,
          });
          continue;
        }
        if (selected.length >= MAX_IMPORT_FILES) {
          skipped.push({
            path: node.path,
            status: "skipped",
            detail: `import limit reached (${MAX_IMPORT_FILES} files per import)`,
          });
          continue;
        }
        selected.push(node.path);
      }

      if (selected.length === 0) {
        throw new Error(
          `No importable files were found in ${repo}. ${skipped.length} file(s) were skipped — unsupported type, empty content or size limit.`,
        );
      }

      const skippedPaths = new Set(skipped.map((entry) => entry.path));
      let imported: string[] = [];
      let failed: FileStatusEntry[] = [];
      let requestError: string | null = null;

      try {
        const result = await importFiles({ data: { projectId, paths: selected } });
        imported = result.imported ?? [];
      } catch (error) {
        requestError = describeError(error);
      }

      const importedPaths = new Set(imported);
      for (const path of selected) {
        if (importedPaths.has(path)) continue;
        if (path.endsWith("/")) continue;
        failed.push({
          path,
          status: "failed",
          detail:
            requestError ??
            "The file was not returned by GitHub. It may be empty, renamed or too large.",
        });
      }
      for (const path of importedPaths) {
        if (!skippedPaths.has(path)) continue;
        skipped.splice(
          skipped.findIndex((entry) => entry.path === path),
          1,
        );
      }

      return {
        imported,
        skipped,
        failed,
        requested: selected.length,
      };
    },
    onSuccess: async (report) => {
      setImportReport(report);
      if (report.imported.length > 0) {
        toast.success(
          `Imported ${report.imported.length} file(s). ${report.failed.length} could not be loaded.`,
        );
      } else {
        toast.warning("Nothing was imported. See the report above the editor.");
      }
      await qc.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (e) => {
      setImportReport({
        imported: [],
        skipped: [],
        failed: [
          {
            path: project.data?.project.repo_full_name ?? "repository",
            status: "failed",
            detail: describeError(e),
          },
        ],
        requested: 0,
      });
      toast.error(describeError(e));
    },
  });

  async function onSend(prompt: string, modelId?: string) {
    setBusy(true);
    try {
      await chat({ data: { projectId, prompt, ...(modelId ? { modelId } : {}) } });
      await qc.invalidateQueries({ queryKey: ["project", projectId] });
      await qc.invalidateQueries({ queryKey: ["versions", projectId] });
      await qc.invalidateQueries({ queryKey: ["account"] });
      await qc.invalidateQueries({ queryKey: ["credit-overview"] });
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateImage(prompt: string, kind: "image" | "logo" | "icon" | "banner") {
    setBusy(true);
    try {
      await image({ data: { projectId, prompt, kind } });
      toast.success(`${kind} generated — see the Assets tab.`);
      await qc.invalidateQueries({ queryKey: ["assets", projectId] });
      await qc.invalidateQueries({ queryKey: ["account"] });
      await qc.invalidateQueries({ queryKey: ["credit-overview"] });
    } finally {
      setBusy(false);
    }
  }

  const files = project.data?.files ?? [];
  const repo = project.data?.project.repo_full_name;

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader isAdmin={account.data?.isAdmin} />
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-medium">{project.data?.project.name ?? "…"}</h1>
          {repo && (
            <span className="inline-flex items-center gap-1 truncate rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              <Github className="size-3" /> {repo}
            </span>
          )}
        </div>
        {repo && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {importMutation.isPending ? "Importing…" : "Import"}
            </Button>
            <Button size="sm" onClick={() => pushMutation.mutate()} disabled={pushMutation.isPending}>
              <Upload className="size-4" /> Commit &amp; push
            </Button>
          </div>
        )}
      </div>

      {importMutation.isPending && (
        <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Reading the repository tree and loading files from GitHub…
        </div>
      )}

      {!importMutation.isPending && importReport && (
        <div className="relative">
          <FileStatusList report={importReport} />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 px-2 text-xs"
            onClick={() => setImportReport(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {project.isPending && (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading your project…
        </div>
      )}

      {project.isError && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">This project could not be loaded.</p>
            <p className="mt-1">{describeError(project.error)}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void project.refetch()}
              disabled={project.isFetching}
            >
              Try again
            </Button>
          </div>
        </div>
      )}

      {!project.isPending && !project.isError && (isMobile ? (
        <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b border-border bg-surface px-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="m-0 min-h-0 flex-1 overflow-hidden">
            <ChatPanel
              messages={project.data?.messages ?? []}
              busy={busy}
              onSend={onSend}
              onGenerateImage={onGenerateImage}
            />
          </TabsContent>
          <TabsContent value="preview" className="m-0 min-h-0 flex-1 overflow-hidden">
            <PreviewPanel files={files} db={integration.data ?? null} />
          </TabsContent>
          <TabsContent value="code" className="m-0 min-h-0 flex-1 overflow-hidden">
            <CodePanel files={files} />
          </TabsContent>
          <TabsContent value="assets" className="m-0 min-h-0 flex-1 overflow-hidden">
            <AssetPanel assets={assets.data ?? []} />
          </TabsContent>
          <TabsContent value="history" className="m-0 min-h-0 flex-1 overflow-hidden">
            <HistoryPanel projectId={projectId} />
          </TabsContent>
          <TabsContent value="data" className="m-0 min-h-0 flex-1 overflow-hidden">
            <DataPanel projectId={projectId} />
          </TabsContent>
        </Tabs>
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize="34%" minSize="24%">
            <ChatPanel
              messages={project.data?.messages ?? []}
              busy={busy}
              onSend={onSend}
              onGenerateImage={onGenerateImage}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="66%" minSize="30%">
            <Tabs defaultValue="preview" className="flex h-full flex-col gap-0">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-surface px-2">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="m-0 flex-1 overflow-hidden">
                <PreviewPanel files={files} db={integration.data ?? null} />
              </TabsContent>
              <TabsContent value="code" className="m-0 flex-1 overflow-hidden">
                <CodePanel files={files} />
              </TabsContent>
              <TabsContent value="assets" className="m-0 flex-1 overflow-hidden">
                <AssetPanel assets={assets.data ?? []} />
              </TabsContent>
              <TabsContent value="history" className="m-0 flex-1 overflow-hidden">
                <HistoryPanel projectId={projectId} />
              </TabsContent>
              <TabsContent value="data" className="m-0 flex-1 overflow-hidden">
                <DataPanel projectId={projectId} />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      ))}

    </div>
  );
}
