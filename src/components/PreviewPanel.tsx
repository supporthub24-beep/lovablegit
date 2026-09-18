import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Monitor,
  Smartphone,
  RefreshCw,
  Info,
  Loader2,
  FileX2,
  AlertTriangle,
  Github,
  GitBranch,
} from "lucide-react";
import { buildPreviewDocument, type GeneratedFile, type PreviewDbConfig } from "@/lib/codegen";
import { getGithubStatus } from "@/lib/github.functions";
import { Button } from "@/components/ui/button";

const PREVIEW_DEBOUNCE_MS = 400;

/**
 * Builds a stable signature for the current file set so the preview only
 * rebuilds when the real content coming from project_files actually changes.
 */
function filesSignature(files: GeneratedFile[]): string {
  return files
    .map((file) => `${file.path}\u0000${file.content.length}\u0000${file.content}`)
    .join("\u0001");
}

export function PreviewPanel({ files, db }: { files: GeneratedFile[]; db?: PreviewDbConfig | null }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [nonce, setNonce] = useState(0);
  const [debouncedFiles, setDebouncedFiles] = useState<GeneratedFile[]>(files);
  const [debouncedDb, setDebouncedDb] = useState<PreviewDbConfig | null | undefined>(db);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConnection = useServerFn(getGithubStatus);
  const connection = useQuery({
    queryKey: ["github-status"],
    queryFn: () => fetchConnection(),
  });

  const signature = useMemo(() => filesSignature(files), [files]);
  const dbSignature = useMemo(
    () => `${db?.supabase_url ?? ""}\u0000${db?.supabase_anon_key ?? ""}`,
    [db],
  );

  const lastSignature = useRef(signature);
  const lastDbSignature = useRef(dbSignature);

  // Debounce live updates so a burst of saves does not reload the iframe on
  // every keystroke, but a real content change still refreshes the preview.
  useEffect(() => {
    if (signature === lastSignature.current && dbSignature === lastDbSignature.current) {
      return;
    }
    setIsRefreshing(true);
    const timer = window.setTimeout(() => {
      lastSignature.current = signature;
      lastDbSignature.current = dbSignature;
      setDebouncedFiles(files);
      setDebouncedDb(db);
      setRenderError(null);
      setIsRefreshing(false);
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [signature, dbSignature, files, db]);

  const doc = useMemo(() => {
    try {
      return buildPreviewDocument(debouncedFiles, debouncedDb ?? null);
    } catch (error) {
      setRenderError(
        error instanceof Error ? error.message : "The preview document could not be built.",
      );
      return "";
    }
  }, [debouncedFiles, debouncedDb]);

  const hasFiles = debouncedFiles.length > 0;
  const showError = renderError !== null || (hasFiles && doc.trim().length === 0);

  const repoContext = connection.data ?? null;
  const repoContextLoading = connection.isPending;
  const repoContextError = connection.isError;
  const repoConnected = repoContext?.connected === true;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="size-3.5" aria-hidden="true" />
          <span>Temporary preview — not hosted</span>
          {isRefreshing && (
            <span className="inline-flex items-center gap-1 text-xs text-primary">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              Updating…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={device === "desktop" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setDevice("desktop")}
            aria-label="Desktop preview"
            aria-pressed={device === "desktop"}
          >
            <Monitor className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant={device === "mobile" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setDevice("mobile")}
            aria-label="Mobile preview"
            aria-pressed={device === "mobile"}
          >
            <Smartphone className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setRenderError(null);
              setNonce((n) => n + 1);
            }}
            aria-label="Reload preview"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="border-b border-border bg-muted/30 px-4 py-2.5">
        {repoContextLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Loading repository context…
          </div>
        ) : repoContextError ? (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <Github className="size-3" aria-hidden="true" />
            Repository context unavailable.
          </div>
        ) : repoConnected ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Github className="size-3" aria-hidden="true" />
              <span className="font-medium text-foreground">
                {repoContext?.account ?? "GitHub account"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="size-3" aria-hidden="true" />
              Connected
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Github className="size-3" aria-hidden="true" />
            No repository connected. Add one in Settings to give the preview repo context.
          </div>
        )}
      </div>

      <div className="flex flex-1 items-start justify-center overflow-auto bg-surface p-4">
        {!hasFiles ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background p-8 text-center">
            <FileX2 className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Nothing to preview yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              This project has no files in storage. Ask the AI to generate the project or import
              files from GitHub, then the live preview will render here.
            </p>
          </div>
        ) : showError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-8 text-center">
            <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
            <p className="text-sm font-medium text-destructive">The preview could not be rendered</p>
            <p className="max-w-md text-xs text-destructive">
              {renderError ?? "The generated document came back empty."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setRenderError(null);
                setNonce((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <iframe
            key={nonce}
            title="Project preview"
            srcDoc={doc}
            sandbox="allow-scripts allow-forms allow-popups"
            className={
              device === "mobile"
                ? "h-[720px] w-[390px] rounded-xl border border-border bg-white shadow-2xl"
                : "h-full min-h-[600px] w-full rounded-lg border border-border bg-white"
            }
          />
        )}
      </div>
    </div>
  );
}
