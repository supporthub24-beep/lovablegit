import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  Mic,
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

const LOGOS = [
  "Vercel",
  "Supabase",
  "Stripe",
  "GitHub",
  "Linear",
  "Figma",
  "Notion",
  "Shopify",
  "Railway",
  "Resend",
];

const STATS = [
  { value: "12k+", label: "apps prototyped" },
  { value: "48s", label: "median first preview" },
  { value: "3.4M", label: "AI messages handled" },
  { value: "99.9%", label: "preview uptime" },
];

/**
 * Fades and gently slides its children in once they scroll into view.
 * Falls back to fully visible content when IntersectionObserver is unavailable
 * or when the visitor prefers reduced motion.
 */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${shown ? "reveal-in" : ""} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-surface shadow-sm transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary/5">
          {icon}
        </span>
        <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </article>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20">
        {n}
      </span>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
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
    <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div
        className={`relative h-32 overflow-hidden bg-gradient-to-br ${accent} to-transparent`}
      >
        <div className="absolute inset-0 grid-noise opacity-60" />
        <div className="absolute inset-x-4 bottom-4 space-y-1.5">
          <div className="h-2.5 w-20 rounded-full bg-foreground/20" />
          <div className="h-2.5 w-28 rounded-full bg-foreground/10" />
        </div>
      </div>
      <div className="p-5">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <h3 className="mt-2 text-base font-semibold tracking-tight">{title}</h3>
      </div>
    </article>
  );
}

function Point({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4 transition-colors duration-300 hover:border-primary/40">
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-inset ring-primary/20">
        {icon}
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Terminal className="size-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Forge</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 text-sm md:flex">
            <a
              href="#how"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              How it works
            </a>
            <a
              href="#features"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Features
            </a>
            <a
              href="#showcase"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Showcase
            </a>
            <a
              href="#faq"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
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
          <div className="pointer-events-none absolute -right-24 top-40 size-72 rounded-full bg-[color-mix(in_oklch,var(--color-highlight)_12%,transparent)] blur-3xl" />
          <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 md:py-28">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                <Github className="size-3" /> Connect your own GitHub account — no setup needed
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
                Build an app by simply <span className="text-gradient">describing it</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
                Chat with AI, watch the code appear, and see a live preview instantly. When you like
                it, push straight to your GitHub repository.
              </p>
            </Reveal>

            {/* Prompt box */}
            <Reveal delay={180}>
              <div className="glow-primary mx-auto mt-9 max-w-2xl rounded-2xl border border-border bg-card p-2 text-left shadow-lg transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-xl focus-within:shadow-primary/10">
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
                  className="w-full resize-none rounded-xl bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:outline-none"
                />
                <div className="flex items-center justify-between gap-2 px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Dictate your idea with voice"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Mic className="size-4" />
                    </button>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      Free credits included · no credit card
                    </span>
                  </div>
                  <Button onClick={start} className="ml-auto">
                    <Sparkles className="size-4" /> Start building
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {IDEAS.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setPrompt(idea)}
                    className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </Reveal>

            {/* Hero preview mock */}
            <Reveal delay={300}>
              <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
                  <span className="size-2.5 rounded-full bg-destructive/70" />
                  <span className="size-2.5 rounded-full bg-highlight/70" />
                  <span className="size-2.5 rounded-full bg-primary/60" />
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
                      <span className="font-medium text-primary">Hero.tsx</span> and wired the CTA
                      to your router.
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
            </Reveal>
          </div>
        </section>

        {/* Trusted-by marquee */}
        <section aria-label="Trusted by" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Teams ship faster with Forge
            </p>
            <div className="relative mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
              <div className="marquee-track flex w-max items-center gap-12">
                {[...LOGOS, ...LOGOS].map((name, index) => (
                  <span
                    key={`${name}-${index}`}
                    aria-hidden={index >= LOGOS.length}
                    className="whitespace-nowrap text-lg font-semibold tracking-tight text-muted-foreground/70"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="features" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
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
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Reveal delay={0}>
                <Feature
                  icon={<MessageSquareCode className="size-5 text-primary" />}
                  title="AI chat that writes code"
                  body="Every message returns real files, versioned inside your project. Pick the AI model you prefer."
                />
              </Reveal>
              <Reveal delay={60}>
                <Feature
                  icon={<MonitorPlay className="size-5 text-primary" />}
                  title="Instant live preview"
                  body="Multi-file React or plain HTML renders in a sandbox while you work. Nothing is hosted — preview only."
                />
              </Reveal>
              <Reveal delay={120}>
                <Feature
                  icon={<GitBranch className="size-5 text-primary" />}
                  title="Your GitHub, your repos"
                  body="Import existing files, let the AI edit them, and push commits back to your own account."
                />
              </Reveal>
              <Reveal delay={0}>
                <Feature
                  icon={<ImageIcon className="size-5 text-primary" />}
                  title="Logos and images"
                  body="Generate logos, icons, banners and illustrations from chat and drop them into the build."
                />
              </Reveal>
              <Reveal delay={60}>
                <Feature
                  icon={<History className="size-5 text-primary" />}
                  title="Version history & rollback"
                  body="Every AI edit is snapshotted. Restore any earlier version with one click — safely and reversibly."
                />
              </Reveal>
              <Reveal delay={120}>
                <Feature
                  icon={<Database className="size-5 text-primary" />}
                  title="Connect your database"
                  body="Plug your own Supabase project into the preview and query real data from the generated app."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="Forge in numbers" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {STATS.map((stat, index) => (
                <Reveal key={stat.label} delay={index * 60}>
                  <div className="text-center">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="block text-3xl font-semibold tracking-tight text-gradient sm:text-4xl">
                        {stat.value}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {stat.label}
                      </span>
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Rocket className="size-3" /> How it works
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Three simple steps
              </h2>
              <p className="mt-3 text-muted-foreground">
                No installs, no configuration. If you can write a message, you can build an app.
              </p>
            </Reveal>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              <Reveal delay={0}>
                <Step
                  n={1}
                  title="Describe your idea"
                  body="Write what you want in plain language. Forge asks for anything it needs and starts writing code."
                />
              </Reveal>
              <Reveal delay={60}>
                <Step
                  n={2}
                  title="See it live"
                  body="A sandboxed preview updates as files are generated. Switch to the code tab any time to read it."
                />
              </Reveal>
              <Reveal delay={120}>
                <Step
                  n={3}
                  title="Push to GitHub"
                  body="Connect your account and commit the generated files straight into your own repository."
                />
              </Reveal>
            </ol>
          </div>
        </section>

        {/* Showcase / social proof */}
        <section id="showcase" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
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
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Reveal delay={0}>
                <ShowcaseCard
                  label="Marketing site"
                  title="Coffee shop landing"
                  accent="from-primary/25"
                />
              </Reveal>
              <Reveal delay={60}>
                <ShowcaseCard
                  label="Portfolio"
                  title="Designer portfolio"
                  accent="from-primary/20"
                />
              </Reveal>
              <Reveal delay={120}>
                <ShowcaseCard
                  label="SaaS"
                  title="Pricing with 3 plans"
                  accent="from-primary/15"
                />
              </Reveal>
              <Reveal delay={180}>
                <ShowcaseCard
                  label="Dashboard"
                  title="Analytics overview"
                  accent="from-primary/10"
                />
              </Reveal>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <Reveal delay={0}>
                <Point
                  icon={<ShieldCheck className="size-4 text-primary" />}
                  text="Your GitHub token is encrypted and never shared"
                />
              </Reveal>
              <Reveal delay={60}>
                <Point
                  icon={<Check className="size-4 text-primary" />}
                  text="Preview only — we never host or expose your app"
                />
              </Reveal>
              <Reveal delay={120}>
                <Point
                  icon={<Check className="size-4 text-primary" />}
                  text="Free starter credits on every new account"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <Reveal>
              <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
                Frequently asked questions
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <Accordion type="single" collapsible className="mt-8">
                <AccordionItem value="q1">
                  <AccordionTrigger>Do I need to know how to code?</AccordionTrigger>
                  <AccordionContent>
                    No. Describe what you want in everyday language. The code is always visible if
                    you want to learn or edit it, but it is not required.
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
                    The built-in gateway works out of the box, and your workspace administrator can
                    add more providers such as OpenAI, Claude, Gemini or DeepSeek. You pick the
                    model in chat.
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
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="grid-noise relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_100%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent)]" />
          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <Reveal>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to build your first app?
              </h2>
            </Reveal>
            <Reveal delay={60}>
              <p className="mt-3 text-muted-foreground">
                Start with a sentence. Forge handles the files, the preview and the commit.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">
                    <Sparkles className="size-4" /> Start building free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#how">See how it works</a>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Terminal className="size-3.5" />
            </span>
            <span className="font-semibold tracking-tight text-foreground">Forge</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#features"
              className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Features
            </a>
            <a
              href="#how"
              className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              How it works
            </a>
            <a
              href="#showcase"
              className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Showcase
            </a>
            <a
              href="#faq"
              className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              FAQ
            </a>
          </nav>
          <p className="text-xs">© {new Date().getFullYear()} Forge. Preview only — you own the code.</p>
        </div>
      </footer>
    </div>
  );
}
