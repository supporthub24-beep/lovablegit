import { Link, useRouter } from "@tanstack/react-router";
import { Terminal, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppHeader({ isAdmin }: { isAdmin?: boolean | undefined }) {
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground">
            <Terminal className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">Forge</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/dashboard"
            className="rounded px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded px-3 py-1.5 bg-secondary text-foreground" }}
          >
            Projects
          </Link>
          <Link
            to="/settings"
            className="rounded px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded px-3 py-1.5 bg-secondary text-foreground" }}
          >
            Settings
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded px-3 py-1.5 bg-secondary text-foreground" }}
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </header>
  );
}
