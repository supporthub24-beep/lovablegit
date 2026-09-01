// Server-only Lovable AI Gateway helpers.

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing gateway key).");
  return key;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function getPlatformSettings() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("platform_settings").select("key, value");
  const out: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) {
    out[row.key] = (row.value ?? {}) as Record<string, unknown>;
  }
  return {
    models: {
      chat: (out.models?.chat as string) ?? "google/gemini-3.7-flash",
      image: (out.models?.image as string) ?? "google/gemini-3.1-flash-image",
    },
    features: {
      github: out.features?.github !== false,
      image_generation: out.features?.image_generation !== false,
      preview: out.features?.preview !== false,
    },
    limits: {
      default_credits: (out.limits?.default_credits as number) ?? 100,
      chat_cost: (out.limits?.chat_cost as number) ?? 1,
      image_cost: (out.limits?.image_cost as number) ?? 5,
    },
  };
}

function gatewayError(status: number, body: string): Error {
  if (status === 429) return new Error("AI rate limit reached. Please retry in a moment.");
  if (status === 402) return new Error("AI credits exhausted. Please top up the workspace credits.");
  if (status === 403) return new Error("AI access is blocked by workspace policy.");
  return new Error(`AI request failed (${status}): ${body.slice(0, 400)}`);
}

export async function chatCompletion(model: string, messages: ChatMessage[]): Promise<string> {
  const body: Record<string, unknown> = { model, messages, stream: true };
  if (model.startsWith("openai/gpt-5.6")) body.reasoning_effort = "none";

  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw gatewayError(res.status, await res.text().catch(() => ""));
  }

  // Consume the stream server-side; keeps long generations alive but returns one result.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
        };
        const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content;
        if (delta) text += delta;
      } catch {
        // ignore partial frames
      }
    }
  }
  return text;
}

export async function generateImage(model: string, prompt: string): Promise<string> {
  const isGemini = model.includes("gemini");
  const body = isGemini
    ? { model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }
    : { model, prompt, quality: "low" };

  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) throw gatewayError(res.status, raw);

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("Image generation returned an unreadable response.");
  }
  const b64 = extractImage(json);
  if (!b64) throw new Error("Image generation returned no image.");
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
}

function extractImage(json: unknown): string | null {
  const seen = new Set<unknown>();
  const walk = (node: unknown): string | null => {
    if (!node || typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);
    const obj = node as Record<string, unknown>;
    if (typeof obj.b64_json === "string") return obj.b64_json;
    if (typeof obj.image_url === "string") return obj.image_url;
    if (typeof obj.url === "string" && obj.url.startsWith("data:")) return obj.url;
    for (const value of Object.values(obj)) {
      const found = walk(value);
      if (found) return found;
    }
    return null;
  };
  return walk(json);
}
