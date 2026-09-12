import { useState, useEffect } from "react";
import { Github, GitBranch, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Project = {
  id: string;
  name: string;
  owner: string;
  repo: string;
  branch: string;
  lastUpdated: string;
  status: "active" | "inactive" | "error";
  unreadMessages?: number;
};

type ProjectListSidebarProps = {
  className?: string;
};

export function ProjectListSidebar({ className }: ProjectListSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for now - will be replaced with real API call
  const mockProjects: Project[] = [
    {
      id: "1",
      name: "lovablegit",
      owner: "lovable",
      repo: "lovablegit",
      branch: "main",
      lastUpdated: "2 hours ago",
      status: "active",
      unreadMessages: 3,
    },
    {
      id: "2",
      name: "portfolio-site",
      owner: "user123",
      repo: "portfolio",
      branch: "develop",
      lastUpdated: "1 day ago",
      status: "active",
      unreadMessages: 0,
    },
    {
      id: "3",
      name: "ecommerce-store",
      owner: "shopify",
      repo: "store-frontend",
      branch: "main",
      lastUpdated: "3 days ago",
      status: "inactive",
    },
    {
      id: "4",
      name: "dashboard-analytics",
      owner: "analytics",
      repo: "dashboard",
      branch: "feature/charts",
      lastUpdated: "1 week ago",
      status: "error",
    },
    {
      id: "5",
      name: "blog-platform",
      owner: "content",
      repo: "blog-next",
      branch: "main",
      lastUpdated: "Just now",
      status: "active",
      unreadMessages: 1,
    },
  ];

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setProjects(mockProjects);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
      case "inactive":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
      case "error":
        return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
    }
  };

  const formatRepoName = (owner: string, repo: string) => {
    return `${owner}/${repo}`;
  };

  if (error) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Github className="size-4" />
            Connected Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <AlertCircle className="size-10 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                setTimeout(() => {
                  setProjects(mockProjects);
                  setLoading(false);
                }, 800);
              }}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Github className="size-4" />
            Connected Projects
            <Badge variant="secondary" className="ml-2 text-xs">
              {loading ? "..." : projects.length}
            </Badge>
          </span>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-4">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2 w-1/4" />
                    <Separator className="mt-3" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Github className="size-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No projects connected yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Connect your GitHub account to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="group rounded-lg border border-transparent p-3 transition-all hover:border-border hover:bg-accent/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{project.name}</h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-normal",
                              getStatusColor(project.status),
                            )}
                          >
                            {project.status}
                          </Badge>
                          {project.unreadMessages && project.unreadMessages > 0 && (
                            <Badge className="ml-auto bg-primary text-primary-foreground text-xs">
                              {project.unreadMessages}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRepoName(project.owner, project.repo)}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <GitBranch className="size-3" />
                            {project.branch}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {project.lastUpdated}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
