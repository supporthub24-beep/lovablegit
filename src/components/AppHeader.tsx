import { Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Coins, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminLogo } from "@/components/AdminLogo";
import { LovableGitLogo } from "@/components/LovableGitLogo";
import { ProjectDrawer } from "@/components/ProjectDrawer";
import { getCreditOverview } from "@/lib/payments.functions";

export function AppHeader({ isAdmin }: { isAdmin?: boolean | undefined }) {
  const router = useRouter();
  const fetchCredits = useServerFn(getCreditOverview);
  const credits = useQuery({
    queryKey: ["credit-overview"],
    queryFn: () => fetchCredits(),
    retry: false,
    staleTime: 30_000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b-2 border-border bg-surface/90 px-4 shadow-lg shadow-primary/10 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
      />
      <div className="flex items-center gap-3 sm:gap-6">
        <ProjectDrawer />
        <Link
          to="/dashboard"
          aria-label="Forge home"
          className="group flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <LovableGitLogo
            showWordmark
            className="transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_color-mix(in_oklch,var(--color-primary)_55%,transparent)] group-focus-visible:scale-110"
          />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 text-sm md:flex">
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-1.5 font-semibold text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent hover:text-foreground hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{
              className:
                "rounded-md px-3 py-1.5 font-black bg-primary/20 text-primary ring-2 ring-inset ring-primary/50 shadow-lg shadow-primary/25",
            }}
          >
            Projects
          </Link>
          <Link
            to="/payments"
            className="rounded-md px-3 py-1.5 font-semibold text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent hover:text-foreground hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{
              className:
                "rounded-md px-3 py-1.5 font-black bg-primary/20 text-primary ring-2 ring-inset ring-primary/50 shadow-lg shadow-primary/25",
            }}
          >
            Billing
          </Link>
          <Link
            to="/settings"
            className="rounded-md px-3 py-1.5 font-semibold text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent hover:text-foreground hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{
              className:
                "rounded-md px-3 py-1.5 font-black bg-primary/20 text-primary ring-2 ring-inset ring-primary/50 shadow-lg shadow-primary/25",
            }}
          >
            Settings
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-md px-3 py-1.5 font-semibold text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent hover:text-foreground hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{
                className:
                  "rounded-md px-3 py-1.5 font-black bg-primary/20 text-primary ring-2 ring-inset ring-primary/50 shadow-lg shadow-primary/25",
              }}
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            to="/admin"
            aria-label="Admin console"
            className="hidden items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:inline-flex"
          >
            <AdminLogo showWordmark={false} label="" className="text-foreground" />
          </Link>
        )}
        <Link
          to="/payments"
          aria-label="Credit balance and top up"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span className="flex items-center gap-1.5 rounded-full border-2 border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:text-foreground hover:shadow-xl hover:shadow-primary/30">
            <Coins className="size-3.5 text-primary" aria-hidden="true" />
            {credits.isPending
              ? "…"
              : credits.isError
                ? "—"
                : `${credits.data?.wallet.balance ?? 0} credits`}
          </span>
        </Link>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="hidden font-bold uppercase tracking-wide sm:inline-flex"
        >
          <Link to="/payments">
            <CreditCard className="size-4" aria-hidden="true" />
            Plans
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
