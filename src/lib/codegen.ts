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

const REACT_ENTRIES = ["src/main.tsx", "src/main.jsx", "src/index.tsx", "src/index.jsx"];

function supabaseBoot(db?: PreviewDbConfig | null) {
  if (!db?.supabase_url || !db?.supabase_anon_key) return "";
  return `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
window.supabaseClient = window.supabase.createClient(${JSON.stringify(db.supabase_url)}, ${JSON.stringify(db.supabase_anon_key)});
</script>`;
}

/** Build a self-contained HTML document for the sandboxed preview iframe. */
export function buildPreviewDocument(files: GeneratedFile[], db?: PreviewDbConfig | null): string {
  const byPath = new Map(files.map((f) => [f.path.replace(/^\.?\//, ""), f.content]));

  let entry = REACT_ENTRIES.find((p) => byPath.has(p));
  if (!entry) {
    // Imported repos may use other entry names (main.tsx at root, src/App.tsx, …).
    entry = [...byPath.keys()].find((p) =>
      /^(src\/)?(main|index|entry-client)\.(t|j)sx?$/.test(p),
    );
  }
  if (!entry) {
    // Fall back to an App component: synthesize a mount entry for it.
    const app = [...byPath.keys()].find((p) => /^(src\/)?App\.(t|j)sx$/.test(p));
    if (app) {
      const synthetic = "src/__preview-entry.jsx";
      byPath.set(
        synthetic,
        `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "${
          "./" + app.replace(/^src\//, "").replace(/\.(t|j)sx?$/, "")
        }";\ncreateRoot(document.getElementById("root")).render(React.createElement(App));\n`,
      );
      entry = synthetic;
    }
  }
  if (entry) return buildReactPreview(byPath, entry, db);

  const htmlPath = byPath.has("index.html")
    ? "index.html"
    : [...byPath.keys()].find((p) => p.endsWith("index.html"));
  const html = htmlPath ? byPath.get(htmlPath) : undefined;
  if (!html) {
    const list = [...byPath.keys()].slice(0, 12).map((p) => `<li>${p}</li>`).join("");
    return `<!doctype html><html><body style="font-family:system-ui;background:#101317;color:#8b95a5;padding:24px;margin:0"><p style="font-size:15px">No renderable entry file found${
      byPath.size ? " in this project" : " yet — ask the AI to build something"
    }.</p>${
      byPath.size
        ? `<p style="font-size:13px">The preview needs an <code>index.html</code>, <code>src/main.tsx</code> or <code>src/App.tsx</code>. Files loaded:</p><ul style="font-size:12px">${list}</ul><p style="font-size:13px">Ask the AI in chat to create a preview entry file.</p>`
        : ""
    }</body></html>`;
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
  const boot = supabaseBoot(db);
  if (boot) {
    doc = doc.includes("</head>") ? doc.replace("</head>", `${boot}\n</head>`) : `${boot}\n${doc}`;
  }
  return doc;
}

/**
 * Multi-file React/Vite preview: every source file is transpiled in the browser
 * with Babel standalone into CommonJS modules and linked by a tiny loader.
 * Bare npm imports are resolved from esm.sh at runtime.
 */
function buildReactPreview(
  byPath: Map<string, string>,
  entry: string,
  db?: PreviewDbConfig | null,
): string {
  const modules: Record<string, string> = {};
  for (const [path, content] of byPath) {
    if (/\.(tsx?|jsx?|css|json)$/.test(path)) modules[path] = content;
  }

  const bare = new Set<string>();
  const importRe = /(?:from\s*|import\s*|require\(\s*)["']([^"'.][^"']*)["']/g;
  for (const content of Object.values(modules)) {
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(content)) !== null) {
      const spec = m[1] ?? "";
      if (spec.startsWith("http")) continue;
      const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]!;
      bare.add(spec.startsWith("react-dom") ? spec : pkg);
    }
  }
  bare.add("react");
  bare.add("react-dom/client");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/@babel/standalone@7.24.7/babel.min.js"></script>
${supabaseBoot(db)}
<style>body{margin:0}</style>
</head>
<body>
<div id="root"></div>
<script>
window.__FILES__ = ${JSON.stringify(modules)};
window.__BARE__ = ${JSON.stringify([...bare])};
window.__ENTRY__ = ${JSON.stringify(entry)};
</script>
<script type="module">
const externals = {};
const failed = [];
await Promise.all(
  window.__BARE__.map(async (spec) => {
    try {
      externals[spec] = await import("https://esm.sh/" + spec + "?dev");
    } catch (e) {
      failed.push(spec);
    }
  })
);

const files = window.__FILES__;
const cache = {};

function resolve(from, spec) {
  if (!spec.startsWith(".")) return null;
  const base = from.split("/").slice(0, -1);
  for (const part of spec.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") base.pop();
    else base.push(part);
  }
  const path = base.join("/");
  const candidates = [path, path + ".tsx", path + ".ts", path + ".jsx", path + ".js", path + "/index.tsx", path + "/index.jsx", path + "/index.ts", path + "/index.js"];
  return candidates.find((c) => c in files) ?? null;
}

function req(from, spec) {
  const path = resolve(from, spec);
  if (!path) {
    const mod = externals[spec] ?? externals[spec.split("/")[0]];
    if (!mod) throw new Error("Cannot resolve module: " + spec);
    return mod.default && Object.keys(mod).length === 1 ? mod.default : mod;
  }
  return load(path);
}

function load(path) {
  if (cache[path]) return cache[path].exports;
  const source = files[path];
  const module = { exports: {} };
  cache[path] = module;
  if (path.endsWith(".css")) {
    const style = document.createElement("style");
    style.textContent = source;
    document.head.appendChild(style);
    return module.exports;
  }
  if (path.endsWith(".json")) {
    module.exports = JSON.parse(source);
    return module.exports;
  }
  const code = Babel.transform(source, {
    filename: path,
    presets: [["react", { runtime: "classic" }], "typescript"],
    plugins: ["transform-modules-commonjs"],
  }).code;
  const React = externals["react"]?.default ?? externals["react"];
  const fn = new Function("require", "module", "exports", "React", code);
  fn((spec) => req(path, spec), module, module.exports, React);
  return module.exports;
}

try {
  load(window.__ENTRY__);
} catch (error) {
  document.body.innerHTML =
    '<pre style="font:13px/1.5 ui-monospace,monospace;color:#ff6b6b;padding:16px;white-space:pre-wrap">' +
    String(error && error.stack || error) +
    '</pre>';
}
</script>
</body>
</html>`;
}

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const SYSTEM_PROMPT = `You are the code-generation engine of an AI web development platform.

Rules:
- Always output the FULL content of every file you create or change, wrapped like:
  <lov-file path="src/App.tsx">...full file...</lov-file>
- DEFAULT to a multi-file React (Vite-style) project. Required entry: src/main.tsx which imports
  React and ReactDOM from "react" / "react-dom/client" and renders <App /> into #root.
  Additional files live under src/ (src/App.tsx, src/components/*.tsx, src/index.css).
  Tailwind CSS is already available in the preview via CDN — just use Tailwind classes.
- Relative imports must include no extension or a .tsx/.ts extension; npm packages are loaded from a CDN,
  so keep third-party dependencies minimal (lucide-react and framer-motion are safe).
- Only produce a single static index.html instead when the user explicitly asks for plain HTML/CSS/JS.
- Write modern, accessible, responsive, beautiful UI. No lorem ipsum placeholders.
- When the user asks a question rather than a change, answer in prose with no file blocks.
- Outside the file blocks, write a SHORT summary (1-3 sentences) of what you changed. Reply in the user's language.
- When image assets are provided in context as data URLs, use them directly in src attributes.`;

