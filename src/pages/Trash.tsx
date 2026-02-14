import { Trash2, RotateCcw, XCircle, Lightbulb, Brain, Wrench, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

function TrashSection({
  title,
  icon: Icon,
  items,
  isLoading,
  onRestore,
  onDelete,
  labelKey,
}: {
  title: string;
  icon: any;
  items: any[];
  isLoading: boolean;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  labelKey: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent">
        <Icon className="h-4 w-4" />
        {title} ({items.length})
        <ChevronRight className={`ml-auto h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No trashed {title.toLowerCase()}</p>
        ) : (
          items.map((item: any) => (
            <Card key={item.id} className="border-border/50 bg-card/50">
              <CardContent className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item[labelKey] || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">
                    Deleted {new Date(item.deleted_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => onRestore(item.id)}>
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}>
                    <XCircle className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function TrashPage() {
  const queryClient = useQueryClient();

  const { data: ideas = [], isLoading: loadingIdeas } = useQuery({
    queryKey: ["trash-ideas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ideas").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: brainstorms = [], isLoading: loadingBrainstorms } = useQuery({
    queryKey: ["trash-brainstorms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brainstorms").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["trash-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const restore = (table: string, queryKey: string) =>
    useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table as any).update({ deleted_at: null } as any).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        queryClient.invalidateQueries({ queryKey: [table === "ideas" ? "ideas" : table === "brainstorms" ? "brainstorms" : "projects"] });
        toast.success("Restored!");
      },
      onError: (e: Error) => toast.error(e.message),
    });

  const permanentDelete = (table: string, queryKey: string) =>
    useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table as any).delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        toast.success("Permanently deleted");
      },
      onError: (e: Error) => toast.error(e.message),
    });

  const restoreIdea = restore("ideas", "trash-ideas");
  const deleteIdea = permanentDelete("ideas", "trash-ideas");
  const restoreBrainstorm = restore("brainstorms", "trash-brainstorms");
  const deleteBrainstorm = permanentDelete("brainstorms", "trash-brainstorms");
  const restoreProject = restore("projects", "trash-projects");
  const deleteProject = permanentDelete("projects", "trash-projects");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trash2 className="h-7 w-7" /> Trash
        </h1>
        <p className="text-muted-foreground">Restore or permanently delete trashed items</p>
      </div>

      <div className="space-y-6">
        <TrashSection title="Ideas" icon={Lightbulb} items={ideas} isLoading={loadingIdeas} onRestore={(id) => restoreIdea.mutate(id)} onDelete={(id) => deleteIdea.mutate(id)} labelKey="title" />
        <TrashSection title="Brainstorms" icon={Brain} items={brainstorms} isLoading={loadingBrainstorms} onRestore={(id) => restoreBrainstorm.mutate(id)} onDelete={(id) => deleteBrainstorm.mutate(id)} labelKey="title" />
        <TrashSection title="Projects" icon={Wrench} items={projects} isLoading={loadingProjects} onRestore={(id) => restoreProject.mutate(id)} onDelete={(id) => deleteProject.mutate(id)} labelKey="name" />
      </div>
    </div>
  );
}
