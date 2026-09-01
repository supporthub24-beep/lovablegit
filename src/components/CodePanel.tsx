import { useState } from "react";
import { FileCode } from "lucide-react";
import type { GeneratedFile } from "@/lib/codegen";

export function CodePanel({ files }: { files: GeneratedFile[] }) {
  const [active, setActive] = useState(0);
  const current = files[active];

  if (!files.length) {
    return (
      <div className="flex h-full items-center justify-center bg-surface text-sm text-muted-foreground">
        No files yet. Ask the AI to generate the project.
      </div>
    );
  }

  return (
    <div className="flex h-full bg-surface">
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-border p-2">
        {files.map((f, i) => (
          <button
            key={f.path}
            onClick={() => setActive(i)}
            className={
              i === active
                ? "flex w-full items-center gap-2 rounded bg-secondary px-2 py-1.5 text-left text-xs text-foreground"
                : "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-secondary/60"
            }
          >
            <FileCode className="size-3.5 shrink-0" />
            <span className="truncate font-mono">{f.path}</span>
          </button>
        ))}
      </aside>
      <pre className="flex-1 overflow-auto bg-background p-4 text-xs leading-relaxed">
        <code className="font-mono">{current?.content}</code>
      </pre>
    </div>
  );
}
