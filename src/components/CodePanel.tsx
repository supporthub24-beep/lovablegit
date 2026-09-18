import { useEffect, useMemo, useState } from "react";
import { FileCode, Save, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { GeneratedFile } from "@/lib/codegen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CodePanel({
  files,
  onSave,
  onDelete,
  saving,
}: {
  files: GeneratedFile[];
  onSave?: (path: string, content: string) => Promise<void>;
  onDelete?: (path: string) => Promise<void>;
  saving?: boolean;
}) {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPath, setNewPath] = useState("");

  const sorted = useMemo(
    () => [...files].sort((a, b) => a.path.localeCompare(b.path)),
    [files],
  );

  const current = useMemo(
    () => sorted.find((f) => f.path === activePath) ?? sorted[0] ?? null,
    [sorted, activePath],
  );

  // Keep the editor in sync with the store unless the user has unsaved edits.
  useEffect(() => {
    if (!current) {
      setDraft("");
      setDirty(false);
      return;
    }
    if (current.path !== activePath) setActivePath(current.path);
    if (!dirty) setDraft(current.content);
  }, [current, activePath, dirty]);

  async function handleSave() {
    if (!current || !onSave) return;
    try {
      await onSave(current.path, draft);
      setDirty(false);
      toast.success(`Saved ${current.path}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the file");
    }
  }

  async function handleDelete(path: string) {
    if (!onDelete) return;
    try {
      await onDelete(path);
      if (path === activePath) {
        setActivePath(null);
        setDirty(false);
      }
      toast.success(`Deleted ${path}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the file");
    }
  }

  async function handleCreate() {
    const path = newPath.trim();
    if (!path || !onSave) return;
    if (path.startsWith("/") || path.includes("..")) {
      toast.error("File paths must be relative and cannot traverse directories.");
      return;
    }
    try {
      await onSave(path, "");
      setActivePath(path);
      setDraft("");
      setDirty(false);
      setNewPath("");
      setCreating(false);
      toast.success(`Created ${path}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the file");
    }
  }

  if (!files.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No files yet. Ask the AI to generate the project.
        </p>
        {onSave && (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New file
          </Button>
        )}
        {creating && (
          <div className="flex w-full max-w-sm items-center gap-2">
            <Input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="src/App.tsx"
              aria-label="New file path"
              className="font-mono text-xs"
            />
            <Button size="sm" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCreating(false)} aria-label="Cancel">
              <X className="size-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full bg-surface">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Files
          </span>
          {onSave && (
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="New file"
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </div>
        {creating && (
          <div className="flex items-center gap-1 border-b border-border p-2">
            <Input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="src/App.tsx"
              aria-label="New file path"
              className="h-7 font-mono text-xs"
            />
            <Button
              size="icon"
              className="size-7 shrink-0"
              onClick={() => void handleCreate()}
              disabled={saving}
              aria-label="Create file"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-2">
          {sorted.map((f) => {
            const isActive = current?.path === f.path;
            return (
              <div key={f.path} className="group flex items-center">
                <button
                  onClick={() => {
                    setActivePath(f.path);
                    setDirty(false);
                  }}
                  className={
                    isActive
                      ? "flex min-w-0 flex-1 items-center gap-2 rounded bg-secondary px-2 py-1.5 text-left text-xs text-foreground"
                      : "flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-secondary/60"
                  }
                >
                  <FileCode className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate font-mono">{f.path}</span>
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(f.path)}
                    className="ml-1 hidden size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:inline-flex"
                    aria-label={`Delete ${f.path}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {current?.path}
            {dirty && <span className="ml-2 text-highlight-foreground">• unsaved</span>}
          </span>
          {onSave && (
            <Button
              size="sm"
              variant={dirty ? "default" : "ghost"}
              onClick={() => void handleSave()}
              disabled={!dirty || saving}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-3.5" aria-hidden="true" />
              )}
              Save
            </Button>
          )}
        </div>
        {onSave ? (
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            aria-label={`Edit ${current?.path ?? "file"}`}
            className="flex-1 resize-none bg-background p-4 font-mono text-xs leading-relaxed text-foreground outline-none"
          />
        ) : (
          <pre className="flex-1 overflow-auto bg-background p-4 text-xs leading-relaxed">
            <code className="font-mono">{current?.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
