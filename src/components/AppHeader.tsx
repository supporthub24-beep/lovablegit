import { Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LovableGitLogo } from "@/components/LovableGitLogo";
import { AdminLogo } from "@/components/AdminLogo";
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
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-surface/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="flex items-center gap-3 sm:gap-6">
        <ProjectDrawer />
        <Link
          to="/dashboard"
          aria-label="lovablegit home"
          className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <LovableGitLogo className="h-7 w-auto text-foreground" />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 text-sm md:flex">
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-foreground" }}
          >
            Projects
          </Link>
          <Link
            to="/payments"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-foreground" }}
          >
            Credits
          </Link>
          <Link
            to="/settings"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-foreground" }}
          >
            Settings
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-foreground" }}
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
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1 text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground">
            <Coins className="size-3.5" aria-hidden="true" />
            {credits.isPending
              ? "…"
              : credits.isError
                ? "—"
                : `${credits.data?.wallet.balance ?? 0} credits`}
          </span>
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
