import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChatModels } from "@/lib/providers.functions";
import { getGithubStatus } from "@/lib/github.functions";
import {
  Send,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Bot,
  User,
  X,
  Github,
  GitBranch,
  FileCode2,
  FilePlus2,
  FileMinus2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ChatMsg = { id: string; role: string; content: string; created_at?: string };

/**
 * A file action emitted by the AI and applied to the project file store.
 * Mirrors bolt.diy's artifact/file-action model: create / update / delete.
 */
export type ChatFileAction = {
  type: "create" | "update" | "delete";
  path: string;
};

export type ChatSendResult = { changedFiles?: string[] } | void;

export function ChatPanel({
  messages,
  busy,
  onSend,
  onGenerateImage,
}: {
  messages: ChatMsg[];
  busy: boolean;
  onSend: (prompt: string, modelId?: string) => Promise<ChatSendResult>;
  onGenerateImage: (prompt: string, kind: "image" | "logo" | "icon" | "banner") => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [imageMode, setImageMode] = useState<null | "image" | "logo" | "icon" | "banner">(null);
  const [modelId, setModelId] = useState<string>("");
  const [lastActions, setLastActions] = useState<ChatFileAction[]>([]);
  const fetchModels = useServerFn(listChatModels);
  const models = useQuery({ queryKey: ["chat-models"], queryFn: () => fetchModels() });

  const fetchConnection = useServerFn(getGithubStatus);
  const connection = useQuery({
    queryKey: ["github-status"],
    queryFn: () => fetchConnection(),
  });

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
        const result = await onSend(prompt, modelId || undefined);
        const changed = result && "changedFiles" in result ? result.changedFiles ?? [] : [];
        setLastActions(
          changed.map((path) => ({
            type: /(^|\/)(index|main)\.(html|tsx|jsx|ts|js)$/.test(path) ? "create" : "update",
            path,
          })),
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  const modelOptions = models.data?.options ?? [];
  const noModelsConfigured =
    !models.isPending && !models.isError && modelOptions.length === 0;

  const repoContext = connection.data ?? null;
  const repoContextLoading = connection.isPending;
  const repoContextError = connection.isError;
  const repoConnected = repoContext?.connected === true;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-surface shadow-lg">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
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
          className="ml-auto max-w-[55%] truncate rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {modelOptions.length === 0 && (
            <option value="">
              {models.isPending
                ? "Loading models…"
                : models.isError
                  ? "Models unavailable"
                  : "No AI provider configured"}
            </option>
          )}
          {modelOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.group} — {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="border-b border-border bg-muted/30 px-5 py-2.5">
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
            No repository connected. Add one in Settings to give the AI repo context.
          </div>
        )}
      </div>

      {models.isError && (
        <div
          role="alert"
          className="border-b border-border bg-destructive/10 px-5 py-3 text-xs text-destructive"
        >
          Could not load AI models. Check that an OpenAI or Google Gemini API key is saved in the
          admin console.
        </div>
      )}

      {noModelsConfigured && (
        <div
          role="status"
          className="border-b border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground"
        >
          No AI provider or model has been saved yet. An administrator must add a provider and its
          models in the admin console before chat can run.
        </div>
      )}

      {lastActions.length > 0 && (
        <div
          role="status"
          className="border-b border-border bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground"
        >
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <FileCode2 className="size-3.5 text-primary" aria-hidden="true" />
            {lastActions.length} file action{lastActions.length === 1 ? "" : "s"} applied to the
            project store
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {lastActions.map((action) => (
              <li key={`${action.type}:${action.path}`} className="flex items-center gap-1.5">
                {action.type === "delete" ? (
                  <FileMinus2 className="size-3 text-destructive" aria-hidden="true" />
                ) : action.type === "create" ? (
                  <FilePlus2 className="size-3 text-primary" aria-hidden="true" />
                ) : (
                  <FileCode2 className="size-3 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="font-mono">{action.path}</span>
                <span className="text-muted-foreground">— {action.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5"
        aria-live="polite"
        aria-busy={busy}
      >
        {messages.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <span className="mx-auto inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
              <Sparkles className="size-5 text-primary" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">Start building with AI</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
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
              className={`flex items-end gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <span
                aria-hidden="true"
                className={`mb-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
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
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm"
                    : "max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm"
                }
              >
                <span className="sr-only">{isUser ? "You said: " : "AI said: "}</span>
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="flex items-end gap-3">
            <span
              aria-hidden="true"
              className="mb-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground ring-1 ring-inset ring-border"
            >
              <Bot className="size-3.5" />
            </span>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm">
              <span className="sr-only">AI is working…</span>
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        {imageMode && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium text-foreground">Generate {imageMode}</span>
            </div>
            <button
              type="button"
              onClick={() => setImageMode(null)}
              className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cancel image generation"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {(["image", "logo", "icon", "banner"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={imageMode === kind}
              onClick={() => setImageMode(imageMode === kind ? null : kind)}
              className={
                imageMode === kind
                  ? "flex items-center gap-1.5 rounded-full bg-highlight px-3 py-1.5 text-xs font-medium text-highlight-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  : "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              }
            >
              <ImageIcon className="size-3" aria-hidden="true" />
              {kind}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-3">
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
            className="min-h-[64px] resize-none rounded-xl bg-background"
          />
          <Button
            size="icon"
            onClick={submit}
            disabled={busy || value.trim().length === 0}
            aria-label="Send message"
            className="h-12 w-12 rounded-full"
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
