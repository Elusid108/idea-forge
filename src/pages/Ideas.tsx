import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Lightbulb, Grid3X3, List, Mic, MicOff, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

function IdeaCard({ idea }: { idea: any }) {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const isProcessing = idea.status === "processing";
  const isProcessed = idea.status === "processed";
  const categoryClass = CATEGORY_COLORS[idea.category] || "bg-secondary text-secondary-foreground";

  return (
    <Card
      className={`cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:bg-card/80 ${
        isProcessing ? "animate-processing-glow border-primary/40" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          {isProcessed && idea.category ? (
            <Badge className={`text-xs border ${categoryClass}`}>{idea.category}</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">{idea.category || "Uncategorized"}</Badge>
          )}
          {isProcessing ? (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing…
            </div>
          ) : (
            <Badge variant="outline" className="text-xs capitalize">{idea.status}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm font-medium leading-relaxed">
          {isProcessed && idea.processed_summary
            ? idea.processed_summary
            : idea.raw_dump.slice(0, 140) + (idea.raw_dump.length > 140 ? "…" : "")}
        </p>

        {isProcessed && idea.key_features && (
          <div>
            <button
              onClick={(e) => { e.stopPropagation(); setFeaturesOpen(!featuresOpen); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {featuresOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Key Features
            </button>
            {featuresOpen && (
              <div className="mt-1.5 text-xs text-muted-foreground prose prose-invert prose-sm max-w-none [&_ul]:mt-0 [&_ul]:mb-0 [&_li]:my-0">
                <div dangerouslySetInnerHTML={{ __html: idea.key_features.replace(/^- /gm, "• ").replace(/\n/g, "<br/>") }} />
              </div>
            )}
          </div>
        )}

        {isProcessed && idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {idea.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {new Date(idea.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

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
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      if (data?.some((i: any) => i.status === "processing")) return 3000;
      return false;
    },
  });

  const createIdea = useMutation({
    mutationFn: async (raw: string) => {
      const { data, error } = await supabase
        .from("ideas")
        .insert({ raw_dump: raw, user_id: user!.id, status: "processing" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      setDumpOpen(false);
      setRawDump("");
      toast.success("Idea captured! AI is processing…");

      // Fire-and-forget AI processing
      supabase.functions
        .invoke("process-idea", { body: { idea_id: data.id, raw_dump: data.raw_dump } })
        .then(({ error }) => {
          if (error) {
            console.error("AI processing error:", error);
            toast.error("AI processing failed — you can retry later.");
          }
          queryClient.invalidateQueries({ queryKey: ["ideas"] });
        });
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
            <IdeaCard key={idea.id} idea={idea} />
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
