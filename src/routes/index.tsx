import { createFileRoute, Link } from "@tanstack/react-router";
import { Github, MessageSquareCode, MonitorPlay, Image as ImageIcon, Terminal } from "lucide-react";

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

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <Terminal className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Forge</span>
        </div>
        <Link
          to="/auth"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Get started
        </Link>
      </header>

      <main>
        <section className="grid-noise border-b border-border">
          <div className="mx-auto max-w-4xl px-4 py-24 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Github className="size-3" /> Connect your own GitHub account
            </p>
            <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
              Describe it. Forge builds it.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
              A chat-first development workspace: talk to the AI, watch the code appear, see a live
              temporary preview, generate logos and images, then commit straight to your repository.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/auth"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start building free
              </Link>
              <Link
                to="/auth"
                className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Everything in one workspace
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<MessageSquareCode className="size-5 text-primary" />}
              title="AI chat that writes code"
              body="Every message returns real files — HTML, CSS and JavaScript — versioned inside your project."
            />
            <Feature
              icon={<MonitorPlay className="size-5 text-primary" />}
              title="Instant temporary preview"
              body="A sandboxed live preview renders while you work. Nothing is hosted — it exists only in your session."
            />
            <Feature
              icon={<Github className="size-5 text-primary" />}
              title="Your GitHub, your repos"
              body="Each customer connects their own account, imports files and pushes AI commits back."
            />
            <Feature
              icon={<ImageIcon className="size-5 text-primary" />}
              title="Logos and images"
              body="Generate logos, icons, banners and illustrations right from the chat and drop them into the build."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Forge — AI development workspace.
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      {icon}
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
