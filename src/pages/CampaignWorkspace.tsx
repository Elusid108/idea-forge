import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Trash2, ExternalLink, Plus, X, Pencil, DollarSign, ShoppingCart, Target, Rocket,
  Wrench, Brain, Lightbulb, Megaphone, Bot, Send, Loader2, CheckCircle2, Sparkles,
  GripVertical, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EditableMarkdown from "@/components/EditableMarkdown";
import ReactMarkdown from "react-markdown";
import { markdownComponents } from "@/lib/markdownComponents";
import { format } from "date-fns";

const STATUS_OPTIONS = ["asset_creation", "pre_launch", "active_campaign", "fulfillment", "evergreen"];
const STATUS_LABELS: Record<string, string> = {
  asset_creation: "Asset Creation",
  pre_launch: "Pre-Launch",
  active_campaign: "Active Campaign",
  fulfillment: "Fulfillment",
  evergreen: "Evergreen",
};

const SALES_MODELS = ["B2B", "B2C", "Open Source", "Marketplace", "Direct", "Other"];
const CHANNELS = ["Shopify", "Etsy", "GitHub", "Gumroad", "Amazon", "Website", "Other"];

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

const KANBAN_COLUMNS = [
  { key: "asset_creation", label: "Asset Creation" },
  { key: "pre_launch", label: "Pre-Launch" },
  { key: "active_campaign", label: "Active Campaign" },
  { key: "fulfillment", label: "Fulfillment" },
  { key: "evergreen", label: "Evergreen" },
];

type MarketingLink = { label: string; url: string };
type ChatMsg = { role: "user" | "assistant"; content: string };

export default function CampaignWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [metricDraft, setMetricDraft] = useState("");
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkForm, setLinkForm] = useState({ label: "", url: "" });
  const [showLinkedIdea, setShowLinkedIdea] = useState(false);

  // GTM Interview state
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [isInterviewThinking, setIsInterviewThinking] = useState(false);
  const [interviewChatHistory, setInterviewChatHistory] = useState<ChatMsg[]>([]);
  const [questionLoaded, setQuestionLoaded] = useState(false);
  const [isForging, setIsForging] = useState(false);
  const [topicsRemaining, setTopicsRemaining] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Add task state
  const [addingTaskColumn, setAddingTaskColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: linkedProject } = useQuery({
    queryKey: ["campaign-linked-project", campaign?.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, brainstorm_id, compiled_description, execution_strategy, bullet_breakdown, general_notes, github_repo_url, tags, category")
        .eq("id", campaign!.project_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!campaign?.project_id,
  });

  const { data: linkedBrainstorm } = useQuery({
    queryKey: ["campaign-linked-brainstorm", linkedProject?.brainstorm_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brainstorms")
        .select("id, title, idea_id")
        .eq("id", linkedProject!.brainstorm_id!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!linkedProject?.brainstorm_id,
  });

  const { data: linkedIdea } = useQuery({
    queryKey: ["campaign-linked-idea", linkedBrainstorm?.idea_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .eq("id", linkedBrainstorm!.idea_id!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!linkedBrainstorm?.idea_id,
  });

  const { data: campaignTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["campaign-tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_tasks" as any)
        .select("*")
        .eq("campaign_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (campaign) {
      setTitleDraft(campaign.title);
      // Load saved interview chat history
      if (campaign.chat_history && Array.isArray(campaign.chat_history) && campaign.chat_history.length > 0) {
        setInterviewChatHistory(campaign.chat_history as ChatMsg[]);
      }
    }
  }, [campaign]);

  const interviewCompleted = campaign?.interview_completed === true;

  // Generate first GTM question
  useEffect(() => {
    if (campaign && !interviewCompleted && !questionLoaded && !isInterviewThinking && linkedProject) {
      setQuestionLoaded(true);
      const history = (campaign.chat_history as ChatMsg[]) || [];
      if (history.length > 0) {
        const lastAssistant = [...history].reverse().find(m => m.role === "assistant");
        if (lastAssistant) {
          const match = lastAssistant.content.match(/Next question:\s*(.+)/);
          if (match) {
            setCurrentQuestion(match[1].trim());
            return;
          }
        }
      }
      generateFirstQuestion();
    }
  }, [campaign, interviewCompleted, questionLoaded, linkedProject]);

  const getInterviewContext = () => ({
    title: campaign?.title || "",
    project_name: linkedProject?.name || "",
    category: campaign?.category || linkedProject?.category || "",
    tags: campaign?.tags || linkedProject?.tags || [],
    compiled_description: linkedProject?.compiled_description || "",
    bullet_breakdown: linkedProject?.bullet_breakdown || "",
    execution_strategy: (linkedProject as any)?.execution_strategy || "",
    has_github: !!(linkedProject as any)?.github_repo_url,
    general_notes: (linkedProject as any)?.general_notes || "",
  });

  const generateFirstQuestion = async () => {
    setIsInterviewThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("campaign-chat", {
        body: {
          mode: "generate_question",
          chat_history: interviewChatHistory,
          context: getInterviewContext(),
        },
      });
      if (error) throw error;
      setCurrentQuestion(data.question);
      if (data.topics_remaining) setTopicsRemaining(data.topics_remaining);
    } catch (e: any) {
      toast.error("Failed to generate question: " + e.message);
    } finally {
      setIsInterviewThinking(false);
    }
  };

  const handleInterviewSubmit = async () => {
    if (!interviewAnswer.trim() || isInterviewThinking) return;
    setIsInterviewThinking(true);

    const userMsg: ChatMsg = { role: "user", content: `Q: ${currentQuestion}\nA: ${interviewAnswer.trim()}` };
    const newHistory = [...interviewChatHistory, userMsg];

    try {
      const { data, error } = await supabase.functions.invoke("campaign-chat", {
        body: {
          mode: "submit_answer",
          answer: interviewAnswer.trim(),
          question: currentQuestion,
          chat_history: newHistory,
          context: getInterviewContext(),
        },
      });
      if (error) throw error;

      const { next_question, clarification, topics_remaining } = data;
      if (topics_remaining) setTopicsRemaining(topics_remaining);

      if (clarification) {
        const assistantMsg: ChatMsg = { role: "assistant", content: clarification };
        const finalHistory = [...newHistory, assistantMsg];
        setInterviewChatHistory(finalHistory);
        setCurrentQuestion(next_question);
        setInterviewAnswer("");
        await supabase.from("campaigns" as any).update({ chat_history: finalHistory }).eq("id", id!);
      } else {
        const assistantMsg: ChatMsg = { role: "assistant", content: `Noted. Next question: ${next_question}` };
        const finalHistory = [...newHistory, assistantMsg];
        setInterviewChatHistory(finalHistory);
        setCurrentQuestion(next_question);
        setInterviewAnswer("");
        await supabase.from("campaigns" as any).update({ chat_history: finalHistory }).eq("id", id!);
      }
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally {
      setIsInterviewThinking(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleForgePlaybook = async () => {
    setIsForging(true);
    try {
      const { data, error } = await supabase.functions.invoke("campaign-chat", {
        body: {
          mode: "forge_playbook",
          chat_history: interviewChatHistory,
          context: getInterviewContext(),
        },
      });
      if (error) throw error;

      const { playbook, sales_model, primary_channel, tasks } = data;

      // Update campaign
      await supabase.from("campaigns" as any).update({
        playbook,
        sales_model: sales_model || "",
        primary_channel: primary_channel || "",
        interview_completed: true,
        chat_history: interviewChatHistory,
      }).eq("id", id!);

      // Create tasks
      if (tasks && Array.isArray(tasks)) {
        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i];
          await supabase.from("campaign_tasks" as any).insert({
            campaign_id: id!,
            user_id: user!.id,
            title: t.title || "",
            description: t.description || "",
            status_column: t.status_column || "asset_creation",
            sort_order: i,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-items"] });
      toast.success("Campaign Playbook forged!");
    } catch (e: any) {
      toast.error("Failed to forge playbook: " + e.message);
    } finally {
      setIsForging(false);
    }
  };

  const updateCampaign = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase.from("campaigns" as any).update(fields).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-items"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async () => {
      if (campaign?.project_id) {
        await supabase.from("projects").update({ campaign_id: null } as any).eq("id", campaign.project_id);
      }
      const { error } = await supabase.from("campaigns" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign moved to trash");
      queryClient.invalidateQueries({ queryKey: ["sidebar-items"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      navigate("/campaigns");
    },
  });

  const handleSaveTitle = () => {
    if (titleDraft.trim() && titleDraft !== campaign?.title) {
      updateCampaign.mutate({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const handleSaveMetric = (field: string) => {
    const val = parseInt(metricDraft) || 0;
    if (val !== campaign?.[field]) {
      updateCampaign.mutate({ [field]: val });
    }
    setEditingMetric(null);
  };

  const marketingLinks: MarketingLink[] = campaign?.marketing_links || [];

  const handleAddLink = () => {
    if (!linkForm.label.trim() || !linkForm.url.trim()) return;
    const url = linkForm.url.match(/^https?:\/\//) ? linkForm.url : `https://${linkForm.url}`;
    const updated = [...marketingLinks, { label: linkForm.label.trim(), url }];
    updateCampaign.mutate({ marketing_links: updated });
    setLinkForm({ label: "", url: "" });
    setShowAddLink(false);
  };

  const handleDeleteLink = (index: number) => {
    const updated = marketingLinks.filter((_, i) => i !== index);
    updateCampaign.mutate({ marketing_links: updated });
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    await supabase.from("campaign_tasks" as any).update({ completed: !completed }).eq("id", taskId);
    refetchTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from("campaign_tasks" as any).delete().eq("id", taskId);
    refetchTasks();
  };

  const handleAddTask = async (column: string) => {
    if (!newTaskTitle.trim()) return;
    await supabase.from("campaign_tasks" as any).insert({
      campaign_id: id!,
      user_id: user!.id,
      title: newTaskTitle.trim(),
      status_column: column,
      sort_order: campaignTasks.filter((t: any) => t.status_column === column).length,
    });
    setNewTaskTitle("");
    setAddingTaskColumn(null);
    refetchTasks();
  };

  const handleInterviewKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInterviewSubmit();
    }
  };

  // Count Q&A exchanges (user messages)
  const exchangeCount = interviewChatHistory.filter(m => m.role === "user").length;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Skeleton className="h-8 w-8" /></div>;
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Campaign not found</p>
        <Button variant="link" onClick={() => navigate("/campaigns")}>Back to campaigns</Button>
      </div>
    );
  }

  // =================== STATE 1: GTM INTERVIEW ===================
  if (!interviewCompleted) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.title}</h1>
            <p className="text-xs text-muted-foreground">Go-To-Market Strategy Interview</p>
          </div>
        </div>

        {/* Project context summary */}
        {linkedProject && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Project Context</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(campaign.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
                {campaign.category && (
                  <Badge className={`text-xs border ${CATEGORY_COLORS[campaign.category] || "bg-secondary text-secondary-foreground"}`}>
                    {campaign.category}
                  </Badge>
                )}
                {linkedIdea && (
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowLinkedIdea(true)}
                  >
                    <Lightbulb className="h-3 w-3 text-yellow-400" /> Linked Idea
                  </Badge>
                )}
                {linkedBrainstorm && (
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => navigate(`/brainstorms/${linkedBrainstorm.id}`)}
                  >
                    <Brain className="h-3 w-3 text-pink-400" /> Linked Brainstorm
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/projects/${linkedProject.id}`)}
                >
                  <Wrench className="h-3 w-3 text-blue-400" /> Linked Project
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interview Q&A Card */}
        <Card className="border-border bg-muted/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">GTM Strategy Interview</h2>
            </div>

            {/* Progress indicator */}
            {exchangeCount > 0 && (
              <p className="text-xs text-muted-foreground italic">
                {topicsRemaining.length > 0
                  ? `To forge your playbook, we still need to discuss: ${topicsRemaining.join(", ")}`
                  : "You can now forge your playbook, or continue answering to refine it."}
              </p>
            )}

            {/* Current question */}
            {isInterviewThinking && !currentQuestion ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : currentQuestion ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{currentQuestion}</p>
                </div>
                <Textarea
                  ref={textareaRef}
                  value={interviewAnswer}
                  onChange={(e) => setInterviewAnswer(e.target.value)}
                  onKeyDown={handleInterviewKeyDown}
                  placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
                  className="min-h-[80px] resize-none text-sm"
                  disabled={isInterviewThinking}
                />
                <Button
                  onClick={handleInterviewSubmit}
                  disabled={!interviewAnswer.trim() || isInterviewThinking}
                  className="w-full gap-2"
                >
                  {isInterviewThinking ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</>
                  ) : (
                    <><Send className="h-4 w-4" /> Submit Answer</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Bot className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">Loading interview questions…</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forge Playbook button -- appears after 3+ exchanges */}
        {exchangeCount >= 3 && (
          <Button
            onClick={handleForgePlaybook}
            disabled={isForging}
            size="lg"
            className="w-full gap-2 h-14 text-base"
          >
            {isForging ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Forging Campaign Playbook…</>
            ) : (
              <><Sparkles className="h-5 w-5" /> Forge Campaign Playbook</>
            )}
          </Button>
        )}
        {/* Linked Idea Overlay */}
        {linkedIdea && (
          <Dialog open={showLinkedIdea} onOpenChange={setShowLinkedIdea}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{linkedIdea.title || "Linked Idea"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(linkedIdea.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  {linkedIdea.category && (
                    <Badge className={`text-xs border ${CATEGORY_COLORS[linkedIdea.category] || "bg-secondary text-secondary-foreground"}`}>{linkedIdea.category}</Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Raw Dump</p>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap">{linkedIdea.raw_dump}</div>
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
      </div>
    );
  }

  // =================== STATE 2: DASHBOARD ===================
  const metricCards = [
    { key: "revenue", label: "Revenue", icon: DollarSign, prefix: "$", value: campaign.revenue || 0 },
    { key: "units_sold", label: "Units Sold", icon: ShoppingCart, prefix: "", value: campaign.units_sold || 0 },
    { key: "target_price", label: "Target Price", icon: Target, prefix: "$", value: campaign.target_price || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
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
            {campaign.title}
          </h1>
        )}

        <Select value={campaign.status} onValueChange={(val) => updateCampaign.mutate({ status: val })}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                <AlertDialogDescription>This will move the campaign to trash and unlock the linked project.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteCampaign.mutate()}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Created date + badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Created {format(new Date(campaign.created_at), "MMM d, yyyy 'at' h:mm a")}
        </p>
        {campaign.category && (
          <Badge className={`text-xs border ${CATEGORY_COLORS[campaign.category] || "bg-secondary text-secondary-foreground"}`}>
            {campaign.category}
          </Badge>
        )}
        {linkedIdea && (
          <Badge
            variant="outline"
            className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setShowLinkedIdea(true)}
          >
            <Lightbulb className="h-3 w-3 text-yellow-400" /> Linked Idea
          </Badge>
        )}
        {linkedBrainstorm && (
          <Badge
            variant="outline"
            className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/brainstorms/${linkedBrainstorm.id}`)}
          >
            <Brain className="h-3 w-3 text-pink-400" /> Linked Brainstorm
          </Badge>
        )}
        {linkedProject && (
          <Badge
            variant="outline"
            className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/projects/${linkedProject.id}`)}
          >
            <Wrench className="h-3 w-3 text-blue-400" /> Linked Project
          </Badge>
        )}
      </div>

      {campaign.tags && campaign.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {campaign.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}

      <Separator />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricCards.map((m) => (
          <Card key={m.key} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</span>
              </div>
              {editingMetric === m.key ? (
                <Input
                  type="number"
                  value={metricDraft}
                  onChange={(e) => setMetricDraft(e.target.value)}
                  onBlur={() => handleSaveMetric(m.key)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveMetric(m.key)}
                  className="text-2xl font-bold h-10"
                  autoFocus
                />
              ) : (
                <p
                  className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setEditingMetric(m.key);
                    setMetricDraft(String(m.value));
                  }}
                >
                  {m.prefix}{m.value.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Playbook */}
      <EditablePlaybook campaignId={id!} initialValue={campaign.playbook || ""} updateCampaign={updateCampaign} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Strategy */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distribution Strategy</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sales Model</label>
                <Select value={campaign.sales_model || ""} onValueChange={(val) => updateCampaign.mutate({ sales_model: val })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select model…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALES_MODELS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Primary Channel</label>
                <Select value={campaign.primary_channel || ""} onValueChange={(val) => updateCampaign.mutate({ primary_channel: val })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select channel…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Links */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign Links</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAddLink(true)}>
                <Plus className="h-3 w-3" /> Add Link
              </Button>
            </div>
            {marketingLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic">No links yet</p>
            ) : (
              <div className="space-y-2">
                {marketingLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background/50">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                      {link.label}
                    </a>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteLink(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kanban Task Board */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Go-To-Market Pipeline</p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {KANBAN_COLUMNS.map(col => {
            const colTasks = campaignTasks.filter((t: any) => t.status_column === col.key);
            return (
              <div key={col.key} className="rounded-lg border border-border/50 bg-card/30 p-3 min-h-[150px]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</p>
                  <Badge variant="secondary" className="text-[10px]">{colTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task: any) => (
                    <div key={task.id} className={`flex items-start gap-2 p-2 rounded-md border border-border/30 bg-background/50 ${task.completed ? "opacity-60" : ""}`}>
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleTask(task.id, task.completed)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                        {task.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteTask(task.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {/* Add task */}
                {addingTaskColumn === col.key ? (
                  <div className="mt-2 space-y-1">
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title…"
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTask(col.key);
                        if (e.key === "Escape") { setAddingTaskColumn(null); setNewTaskTitle(""); }
                      }}
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-6 text-[10px]" onClick={() => handleAddTask(col.key)} disabled={!newTaskTitle.trim()}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setAddingTaskColumn(null); setNewTaskTitle(""); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs gap-1 text-muted-foreground" onClick={() => setAddingTaskColumn(col.key)}>
                    <Plus className="h-3 w-3" /> Add Task
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Link Dialog */}
      <Dialog open={showAddLink} onOpenChange={setShowAddLink}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Campaign Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Label (e.g. Reddit Post, Store Page)"
              value={linkForm.label}
              onChange={(e) => setLinkForm(f => ({ ...f, label: e.target.value }))}
            />
            <Input
              placeholder="URL"
              value={linkForm.url}
              onChange={(e) => setLinkForm(f => ({ ...f, url: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddLink(false)}>Cancel</Button>
            <Button onClick={handleAddLink} disabled={!linkForm.label.trim() || !linkForm.url.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Linked Idea Overlay */}
      {linkedIdea && (
        <Dialog open={showLinkedIdea} onOpenChange={setShowLinkedIdea}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{linkedIdea.title || "Linked Idea"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(linkedIdea.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
                {linkedIdea.category && (
                  <Badge className={`text-xs border ${CATEGORY_COLORS[linkedIdea.category] || "bg-secondary text-secondary-foreground"}`}>{linkedIdea.category}</Badge>
                )}
              </div>
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
    </div>
  );
}

// Separate component for editable playbook to handle its own state
function EditablePlaybook({ campaignId, initialValue, updateCampaign }: { campaignId: string; initialValue: string; updateCampaign: any }) {
  const [playbook, setPlaybook] = useState(initialValue);

  useEffect(() => {
    setPlaybook(initialValue);
  }, [initialValue]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Campaign Playbook</p>
      <EditableMarkdown
        value={playbook}
        onChange={setPlaybook}
        onSave={() => {
          if (playbook !== initialValue) {
            updateCampaign.mutate({ playbook });
          }
        }}
        placeholder="No playbook generated yet…"
        minHeight="120px"
      />
    </div>
  );
}
