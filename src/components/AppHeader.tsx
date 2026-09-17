import { Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
          aria-label="SupportHub24 home"
          className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <img
            src="/generated/supporthub24-logo-1789314077899.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0 object-contain"
          />
          <span className="text-sm font-bold tracking-tight text-foreground">
            SupportHub24
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 text-sm md:flex">
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{
              className:
                "rounded-md px-3 py-1.5 font-semibold bg-primary/15 text-primary ring-1 ring-inset ring-primary/30",
            }}
          >
            Projects
          </Link>
          <Link
            to="/payments"
            className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{
              className:
                "rounded-md px-3 py-1.5 font-semibold bg-primary/15 text-primary ring-1 ring-inset ring-primary/30",
            }}
          >
            Credits
          </Link>
          <Link
            to="/settings"
            className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{
              className:
                "rounded-md px-3 py-1.5 font-semibold bg-primary/15 text-primary ring-1 ring-inset ring-primary/30",
            }}
          >
            Settings
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{
                className:
                  "rounded-md px-3 py-1.5 font-semibold bg-primary/15 text-primary ring-1 ring-inset ring-primary/30",
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
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:text-foreground hover:shadow-lg hover:shadow-primary/20">
            <Coins className="size-3.5 text-primary" aria-hidden="true" />
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
