import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Github, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { CodePanel } from "@/components/CodePanel";
import { AssetPanel } from "@/components/AssetPanel";
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

function Workspace() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const fetchProject = useServerFn(getProject);
  const fetchAccount = useServerFn(getMyAccount);
  const fetchAssets = useServerFn(listAssets);
  const chat = useServerFn(sendChatMessage);
  const image = useServerFn(generateAsset);
  const push = useServerFn(pushProjectToGithub);
  const tree = useServerFn(listRepoTree);
  const importFiles = useServerFn(importRepoFiles);
  const [busy, setBusy] = useState(false);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject({ data: { id: projectId } }),
  });
  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
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
    mutationFn: async () => {
      const repo = project.data?.project.repo_full_name;
      if (!repo) throw new Error("No repository linked to this project.");
      const nodes = await tree({
        data: { repo, branch: project.data?.project.repo_branch || "main" },
      });
      const paths = nodes
        .filter((n) => /\.(html|css|js|jsx|ts|tsx|json|md)$/.test(n.path) && n.size < 120000)
        .slice(0, 15)
        .map((n) => n.path);
      return importFiles({ data: { projectId, paths } });
    },
    onSuccess: (r) => {
      toast.success(`Imported ${r.imported.length} file(s).`);
      void qc.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  async function onSend(prompt: string) {
    setBusy(true);
    try {
      await chat({ data: { projectId, prompt } });
      await qc.invalidateQueries({ queryKey: ["project", projectId] });
      await qc.invalidateQueries({ queryKey: ["account"] });
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
              <Download className="size-4" /> Import
            </Button>
            <Button size="sm" onClick={() => pushMutation.mutate()} disabled={pushMutation.isPending}>
              <Upload className="size-4" /> Commit &amp; push
            </Button>
          </div>
        )}
      </div>

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
            </TabsList>
            <TabsContent value="preview" className="m-0 flex-1 overflow-hidden">
              <PreviewPanel files={files} />
            </TabsContent>
            <TabsContent value="code" className="m-0 flex-1 overflow-hidden">
              <CodePanel files={files} />
            </TabsContent>
            <TabsContent value="assets" className="m-0 flex-1 overflow-hidden">
              <AssetPanel assets={assets.data ?? []} />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
