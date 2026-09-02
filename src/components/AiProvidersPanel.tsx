import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

  async function submit() {
    try {
      await save({ data: draft });
      toast.success("Provider saved.");
      setDraft(EMPTY);
      await qc.invalidateQueries({ queryKey: ["ai-providers"] });
      await qc.invalidateQueries({ queryKey: ["chat-models"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save provider");
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-medium">Custom AI providers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add any AI provider with your own API key — Claude, DeepSeek, OpenAI, Groq, OpenRouter and
        more. Every listed model appears in the customer&apos;s chat model picker.
      </p>

      <div className="mt-4 space-y-2">
        {(providers.data ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span className="font-medium">{p.label}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {p.kind}
            </span>
            <span className="truncate text-xs text-muted-foreground">{p.base_url}</span>
            <span className="text-xs text-muted-foreground">
              {(p.models ?? []).length} model(s)
            </span>
            {!p.enabled && <span className="text-xs text-destructive">disabled</span>}
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
                onClick={async () => {
                  await remove({ data: { id: p.id } });
                  await qc.invalidateQueries({ queryKey: ["ai-providers"] });
                  await qc.invalidateQueries({ queryKey: ["chat-models"] });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {(providers.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No custom providers yet.</p>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
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
          <Label htmlFor="p-key">API key {draft.id && "(leave blank to keep)"}</Label>
          <Input
            id="p-key"
            type="password"
            autoComplete="off"
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
        <Button onClick={submit}>
          {draft.id ? <Save className="size-4" /> : <Plus className="size-4" />}
          {draft.id ? "Update provider" : "Add provider"}
        </Button>
        {draft.id && (
          <Button variant="ghost" onClick={() => setDraft(EMPTY)}>
            Cancel
          </Button>
        )}
      </div>
    </section>
  );
}
