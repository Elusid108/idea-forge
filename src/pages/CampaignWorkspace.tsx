import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Trash2, ExternalLink, Plus, X, Pencil, DollarSign, ShoppingCart, Target, Rocket,
  FolderOpen, Brain, Lightbulb, Megaphone, Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FloatingChatWidget from "@/components/FloatingChatWidget";
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

type MarketingLink = { label: string; url: string };

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

  // Chat states
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "👋 I'm your campaign assistant. I can help you:\n\n- **Plan marketing strategy** and distribution channels\n- **Create tasks** for campaign execution\n- **Generate research notes** with competitor analysis, pricing strategies, and more\n- **Provide actionable recommendations** for growth\n\nHow can I help with your campaign?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatThinking, setIsChatThinking] = useState(false);

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

  // Linked project with full data for chat context
  const { data: linkedProject } = useQuery({
    queryKey: ["campaign-linked-project", campaign?.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, brainstorm_id, compiled_description, execution_strategy, bullet_breakdown")
        .eq("id", campaign!.project_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!campaign?.project_id,
  });

  // Linked brainstorm (through project)
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

  // Linked idea (through brainstorm) - full data for overlay
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

  // Project tasks for chat context
  const { data: projectTasks = [] } = useQuery({
    queryKey: ["campaign-project-tasks", campaign?.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("title, description, priority, completed, due_date")
        .eq("project_id", campaign!.project_id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!campaign?.project_id,
  });

  // Project notes for chat context
  const { data: projectNotes = [] } = useQuery({
    queryKey: ["campaign-project-notes", campaign?.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_references")
        .select("title, description")
        .eq("project_id", campaign!.project_id)
        .eq("type", "note");
      if (error) throw error;
      return data;
    },
    enabled: !!campaign?.project_id,
  });

  useEffect(() => {
    if (campaign) {
      setTitleDraft(campaign.title);
    }
  }, [campaign]);

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
      // Unlink the project
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

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatThinking) return;
    const userMsg = { role: "user" as const, content: chatInput.trim() };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput("");
    setIsChatThinking(true);

    const tasksStr = projectTasks.map((t: any) => `[${t.completed ? "✓" : "○"}] ${t.title} (${t.priority}${t.due_date ? `, due ${t.due_date}` : ""})`).join("\n") || "None";
    const notesStr = projectNotes.map((n: any) => `${n.title}: ${n.description || ""}`).join("\n") || "None";

    try {
      const { data, error } = await supabase.functions.invoke("project-chat", {
        body: {
          messages: newHistory,
          context: {
            title: campaign?.title || "",
            description: `Campaign for project "${linkedProject?.name || ""}". Sales model: ${campaign?.sales_model || "not set"}. Channel: ${campaign?.primary_channel || "not set"}. Revenue: $${campaign?.revenue || 0}. Units sold: ${campaign?.units_sold || 0}. Target price: $${campaign?.target_price || 0}. Category: ${campaign?.category || "none"}. Tags: ${(campaign?.tags || []).join(", ") || "none"}.`,
            tasks: tasksStr,
            notes: notesStr,
            execution_strategy: (linkedProject as any)?.execution_strategy || "",
            bullet_breakdown: (linkedProject as any)?.bullet_breakdown || "",
            project_description: (linkedProject as any)?.compiled_description || "",
          },
        },
      });
      if (error) throw error;
      setChatHistory([...newHistory, { role: "assistant", content: data.message || "Done." }]);
    } catch (e: any) {
      toast.error("Chat failed: " + e.message);
    } finally {
      setIsChatThinking(false);
    }
  };

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
            <FolderOpen className="h-3 w-3 text-blue-400" /> Linked Project
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
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate flex-1"
                    >
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

      {/* Floating Chat */}
      <FloatingChatWidget
        storageKey="chat-widget-campaign"
        chatHistory={chatHistory}
        chatInput={chatInput}
        isThinking={isChatThinking}
        onInputChange={setChatInput}
        onSubmit={handleChatSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleChatSubmit();
          }
        }}
        title="Campaign Assistant"
        placeholder="Ask about your campaign…"
        renderMessage={(msg, i) => (
          <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            )}
            <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5">
                  <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
          </div>
        )}
      />

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
