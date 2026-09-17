import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listAiProviders,
  saveAiProvider,
  deleteAiProvider,
} from "@/lib/providers.functions";

type Draft = {
  id?: string;
  label: string;
  kind: "openai_compatible" | "anthropic" | "google";
  base_url: string;
  api_key: string;
  models: string;
  enabled: boolean;
};

const EMPTY: Draft = {
  label: "",
  kind: "openai_compatible",
  base_url: "",
  api_key: "",
  models: "",
  enabled: true,
};

export function AiProvidersPanel() {
  const qc = useQueryClient();
  const fetchProviders = useServerFn(listAiProviders);
  const save = useServerFn(saveAiProvider);
  const remove = useServerFn(deleteAiProvider);

  const providers = useQuery({
    queryKey: ["ai-providers"],
    queryFn: () => fetchProviders(),
    retry: false,
  });
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function submit() {
    if (!draft.label.trim()) {
      toast.error("Enter a provider name before saving.");
      return;
    }
    const models = draft.models
      .split(/[\n,]/)
      .map((m) => m.trim())
      .filter(Boolean);
    if (models.length === 0) {
      toast.error("Add at least one model name.");
      return;
    }
    if (!draft.id && !draft.api_key.trim()) {
      toast.error("An API key is required for a new provider.");
      return;
    }
    setSaving(true);
    try {
      await save({ data: { ...draft, models: models.join("\n") } });
      toast.success(
        draft.id
          ? "Provider updated. Customers now see the saved models in chat."
          : "Provider added. Customers now see the saved models in chat.",
      );
      setDraft(EMPTY);
      await qc.invalidateQueries({ queryKey: ["ai-providers"] });
      await qc.invalidateQueries({ queryKey: ["chat-models"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save provider");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await remove({ data: { id } });
      toast.success("Provider removed.");
      if (draft.id === id) setDraft(EMPTY);
      await qc.invalidateQueries({ queryKey: ["ai-providers"] });
      await qc.invalidateQueries({ queryKey: ["chat-models"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove provider");
    } finally {
      setRemovingId(null);
    }
  }

  const rows = providers.data ?? [];

  return (
    <section className="rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-tight">Custom AI providers</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Add any AI provider with your own API key — Claude, DeepSeek, OpenAI, Groq, OpenRouter
            and more. Every listed model appears in the customer&apos;s chat model picker and is
            stored in Supabase, so it survives a reload.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <KeyRound className="size-3" /> Server-side keys
        </Badge>
      </div>

      <div className="mt-5 space-y-2">
        {providers.isPending && (
          <div className="space-y-2">
            {[0, 1].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        )}
        {providers.isError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            Could not load providers:{" "}
            {providers.error instanceof Error ? providers.error.message : "unknown error"}
          </div>
        )}
        {rows.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-border bg-surface px-3 py-2.5 text-sm transition-colors hover:border-primary/50"
          >
            <span className="font-bold uppercase tracking-wide">{p.label}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {p.kind}
            </span>
            <span className="truncate text-xs text-muted-foreground">{p.base_url}</span>
            <span className="text-xs text-muted-foreground">
              {(p.models ?? []).length} model(s)
            </span>
            {p.enabled ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="size-3" /> Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setDraft({
                    id: p.id,
                    label: p.label,
                    kind: p.kind as Draft["kind"],
                    base_url: p.base_url,
                    api_key: "",
                    models: (p.models ?? []).join(", "),
                    enabled: p.enabled,
                  })
                }
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={removingId === p.id}
                aria-label={`Remove ${p.label}`}
                onClick={() => handleRemove(p.id)}
              >
                {removingId === p.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
        {!providers.isPending && !providers.isError && rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">
            No custom providers yet. Add one below to make its models available in chat.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="p-label">Name</Label>
          <Input
            id="p-label"
            placeholder="Claude"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-kind">API type</Label>
          <select
            id="p-kind"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="openai_compatible">OpenAI-compatible (OpenAI, DeepSeek, Groq…)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="google">Google Gemini</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-url">Base URL (optional)</Label>
          <Input
            id="p-url"
            placeholder="https://api.deepseek.com/v1"
            value={draft.base_url}
            onChange={(e) => setDraft({ ...draft, base_url: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-key">
            API key {draft.id ? "(leave blank to keep the saved key)" : ""}
          </Label>
          <Input
            id="p-key"
            type="password"
            autoComplete="off"
            placeholder={draft.id ? "••••••••  (leave blank to keep)" : "Paste the key"}
            value={draft.api_key}
            onChange={(e) => setDraft({ ...draft, api_key: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="p-models">Models (comma or newline separated)</Label>
          <Textarea
            id="p-models"
            rows={2}
            placeholder="claude-sonnet-4-5, claude-opus-4-1"
            value={draft.models}
            onChange={(e) => setDraft({ ...draft, models: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={draft.enabled}
            onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
          />
          Enabled for customers
        </label>
        <Button onClick={submit} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : draft.id ? (
            <Save className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {saving ? "Saving…" : draft.id ? "Update provider" : "Add provider"}
        </Button>
        {draft.id && (
          <Button variant="ghost" onClick={() => setDraft(EMPTY)} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </section>
  );
}
