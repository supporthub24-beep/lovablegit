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
  CreditCard,
  Users,
  Gauge,
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
      { title: "bolt.diy — Open-source AI web development agent" },
      {
        name: "description",
        content:
          "bolt.diy is an open-source AI agent that builds, edits and previews full-stack web apps in your browser. Bring your own model, run it locally, deploy anywhere.",
      },
      {
        property: "og:title",
        content: "bolt.diy — Open-source AI web development agent",
      },
      {
        property: "og:description",
        content:
          "Prompt, run, edit and deploy full-stack web apps with any LLM. Self-hosted, open source, no lock-in.",
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
  "OpenAI",
  "Anthropic",
  "Google Gemini",
  "Ollama",
  "Groq",
  "Mistral",
  "OpenRouter",
  "DeepSeek",
  "xAI",
  "LM Studio",
];

const STATS = [
  { value: "20+", label: "LLM providers supported" },
  { value: "100%", label: "open source, MIT licensed" },
  { value: "1-click", label: "deploy to Netlify or Vercel" },
  { value: "Local", label: "runs on your own machine" },
];

const PLANS = [
  {
    id: "self-host",
    name: "Self-hosted",
    price: "$0",
    cadence: "forever",
    tagline: "Run bolt.diy on your own machine with your own API keys.",
    features: [
      "Full source code, MIT licensed",
      "Bring your own LLM provider and keys",
      "Local Ollama and LM Studio support",
      "WebContainer preview in the browser",
      "Docker and pnpm install paths",
    ],
    cta: "Read the docs",
    highlight: true,
  },
  {
    id: "cloud",
    name: "Cloud",
    price: "Usage",
    cadence: "based",
    tagline: "Skip the setup and run bolt.diy from a hosted instance.",
    features: [
      "No local install required",
      "Managed model routing",
      "Shared project workspaces",
      "Deploy to Netlify, Vercel or GitHub Pages",
      "Community and email support",
    ],
    cta: "Try the cloud",
    highlight: false,
  },
  {
    id: "team",
    name: "Team",
    price: "Custom",
    cadence: "per workspace",
    tagline: "For teams that want bolt.diy wired into their own stack.",
    features: [
      "Everything in Cloud",
      "Private model endpoints",
      "Single sign-on and role access",
      "Self-hosted deployment support",
      "Priority issue triage",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

const BILLING_POINTS = [
  {
    icon: <CreditCard className="size-5 text-primary" />,
    title: "Bring your own keys",
    body: "bolt.diy never resells model access. Point it at OpenAI, Anthropic, Gemini, Groq, OpenRouter or a local Ollama server and pay those providers directly.",
  },
  {
    icon: <Gauge className="size-5 text-primary" />,
    title: "Usage you can see",
    body: "Token usage and context limits are surfaced per provider, so you always know which model is doing the work and what it costs.",
  },
  {
    icon: <Users className="size-5 text-primary" />,
    title: "Open source, no lock-in",
    body: "The whole agent is MIT licensed. Fork it, extend the provider list, or run it entirely offline — nothing is hidden behind a paywall.",
  },
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card p-6 transition-all duration-300 hover:-translate-y-2 hover:border-primary hover:shadow-2xl hover:shadow-primary/40 focus-within:border-primary focus-within:shadow-2xl focus-within:shadow-primary/40 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_30%,transparent)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex flex-1 flex-col">
        <span className="inline-flex size-11 items-center justify-center rounded-xl border-2 border-border bg-surface shadow-sm transition-colors duration-300 group-hover:border-primary group-hover:bg-primary/15">
          {icon}
        </span>
        <h3 className="mt-5 text-lg font-black tracking-tight text-balance sm:text-xl">
          {title}
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>
      </div>
    </article>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card p-6 transition-all duration-300 hover:-translate-y-2 hover:border-primary hover:shadow-2xl hover:shadow-primary/40 focus-within:border-primary focus-within:shadow-2xl focus-within:shadow-primary/40 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground shadow-lg shadow-primary/50 ring-2 ring-inset ring-primary/50">
        {n}
      </span>
      <h3 className="mt-5 text-lg font-black tracking-tight text-balance sm:text-xl">
        {title}
      </h3>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>
    </li>
  );
}

function ShowcaseCard({
  label,
  title,
  description,
  image,
  imageAlt,
  accent,
}: {
  label: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  accent: string;
}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card transition-all duration-300 hover:-translate-y-2 hover:border-primary hover:shadow-2xl hover:shadow-primary/40 focus-within:border-primary focus-within:shadow-2xl focus-within:shadow-primary/40">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div
        className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${accent} to-transparent`}
      >
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/80 via-card/10 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
          {label}
        </span>
        <h3 className="mt-2 text-lg font-black tracking-tight text-balance">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
    </article>
  );
}

function Point({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-card/60 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:bg-card hover:shadow-xl hover:shadow-primary/25 focus-within:border-primary">
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-inset ring-primary/40">
        {icon}
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{text}</p>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    value: "models",
    question: "Which AI models can I use?",
    answer:
      "Any provider you have a key for — OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter, DeepSeek, xAI — plus local models through Ollama or LM Studio. You can switch models per project.",
  },
  {
    value: "hosting",
    question: "Where does bolt.diy run?",
    answer:
      "On your own machine or server. It is a self-hosted web app: clone the repository, install dependencies, start the dev server and open it in your browser.",
  },
  {
    value: "preview",
    question: "How does the live preview work?",
    answer:
      "Generated projects run inside a WebContainer in your browser, so you get a real dev server and terminal without any remote build step.",
  },
  {
    value: "deploy",
    question: "Can I deploy what I build?",
    answer:
      "Yes. Push the generated project to GitHub and deploy it to Netlify, Vercel or any static host — the code is plain, portable web output.",
  },
];

function FaqItem({
  value,
  question,
  answer,
  index,
}: {
  value: string;
  question: string;
  answer: string;
  index: number;
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
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${index * 90}ms` : "0ms" }}
      className={`faq-item ${shown ? "faq-item-in" : ""}`}
    >
      <AccordionItem value={value}>
        <AccordionTrigger>{question}</AccordionTrigger>
        <AccordionContent>{answer}</AccordionContent>
      </AccordionItem>
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
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            aria-label="bolt.diy home"
            className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <LovableGitLogo className="h-7 w-auto text-foreground" />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 text-sm md:flex">
            <a
              href="#how"
              className="rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              How it works
            </a>
            <a
              href="#features"
              className="rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Features
            </a>
            <a
              href="#showcase"
              className="rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Showcase
            </a>
            <a
              href="#pricing"
              className="rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          {/* Aggressive gradient wash */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[80%]">
            <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_125%,#ff3d00_0%,#ff0066_32%,#c026d3_58%,#4f46e5_80%,transparent_100%)] opacity-100 blur-[1px]" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
          </div>

          <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 sm:py-32">
            <Reveal>
              <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/50 bg-card/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground shadow-lg shadow-primary/25 backdrop-blur">
                <Github className="size-3.5 text-primary" /> Open source · MIT licensed
                <ArrowRight className="size-3.5 text-primary" />
              </p>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="mx-auto mt-8 max-w-3xl text-balance text-5xl font-black uppercase leading-[0.95] tracking-tighter sm:text-7xl lg:text-8xl">
                Prompt, run, edit and <span className="text-gradient">deploy</span> web apps
              </h1>
            </Reveal>

            {/* Prompt box */}
            <Reveal delay={140}>
              <div className="glow-primary mx-auto mt-10 max-w-2xl rounded-3xl border-2 border-primary/40 bg-card/95 p-3 text-left shadow-2xl shadow-primary/25 backdrop-blur transition-all duration-300 focus-within:border-primary focus-within:shadow-[0_0_0_5px_color-mix(in_oklch,var(--color-primary)_28%,transparent)]">
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
                    <Button onClick={start} size="sm" className="rounded-full font-bold uppercase tracking-wide">
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
                    className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:bg-primary/15 hover:text-foreground hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              Works with the models you already use
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

        {/* How it works */}
        <section id="how" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Rocket className="size-3" /> How it works
              </span>
              <h2 className="mt-4 text-balance text-4xl font-black uppercase tracking-tighter sm:text-6xl">
                Three simple steps
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Self-host it, pick a model, and start building. No account required.
              </p>
            </Reveal>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              <Reveal delay={0} className="h-full">
                <Step
                  n={1}
                  title="Run it locally"
                  body="Clone the bolt.diy repository, install dependencies with pnpm, and start the dev server on your own machine."
                />
              </Reveal>
              <Reveal delay={60} className="h-full">
                <Step
                  n={2}
                  title="Pick your model"
                  body="Add an API key for any supported provider, or point bolt.diy at a local Ollama or LM Studio server."
                />
              </Reveal>
              <Reveal delay={120} className="h-full">
                <Step
                  n={3}
                  title="Prompt, preview, deploy"
                  body="Describe the app you want, watch it run in the browser preview, then push it to GitHub and deploy."
                />
              </Reveal>
            </ol>
          </div>
        </section>

        {/* Capabilities */}
        <section id="features" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Layers className="size-3" /> Capabilities
              </span>
              <h2 className="mt-4 text-balance text-4xl font-black uppercase tracking-tighter sm:text-6xl">
                Everything in one workspace
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Chat, code, terminal and live preview — side by side on desktop, tabbed on mobile.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Reveal delay={0} className="h-full">
                <Feature
                  icon={<GitBranch className="size-5 text-primary" />}
                  title="Any LLM provider"
                  body="OpenAI, Anthropic, Gemini, Groq, Mistral, OpenRouter, DeepSeek, xAI, Ollama and LM Studio — switch models per project."
                />
              </Reveal>
              <Reveal delay={60} className="h-full">
                <Feature
                  icon={<MessageSquareCode className="size-5 text-primary" />}
                  title="AI chat that writes code"
                  body="Every message returns real files, versioned inside your project. Diff, revert or keep each change."
                />
              </Reveal>
              <Reveal delay={120} className="h-full">
                <Feature
                  icon={<MonitorPlay className="size-5 text-primary" />}
                  title="In-browser preview"
                  body="Generated projects run in a WebContainer with a real dev server and terminal — no remote build step."
                />
              </Reveal>
              <Reveal delay={0} className="h-full">
                <Feature
                  icon={<ImageIcon className="size-5 text-primary" />}
                  title="Attach images and files"
                  body="Drop screenshots, designs or existing files into the chat and let the agent work from them."
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
                  title="Deploy anywhere"
                  body="Push the generated project to GitHub and ship it to Netlify, Vercel or any static host you like."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="bolt.diy in numbers" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {STATS.map((stat, index) => (
                <Reveal key={stat.label} delay={index * 60}>
                  <div className="text-center">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="block text-5xl font-black tracking-tighter text-gradient sm:text-6xl">
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

        {/* Showcase */}
        <section id="showcase" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <Wand2 className="size-3" /> Showcase
              </span>
              <h2 className="mt-4 text-balance text-4xl font-black uppercase tracking-tighter sm:text-6xl">
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
                  description="A warm storefront with a menu, opening hours and an order form — built from one prompt, then tuned with follow-ups."
                  image="/showcase-coffee-shop.jpg"
                  imageAlt="Preview of a coffee shop landing page with a menu and order form"
                  accent="from-primary/25"
                />
              </Reveal>
              <Reveal delay={60} className="h-full">
                <ShowcaseCard
                  label="Dashboard"
                  title="Analytics with live charts"
                  description="A metrics dashboard with charts, filters and a data table, wired to a real Supabase project."
                  image="/showcase-analytics-dashboard.jpg"
                  imageAlt="Preview of an analytics dashboard with charts and a data table"
                  accent="from-highlight/25"
                />
              </Reveal>
              <Reveal delay={120} className="h-full">
                <ShowcaseCard
                  label="Portfolio"
                  title="Personal site with dark mode"
                  description="A personal portfolio with project cards, a contact form and a dark mode that follows the visitor's system theme."
                  image="/showcase-portfolio.jpg"
                  imageAlt="Preview of a personal portfolio site shown in dark mode"
                  accent="from-primary/20"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Why Forge */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3" /> Built for real work
              </span>
              <h2 className="mt-4 text-balance text-4xl font-black uppercase tracking-tighter sm:text-6xl">
                Your code stays yours
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                bolt.diy is MIT licensed and self-hosted. Everything it generates lands in your own
                repository — no lock-in, no hidden hosting, no surprises.
              </p>
              <ul className="mt-8 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/20">
                    <Check className="size-3 text-primary" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Full source code you can read, fork and extend.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/20">
                    <Check className="size-3 text-primary" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Bring your own API keys, or run models locally.
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
                  text="Deploy the finished project to any host you choose."
                />
                <Point
                  icon={<History className="size-4 text-primary" />}
                  text="Every version is snapshotted and restorable."
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <CreditCard className="size-3" /> Pricing
              </span>
              <h2 className="mt-4 text-balance text-4xl font-black uppercase tracking-tighter sm:text-6xl">
                Free to self-host, cloud when you want it
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Run bolt.diy yourself at no cost, or use a hosted instance when you would rather
                skip the setup. You always bring your own model keys.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {PLANS.map((plan, index) => (
                <Reveal key={plan.id} delay={index * 60} className="h-full">
                  <article
                    className={
                      plan.highlight
                        ? "relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-primary bg-card p-6 shadow-2xl shadow-primary/40 sm:p-7"
                        : "relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card p-6 transition-all duration-300 hover:-translate-y-2 hover:border-primary hover:shadow-2xl hover:shadow-primary/40 sm:p-7"
                    }
                  >
                    {plan.highlight && (
                      <span className="absolute right-5 top-5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/40">
                        Recommended
                      </span>
                    )}
                    <h3 className="text-lg font-black tracking-tight">{plan.name}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                      {plan.tagline}
                    </p>
                    <p className="mt-5 flex items-baseline gap-1.5">
                      <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                    </p>
                    <ul className="mt-6 flex-1 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/20">
                            <Check className="size-3 text-primary" />
                          </span>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className="mt-7 w-full font-bold uppercase tracking-wide"
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      <Link to="/auth">{plan.cta}</Link>
                    </Button>
                  </article>
                </Reveal>
              ))}
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {BILLING_POINTS.map((point, index) => (
                <Reveal key={point.title} delay={index * 60} className="h-full">
                  <Feature icon={point.icon} title={point.title} body={point.body} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="text-center">
              <h2 className="text-balance text-4xl font-black uppercase tracking-tighter sm:text-6xl">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Everything you need to know before you self-host bolt.diy.
              </p>
            </Reveal>
            <Accordion type="single" collapsible className="mt-10 w-full">
              {FAQ_ITEMS.map((item, index) => (
                <FaqItem
                  key={item.value}
                  value={item.value}
                  question={item.question}
                  answer={item.answer}
                  index={index}
                />
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_100%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent)]" />
          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <Reveal>
              <h2 className="text-balance text-5xl font-black uppercase tracking-tighter sm:text-7xl">
                Start building in <span className="text-gradient">seconds</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
                Describe your idea, watch it run in the browser, and push it to GitHub — all in one
                workspace.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="font-bold uppercase tracking-wide">
                  <Link to="/auth">
                    <Sparkles className="size-4" /> Get started free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="font-bold uppercase tracking-wide">
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
            aria-label="bolt.diy home"
            className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <LovableGitLogo className="h-6 w-auto text-foreground" />
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} bolt.diy. Open source, MIT licensed.
          </p>
        </div>
      </footer>
    </div>
  );
}
