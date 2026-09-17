import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Terminal, ArrowLeft, Sparkles, ShieldCheck, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Forge AI Dev Platform" },
      {
        name: "description",
        content:
          "Sign in to Forge to connect GitHub, chat with AI, generate code and preview your app instantly.",
      },
      { property: "og:title", content: "Sign in — Forge AI Dev Platform" },
      {
        property: "og:description",
        content: "Access your GitHub-connected AI development workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const HIGHLIGHTS = [
  {
    icon: <Sparkles className="size-4 text-primary" />,
    title: "Describe it, ship it",
    body: "Chat with AI and get real files with a live preview, instantly.",
  },
  {
    icon: <GitBranch className="size-4 text-primary" />,
    title: "Your GitHub, your repos",
    body: "Push commits back to your own account — no lock-in, ever.",
  },
  {
    icon: <ShieldCheck className="size-4 text-primary" />,
    title: "Versioned and reversible",
    body: "Every AI edit is snapshotted, so you can roll back in one click.",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("If that email exists, a password reset link is on its way.");
        setMode("signin");
        return;
      }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created. You can start building now.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid-noise relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <Terminal className="size-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Forge</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" /> Back to home
            </Link>
          </Button>
        </div>

        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.1fr_minmax(0,1fr)] lg:gap-16 lg:py-16">
          <div className="hidden lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3 text-primary" /> Free credits included · no credit card
            </p>
            <h2 className="mt-6 text-balance text-4xl font-semibold tracking-tight xl:text-5xl">
              Your AI development workspace, ready in seconds.
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-muted-foreground">
              Sign in to connect GitHub, describe what you want to build, and watch Forge write the
              code, preview it live, and commit it back to your repository.
            </p>
            <ul className="mt-10 space-y-5">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-7">
            <div className="lg:hidden">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="size-3 text-primary" /> Free credits included
              </span>
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight lg:mt-0">
              {mode === "signin"
                ? "Sign in to your workspace"
                : mode === "signup"
                  ? "Create your workspace"
                  : "Reset your password"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "reset"
                ? "We'll email you a secure link to choose a new password."
                : "Connect GitHub, chat with AI, ship faster."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              {mode !== "reset" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("reset")}
                        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
              </Button>
            </form>

            {mode !== "reset" && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button variant="secondary" className="w-full" onClick={google}>
                  Continue with Google
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() =>
                setMode(mode === "signin" ? "signup" : mode === "signup" ? "signin" : "signin")
              }
              className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {mode === "signin"
                ? "No account? Create one"
                : mode === "signup"
                  ? "Already have an account? Sign in"
                  : "Back to sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground lg:text-left">
          By continuing you agree to keep your own GitHub credentials secure. Forge never stores your
          repository tokens in plain text.
        </p>
      </div>
    </div>
  );
}
