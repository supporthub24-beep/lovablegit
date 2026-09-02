import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listVersions, restoreVersion, deleteVersion } from "@/lib/versions.functions";

export function HistoryPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const fetchVersions = useServerFn(listVersions);
  const restore = useServerFn(restoreVersion);
  const remove = useServerFn(deleteVersion);

  const versions = useQuery({
    queryKey: ["versions", projectId],
    queryFn: () => fetchVersions({ data: { projectId } }),
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restore({ data: { projectId, versionId } }),
    onSuccess: async (r) => {
      toast.success(`Rolled back — ${r.restored} file(s) restored.`);
      await qc.invalidateQueries({ queryKey: ["project", projectId] });
      await qc.invalidateQueries({ queryKey: ["versions", projectId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Rollback failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (versionId: string) => remove({ data: { versionId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["versions", projectId] }),
  });

  const rows = versions.data ?? [];

  return (
    <div className="h-full overflow-auto bg-background p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <History className="size-4" />
        <span>Every AI change creates a restore point.</span>
      </div>
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No versions yet — send a prompt to create one.</p>
      )}
      <ul className="space-y-2">
        {rows.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">{v.label}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(v.created_at).toLocaleString()} · {v.fileCount} file(s)
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => restoreMutation.mutate(v.id)}
                disabled={restoreMutation.isPending}
              >
                <RotateCcw className="size-3.5" /> Restore
              </Button>
              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(v.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
