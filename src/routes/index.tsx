import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Github,
  MessageSquareCode,
  MonitorPlay,
  Image as ImageIcon,
  Terminal,
  ArrowRight,
  Sparkles,
  GitBranch,
  History,
  Database,
  ShieldCheck,
  Check,
  Layers,
  Rocket,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forge — Chat with AI, generate code, preview instantly" },
      {
        name: "description",
        content:
          "Connect your GitHub account, describe what you want, and Forge writes the code, shows a live preview and commits it back — powered by AI.",
      },
      { property: "og:title", content: "Forge — Chat with AI, generate code, preview instantly" },
      {
        property: "og:description",
        content: "GitHub-connected AI development workspace with live preview and image generation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const IDEAS = [
  "A landing page for my coffee shop",
  "A personal portfolio with dark mode",
  "A pricing page with 3 plans",
  "A dashboard with charts",
];

function Landing() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  function start() {
    if (typeof window !== "undefined" && prompt.trim()) {
      window.localStorage.setItem("forge:pending-prompt", prompt.trim());
    }
    void navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <Terminal className="size-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Forge</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="grid-noise relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent)]" />
          <div className="pointer-events-none absolute -left-24 top-24 size-72 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_14%,transparent)] blur-3xl" />
          <div className="pointer-events-none absolute -right-24 top-40 size-72 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)] blur-3xl" />
          <div className="relative mx-auto max-w-5xl px-4 py-20 text-center md:py-28">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              <Github className="size-3" /> Connect your own GitHub account — no setup needed
            </p>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
              Build an app by simply{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                describing it
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Chat with AI, watch the code appear, and see a live preview instantly. When you like
              it, push straight to your GitHub repository.
            </p>

            {/* Prompt box */}
            <div className="mx-auto mt-9 max-w-2xl rounded-2xl border border-border bg-card p-2 text-left shadow-lg">
              <label htmlFor="idea" className="sr-only">
                Describe what you want to build
              </label>
              <textarea
                id="idea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start();
                }}
                rows={3}
                placeholder="Ask Forge to create a landing page for my bakery…"
                className="w-full resize-none rounded-xl bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <span className="hidden text-xs text-muted-foreground sm:block">
                  Free credits included · no credit card
                </span>
                <Button onClick={start} className="ml-auto">
                  <Sparkles className="size-4" /> Start building
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setPrompt(idea)}
                  className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {idea}
                </button>
              ))}
            </div>

            {/* Hero preview mock */}
            <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-destructive/70" />
                <span className="size-2.5 rounded-full bg-primary/60" />
                <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                <span className="ml-3 truncate rounded-md bg-background/60 px-2 py-1 text-xs text-muted-foreground">
                  preview.forge.app
                </span>
              </div>
              <div className="grid gap-4 p-5 text-left sm:grid-cols-[1.1fr_1fr]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquareCode className="size-4 text-primary" />
                    AI chat
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                    Create a hero with a headline, subtitle and a primary call-to-action button.
                  </div>
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs text-foreground">
                    Done — I added{" "}
                    <span className="font-medium text-primary">Hero.tsx</span> and wired the CTA to
                    your router.
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background/60 p-4">
                  <div className="h-3 w-24 rounded-full bg-muted-foreground/30" />
                  <div className="mt-2 h-3 w-40 rounded-full bg-muted-foreground/20" />
                  <div className="mt-4 h-8 w-28 rounded-lg bg-primary/80" />
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    <div className="h-12 rounded-md bg-muted-foreground/15" />
                    <div className="h-12 rounded-md bg-muted-foreground/15" />
                    <div className="h-12 rounded-md bg-muted-foreground/15" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="features" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Layers className="size-3" /> Capabilities
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything in one workspace
              </h2>
              <p className="mt-3 text-muted-foreground">
                Chat, preview, code, assets, history and data — side by side on desktop, tabbed on
                mobile.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Feature
                icon={<MessageSquareCode className="size-5 text-primary" />}
                title="AI chat that writes code"
                body="Every message returns real files, versioned inside your project. Pick the AI model you prefer."
              />
              <Feature
                icon={<MonitorPlay className="size-5 text-primary" />}
                title="Instant live preview"
                body="Multi-file React or plain HTML renders in a sandbox while you work. Nothing is hosted — preview only."
              />
              <Feature
                icon={<GitBranch className="size-5 text-primary" />}
                title="Your GitHub, your repos"
                body="Import existing files, let the AI edit them, and push commits back to your own account."
              />
              <Feature
                icon={<ImageIcon className="size-5 text-primary" />}
                title="Logos and images"
                body="Generate logos, icons, banners and illustrations from chat and drop them into the build."
              />
              <Feature
                icon={<History className="size-5 text-primary" />}
                title="Version history & rollback"
                body="Every AI edit is snapshotted. Restore any earlier version with one click — safely and reversibly."
              />
              <Feature
                icon={<Database className="size-5 text-primary" />}
                title="Connect your database"
                body="Plug your own Supabase project into the preview and query real data from the generated app."
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Rocket className="size-3" /> How it works
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Three simple steps
              </h2>
              <p className="mt-3 text-muted-foreground">
                No installs, no configuration. If you can write a message, you can build an app.
              </p>
            </div>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              <Step
                n={1}
                title="Describe your idea"
                body="Write what you want in plain language. Forge asks for anything it needs and starts writing code."
              />
              <Step
                n={2}
                title="See it live"
                body="A sandboxed preview updates as files are generated. Switch to the code tab any time to read it."
              />
              <Step
                n={3}
                title="Push to GitHub"
                body="Connect your account and commit the generated files straight into your own repository."
              />
            </ol>
          </div>
        </section>

        {/* Showcase / social proof */}
        <section id="showcase" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Wand2 className="size-3" /> Made with Forge
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                From prompt to preview in minutes
              </h2>
              <p className="mt-3 text-muted-foreground">
                A look at the kinds of apps the workspace produces — built from chat, previewed
                live, then pushed to GitHub.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <ShowcaseCard
                label="Marketing site"
                title="Coffee shop landing"
                accent="from-primary/25"
              />
              <ShowcaseCard
                label="Portfolio"
                title="Designer portfolio"
                accent="from-primary/20"
              />
              <ShowcaseCard
                label="SaaS"
                title="Pricing with 3 plans"
                accent="from-primary/15"
              />
              <ShowcaseCard
                label="Dashboard"
                title="Analytics overview"
                accent="from-primary/10"
              />
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <Point
                icon={<ShieldCheck className="size-4 text-primary" />}
                text="Your GitHub token is encrypted and never shared"
              />
              <Point
                icon={<Check className="size-4 text-primary" />}
                text="Preview only — we never host or expose your app"
              />
              <Point
                icon={<Check className="size-4 text-primary" />}
                text="Free starter credits on every new account"
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="mt-8">
              <AccordionItem value="q1">
                <AccordionTrigger>Do I need to know how to code?</AccordionTrigger>
                <AccordionContent>
                  No. Describe what you want in everyday language. The code is always visible if you
                  want to learn or edit it, but it is not required.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>Is my app hosted here?</AccordionTrigger>
                <AccordionContent>
                  No. Forge shows a temporary sandboxed preview only. To publish, push the code to
                  your GitHub repository and deploy it wherever you like.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>Which AI models can I use?</AccordionTrigger>
                <AccordionContent>
                  The built-in gateway works out of the box, and your workspace administrator can add
                  more providers such as OpenAI, Claude, Gemini or DeepSeek. You pick the model in
                  chat.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger>What happens to my GitHub access?</AccordionTrigger>
                <AccordionContent>
                  You authorise Forge yourself, tokens are stored encrypted, and you can disconnect
                  at any time from Settings.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="grid-noise relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_100%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent)]" />
          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to build your first app?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Create a free account and see your idea running in under a minute.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/auth">
                  Start building free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free starter credits · no credit card required
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground">
                <Terminal className="size-4" />
              </span>
              <span className="text-base font-semibold tracking-tight">Forge</span>
            </div>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="#features" className="transition-colors hover:text-foreground">
                Features
              </a>
              <a href="#how" className="transition-colors hover:text-foreground">
                How it works
              </a>
              <a href="#showcase" className="transition-colors hover:text-foreground">
                Showcase
              </a>
              <a href="#faq" className="transition-colors hover:text-foreground">
                FAQ
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">Get started</Link>
              </Button>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} Forge — AI development workspace.</span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              GitHub access is encrypted and reversible any time.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-border bg-card p-6">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {n}
      </span>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </li>
  );
}

function Point({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
      <span className="mt-0.5">{icon}</span>
      {text}
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </span>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}

function ShowcaseCard({
  label,
  title,
  accent,
}: {
  label: string;
  title: string;
  accent: string;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className={`relative h-32 bg-gradient-to-br ${accent} to-transparent`}>
        <div className="absolute inset-4 rounded-lg border border-border/60 bg-background/40 backdrop-blur-sm" />
        <div className="absolute inset-x-6 top-8 space-y-2">
          <div className="h-3 w-20 rounded-full bg-muted-foreground/30" />
          <div className="h-3 w-28 rounded-full bg-muted-foreground/20" />
          <div className="mt-3 h-6 w-16 rounded-md bg-primary/70" />
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <h3 className="mt-1 text-sm font-medium">{title}</h3>
      </div>
    </article>
  );
}
