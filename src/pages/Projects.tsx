import { Wrench, LayoutGrid, List, Plus, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  "Product": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Process": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Fixture/Jig": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Tool": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Art": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Hardware/Electronics": "bg-red-500/20 text-red-400 border-red-500/30",
  "Software/App": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "Environment/Space": "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

const statusColumns = ["planning", "in_progress", "testing", "done"];
const statusLabels: Record<string, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  testing: "Testing",
  done: "Done",
};

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [sortMode, setSortMode] = useState<string>(
    () => localStorage.getItem("projects-sort-mode") || "newest"
  );

  const handleSortChange = (val: string) => {
    setSortMode(val);
    localStorage.setItem("projects-sort-mode", val);
  };

  const sortItems = (items: any[]) => {
    const sorted = [...items];
    switch (sortMode) {
      case "category": return sorted.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      case "newest": return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "alpha": return sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "recent": return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      default: return sorted;
    }
  };
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const createProject = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ user_id: user!.id, name: "Untitled Project" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-items"] });
      navigate(`/projects/${data.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderProjectCard = (p: any) => {
    const category = p.category;
    const categoryClass = category ? CATEGORY_COLORS[category] || "bg-secondary text-secondary-foreground" : "";
    const tags: string[] = p.tags || [];
    const descPreview = p.compiled_description || p.general_notes;

    return (
      <Card
        key={p.id}
        onClick={() => navigate(`/projects/${p.id}`)}
        className="cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:bg-card/80"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            {category ? (
              <Badge className={`text-xs border ${categoryClass}`}>{category}</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Uncategorized</Badge>
            )}
            <Badge variant="outline" className="text-xs">{statusLabels[p.status] || p.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-bold leading-snug">{p.name}</p>
          {descPreview && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{descPreview}</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
              {tags.length > 4 && (
                <Badge variant="secondary" className="text-[10px]">+{tags.length - 4}</Badge>
              )}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/60">
            {format(new Date(p.created_at), "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your active builds</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("kanban")} className={viewMode === "kanban" ? "text-primary" : ""}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "text-primary" : ""}>
            <List className="h-4 w-4" />
          </Button>
          <Select value={sortMode} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Created Date</SelectItem>
              <SelectItem value="recent">Recently Edited</SelectItem>
              <SelectItem value="alpha">Alphabetical</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => createProject.mutate()} disabled={createProject.isPending} className="gap-2">
            <Plus className="h-4 w-4" /> New Project
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
              {sortItems(projects.filter((p) => p.status === status)).map(renderProjectCard)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortItems(projects).map(renderProjectCard)}
        </div>
      )}
    </div>
  );
}
