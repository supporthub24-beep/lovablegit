import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  FolderGit2,
  Coins,
  Github,
  Save,
  LayoutDashboard,
  Sparkles,
  Activity,
  Settings2,
  Search,
  RefreshCw,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { AiProvidersPanel } from "@/components/AiProvidersPanel";
import { DataPanel } from "@/components/DataPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyAccount } from "@/lib/projects.functions";
import {
  getAdminOverview,
  updatePlatformSetting,
  setCustomerCredits,
  saveAiKey,
  getAiKeyStatus,
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

type UsageRow = {
  kind: string;
  credits: number | null;
  model: string | null;
  created_at: string;
  user_id: string;
};

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
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

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

  const customers = overview.data?.customers ?? [];
  const usage = (overview.data?.usage ?? []) as UsageRow[];

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => (c.email ?? "").toLowerCase().includes(q));
  }, [customers, search]);

  const usageByKind = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of usage) map.set(u.kind, (map.get(u.kind) ?? 0) + (u.credits ?? 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [usage]);

  if (overview.isError) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader isAdmin={false} />
        <main className="mx-auto max-w-md flex-1 px-4 py-20 text-center">
          <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            You do not have administrator access to this platform.
          </p>
        </main>
      </div>
    );
  }

  async function persist() {
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  const totals = overview.data?.totals;
  const loading = overview.isLoading;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader isAdmin={account.data?.isAdmin} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin console</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage AI keys, providers, customers, credits and platform features.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-overview"] })}
          >
            <RefreshCw className={`size-4 ${overview.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            loading={loading}
            icon={<Users className="size-4" />}
            label="Customers"
            value={totals?.customers ?? 0}
          />
          <Stat
            loading={loading}
            icon={<FolderGit2 className="size-4" />}
            label="Projects"
            value={totals?.projects ?? 0}
          />
          <Stat
            loading={loading}
            icon={<Coins className="size-4" />}
            label="Credits used"
            value={totals?.creditsUsed ?? 0}
          />
          <Stat
            loading={loading}
            icon={<Github className="size-4" />}
            label="GitHub connector"
            value={
              <Badge variant={totals?.githubConfigured ? "default" : "secondary"}>
                {totals?.githubConfigured ? "Ready" : "Not set up"}
              </Badge>
            }
          />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutDashboard className="size-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="keys" className="gap-1.5">
              <KeyRound className="size-4" /> API keys
            </TabsTrigger>
            <TabsTrigger value="providers" className="gap-1.5">
              <Sparkles className="size-4" /> AI providers
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5">
              <Users className="size-4" /> Customers
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5">
              <Activity className="size-4" /> Usage
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5">
              <Database className="size-4" /> Data
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings2 className="size-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5 space-y-5">
            <Section
              title="Platform health"
              description="A quick snapshot of the last 200 recorded activity events."
            >
              {usageByKind.length === 0 ? (
                <Empty text="No usage recorded yet." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {usageByKind.map(([kind, credits]) => (
                    <div key={kind} className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{kind}</p>
                      <p className="mt-1 text-xl font-semibold">{credits} credits</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Newest customers" description="Latest accounts created on the platform.">
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : customers.length === 0 ? (
                <Empty text="No customers yet." />
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {customers.slice(0, 6).map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2.5">
                      <span className="truncate">{c.email ?? c.id.slice(0, 8)}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()} · {c.credits ?? 0} credits
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="keys" className="mt-5">
            <AiKeysPanel />
          </TabsContent>

          <TabsContent value="providers" className="mt-5">
            <AiProvidersPanel />
          </TabsContent>

          <TabsContent value="customers" className="mt-5">
            <Section
              title="Customers"
              description="Adjust credit balances for individual accounts."
              action={
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by email"
                    className="h-9 pl-8"
                  />
                </div>
              }
            >
              <div className="overflow-x-auto">
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
                    {filteredCustomers.map((c) => (
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
                {filteredCustomers.length === 0 && !loading ? (
                  <Empty text="No customers match this search." />
                ) : null}
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="usage" className="mt-5">
            <Section title="Recent activity" description="Latest AI and platform events.">
              {usage.length === 0 ? (
                <Empty text="No activity yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2">When</th>
                        <th className="py-2">Kind</th>
                        <th className="py-2">Model</th>
                        <th className="py-2 text-right">Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.slice(0, 60).map((u, i) => (
                        <tr key={`${u.created_at}-${i}`} className="border-t border-border">
                          <td className="py-2 text-muted-foreground">
                            {new Date(u.created_at).toLocaleString()}
                          </td>
                          <td className="py-2">
                            <Badge variant="secondary">{u.kind}</Badge>
                          </td>
                          <td className="py-2 text-muted-foreground">{u.model ?? "—"}</td>
                          <td className="py-2 text-right font-medium">{u.credits ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="data" className="mt-5">
            <DataPanel />
          </TabsContent>

          <TabsContent value="settings" className="mt-5 space-y-5">
            <Section
              title="Default AI models"
              description="Used when a customer does not pick a specific model. Requests use the API keys saved in the API keys tab."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="chat-model">Chat / code model</Label>
                  <Input
                    id="chat-model"
                    value={chatModel}
                    onChange={(e) => setChatModel(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="image-model">Image model</Label>
                  <Input
                    id="image-model"
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Features & limits" description="Toggle capabilities for all customers.">
              <div className="space-y-4">
                <ToggleRow
                  label="Image & logo generation"
                  hint="Allow customers to generate images and logos from chat."
                  checked={imagesEnabled}
                  onChange={setImagesEnabled}
                />
                <ToggleRow
                  label="GitHub integration"
                  hint="Allow customers to connect repositories, import and push code."
                  checked={githubEnabled}
                  onChange={setGithubEnabled}
                />
                <div className="max-w-xs space-y-1.5">
                  <Label htmlFor="credits">Signup credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    value={freeCredits}
                    onChange={(e) => setFreeCredits(Number(e.target.value))}
                  />
                </div>
              </div>
            </Section>

            <div className="sticky bottom-4 flex justify-end">
              <Button onClick={persist} disabled={saving}>
                <Save className="size-4" /> {saving ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

type ProviderKeyStatus = {
  provider: "openai" | "google";
  label: string;
  configured: boolean;
  updatedAt: string | null;
};

function AiKeysPanel() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getAiKeyStatus);
  const saveKey = useServerFn(saveAiKey);

  const status = useQuery({
    queryKey: ["ai-key-status"],
    queryFn: () => fetchStatus(),
    retry: false,
  });

  const [values, setValues] = useState<Record<"openai" | "google", string>>({
    openai: "",
    google: "",
  });
  const [savingProvider, setSavingProvider] = useState<"openai" | "google" | null>(null);

  const rows: ProviderKeyStatus[] = status.data ?? [
    { provider: "openai", label: "OpenAI", configured: false, updatedAt: null },
    { provider: "google", label: "Google Gemini", configured: false, updatedAt: null },
  ];

  async function submit(provider: "openai" | "google") {
    const apiKey = values[provider].trim();
    if (!apiKey) {
      toast.error("Enter an API key before saving.");
      return;
    }
    setSavingProvider(provider);
    try {
      await saveKey({ data: { provider, apiKey } });
      toast.success("API key saved server-side. It is never sent to the browser again.");
      setValues((prev) => ({ ...prev, [provider]: "" }));
      await qc.invalidateQueries({ queryKey: ["ai-key-status"] });
      await qc.invalidateQueries({ queryKey: ["chat-models"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the API key");
    } finally {
      setSavingProvider(null);
    }
  }

  return (
    <Section
      title="AI provider API keys"
      description="Keys are stored server-side only and are never returned to the browser. Chat and image generation use these keys; without them the workspace shows a clear setup error instead of placeholder output."
    >
      {status.isPending ? (
        <div className="space-y-3">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : status.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load API key status:{" "}
          {status.error instanceof Error ? status.error.message : "unknown error"}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.provider} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.label}</span>
                  {row.configured ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="size-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not configured</Badge>
                  )}
                </div>
                {row.updatedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(row.updatedAt).toLocaleString()}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`key-${row.provider}`}>
                    {row.configured ? "Replace API key" : "API key"}
                  </Label>
                  <Input
                    id={`key-${row.provider}`}
                    type="password"
                    autoComplete="off"
                    placeholder={row.configured ? "••••••••  (leave blank to keep)" : "Paste the key"}
                    value={values[row.provider]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [row.provider]: e.target.value }))
                    }
                  />
                </div>
                <Button
                  onClick={() => submit(row.provider)}
                  disabled={savingProvider === row.provider}
                >
                  <Save className="size-4" />
                  {savingProvider === row.provider ? "Saving…" : "Save key"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function Stat({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <div className="mt-2 text-2xl font-semibold">{value}</div>
      )}
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
  const dirty = credits !== (customer.credits ?? 0);
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
        <Button size="sm" variant={dirty ? "default" : "secondary"} onClick={() => onSave(credits)}>
          Save
        </Button>
      </td>
    </tr>
  );
}
