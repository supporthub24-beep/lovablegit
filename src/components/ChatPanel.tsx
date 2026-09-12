import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChatModels } from "@/lib/providers.functions";
import { Send, Sparkles, Image as ImageIcon, Loader2, Bot, User } from "lucide-react";
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      stickToBottom.current = distance < 80;
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  async function submit() {
    const prompt = value.trim();
    if (!prompt || busy) return;
    setValue("");
    stickToBottom.current = true;
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

  const modelOptions = models.data?.options ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-inset ring-primary/20">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold tracking-tight">AI Chat</span>
        <label htmlFor="chat-model-select" className="sr-only">
          AI model
        </label>
        <select
          id="chat-model-select"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          disabled={models.isPending || modelOptions.length === 0}
          className="ml-auto max-w-[55%] truncate rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {modelOptions.length === 0 && (
            <option value="">
              {models.isError ? "Models unavailable" : "No AI provider configured"}
            </option>
          )}
          {modelOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.group} — {o.label}
            </option>
          ))}
        </select>
      </div>

      {models.isError && (
        <div
          role="alert"
          className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive"
        >
          Could not load AI models. Check that an OpenAI or Google Gemini API key is saved in the
          admin console.
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
        aria-live="polite"
        aria-busy={busy}
      >
        {messages.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <span className="mx-auto inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
              <Sparkles className="size-5 text-primary" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">Start building with AI</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              Describe what you want to build. For example: “Build a landing page for a coffee shop
              with a menu and contact form.”
            </p>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <span
                aria-hidden="true"
                className={`mb-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
                  isUser
                    ? "bg-primary/10 text-primary ring-primary/20"
                    : "bg-surface text-muted-foreground ring-border"
                }`}
              >
                {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
              </span>
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm"
                    : "max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-sm text-card-foreground shadow-sm"
                }
              >
                <span className="sr-only">{isUser ? "You said: " : "AI said: "}</span>
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="flex items-end gap-2">
            <span
              aria-hidden="true"
              className="mb-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground ring-1 ring-inset ring-border"
            >
              <Bot className="size-3.5" />
            </span>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-3 shadow-sm">
              <span className="sr-only">AI is working…</span>
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(["image", "logo", "icon", "banner"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={imageMode === kind}
              onClick={() => setImageMode(imageMode === kind ? null : kind)}
              className={
                imageMode === kind
                  ? "flex items-center gap-1 rounded-full bg-highlight px-2.5 py-1 text-xs font-medium text-highlight-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  : "flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
              imageMode
                ? `Describe the ${imageMode} to generate…`
                : "Ask the AI to build or change something… (Enter to send, Shift+Enter for a new line)"
            }
            className="min-h-[60px] resize-none bg-background"
          />
          <Button
            size="icon"
            onClick={submit}
            disabled={busy || value.trim().length === 0}
            aria-label="Send message"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
