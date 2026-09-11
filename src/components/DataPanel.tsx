import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { Database, Unplug, Play, PlusCircle, RefreshCw, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getProjectIntegration,
  saveProjectIntegration,
  clearProjectIntegration,
} from "@/lib/integrations.functions";

type QueryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; columns: string[]; rows: Record<string, unknown>[] };

const DEFAULT_TABLE = "preview_items";

const CREATE_TABLE_SQL = `create table if not exists public.${DEFAULT_TABLE} (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.${DEFAULT_TABLE} enable row level security;
create policy "preview read" on public.${DEFAULT_TABLE} for select using (true);
create policy "preview insert" on public.${DEFAULT_TABLE} for insert with check (true);`;

const INSERT_ROW_SQL = `insert into public.${DEFAULT_TABLE} (title, note)
values ('First preview row', 'Created from the Data tab preview');`;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function buildClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown error";
}

export function DataPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const fetchIntegration = useServerFn(getProjectIntegration);
  const save = useServerFn(saveProjectIntegration);
  const clear = useServerFn(clearProjectIntegration);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [tableName, setTableName] = useState(DEFAULT_TABLE);
  const [query, setQuery] = useState<QueryState>({ status: "idle" });

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
      setQuery({ status: "idle" });
      toast.success("Database disconnected.");
      await qc.invalidateQueries({ queryKey: ["integration", projectId] });
    },
  });

  const connectedUrl = integration.data?.supabase_url ?? "";
  const connectedKey = integration.data?.supabase_anon_key ?? "";
  const isConnected = Boolean(connectedUrl && connectedKey);

  async function runEditorQuery(sql: string, successMessage: string) {
    const trimmed = sql.trim();
    if (!trimmed) {
      setQuery({ status: "error", message: "Write a SQL statement first." });
      toast.error("Write a SQL statement first.");
      return;
    }
    if (!isConnected) {
      setQuery({
        status: "error",
        message: "Connect your database before running SQL from this panel.",
      });
      toast.error("Connect your database first.");
      return;
    }

    setQuery({ status: "loading" });
    const client = buildClient(connectedUrl, connectedKey);
    try {
      const { error } = await client.rpc("exec_sql", { sql: trimmed });
      if (error) throw error;
      toast.success(successMessage);
    } catch (error) {
      const message =
        `${describeError(error)}. The SQL editor needs an "exec_sql" function with ` +
        "security definer in your own database. Run the statement from your Supabase SQL editor, " +
        "then use “Load table” below to verify the result here.";
      setQuery({ status: "error", message });
      toast.error("SQL could not run from the panel.");
    }
  }

  async function loadTable() {
    const table = tableName.trim();
    if (!table) {
      setQuery({ status: "error", message: "Enter a table name to preview." });
      toast.error("Enter a table name to preview.");
      return;
    }
    if (!isConnected) {
      setQuery({
        status: "error",
        message: "Connect your database before loading a table.",
      });
      toast.error("Connect your database first.");
      return;
    }

    setQuery({ status: "loading" });
    const client = buildClient(connectedUrl, connectedKey);
    const { data, error } = await client.from(table).select("*").limit(25);

    if (error) {
      setQuery({ status: "error", message: error.message });
      return;
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const firstRow = rows[0];
    const columns = firstRow ? Object.keys(firstRow) : [];
    setQuery({ status: "ready", columns, rows });
  }

  return (
    <div className="h-full overflow-auto bg-background p-5">
      <div className="mx-auto max-w-2xl space-y-4">
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
            {saveMutation.isPending ? "Saving…" : "Save connection"}
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

        {integration.isError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Could not load the saved connection:{" "}
            {describeError(integration.error)}
          </p>
        )}

        <section className="space-y-3 border-t border-border pt-5">
          <div className="flex items-center gap-2">
            <Table2 className="size-4 text-primary" />
            <h3 className="text-sm font-medium">Preview your data</h3>
          </div>
          {isConnected ? (
            <p className="text-xs text-muted-foreground">
              Connected to <span className="font-medium">{connectedUrl}</span>. Create a table,
              insert a row, then load it to check the connection end to end.
            </p>
          ) : (
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              No database connected yet. Save a project URL and anon key above to run queries in the
              preview.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!isConnected}
              onClick={() => runEditorQuery(CREATE_TABLE_SQL, "preview_items created.")}
            >
              <PlusCircle className="size-4" /> Create {DEFAULT_TABLE}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!isConnected}
              onClick={() => runEditorQuery(INSERT_ROW_SQL, "Sample row inserted.")}
            >
              <PlusCircle className="size-4" /> Insert sample row
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="db-table">Table name</Label>
            <div className="flex gap-2">
              <Input
                id="db-table"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder={DEFAULT_TABLE}
              />
              <Button
                variant="outline"
                onClick={() => void loadTable()}
                disabled={!isConnected || query.status === "loading"}
              >
                <Play className="size-4" /> Load table
              </Button>
            </div>
          </div>

          <details className="rounded-md border border-border bg-surface/40 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">
              SQL for the sample table
            </summary>
            <Textarea
              readOnly
              rows={8}
              value={CREATE_TABLE_SQL}
              className="mt-2 font-mono text-xs"
              aria-label="SQL that creates the sample preview table"
            />
          </details>

          {query.status === "loading" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="size-4 animate-spin" /> Running the query…
            </p>
          )}

          {query.status === "error" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {query.message}
            </div>
          )}

          {query.status === "ready" && (
            <div className="space-y-2">
              {query.rows.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  The query succeeded but returned no rows. Insert a row and load the table again.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        {query.columns.map((column) => (
                          <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {query.rows.map((row, index) => (
                        <tr key={index} className="border-t border-border">
                          {query.columns.map((column) => (
                            <td key={column} className="px-3 py-2 align-top">
                              {formatCell(row[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {query.rows.length} row(s) returned.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
