import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChatModels } from "@/lib/providers.functions";
import { Send, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ChatMsg = { id: string; role: string; content: string; created_at?: string };

export function ChatPanel({
  messages,
  busy,
  onSend,
  onGenerateImage,
}: {
  messages: ChatMsg[];
  busy: boolean;
  onSend: (prompt: string, modelId?: string) => Promise<void>;
  onGenerateImage: (prompt: string, kind: "image" | "logo" | "icon" | "banner") => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [imageMode, setImageMode] = useState<null | "image" | "logo" | "icon" | "banner">(null);
  const [modelId, setModelId] = useState<string>("");
  const fetchModels = useServerFn(listChatModels);
  const models = useQuery({ queryKey: ["chat-models"], queryFn: () => fetchModels() });

  useEffect(() => {
    if (!modelId && models.data?.defaultId) setModelId(models.data.defaultId);
  }, [models.data, modelId]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, busy]);

  async function submit() {
    const prompt = value.trim();
    if (!prompt || busy) return;
    setValue("");
    try {
      if (imageMode) {
        await onGenerateImage(prompt, imageMode);
        setImageMode(null);
      } else {
        await onSend(prompt, modelId || undefined);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <span className="text-sm font-medium">AI Chat</span>
        <label htmlFor="chat-model-select" className="sr-only">
          AI model
        </label>
        <select
          id="chat-model-select"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          disabled={models.isPending || (models.data?.options ?? []).length === 0}
          className="ml-auto max-w-[55%] truncate rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-60"
        >
          {(models.data?.options ?? []).length === 0 && (
            <option value="">
              {models.isError ? "Models unavailable" : "No AI provider configured"}
            </option>
          )}
          {(models.data?.options ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.group} — {o.label}
            </option>
          ))}
        </select>
      </div>

      {models.isError && (
        <div className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
          Could not load AI models. Check that an OpenAI or Google Gemini API key is saved in the
          admin console.
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Describe what you want to build. For example: “Build a landing page for a coffee shop
            with a menu and contact form.”
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "max-w-[92%] rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground"
            }
          >
            <p className="whitespace-pre-wrap break-words">{m.content}</p>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> AI is working…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(["image", "logo", "icon", "banner"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={imageMode === kind}
              onClick={() => setImageMode(imageMode === kind ? null : kind)}
              className={
                imageMode === kind
                  ? "flex items-center gap-1 rounded-full bg-highlight px-2.5 py-1 text-xs font-medium text-highlight-foreground"
                  : "flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              <ImageIcon className="size-3" aria-hidden="true" />
              {kind}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <label htmlFor="chat-prompt" className="sr-only">
            {imageMode ? `Describe the ${imageMode} to generate` : "Message the AI"}
          </label>
          <Textarea
            id="chat-prompt"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={2}
            placeholder={
              imageMode ? `Describe the ${imageMode} to generate…` : "Ask the AI to build or change something…"
            }
            className="min-h-[60px] resize-none bg-background"
          />
          <Button size="icon" onClick={submit} disabled={busy} aria-label="Send message">
            <Send className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
