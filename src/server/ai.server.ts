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
      chat: (out['models']?.['chat'] as string) ?? "",
      image: (out['models']?.['image'] as string) ?? "",
    },
    features: {
      github: out['features']?.['github'] !== false,
      image_generation: out['features']?.['image_generation'] !== false,
      preview: out['features']?.['preview'] !== false,
    },
    limits: {
      default_credits: (out['limits']?.['default_credits'] as number) ?? 100,
      chat_cost: (out['limits']?.['chat_cost'] as number) ?? 1,
      image_cost: (out['limits']?.['image_cost'] as number) ?? 5,
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
  if (model.startsWith("openai/gpt-5.6")) body['reasoning_effort'] = "none";

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
  if (!model) {
    throw new Error("No image model is configured. An administrator must save one in the admin console.");
  }
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
    if (typeof obj['b64_json'] === "string") return obj['b64_json'];
    if (typeof obj['image_url'] === "string") return obj['image_url'];
    if (typeof obj['url'] === "string" && obj['url'].startsWith("data:")) return obj['url'];
    for (const value of Object.values(obj)) {
      const found = walk(value);
      if (found) return found;
    }
    return null;
  };
  return walk(json);
}

// ---------------------------------------------------------------------------
// Custom (admin-configured) AI providers: OpenAI-compatible, Anthropic, Google
// ---------------------------------------------------------------------------

export type ProviderRow = {
  id: string;
  label: string;
  kind: string;
  base_url: string;
  api_key: string;
  models: string[] | null;
  enabled: boolean;
};

/** Resolve "gateway::model" or "<providerId>::model" into a callable target. */
export async function resolveChatTarget(
  modelId: string | undefined,
  fallbackModel: string,
): Promise<{ provider: ProviderRow | null; model: string }> {
  if (!modelId || modelId.startsWith("gateway::")) {
    const model = modelId?.split("::").slice(1).join("::") || fallbackModel;
    if (!model) {
      throw new Error(
        "No AI model is configured. An administrator must save a provider and model in the admin console.",
      );
    }
    return { provider: null, model };
  }
  const [providerId, ...rest] = modelId.split("::");
  const model = rest.join("::");
  if (!providerId || !model) {
    if (!fallbackModel) {
      throw new Error(
        "No AI model is configured. An administrator must save a provider and model in the admin console.",
      );
    }
    return { provider: null, model: fallbackModel };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("ai_providers")
    .select("id, label, kind, base_url, api_key, models, enabled")
    .eq("id", providerId)
    .maybeSingle();
  if (!data || !data.enabled) throw new Error("That AI model is not available.");
  return { provider: data as ProviderRow, model };
}

export async function chatWithTarget(
  target: { provider: ProviderRow | null; model: string },
  messages: ChatMessage[],
): Promise<string> {
  if (!target.provider) return chatCompletion(target.model, messages);
  const { provider, model } = target;
  const base = provider.base_url.replace(/\/+$/, "");

  if (provider.kind === "anthropic") {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const rest = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch(`${base}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": provider.api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, system, messages: rest, max_tokens: 8000 }),
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`AI request failed (${res.status}): ${raw.slice(0, 400)}`);
    const json = JSON.parse(raw) as { content?: Array<{ text?: string }> };
    return (json.content ?? []).map((c) => c.text ?? "").join("");
  }

  if (provider.kind === "google") {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const res = await fetch(
      `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(provider.api_key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        }),
      },
    );
    const raw = await res.text();
    if (!res.ok) throw new Error(`AI request failed (${res.status}): ${raw.slice(0, 400)}`);
    const json = JSON.parse(raw) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  }

  // OpenAI-compatible (OpenAI, DeepSeek, Groq, xAI, OpenRouter, Together, …)
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${raw.slice(0, 400)}`);
  const json = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}
