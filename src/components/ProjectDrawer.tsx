import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Menu, Plus, Search, FolderGit2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listProjects } from "@/lib/projects.functions";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function ProjectDrawer() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fetchProjects = useServerFn(listProjects);
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
    retry: false,
    enabled: open,
  });

  const rows = useMemo(() => {
    const list = (projects.data ?? []) as Array<{
      id: string;
      name: string;
      updated_at: string;
    }>;
    const q = query.trim().toLowerCase();
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [projects.data, query]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open projects menu"
        className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="size-4" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] gap-0 p-0 sm:max-w-sm">
        <SheetTitle className="sr-only">Your projects</SheetTitle>

        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              className="h-10 rounded-full pl-9"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
          >
            <span className="flex size-12 items-center justify-center rounded-lg border border-dashed border-border">
              <Plus className="size-5 text-muted-foreground" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium">Create new project</span>
          </Link>

          {projects.isPending && open ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ul className="mt-1">
              {rows.map((project) => (
                <li key={project.id} className="border-t border-border/60">
                  <Link
                    to="/workspace/$projectId"
                    params={{ projectId: project.id }}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                      <FolderGit2 className="size-5 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{project.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {timeAgo(project.updated_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
