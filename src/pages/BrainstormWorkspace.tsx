import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Link as LinkIcon, Image, Film, StickyNote, X,
  Loader2, Rocket, Lightbulb, Bot, Send, CheckCircle2,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EditableMarkdown from "@/components/EditableMarkdown";
import ReferenceViewer, { getVideoThumbnail } from "@/components/ReferenceViewer";
import { useUndoRedo } from "@/hooks/useUndoRedo";

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

  // Chatbot state (post-promotion)
  const [queryChatHistory, setQueryChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatThinking, setIsChatThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Reference viewer state
  const [viewingRef, setViewingRef] = useState<any>(null);

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

  const isCompleted = brainstorm?.status === "completed";

  // --- Undo/Redo ---
  const handleRevert = useCallback(async (fieldName: string, value: string | null, metadata: any) => {
    if (fieldName === "compiled_description") {
      setDescription(value || "");
      await supabase.from("brainstorms").update({ compiled_description: value || "" }).eq("id", id!);
      queryClient.invalidateQueries({ queryKey: ["brainstorm", id] });
      toast.info("Undo: description reverted");
    } else if (fieldName === "bullet_breakdown") {
      setBullets(value || "");
      await supabase.from("brainstorms").update({ bullet_breakdown: value || "" }).eq("id", id!);
      queryClient.invalidateQueries({ queryKey: ["brainstorm", id] });
      toast.info("Undo: bullets reverted");
    } else if (fieldName === "deleted_reference" && metadata) {
      // Re-insert the deleted reference
      const { id: _id, ...rest } = metadata;
      await supabase.from("brainstorm_references").insert({ ...rest, id: metadata.id });
      queryClient.invalidateQueries({ queryKey: ["brainstorm-refs", id] });
      toast.info("Undo: reference restored");
    }
  }, [id, queryClient]);

  const handleReapply = useCallback(async (fieldName: string, value: string | null, metadata: any) => {
    if (fieldName === "compiled_description") {
      setDescription(value || "");
      await supabase.from("brainstorms").update({ compiled_description: value || "" }).eq("id", id!);
      queryClient.invalidateQueries({ queryKey: ["brainstorm", id] });
      toast.info("Redo: description updated");
    } else if (fieldName === "bullet_breakdown") {
      setBullets(value || "");
      await supabase.from("brainstorms").update({ bullet_breakdown: value || "" }).eq("id", id!);
      queryClient.invalidateQueries({ queryKey: ["brainstorm", id] });
      toast.info("Redo: bullets updated");
    } else if (fieldName === "deleted_reference" && metadata) {
      await supabase.from("brainstorm_references").delete().eq("id", metadata.id);
      queryClient.invalidateQueries({ queryKey: ["brainstorm-refs", id] });
      toast.info("Redo: reference deleted");
    }
  }, [id, queryClient]);

  const { pushEntry } = useUndoRedo({
    brainstormId: id,
    userId: user?.id,
    onRevert: handleRevert,
    onReapply: handleReapply,
    enabled: !isCompleted,
  });

  useEffect(() => {
    if (brainstorm && !questionLoaded && !isThinking && !isCompleted) {
      setQuestionLoaded(true);
      generateFirstQuestion();
    }
  }, [brainstorm, questionLoaded, isCompleted]);

  const chatHistory: ChatMsg[] = (brainstorm?.chat_history as ChatMsg[]) || [];

  const getContext = () => ({
    title: brainstorm?.title || "",
    idea_raw: (brainstorm as any)?.ideas?.raw_dump || "",
    idea_summary: (brainstorm as any)?.ideas?.processed_summary || "",
    references: references.map((r: any) => `[${r.type}] ${r.title}: ${r.description || r.url}`).join("\n"),
    tags: (brainstorm as any)?.tags || [],
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
    mutationFn: async ({ type, title, url, description, thumbnail_url }: { type: string; title: string; url?: string; description?: string; thumbnail_url?: string }) => {
      const { error } = await supabase.from("brainstorm_references").insert({
        brainstorm_id: id!,
        user_id: user!.id,
        type,
        title,
        url: url || "",
        description: description || "",
        sort_order: references.length,
        thumbnail_url: thumbnail_url || "",
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
    mutationFn: async (ref: any) => {
      // Record history before deleting
      await pushEntry("deleted_reference", null, null, ref);
      const { error } = await supabase.from("brainstorm_references").delete().eq("id", ref.id);
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
    const oldVal = brainstorm?.compiled_description || "";
    if (description !== oldVal) {
      pushEntry("compiled_description", oldVal, description);
      updateBrainstorm.mutate({ compiled_description: description });
    }
  };

  const handleSaveBullets = () => {
    const oldVal = brainstorm?.bullet_breakdown || "";
    if (bullets !== oldVal) {
      pushEntry("bullet_breakdown", oldVal, bullets);
      updateBrainstorm.mutate({ bullet_breakdown: bullets });
    }
  };

  const fetchLinkPreview = async (url: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-link-preview", {
        body: { url },
      });
      if (error) return null;
      return data?.thumbnail_url || null;
    } catch {
      return null;
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
        thumbnail_url: urlData.publicUrl,
      });
    } else if (addRefType === "link" || addRefType === "video") {
      // Fetch thumbnail for links and videos
      let thumbnail_url: string | null = null;
      if (addRefType === "video" && refForm.url) {
        thumbnail_url = getVideoThumbnail(refForm.url);
      }
      if (!thumbnail_url && refForm.url) {
        thumbnail_url = await fetchLinkPreview(refForm.url);
      }
      addReference.mutate({
        type: addRefType,
        title: refForm.title,
        url: refForm.url,
        description: refForm.description,
        thumbnail_url: thumbnail_url || undefined,
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

  const handleRefClick = (ref: any) => {
    if (ref.type === "link" && ref.url) {
      window.open(ref.url, "_blank", "noopener,noreferrer");
    } else if (ref.type === "note" || ref.type === "image" || ref.type === "video") {
      setViewingRef(ref);
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

      const { updated_description, updated_bullets, updated_tags, next_question } = data;

      setDescription(updated_description);
      setBullets(updated_bullets);
      setCurrentQuestion(next_question);
      setAnswer("");

      const assistantMsg: ChatMsg = {
        role: "assistant",
        content: `Updated description and bullets. Next question: ${next_question}`,
      };
      const finalHistory = [...newHistory, assistantMsg];

      const updateFields: Record<string, any> = {
        compiled_description: updated_description,
        bullet_breakdown: updated_bullets,
        chat_history: finalHistory,
      };
      if (updated_tags && Array.isArray(updated_tags)) {
        updateFields.tags = updated_tags;
      }

      await supabase.from("brainstorms").update(updateFields).eq("id", id!);
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

  // Chatbot handler (post-promotion)
  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatThinking) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    const newHistory = [...queryChatHistory, userMsg];
    setQueryChatHistory(newHistory);
    setChatInput("");
    setIsChatThinking(true);

    try {
      const { data, error } = await supabase.functions.invoke("brainstorm-chat", {
        body: {
          mode: "chat_query",
          chat_history: newHistory,
          context: {
            ...getContext(),
            compiled_description: description,
            bullet_breakdown: bullets,
            tags: (brainstorm as any)?.tags || [],
          },
        },
      });
      if (error) throw error;
      const assistantMsg: ChatMsg = { role: "assistant", content: data.answer };
      setQueryChatHistory([...newHistory, assistantMsg]);
    } catch (e: any) {
      toast.error("Chat failed: " + e.message);
    } finally {
      setIsChatThinking(false);
      setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
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

  const getRefThumbnail = (ref: any): string | null => {
    if (ref.thumbnail_url) return ref.thumbnail_url;
    if (ref.type === "image" && ref.url) return ref.url;
    if (ref.type === "video" && ref.url) return getVideoThumbnail(ref.url);
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. Title Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/brainstorms")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {editingTitle && !isCompleted ? (
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
            className={`text-2xl font-bold ${!isCompleted ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
            onClick={() => !isCompleted && setEditingTitle(true)}
          >
            {brainstorm.title}
          </h1>
        )}

        {brainstormCategory && (
          <Badge className={`text-xs border ${categoryBadgeClass}`}>{brainstormCategory}</Badge>
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

        <div className="ml-auto flex items-center gap-2">
          {isCompleted ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border gap-1">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* 2. Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-6">
          {/* AI Interview or Chatbot */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {isCompleted ? "AI Assistant" : "AI Interview"}
            </p>
            <Card className="border-border bg-muted/30">
              <CardContent className="p-4 space-y-3">
                {isCompleted ? (
                  <>
                    <div ref={chatScrollRef} className="max-h-64 overflow-y-auto space-y-3">
                      {queryChatHistory.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                          <Bot className="h-8 w-8 text-muted-foreground/50 mb-2" />
                          <p className="text-xs text-muted-foreground">Ask questions about this brainstorm's content…</p>
                        </div>
                      )}
                      {queryChatHistory.map((msg, i) => (
                        <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                          {msg.role === "assistant" && (
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Bot className="h-3 w-3 text-primary" />
                            </div>
                          )}
                          <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isChatThinking && (
                        <div className="flex items-start gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="h-3 w-3 text-primary" />
                          </div>
                          <Skeleton className="h-8 w-40 rounded-lg" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleChatKeyDown}
                        placeholder="Ask about this brainstorm… (Enter to send)"
                        className="min-h-[60px] resize-none text-sm flex-1"
                        disabled={isChatThinking}
                      />
                      <Button
                        onClick={handleChatSubmit}
                        disabled={!chatInput.trim() || isChatThinking}
                        size="icon"
                        className="shrink-0 self-end"
                      >
                        {isChatThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Compiled Description */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Compiled Description</p>
            <EditableMarkdown
              value={description}
              onChange={setDescription}
              onSave={handleSaveDescription}
              placeholder="Synthesize your idea description here…"
              minHeight="100px"
              readOnly={isCompleted}
            />
          </div>

          {/* References */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">References</h2>
              {!isCompleted && (
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
              )}
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
                  const thumbnail = getRefThumbnail(ref);
                  return (
                    <Card
                      key={ref.id}
                      className="border-border/50 bg-card/50 cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => handleRefClick(ref)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          {thumbnail ? (
                            <div className="h-12 w-16 rounded overflow-hidden shrink-0 bg-muted">
                              <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-12 w-16 rounded bg-muted/50 flex items-center justify-center shrink-0">
                              <Icon className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ref.title}</p>
                            {ref.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{ref.description}</p>
                            )}
                          </div>
                          {!isCompleted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteReference.mutate(ref);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
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

          {/* Bullet Breakdown */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bullet Breakdown</p>
            <EditableMarkdown
              value={bullets}
              onChange={setBullets}
              onSave={handleSaveBullets}
              placeholder="- Key point 1&#10;- Key point 2&#10;- Key point 3"
              minHeight="80px"
              readOnly={isCompleted}
            />
          </div>
        </div>
      </div>

      {/* Reference Viewer */}
      <ReferenceViewer
        reference={viewingRef}
        open={!!viewingRef}
        onOpenChange={(open) => { if (!open) setViewingRef(null); }}
      />

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
