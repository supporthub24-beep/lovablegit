import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Users, FolderGit2, Coins, Github, Save } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { AiProvidersPanel } from "@/components/AiProvidersPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getMyAccount } from "@/lib/projects.functions";
import {
  getAdminOverview,
  updatePlatformSetting,
  setCustomerCredits,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — Forge" },
      {
        name: "description",
        content: "Configure AI models, feature toggles, customer credits and platform usage.",
      },
      { property: "og:title", content: "Admin console — Forge" },
      { property: "og:description", content: "Platform configuration and customer management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchOverview = useServerFn(getAdminOverview);
  const saveSetting = useServerFn(updatePlatformSetting);
  const saveCredits = useServerFn(setCustomerCredits);

  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    retry: false,
  });

  const [chatModel, setChatModel] = useState("google/gemini-3.7-flash");
  const [imageModel, setImageModel] = useState("google/gemini-3.1-flash-image");
  const [imagesEnabled, setImagesEnabled] = useState(true);
  const [githubEnabled, setGithubEnabled] = useState(true);
  const [freeCredits, setFreeCredits] = useState(100);

  useEffect(() => {
    const s = overview.data?.settings;
    if (!s) return;
    const models = s["models"] as { chat?: string; image?: string } | undefined;
    const features = s["features"] as { images?: boolean; github?: boolean } | undefined;
    const limits = s["limits"] as { signup_credits?: number } | undefined;
    if (models?.chat) setChatModel(models.chat);
    if (models?.image) setImageModel(models.image);
    if (features) {
      setImagesEnabled(features.images !== false);
      setGithubEnabled(features.github !== false);
    }
    if (typeof limits?.signup_credits === "number") setFreeCredits(limits.signup_credits);
  }, [overview.data]);

  if (overview.isError) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader isAdmin={false} />
        <main className="mx-auto max-w-md flex-1 px-4 py-20 text-center text-sm text-muted-foreground">
          You do not have administrator access to this platform.
        </main>
      </div>
    );
  }

  async function persist() {
    try {
      await saveSetting({ data: { key: "models", value: { chat: chatModel, image: imageModel } } });
      await saveSetting({
        data: { key: "features", value: { images: imagesEnabled, github: githubEnabled } },
      });
      await saveSetting({ data: { key: "limits", value: { signup_credits: freeCredits } } });
      toast.success("Platform settings saved.");
      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    }
  }

  const totals = overview.data?.totals;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader isAdmin={account.data?.isAdmin} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin console</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Users className="size-4" />} label="Customers" value={totals?.customers ?? 0} />
          <Stat icon={<FolderGit2 className="size-4" />} label="Projects" value={totals?.projects ?? 0} />
          <Stat icon={<Coins className="size-4" />} label="Credits used" value={totals?.creditsUsed ?? 0} />
          <Stat
            icon={<Github className="size-4" />}
            label="GitHub connector"
            value={totals?.githubConfigured ? "Ready" : "Not set up"}
          />
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">AI configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These models power chat, code generation and image creation for every customer. No API
            key is required — requests run through the built-in AI gateway.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="chat-model">Chat / code model</Label>
              <Input id="chat-model" value={chatModel} onChange={(e) => setChatModel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="image-model">Image model</Label>
              <Input id="image-model" value={imageModel} onChange={(e) => setImageModel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credits">Signup credits</Label>
              <Input
                id="credits"
                type="number"
                value={freeCredits}
                onChange={(e) => setFreeCredits(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={imagesEnabled} onCheckedChange={setImagesEnabled} />
              Image &amp; logo generation
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={githubEnabled} onCheckedChange={setGithubEnabled} />
              GitHub integration
            </label>
          </div>
          <Button className="mt-5" onClick={persist}>
            <Save className="size-4" /> Save settings
          </Button>
        </section>

        <AiProvidersPanel />

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Customers</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Email</th>
                  <th className="py-2">Joined</th>
                  <th className="py-2">Credits</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {(overview.data?.customers ?? []).map((c) => (
                  <CustomerRow
                    key={c.id}
                    customer={c}
                    onSave={async (credits) => {
                      await saveCredits({ data: { userId: c.id, credits } });
                      toast.success("Credits updated.");
                      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function CustomerRow({
  customer,
  onSave,
}: {
  customer: { id: string; email: string | null; credits: number | null; created_at: string };
  onSave: (credits: number) => Promise<void>;
}) {
  const [credits, setCredits] = useState(customer.credits ?? 0);
  return (
    <tr className="border-t border-border">
      <td className="py-2">{customer.email ?? customer.id.slice(0, 8)}</td>
      <td className="py-2 text-muted-foreground">
        {new Date(customer.created_at).toLocaleDateString()}
      </td>
      <td className="py-2">
        <Input
          type="number"
          value={credits}
          onChange={(e) => setCredits(Number(e.target.value))}
          className="h-8 w-24"
        />
      </td>
      <td className="py-2 text-right">
        <Button size="sm" variant="secondary" onClick={() => onSave(credits)}>
          Save
        </Button>
      </td>
    </tr>
  );
}
