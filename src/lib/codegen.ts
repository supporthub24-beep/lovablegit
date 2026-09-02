export type GeneratedFile = { path: string; content: string };

/**
 * The AI is instructed to emit files inside <lov-file path="..."> ... </lov-file>
 * blocks. This parses them out and returns the remaining prose separately.
 */
export function parseAiResponse(raw: string): { message: string; files: GeneratedFile[] } {
  const files: GeneratedFile[] = [];
  const re = /<lov-file\s+path="([^"]+)"\s*>([\s\S]*?)<\/lov-file>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    let content = (match[2] ?? "").replace(/^\r?\n/, "");
    content = content.replace(/^```[a-zA-Z]*\r?\n/, "").replace(/```\s*$/, "");
    files.push({ path: (match[1] ?? "").trim(), content });
  }
  const message = raw.replace(re, "").trim();
  return { message: message || "Updated the project files.", files };
}

export type PreviewDbConfig = { supabase_url: string | null; supabase_anon_key: string | null };

/** Build a self-contained HTML document for the sandboxed preview iframe. */
export function buildPreviewDocument(files: GeneratedFile[], db?: PreviewDbConfig | null): string {
  const byPath = new Map(files.map((f) => [f.path.replace(/^\.?\//, ""), f.content]));
  const html = byPath.get("index.html");
  if (!html) {
    return `<!doctype html><html><body style="font-family:system-ui;background:#101317;color:#8b95a5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>No preview yet — ask the AI to build something.</p></body></html>`;
  }
  let doc = html;
  for (const [path, content] of byPath) {
    if (path === "index.html") continue;
    if (path.endsWith(".css")) {
      doc = doc.replace(
        new RegExp(`<link[^>]*href=["']\\.?/?${escapeRe(path)}["'][^>]*>`, "g"),
        `<style>\n${content}\n</style>`,
      );
    } else if (path.endsWith(".js")) {
      doc = doc.replace(
        new RegExp(`<script[^>]*src=["']\\.?/?${escapeRe(path)}["'][^>]*>\\s*</script>`, "g"),
        `<script>\n${content}\n</script>`,
      );
    }
  }
  if (db?.supabase_url && db?.supabase_anon_key) {
    const boot = `<script type="module">
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
window.supabase = createClient(${JSON.stringify(db.supabase_url)}, ${JSON.stringify(db.supabase_anon_key)});
</script>`;
    doc = doc.includes("</head>") ? doc.replace("</head>", `${boot}\n</head>`) : `${boot}\n${doc}`;
  }
  return doc;
}

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const SYSTEM_PROMPT = `You are the code-generation engine of an AI web development platform.

Rules:
- Produce a complete, runnable static web app the user can preview instantly in a sandboxed iframe.
- Always output the FULL content of every file you create or change, wrapped like:
  <lov-file path="index.html">...full file...</lov-file>
- index.html is required and must be self-contained enough to render: load Tailwind via
  <script src="https://cdn.tailwindcss.com"></script> and reference ./styles.css and ./app.js when you create them.
- You may also emit styles.css and app.js. Keep the file count small.
- Write modern, accessible, responsive, beautiful UI. No lorem ipsum placeholders.
- When the user asks a question rather than a change, answer in prose with no file blocks.
- Outside the file blocks, write a SHORT summary (1-3 sentences) of what you changed. Reply in the user's language.
- When image assets are provided in context as data URLs, use them directly in src attributes.`;
