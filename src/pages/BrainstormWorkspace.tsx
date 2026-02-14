import { useState, useEffect, useRef } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EditableMarkdown from "@/components/EditableMarkdown";

type RefType = "link" | "image" | "video" | "note";
type ChatMsg = { role: "user" | "assistant"; content: string };

const REF_ICONS: Record<string, any> = {
  link: LinkIcon,
  image: Image,
  video: Film,
  note: StickyNote,
};

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
  const [showLinkedIdea, setShowLinkedIdea] = useState(false);

  // Flashcard Q&A state
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [questionLoaded, setQuestionLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (brainstorm) {
      setDescription(brainstorm.compiled_description || "");
      setBullets(brainstorm.bullet_breakdown || "");
      setTitleDraft(brainstorm.title);
    }
  }, [brainstorm]);

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

  const deleteBrainstorm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("brainstorms")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brainstorm moved to trash");
      navigate("/brainstorms");
    },
    onError: (e: Error) => toast.error(e.message),
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

      setDescription(updated_description);
      setBullets(updated_bullets);
      setCurrentQuestion(next_question);
      setAnswer("");

      const assistantMsg: ChatMsg = {
        role: "assistant",
        content: `Updated description and bullets. Next question: ${next_question}`,
      };
      const finalHistory = [...newHistory, assistantMsg];

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
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleAnswerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
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

  const linkedIdea = (brainstorm as any)?.ideas;
  const brainstormCategory = (brainstorm as any)?.category || linkedIdea?.category;
  const brainstormTags: string[] = (brainstorm as any)?.tags || linkedIdea?.tags || [];
  const linkedCategoryClass = linkedIdea?.category ? CATEGORY_COLORS[linkedIdea.category] || "bg-secondary text-secondary-foreground" : "";
  const categoryBadgeClass = brainstormCategory ? CATEGORY_COLORS[brainstormCategory] || "bg-secondary text-secondary-foreground" : "";

  return (
    <div className="space-y-6">
      {/* 1. Title Bar */}
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
          <Badge
            variant="outline"
            className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setShowLinkedIdea(true)}
          >
            <Lightbulb className="h-3 w-3" /> Linked Idea
          </Badge>
        )}

        {brainstormCategory && (
          <Badge className={`text-xs border ${categoryBadgeClass}`}>{brainstormCategory}</Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={() => deleteBrainstorm.mutate()}
            disabled={deleteBrainstorm.isPending}
          >
            {deleteBrainstorm.isPending ? "Deleting…" : "Delete"}
          </Button>
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

      {/* 2. Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: AI Interview + References */}
        <div className="lg:col-span-3 space-y-6">
          {/* AI Interview (Flashcard Q&A) */}
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
                      ref={textareaRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={handleAnswerKeyDown}
                      placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
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

          {/* References */}
          <div className="space-y-4">
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
        </div>

          {/* Compiled Description - in left column */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Compiled Description</p>
            <EditableMarkdown
              value={description}
              onChange={setDescription}
              onSave={handleSaveDescription}
              placeholder="Synthesize your idea description here…"
              minHeight="100px"
            />
          </div>
        </div>

        {/* Right column: Bullet Breakdown + Tags */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bullet Breakdown</p>
            <EditableMarkdown
              value={bullets}
              onChange={setBullets}
              onSave={handleSaveBullets}
              placeholder="- Key point 1&#10;- Key point 2&#10;- Key point 3"
              minHeight="80px"
            />
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
            {brainstormTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {brainstormTags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">No tags yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Linked Idea Dialog */}
      {linkedIdea && (
        <Dialog open={showLinkedIdea} onOpenChange={setShowLinkedIdea}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="space-y-2">
                {linkedIdea.category && (
                  <Badge className={`text-xs border ${linkedCategoryClass}`}>{linkedIdea.category}</Badge>
                )}
                <DialogTitle>{linkedIdea.title || "Linked Idea"}</DialogTitle>
              </div>
              <DialogDescription className="sr-only">View linked idea details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Raw Dump</p>
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                  {linkedIdea.raw_dump}
                </div>
              </div>

              {linkedIdea.processed_summary && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm leading-relaxed">{linkedIdea.processed_summary}</p>
                </div>
              )}

              {linkedIdea.key_features && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Key Features</p>
                  <div className="text-sm text-muted-foreground">
                    <div dangerouslySetInnerHTML={{ __html: linkedIdea.key_features.replace(/^- /gm, "• ").replace(/\n/g, "<br/>") }} />
                  </div>
                </div>
              )}

              {linkedIdea.tags && linkedIdea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {linkedIdea.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowLinkedIdea(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
