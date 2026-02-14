import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Link as LinkIcon, Image, Film, StickyNote, X,
  Loader2, Rocket, Lightbulb, Bot, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type RefType = "link" | "image" | "video" | "note";
type ChatMsg = { role: "user" | "assistant"; content: string };

const REF_ICONS: Record<string, any> = {
  link: LinkIcon,
  image: Image,
  video: Film,
  note: StickyNote,
};

export default function BrainstormWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- State ---
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [addRefType, setAddRefType] = useState<RefType | null>(null);
  const [refForm, setRefForm] = useState({ title: "", url: "", description: "" });
  const [refFile, setRefFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [bullets, setBullets] = useState("");

  // Flashcard Q&A state
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [questionLoaded, setQuestionLoaded] = useState(false);

  // --- Queries ---
  const { data: brainstorm, isLoading } = useQuery({
    queryKey: ["brainstorm", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brainstorms")
        .select("*, ideas(raw_dump, processed_summary, title, key_features, tags, category)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: references = [] } = useQuery({
    queryKey: ["brainstorm-refs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brainstorm_references")
        .select("*")
        .eq("brainstorm_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (brainstorm) {
      setDescription(brainstorm.compiled_description || "");
      setBullets(brainstorm.bullet_breakdown || "");
      setTitleDraft(brainstorm.title);
    }
  }, [brainstorm]);

  // Generate first question on load
  useEffect(() => {
    if (brainstorm && !questionLoaded && !isThinking) {
      setQuestionLoaded(true);
      generateFirstQuestion();
    }
  }, [brainstorm, questionLoaded]);

  const chatHistory: ChatMsg[] = (brainstorm?.chat_history as ChatMsg[]) || [];

  const getContext = () => ({
    title: brainstorm?.title || "",
    idea_raw: (brainstorm as any)?.ideas?.raw_dump || "",
    idea_summary: (brainstorm as any)?.ideas?.processed_summary || "",
    references: references.map((r: any) => `[${r.type}] ${r.title}: ${r.description || r.url}`).join("\n"),
  });

  const generateFirstQuestion = async () => {
    setIsThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("brainstorm-chat", {
        body: {
          mode: "generate_question",
          compiled_description: brainstorm?.compiled_description || "",
          bullet_breakdown: brainstorm?.bullet_breakdown || "",
          chat_history: chatHistory,
          context: getContext(),
        },
      });
      if (error) throw error;
      setCurrentQuestion(data.question);
    } catch (e: any) {
      toast.error("Failed to generate question: " + e.message);
    } finally {
      setIsThinking(false);
    }
  };

  // --- Mutations ---
  const updateBrainstorm = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase.from("brainstorms").update(fields).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brainstorm", id] }),
  });

  const addReference = useMutation({
    mutationFn: async ({ type, title, url, description }: { type: string; title: string; url?: string; description?: string }) => {
      const { error } = await supabase.from("brainstorm_references").insert({
        brainstorm_id: id!,
        user_id: user!.id,
        type,
        title,
        url: url || "",
        description: description || "",
        sort_order: references.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brainstorm-refs", id] });
      setAddRefType(null);
      setRefForm({ title: "", url: "", description: "" });
      setRefFile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteReference = useMutation({
    mutationFn: async (refId: string) => {
      const { error } = await supabase.from("brainstorm_references").delete().eq("id", refId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brainstorm-refs", id] }),
  });

  const promoteToProject = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          brainstorm_id: id!,
          user_id: user!.id,
          name: brainstorm?.title || "Untitled Project",
          general_notes: description,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("brainstorms").update({ status: "completed" }).eq("id", id!);
      return data;
    },
    onSuccess: () => {
      toast.success("Promoted to project!");
      navigate("/projects");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Handlers ---
  const handleSaveTitle = () => {
    if (titleDraft.trim() && titleDraft !== brainstorm?.title) {
      updateBrainstorm.mutate({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (description !== (brainstorm?.compiled_description || "")) {
      updateBrainstorm.mutate({ compiled_description: description });
    }
  };

  const handleSaveBullets = () => {
    if (bullets !== (brainstorm?.bullet_breakdown || "")) {
      updateBrainstorm.mutate({ bullet_breakdown: bullets });
    }
  };

  const handleAddRef = async () => {
    if (addRefType === "image" && refFile) {
      const path = `${user!.id}/${id}/${Date.now()}-${refFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("brainstorm-references")
        .upload(path, refFile);
      if (uploadError) {
        toast.error("Upload failed: " + uploadError.message);
        return;
      }
      const { data: urlData } = supabase.storage.from("brainstorm-references").getPublicUrl(path);
      addReference.mutate({
        type: "image",
        title: refForm.title || refFile.name,
        url: urlData.publicUrl,
        description: refForm.description,
      });
    } else {
      addReference.mutate({
        type: addRefType!,
        title: refForm.title,
        url: refForm.url,
        description: refForm.description,
      });
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || isThinking) return;
    setIsThinking(true);

    const userMsg: ChatMsg = { role: "user", content: `Q: ${currentQuestion}\nA: ${answer.trim()}` };
    const newHistory = [...chatHistory, userMsg];

    try {
      const { data, error } = await supabase.functions.invoke("brainstorm-chat", {
        body: {
          mode: "submit_answer",
          answer: answer.trim(),
          question: currentQuestion,
          compiled_description: description,
          bullet_breakdown: bullets,
          chat_history: newHistory,
          context: getContext(),
        },
      });
      if (error) throw error;

      const { updated_description, updated_bullets, next_question } = data;

      // Update local state
      setDescription(updated_description);
      setBullets(updated_bullets);
      setCurrentQuestion(next_question);
      setAnswer("");

      // Build final chat history with AI response
      const assistantMsg: ChatMsg = {
        role: "assistant",
        content: `Updated description and bullets. Next question: ${next_question}`,
      };
      const finalHistory = [...newHistory, assistantMsg];

      // Save to DB
      await supabase.from("brainstorms").update({
        compiled_description: updated_description,
        bullet_breakdown: updated_bullets,
        chat_history: finalHistory,
      }).eq("id", id!);

      queryClient.invalidateQueries({ queryKey: ["brainstorm", id] });
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally {
      setIsThinking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!brainstorm) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Brainstorm not found</p>
        <Button variant="link" onClick={() => navigate("/brainstorms")}>Back to brainstorms</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/brainstorms")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {editingTitle ? (
          <Input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
            className="max-w-sm text-xl font-bold"
            autoFocus
          />
        ) : (
          <h1
            className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
            onClick={() => setEditingTitle(true)}
          >
            {brainstorm.title}
          </h1>
        )}

        {brainstorm.idea_id && (
          <Badge variant="outline" className="text-xs gap-1">
            <Lightbulb className="h-3 w-3" /> Linked Idea
          </Badge>
        )}

        <div className="ml-auto">
          <Button
            onClick={() => promoteToProject.mutate()}
            disabled={promoteToProject.isPending}
            className="gap-2"
          >
            <Rocket className="h-4 w-4" />
            {promoteToProject.isPending ? "Promoting…" : "Promote to Project"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Reference Board */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">References</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="end">
                {(["link", "image", "video", "note"] as RefType[]).map((type) => {
                  const Icon = REF_ICONS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setAddRefType(type)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent capitalize"
                    >
                      <Icon className="h-4 w-4" /> {type}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>

          {references.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
              <StickyNote className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No references yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {references.map((ref: any) => {
                const Icon = REF_ICONS[ref.type] || StickyNote;
                return (
                  <Card key={ref.id} className="border-border/50 bg-card/50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{ref.title}</p>
                            {ref.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{ref.description}</p>
                            )}
                            {ref.url && ref.type !== "note" && (
                              <a
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline truncate block"
                              >
                                {ref.url}
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteReference.mutate(ref.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Synthesis + Flashcard Q&A */}
        <div className="lg:col-span-2 space-y-4">
          {/* Compiled Description */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Compiled Description</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="Synthesize your idea description here…"
              className="min-h-[100px] resize-none text-sm"
            />
          </div>

          {/* Bullet Breakdown */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bullet Breakdown</p>
            <Textarea
              value={bullets}
              onChange={(e) => setBullets(e.target.value)}
              onBlur={handleSaveBullets}
              placeholder="- Key point 1&#10;- Key point 2&#10;- Key point 3"
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          <Separator />

          {/* Flashcard Q&A */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI Interview</p>
            <Card className="border-border bg-muted/30">
              <CardContent className="p-4 space-y-3">
                {isThinking && !currentQuestion ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : currentQuestion ? (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{currentQuestion}</p>
                    </div>
                    <Textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer…"
                      className="min-h-[80px] resize-none text-sm"
                      disabled={isThinking}
                    />
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!answer.trim() || isThinking}
                      className="w-full gap-2"
                    >
                      {isThinking ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</>
                      ) : (
                        <><Send className="h-4 w-4" /> Submit Answer</>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <Bot className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">Loading interview questions…</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Reference Dialog */}
      <Dialog open={!!addRefType} onOpenChange={(open) => { if (!open) setAddRefType(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">Add {addRefType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={refForm.title}
              onChange={(e) => setRefForm(p => ({ ...p, title: e.target.value }))}
            />
            {addRefType === "image" ? (
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setRefFile(e.target.files?.[0] || null)}
              />
            ) : addRefType !== "note" ? (
              <Input
                placeholder="URL"
                value={refForm.url}
                onChange={(e) => setRefForm(p => ({ ...p, url: e.target.value }))}
              />
            ) : null}
            <Textarea
              placeholder="Description (optional)"
              value={refForm.description}
              onChange={(e) => setRefForm(p => ({ ...p, description: e.target.value }))}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddRefType(null)}>Cancel</Button>
            <Button
              onClick={handleAddRef}
              disabled={!refForm.title.trim() || addReference.isPending}
            >
              {addReference.isPending ? "Adding…" : "Add Reference"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
