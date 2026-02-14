import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Plus, Grid3X3, List } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

export default function BrainstormsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    () => (localStorage.getItem("brainstorms-view-mode") as "grid" | "list") || "grid"
  );

  const toggleView = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("brainstorms-view-mode", mode);
  };

  const { data: brainstorms = [], isLoading } = useQuery({
    queryKey: ["brainstorms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brainstorms")
        .select("*, ideas(processed_summary, raw_dump), brainstorm_references(id)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createBrainstorm = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("brainstorms")
        .insert({ user_id: user!.id, title: "Untitled Brainstorm" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["brainstorms"] });
      navigate(`/brainstorms/${data.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Brainstorms</h1>
          <p className="text-muted-foreground">Research workspaces for developing your ideas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => toggleView("grid")} className={viewMode === "grid" ? "text-primary" : ""}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => toggleView("list")} className={viewMode === "list" ? "text-primary" : ""}>
            <List className="h-4 w-4" />
          </Button>
          <Button onClick={() => createBrainstorm.mutate()} disabled={createBrainstorm.isPending} className="gap-2">
            <Plus className="h-4 w-4" /> New Brainstorm
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : brainstorms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Brain className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No brainstorms yet</p>
          <p className="text-sm text-muted-foreground/70">Start a brainstorm from an idea or create one directly</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {brainstorms.map((b: any) => {
            const categoryClass = CATEGORY_COLORS[b.category] || "bg-secondary text-secondary-foreground";
            const tags: string[] = b.tags || [];
            const descPreview = b.compiled_description || (b.ideas?.processed_summary) || (b.ideas?.raw_dump?.slice(0, 140));

            return (
              <Card
                key={b.id}
                onClick={() => navigate(`/brainstorms/${b.id}`)}
                className="cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:bg-card/80"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    {b.category ? (
                      <Badge className={`text-xs border ${categoryClass}`}>{b.category}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">{b.status}</Badge>
                    )}
                    {b.brainstorm_references?.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {b.brainstorm_references.length} refs
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-bold leading-snug">{b.title}</p>
                  {descPreview && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {descPreview}
                    </p>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
