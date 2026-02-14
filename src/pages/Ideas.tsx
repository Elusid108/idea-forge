import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Lightbulb, Grid3X3, List, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function IdeasPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dumpOpen, setDumpOpen] = useState(false);
  const [rawDump, setRawDump] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isListening, setIsListening] = useState(false);

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createIdea = useMutation({
    mutationFn: async (raw: string) => {
      const { data, error } = await supabase
        .from("ideas")
        .insert({ raw_dump: raw, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      setDumpOpen(false);
      setRawDump("");
      toast.success("Idea captured!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setRawDump(prev => prev + " " + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const handleSave = () => {
    if (!rawDump.trim()) return;
    createIdea.mutate(rawDump.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ideas</h1>
          <p className="text-muted-foreground">Capture raw thoughts and let AI help organize them</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "text-primary" : ""}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "text-primary" : ""}>
            <List className="h-4 w-4" />
          </Button>
          <Button onClick={() => setDumpOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Dump Idea
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No ideas yet</p>
          <p className="text-sm text-muted-foreground/70">Hit "Dump Idea" to capture your first thought</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {ideas.map((idea) => (
            <Card key={idea.id} className="cursor-pointer border-border/50 bg-card/50 transition-colors hover:border-primary/30 hover:bg-card/80">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary" className="text-xs">{idea.category}</Badge>
                  <Badge variant="outline" className="text-xs">{idea.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm font-medium">{idea.processed_summary || idea.raw_dump.slice(0, 120)}</p>
                {idea.tags && idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {idea.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(idea.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dumpOpen} onOpenChange={setDumpOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Dump an Idea
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Just dump it — stream of consciousness, rough notes, half-baked thoughts…"
              className="min-h-[200px] resize-none"
              value={rawDump}
              onChange={(e) => setRawDump(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoice}
              className={`gap-2 ${isListening ? "text-destructive" : ""}`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isListening ? "Stop Recording" : "Voice Input"}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDumpOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!rawDump.trim() || createIdea.isPending}>
              {createIdea.isPending ? "Saving…" : "Save Idea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
