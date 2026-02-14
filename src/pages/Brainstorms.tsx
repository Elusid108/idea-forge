import { Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BrainstormsPage() {
  const { data: brainstorms = [], isLoading } = useQuery({
    queryKey: ["brainstorms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brainstorms")
        .select("*, ideas(processed_summary, raw_dump)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Brainstorms</h1>
        <p className="text-muted-foreground">Research workspaces for developing your ideas</p>
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
        <div className="space-y-3">
          {brainstorms.map((b: any) => (
            <Card key={b.id} className="cursor-pointer border-border/50 bg-card/50 transition-colors hover:border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{b.title}</span>
                  <Badge variant="outline" className="text-xs">{b.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {b.ideas && (
                  <p className="mb-1 text-sm text-muted-foreground">
                    From: {b.ideas.processed_summary || b.ideas.raw_dump?.slice(0, 80)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
