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
import { LovableGitLogo } from "@/components/LovableGitLogo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "lovablegit — Chat with AI, generate code, preview instantly" },
      {
        name: "description",
        content:
          "Connect your GitHub account, describe what you want, and lovablegit writes the code, shows a live preview and commits it back — powered by AI.",
      },
      {
        property: "og:title",
        content: "lovablegit — Chat with AI, generate code, preview instantly",
      },
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex flex-1 flex-col">
        <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-surface shadow-sm transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary/5">
          {icon}
        </span>
        <h3 className="mt-5 text-base font-semibold tracking-tight text-balance sm:text-lg">
          {title}
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>
      </div>
    </article>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20">
        {n}
      </span>
      <h3 className="mt-5 text-base font-semibold tracking-tight text-balance sm:text-lg">
        {title}
      </h3>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
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
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <h3 className="mt-2 text-base font-semibold tracking-tight text-balance">{title}</h3>
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
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{text}</p>
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
            aria-label="lovablegit home"
            className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <LovableGitLogo className="h-7 w-auto text-foreground" />
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
        <section className="relative overflow-hidden border-b border-border bg-background">
          {/* Lovable-style gradient wash */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]">
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,#ff7a18_0%,#ff2d7a_38%,#a855f7_62%,#2563eb_82%,transparent_100%)] opacity-90 blur-[2px]" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
          </div>

          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <Reveal>
              <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs text-foreground shadow-sm backdrop-blur">
                <Github className="size-3.5" /> Connect all your tools
                <ArrowRight className="size-3.5" />
              </p>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="mx-auto mt-8 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                What&apos;s on your mind?
              </h1>
            </Reveal>

            {/* Prompt box */}
            <Reveal delay={140}>
              <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-border bg-card/90 p-3 text-left shadow-2xl backdrop-blur transition-all duration-300 focus-within:border-primary/50">
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
                  rows={2}
                  placeholder="Create a landing page about…"
                  className="w-full resize-none rounded-2xl bg-transparent px-3 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:outline-none"
                />
                <div className="flex items-center justify-between gap-2 px-1 pb-1">
                  <button
                    type="button"
                    aria-label="Add attachment"
                    className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Wand2 className="size-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Dictate your idea with voice"
                      className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Mic className="size-4" />
                    </button>
                    <Button onClick={start} size="sm" className="rounded-full">
                      <Sparkles className="size-4" /> Start
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {IDEAS.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setPrompt(idea)}
                    className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </Reveal>

            <div className="h-40 sm:h-56" />
          </div>
        </section>


        {/* Trusted-by marquee */}
        <section aria-label="Trusted by" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Teams ship faster with lovablegit
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
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Layers className="size-3" /> Capabilities
              </span>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything in one workspace
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Chat, preview, code, assets, history and data — side by side on desktop, tabbed on
                mobile.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Reveal delay={0} className="h-full">
                <Feature
                  icon={<MessageSquareCode className="size-5 text-primary" />}
                  title="AI chat that writes code"
                  body="Every message returns real files, versioned inside your project. Pick the AI model you prefer."
                />
              </Reveal>
              <Reveal delay={60} className="h-full">
                <Feature
                  icon={<MonitorPlay className="size-5 text-primary" />}
                  title="Instant live preview"
                  body="Multi-file React or plain HTML renders in a sandbox while you work. Nothing is hosted — preview only."
                />
              </Reveal>
              <Reveal delay={120} className="h-full">
                <Feature
                  icon={<GitBranch className="size-5 text-primary" />}
                  title="Your GitHub, your repos"
                  body="Import existing files, let the AI edit them, and push commits back to your own account."
                />
              </Reveal>
              <Reveal delay={0} className="h-full">
                <Feature
                  icon={<ImageIcon className="size-5 text-primary" />}
                  title="Logos and images"
                  body="Generate logos, icons, banners and illustrations from chat and drop them into the build."
                />
              </Reveal>
              <Reveal delay={60} className="h-full">
                <Feature
                  icon={<History className="size-5 text-primary" />}
                  title="Version history & rollback"
                  body="Every AI edit is snapshotted. Restore any earlier version with one click — safely and reversibly."
                />
              </Reveal>
              <Reveal delay={120} className="h-full">
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
        <section aria-label="lovablegit in numbers" className="border-b border-border bg-surface">
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
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Rocket className="size-3" /> How it works
              </span>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Three simple steps
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                No installs, no configuration. If you can write a message, you can build an app.
              </p>
            </Reveal>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              <Reveal delay={0} className="h-full">
                <Step
                  n={1}
                  title="Describe your idea"
                  body="Write what you want in plain language. lovablegit asks for anything it needs and starts writing code."
                />
              </Reveal>
              <Reveal delay={60} className="h-full">
                <Step
                  n={2}
                  title="See it live"
                  body="A sandboxed preview updates as files are generated. Switch to the code tab any time to read it."
                />
              </Reveal>
              <Reveal delay={120} className="h-full">
                <Step
                  n={3}
                  title="Push to GitHub"
                  body="Connect your account and commit the generated project straight into a repository you own."
                />
              </Reveal>
            </ol>
          </div>
        </section>

        {/* Showcase */}
        <section id="showcase" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Wand2 className="size-3" /> Showcase
              </span>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Made with a single prompt
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Real projects generated from chat, then refined with follow-up messages.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Reveal delay={0} className="h-full">
                <ShowcaseCard
                  label="Landing page"
                  title="Coffee shop with online ordering"
                  accent="from-primary/25"
                />
              </Reveal>
              <Reveal delay={60} className="h-full">
                <ShowcaseCard
                  label="Dashboard"
                  title="Analytics with live charts"
                  accent="from-highlight/25"
                />
              </Reveal>
              <Reveal delay={120} className="h-full">
                <ShowcaseCard
                  label="Portfolio"
                  title="Personal site with dark mode"
                  accent="from-primary/20"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Why lovablegit */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3" /> Built for real work
              </span>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Your code stays yours
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Everything lovablegit generates lands in your own GitHub repository. No lock-in, no
                hidden hosting, no surprises.
              </p>
              <ul className="mt-8 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/20">
                    <Check className="size-3 text-primary" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Commit history you control, on your own account.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/20">
                    <Check className="size-3 text-primary" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Bring your own Supabase project for real data.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/20">
                    <Check className="size-3 text-primary" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Roll back any AI edit with a single click.
                  </span>
                </li>
              </ul>
            </Reveal>
            <Reveal delay={80}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Point
                  icon={<Terminal className="size-4 text-primary" />}
                  text="Read and edit the generated code directly in the workspace."
                />
                <Point
                  icon={<GitBranch className="size-4 text-primary" />}
                  text="Branch, commit and push without leaving the chat."
                />
                <Point
                  icon={<Database className="size-4 text-primary" />}
                  text="Query real data from your own Supabase project."
                />
                <Point
                  icon={<History className="size-4 text-primary" />}
                  text="Every version is snapshotted and restorable."
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="text-center">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Everything you need to know before you start building.
              </p>
            </Reveal>
            <Reveal delay={80}>
              <Accordion type="single" collapsible className="mt-10 w-full">
                <AccordionItem value="github">
                  <AccordionTrigger>Do I need a GitHub account?</AccordionTrigger>
                  <AccordionContent>
                    Yes. lovablegit connects to your own GitHub account so every project you build
                    lives in a repository you control.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="hosting">
                  <AccordionTrigger>Does lovablegit host my app?</AccordionTrigger>
                  <AccordionContent>
                    No. The preview runs in a sandbox so you can see your changes instantly. When
                    you are ready to ship, deploy the repository with any host you like.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="database">
                  <AccordionTrigger>Can I connect my own database?</AccordionTrigger>
                  <AccordionContent>
                    Yes. Plug your own Supabase project into the preview and query real data from
                    the generated app.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="rollback">
                  <AccordionTrigger>What if I do not like a change?</AccordionTrigger>
                  <AccordionContent>
                    Every AI edit is snapshotted. Open the version history and restore any earlier
                    version with one click.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_100%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent)]" />
          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <Reveal>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Start building in seconds
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
                Describe your idea, watch it come to life, and push it to GitHub — all in one
                workspace.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">
                    <Sparkles className="size-4" /> Get started free
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Link
            to="/"
            aria-label="lovablegit home"
            className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <LovableGitLogo className="h-6 w-auto text-foreground" />
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} lovablegit. Built for people who ship.
          </p>
        </div>
      </footer>
    </div>
  );
}
