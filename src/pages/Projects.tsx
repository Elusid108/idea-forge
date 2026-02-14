import { Wrench, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColumns = ["planning", "in_progress", "testing", "done"];
const statusLabels: Record<string, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  testing: "Testing",
  done: "Done",
};

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your active builds</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("kanban")} className={viewMode === "kanban" ? "text-primary" : ""}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "text-primary" : ""}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Wrench className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground/70">Promote a brainstorm or create a project directly</p>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {statusColumns.map((status) => (
            <div key={status} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {statusLabels[status]}
                <Badge variant="secondary" className="ml-2">
                  {projects.filter((p) => p.status === status).length}
                </Badge>
              </h3>
              {projects
                .filter((p) => p.status === status)
                .map((p) => (
                  <Card key={p.id} className="cursor-pointer border-border/50 bg-card/50 transition-colors hover:border-primary/30">
                    <CardContent className="p-4">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card key={p.id} className="cursor-pointer border-border/50 bg-card/50 transition-colors hover:border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <Badge variant="outline" className="text-xs">{statusLabels[p.status] || p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
