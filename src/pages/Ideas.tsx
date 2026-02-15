import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Lightbulb, Grid3X3, List, Mic, MicOff, Loader2, Brain, ChevronDown, ChevronRight, Ban, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

function IdeaCard({ idea, onClick }: { idea: any; onClick: () => void }) {
  const isProcessing = idea.status === "processing";
  const isProcessed = idea.status === "processed" || idea.status === "brainstorming" || idea.status === "scrapped";
  const isScrapped = idea.status === "scrapped";
  const categoryClass = CATEGORY_COLORS[idea.category] || "bg-secondary text-secondary-foreground";

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:bg-card/80 ${
        isProcessing ? "animate-processing-glow border-primary/40" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          {isScrapped ? (
            <Badge className="text-xs border bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
              <Ban className="h-3 w-3 mr-1" /> Scrapped
            </Badge>
          ) : isProcessed && idea.category ? (
            <Badge className={`text-xs border ${categoryClass}`}>{idea.category}</Badge>
          ) : isProcessing ? (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing…
            </div>
          ) : (
            <Badge variant="secondary" className="text-xs">{idea.category || "New"}</Badge>
          )}
          {idea.status === "brainstorming" && (
            <Badge variant="outline" className="text-xs text-primary border-primary/30">
              <Brain className="h-3 w-3 mr-1" /> Brainstorming
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isProcessed && idea.title ? (
          <p className="text-sm font-bold leading-snug">{idea.title}</p>
        ) : null}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {isProcessed && idea.processed_summary
            ? idea.processed_summary
            : idea.raw_dump.slice(0, 140) + (idea.raw_dump.length > 140 ? "…" : "")}
        </p>

        {isProcessed && idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {idea.tags.slice(0, 4).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
            {idea.tags.length > 4 && (
              <Badge variant="secondary" className="text-[10px]">+{idea.tags.length - 4}</Badge>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60">
          {format(new Date(idea.created_at), "MMM d, yyyy")}
        </p>
      </CardContent>
    </Card>
  );
}

function IdeaDetailModal({
  idea,
  open,
  onOpenChange,
  onDelete,
  onStartBrainstorm,
  onScrap,
  isDeleting,
  isStarting,
  isScrapping,
}: {
  idea: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  onStartBrainstorm: () => void;
  onScrap: () => void;
  isDeleting: boolean;
  isStarting: boolean;
  isScrapping: boolean;
}) {
  const navigate = useNavigate();

  const categoryClass = idea ? (CATEGORY_COLORS[idea.category] || "bg-secondary text-secondary-foreground") : "";
  const isBrainstorming = idea?.status === "brainstorming";
  const isScrapped = idea?.status === "scrapped";

  // Query linked brainstorm and project
  const { data: linkedBrainstorm } = useQuery({
    queryKey: ["idea-linked-brainstorm", idea?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brainstorms")
        .select("id, title")
        .eq("idea_id", idea!.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!idea?.id,
  });

  const { data: linkedProject } = useQuery({
    queryKey: ["idea-linked-project", linkedBrainstorm?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("brainstorm_id", linkedBrainstorm!.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!linkedBrainstorm?.id,
  });

  if (!idea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{idea.title || "Idea Details"}</DialogTitle>
          <DialogDescription className="sr-only">View idea details, delete, or start a brainstorm</DialogDescription>
        </DialogHeader>

        {/* Timestamp + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Created {format(new Date(idea.created_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
          {idea.category && (
            <Badge className={`text-xs border ${categoryClass}`}>{idea.category}</Badge>
          )}
          {linkedBrainstorm && (
            <Badge
              variant="outline"
              className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => { onOpenChange(false); navigate(`/brainstorms/${linkedBrainstorm.id}`); }}
            >
              <Brain className="h-3 w-3" /> Linked Brainstorm
            </Badge>
          )}
          {linkedProject && (
            <Badge
              variant="outline"
              className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => { onOpenChange(false); navigate(`/projects/${linkedProject.id}`); }}
            >
              <FolderOpen className="h-3 w-3" /> Linked Project
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          {/* Raw Dump */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Raw Dump</p>
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
              {idea.raw_dump}
            </div>
          </div>

          {/* Summary */}
          {idea.processed_summary && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Summary</p>
              <p className="text-sm leading-relaxed">{idea.processed_summary}</p>
            </div>
          )}

          {/* Key Features */}
          {idea.key_features && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Key Features</p>
              <div className="text-sm text-muted-foreground prose prose-sm max-w-none [&_ul]:mt-0 [&_ul]:mb-0 [&_li]:my-0">
                <div dangerouslySetInnerHTML={{ __html: idea.key_features.replace(/^- /gm, "• ").replace(/\n/g, "<br/>") }} />
              </div>
            </div>
          )}

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {idea.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter>
          {!isBrainstorming && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting} className="mr-auto">
                  {isDeleting ? "Deleting…" : "Delete"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                  <AlertDialogDescription>This will move the idea to trash. You can restore it later.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!isBrainstorming && (
            <Button variant="secondary" onClick={onScrap} disabled={isScrapping}>
              {isScrapped ? "Un-scrap" : "Scrap"}
            </Button>
          )}
          <Button
            onClick={onStartBrainstorm}
            disabled={isBrainstorming || isStarting || idea.status === "processing"}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            {isBrainstorming ? "Brainstorming…" : isStarting ? "Starting…" : "Start Brainstorm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const IDEA_GROUPS = [
  { key: "fresh", label: "Fresh Ideas", statuses: ["new", "processing", "processed"] },
  { key: "brainstorming", label: "Brainstorming", statuses: ["brainstorming"] },
  { key: "scrapped", label: "Scrapped", statuses: ["scrapped"] },
];

export default function IdeasPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dumpOpen, setDumpOpen] = useState(false);
  const [rawDump, setRawDump] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    () => (localStorage.getItem("ideas-view-mode") as "grid" | "list") || "grid"
  );
  const [isListening, setIsListening] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("ideas-collapsed-groups");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem("ideas-collapsed-groups", JSON.stringify([...next]));
      return next;
    });
  };

  const toggleView = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("ideas-view-mode", mode);
  };

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .is("deleted_at", null)
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
      queryClient.invalidateQueries({ queryKey: ["sidebar-items"] });
      setDumpOpen(false);
      setRawDump("");
      toast.success("Idea captured! AI is processing…");
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

  const deleteIdea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ideas").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      setSelectedIdea(null);
      toast.success("Idea moved to trash");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scrapIdea = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "scrapped" ? "processed" : "scrapped";
      const { error } = await supabase.from("ideas").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      toast.success(newStatus === "scrapped" ? "Idea scrapped" : "Idea restored");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startBrainstorm = useMutation({
    mutationFn: async (idea: any) => {
      const title = idea.title || "Brainstorm";
      const { data, error } = await supabase
        .from("brainstorms")
        .insert({
          idea_id: idea.id,
          title,
          user_id: user!.id,
          compiled_description: idea.processed_summary || "",
          bullet_breakdown: idea.key_features || "",
          category: idea.category || null,
          tags: idea.tags || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("ideas").update({ status: "brainstorming" }).eq("id", idea.id);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-items"] });
      setSelectedIdea(null);
      navigate(`/brainstorms/${data.id}`);
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

  const currentIdea = selectedIdea ? ideas.find((i: any) => i.id === selectedIdea.id) || selectedIdea : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ideas</h1>
          <p className="text-muted-foreground">Capture raw thoughts and let AI help organize them</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => toggleView("grid")} className={viewMode === "grid" ? "text-primary" : ""}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => toggleView("list")} className={viewMode === "list" ? "text-primary" : ""}>
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
        <div className="space-y-4">
          {IDEA_GROUPS.map(group => {
            const groupIdeas = ideas.filter((i: any) => group.statuses.includes(i.status));
            if (groupIdeas.length === 0) return null;
            const isCollapsed = collapsedGroups.has(group.key);
            return (
              <Collapsible key={group.key} open={!isCollapsed} onOpenChange={() => toggleGroupCollapse(group.key)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 hover:text-primary transition-colors">
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="text-sm font-semibold uppercase tracking-wider">{group.label}</span>
                  <Badge variant="secondary" className="text-[10px] ml-1">{groupIdeas.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                    {groupIdeas.map((idea: any) => (
                      <IdeaCard key={idea.id} idea={idea} onClick={() => setSelectedIdea(idea)} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Dump Idea Dialog */}
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

      {/* Idea Detail Modal */}
      <IdeaDetailModal
        idea={currentIdea}
        open={!!selectedIdea}
        onOpenChange={(open) => { if (!open) setSelectedIdea(null); }}
        onDelete={() => currentIdea && deleteIdea.mutate(currentIdea.id)}
        onStartBrainstorm={() => currentIdea && startBrainstorm.mutate(currentIdea)}
        onScrap={() => currentIdea && scrapIdea.mutate({ id: currentIdea.id, currentStatus: currentIdea.status })}
        isDeleting={deleteIdea.isPending}
        isStarting={startBrainstorm.isPending}
        isScrapping={scrapIdea.isPending}
      />
    </div>
  );
}
