import { toast } from "sonner";

export type Asset = {
  id: string;
  kind: string;
  prompt: string | null;
  data_url: string;
  created_at: string;
};

export function AssetPanel({ assets }: { assets: Asset[] }) {
  if (!assets.length) {
    return (
      <div className="flex h-full items-center justify-center bg-surface p-6 text-center text-sm text-muted-foreground">
        Generate logos, icons, banners or images from the chat — they will appear here and can be
        used directly in your project.
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-2 gap-3 overflow-y-auto bg-surface p-4 md:grid-cols-3">
      {assets.map((a) => (
        <figure key={a.id} className="overflow-hidden rounded-lg border border-border bg-card">
          <img
            src={a.data_url}
            alt={a.prompt ?? a.kind}
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
          <figcaption className="space-y-1 p-2">
            <p className="truncate text-xs text-muted-foreground">{a.prompt}</p>
            <button
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => {
                void navigator.clipboard.writeText(a.data_url);
                toast.success("Image data URL copied — paste it in chat to use it.");
              }}
            >
              Copy for chat
            </button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
