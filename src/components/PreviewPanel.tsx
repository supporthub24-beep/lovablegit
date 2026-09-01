import { useMemo, useState } from "react";
import { Monitor, Smartphone, RefreshCw, Info } from "lucide-react";
import { buildPreviewDocument, type GeneratedFile } from "@/lib/codegen";
import { Button } from "@/components/ui/button";

export function PreviewPanel({ files }: { files: GeneratedFile[] }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [nonce, setNonce] = useState(0);
  const doc = useMemo(() => buildPreviewDocument(files), [files]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="size-3.5" />
          <span>Temporary preview — not hosted</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={device === "desktop" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setDevice("desktop")}
          >
            <Monitor className="size-4" />
          </Button>
          <Button
            variant={device === "mobile" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setDevice("mobile")}
          >
            <Smartphone className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setNonce((n) => n + 1)}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto bg-surface p-4">
        <iframe
          key={nonce}
          title="Project preview"
          srcDoc={doc}
          sandbox="allow-scripts allow-forms allow-popups"
          className={
            device === "mobile"
              ? "h-[720px] w-[390px] rounded-xl border border-border bg-white shadow-2xl"
              : "h-full min-h-[600px] w-full rounded-lg border border-border bg-white"
          }
        />
      </div>
    </div>
  );
}
