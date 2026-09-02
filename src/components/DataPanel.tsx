import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getProjectIntegration,
  saveProjectIntegration,
  clearProjectIntegration,
} from "@/lib/integrations.functions";

export function DataPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const fetchIntegration = useServerFn(getProjectIntegration);
  const save = useServerFn(saveProjectIntegration);
  const clear = useServerFn(clearProjectIntegration);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");

  const integration = useQuery({
    queryKey: ["integration", projectId],
    queryFn: () => fetchIntegration({ data: { projectId } }),
  });

  useEffect(() => {
    if (integration.data) {
      setUrl(integration.data.supabase_url ?? "");
      setKey(integration.data.supabase_anon_key ?? "");
    }
  }, [integration.data]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { projectId, supabaseUrl: url, supabaseAnonKey: key } }),
    onSuccess: async () => {
      toast.success("Database connected to this project's preview.");
      await qc.invalidateQueries({ queryKey: ["integration", projectId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const clearMutation = useMutation({
    mutationFn: () => clear({ data: { projectId } }),
    onSuccess: async () => {
      setUrl("");
      setKey("");
      toast.success("Database disconnected.");
      await qc.invalidateQueries({ queryKey: ["integration", projectId] });
    },
  });

  return (
    <div className="h-full overflow-auto bg-background p-5">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-primary" />
          <h2 className="text-sm font-medium">Connect your own database</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste your existing Supabase project URL and publishable (anon) key. The preview loads the
          Supabase client automatically and exposes it as{" "}
          <code className="rounded bg-surface px-1">window.supabaseClient</code>, so generated code
          can read and write your data.
        </p>
        <div className="space-y-2">
          <Label htmlFor="db-url">Project URL</Label>
          <Input
            id="db-url"
            placeholder="https://xxxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="db-key">Publishable / anon key</Label>
          <Input
            id="db-key"
            placeholder="sb_publishable_… or eyJ…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Save connection
          </Button>
          {integration.data?.supabase_url && (
            <Button variant="ghost" onClick={() => clearMutation.mutate()}>
              <Unplug className="size-4" /> Disconnect
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Only use a publishable/anon key here — never a service role key. Preview only; nothing is
          hosted.
        </p>
      </div>
    </div>
  );
}
