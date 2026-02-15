import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Link as LinkIcon, Image, Film, StickyNote, X, Pencil,
  Grid3X3, List, ChevronDown, ChevronRight, ArrowUpDown, Trash2,
  Plus, Lightbulb, Brain, FileText, FolderOpen, Github, Star, GitFork, AlertCircle, GitCommit,
  CheckSquare, DollarSign, Calendar, ExternalLink, Receipt, Upload, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EditableMarkdown from "@/components/EditableMarkdown";
import ReferenceViewer, { getVideoThumbnail } from "@/components/ReferenceViewer";
import RichTextNoteEditor from "@/components/RichTextNoteEditor";
import ReactMarkdown from "react-markdown";
import { format, formatDistanceToNow } from "date-fns";

type RefType = "link" | "image" | "video" | "note" | "file";
type SortMode = "az" | "za" | "newest" | "oldest";

const REF_ICONS: Record<string, any> = { link: LinkIcon, image: Image, video: Film, note: StickyNote, file: FileText };
const REF_ICON_COLORS: Record<string, string> = {
  note: "text-yellow-400",
  link: "text-blue-400",
  image: "text-emerald-400",
  video: "text-red-400",
  file: "text-orange-400",
};
const REF_TYPE_ORDER: RefType[] = ["note", "link", "image", "video", "file"];
const REF_TYPE_LABELS: Record<string, string> = { note: "Notes", link: "Links", image: "Images", video: "Videos", file: "Files" };

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

const STATUS_OPTIONS = ["planning", "in_progress", "testing", "done"];

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}
const STATUS_LABELS: Record<string, string> = {
  planning: "Planning", in_progress: "In Progress", testing: "Testing", done: "Done",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const EXPENSE_CATEGORIES = ["General", "Materials", "Software", "Hardware", "Services", "Shipping", "Other"];

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [description, setDescription] = useState("");
  const [bullets, setBullets] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [editingGithub, setEditingGithub] = useState(false);
  const [githubDraft, setGithubDraft] = useState("");
  const [executionStrategy, setExecutionStrategy] = useState("");
  const [viewingRef, setViewingRef] = useState<any>(null);
  const [addRefType, setAddRefType] = useState<RefType | null>(null);
  const [editingRef, setEditingRef] = useState<any>(null);
  const [refForm, setRefForm] = useState({ title: "", url: "", description: "" });
  const [refFile, setRefFile] = useState<File | null>(null);
  const [showLinkedIdea, setShowLinkedIdea] = useState(false);
  const [refViewMode, setRefViewMode] = useState<"grid" | "list">(
    () => (localStorage.getItem("ref-view-mode") as "grid" | "list") || "grid"
  );
  const [refSortMode, setRefSortMode] = useState<SortMode>(
    () => (localStorage.getItem("ref-sort-mode") as SortMode) || "newest"
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`proj-ref-collapse-${id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [brainstormCalloutOpen, setBrainstormCalloutOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`proj-brainstorm-callout-${id}`) === "true";
    } catch { return false; }
  });

  // Task states
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", due_date: "" });

  // Expense states
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({ title: "", description: "", amount: "", category: "General", date: format(new Date(), "yyyy-MM-dd") });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, brainstorms(id, title, idea_id, compiled_description, bullet_breakdown)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: references = [] } = useQuery({
    queryKey: ["project-refs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_references")
        .select("*")
        .eq("project_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const brainstormId = project?.brainstorm_id;
  const { data: brainstormRefs = [] } = useQuery({
    queryKey: ["brainstorm-refs-for-project", brainstormId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brainstorm_references")
        .select("*")
        .eq("brainstorm_id", brainstormId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!brainstormId,
  });

  // Tasks query
  const { data: tasks = [] } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", id!)
        .order("completed")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Expenses query
  const { data: expenses = [] } = useQuery({
    queryKey: ["project-expenses", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_expenses")
        .select("*")
        .eq("project_id", id!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const totalExpenses = useMemo(() => expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0), [expenses]);

  useEffect(() => {
    if (project) {
      setTitleDraft(project.name);
      setDescription((project as any).compiled_description || "");
      setBullets((project as any).bullet_breakdown || "");
      setGithubUrl(project.github_repo_url || "");
      setExecutionStrategy((project as any).execution_strategy || "");
    }
  }, [project]);

  const githubParsed = useMemo(() => parseGitHubUrl(githubUrl), [githubUrl]);

  const { data: githubData } = useQuery({
    queryKey: ["github-repo", githubParsed?.owner, githubParsed?.repo],
    queryFn: async () => {
      const { owner, repo } = githubParsed!;
      const base = `https://api.github.com/repos/${owner}/${repo}`;
      const [repoRes, commitsRes] = await Promise.all([
        fetch(base),
        fetch(`${base}/commits?per_page=3`),
      ]);
      if (!repoRes.ok) throw new Error("Repo not found");
      const repoData = await repoRes.json();
      const commitsData = commitsRes.ok ? await commitsRes.json() : [];
      return { repo: repoData, commits: commitsData };
    },
    enabled: !!githubParsed,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const [showReadme, setShowReadme] = useState(false);
  const { data: readmeContent } = useQuery({
    queryKey: ["github-readme", githubParsed?.owner, githubParsed?.repo],
    queryFn: async () => {
      const { owner, repo } = githubParsed!;
      const mainRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`);
      if (mainRes.ok) return mainRes.text();
      const masterRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`);
      if (masterRes.ok) return masterRes.text();
      return null;
    },
    enabled: !!githubParsed && showReadme,
    staleTime: 5 * 60 * 1000,
  });

  const updateProject = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase.from("projects").update(fields).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-items"] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      if (project?.brainstorm_id) {
        await supabase.from("brainstorms").update({ status: "active" }).eq("id", project.brainstorm_id);
      }
      const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() } as any).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project moved to trash");
      queryClient.invalidateQueries({ queryKey: ["sidebar-items"] });
      navigate("/projects");
    },
  });

  // Task mutations
  const addTask = useMutation({
    mutationFn: async (fields: any) => {
      const { error } = await supabase.from("project_tasks").insert({
        project_id: id!,
        user_id: user!.id,
        ...fields,
        sort_order: tasks.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      setShowTaskDialog(false);
      setTaskForm({ title: "", description: "", priority: "medium", due_date: "" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, fields }: { taskId: string; fields: Record<string, any> }) => {
      const { error } = await supabase.from("project_tasks").update(fields).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      setEditingTask(null);
      setTaskForm({ title: "", description: "", priority: "medium", due_date: "" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-tasks", id] }),
  });

  const toggleTaskComplete = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase.from("project_tasks").update({ completed }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-tasks", id] }),
  });

  // Expense mutations
  const addExpense = useMutation({
    mutationFn: async (fields: any) => {
      const { error } = await supabase.from("project_expenses").insert({
        project_id: id!,
        user_id: user!.id,
        ...fields,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-expenses", id] });
      setShowExpenseDialog(false);
      setExpenseForm({ title: "", description: "", amount: "", category: "General", date: format(new Date(), "yyyy-MM-dd") });
      setReceiptFile(null);
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ expenseId, fields }: { expenseId: string; fields: Record<string, any> }) => {
      const { error } = await supabase.from("project_expenses").update(fields).eq("id", expenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-expenses", id] });
      setEditingExpense(null);
      setExpenseForm({ title: "", description: "", amount: "", category: "General", date: format(new Date(), "yyyy-MM-dd") });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.from("project_expenses").delete().eq("id", expenseId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-expenses", id] }),
  });

  const addReference = useMutation({
    mutationFn: async ({ type, title, url, description, thumbnail_url }: { type: string; title: string; url?: string; description?: string; thumbnail_url?: string }) => {
      const { error } = await supabase.from("project_references").insert({
        project_id: id!,
        user_id: user!.id,
        type, title,
        url: url || "", description: description || "",
        sort_order: references.length,
        thumbnail_url: thumbnail_url || "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-refs", id] });
      setAddRefType(null);
      setRefForm({ title: "", url: "", description: "" });
      setRefFile(null);
    },
  });

  const updateReference = useMutation({
    mutationFn: async ({ refId, fields }: { refId: string; fields: Record<string, any> }) => {
      const { error } = await supabase.from("project_references").update(fields).eq("id", refId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-refs", id] });
      setEditingRef(null);
      setRefForm({ title: "", url: "", description: "" });
    },
  });

  const deleteReference = useMutation({
    mutationFn: async (refId: string) => {
      const { error } = await supabase.from("project_references").delete().eq("id", refId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-refs", id] }),
  });

  const handleSaveTitle = () => {
    if (titleDraft.trim() && titleDraft !== project?.name) {
      updateProject.mutate({ name: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const handleSaveGithubUrl = () => {
    if (githubDraft !== githubUrl) {
      setGithubUrl(githubDraft);
      updateProject.mutate({ github_repo_url: githubDraft });
    }
    setEditingGithub(false);
  };

  const handleRefClick = (ref: any) => {
    if (ref.type === "link" && ref.url) {
      const url = ref.url.match(/^https?:\/\//) ? ref.url : `https://${ref.url}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (ref.type === "file" && ref.url) {
      window.open(ref.url, "_blank", "noopener,noreferrer");
    } else if (ref.type === "note" || ref.type === "image" || ref.type === "video") {
      setViewingRef(ref);
    }
  };

  const handleEditRef = (ref: any) => {
    setEditingRef(ref);
    setRefForm({ title: ref.title, url: ref.url || "", description: ref.description || "" });
  };

  const handleAddRef = async () => {
    if ((addRefType === "image" || addRefType === "file") && refFile) {
      const path = `${user!.id}/${id}/${Date.now()}-${refFile.name}`;
      const { error: uploadError } = await supabase.storage.from("brainstorm-references").upload(path, refFile);
      if (uploadError) { toast.error("Upload failed: " + uploadError.message); return; }
      const { data: urlData } = supabase.storage.from("brainstorm-references").getPublicUrl(path);
      addReference.mutate({
        type: addRefType,
        title: refForm.title || refFile.name,
        url: urlData.publicUrl,
        description: refForm.description,
        thumbnail_url: addRefType === "image" ? urlData.publicUrl : undefined,
      });
    } else if (addRefType === "link" || addRefType === "video") {
      let thumbnail_url: string | null = null;
      if (addRefType === "video" && refForm.url) thumbnail_url = getVideoThumbnail(refForm.url);
      addReference.mutate({ type: addRefType, title: refForm.title, url: refForm.url, description: refForm.description, thumbnail_url: thumbnail_url || undefined });
    } else {
      addReference.mutate({ type: addRefType!, title: refForm.title, url: refForm.url, description: refForm.description });
    }
  };

  const handleAddExpense = async () => {
    let receiptUrl = "";
    if (receiptFile) {
      const path = `${user!.id}/${id}/receipts/${Date.now()}-${receiptFile.name}`;
      const { error: uploadError } = await supabase.storage.from("project-assets").upload(path, receiptFile);
      if (uploadError) { toast.error("Upload failed: " + uploadError.message); return; }
      const { data: urlData } = supabase.storage.from("project-assets").getPublicUrl(path);
      receiptUrl = urlData.publicUrl;
    }
    addExpense.mutate({
      title: expenseForm.title,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount) || 0,
      category: expenseForm.category,
      date: expenseForm.date || undefined,
      receipt_url: receiptUrl,
    });
  };

  const toggleRefViewMode = (mode: "grid" | "list") => { setRefViewMode(mode); localStorage.setItem("ref-view-mode", mode); };
  const handleRefSortChange = (val: string) => { setRefSortMode(val as SortMode); localStorage.setItem("ref-sort-mode", val); };
  const toggleGroupCollapse = (type: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      localStorage.setItem(`proj-ref-collapse-${id}`, JSON.stringify([...next]));
      return next;
    });
  };

  const sortRefs = (refs: any[]) => {
    const sorted = [...refs];
    switch (refSortMode) {
      case "az": return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "za": return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case "newest": return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "oldest": return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default: return sorted;
    }
  };

  const getRefThumbnail = (ref: any): string | null => {
    if (ref.thumbnail_url) return ref.thumbnail_url;
    if (ref.type === "image" && ref.url) return ref.url;
    if (ref.type === "video" && ref.url) return getVideoThumbnail(ref.url);
    return null;
  };

  const groupedRefs = REF_TYPE_ORDER.map(type => ({
    type,
    label: REF_TYPE_LABELS[type],
    items: sortRefs(references.filter((r: any) => r.type === type)),
  })).filter(g => g.items.length > 0);

  const projectCategory = (project as any)?.category;
  const projectTags: string[] = (project as any)?.tags || [];
  const categoryBadgeClass = projectCategory ? CATEGORY_COLORS[projectCategory] || "bg-secondary text-secondary-foreground" : "";

  const linkedBrainstorm = (project as any)?.brainstorms;
  const linkedIdeaId = linkedBrainstorm?.idea_id;

  const { data: linkedIdeaData } = useQuery({
    queryKey: ["linked-idea-for-project", linkedIdeaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .eq("id", linkedIdeaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!linkedIdeaId,
  });

  // GitHub Pages link
  const githubPagesUrl = useMemo(() => {
    if (!githubData) return null;
    if (githubData.repo.homepage) return githubData.repo.homepage;
    if (githubData.repo.has_pages) return `https://${githubParsed?.owner}.github.io/${githubParsed?.repo}`;
    return null;
  }, [githubData, githubParsed]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Skeleton className="h-8 w-8" /></div>;
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="link" onClick={() => navigate("/projects")}>Back to projects</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
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
            {project.name}
          </h1>
        )}

        <Select value={project.status} onValueChange={(val) => updateProject.mutate({ status: val })}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                <AlertDialogDescription>This will move the project to trash. The linked brainstorm will be unlocked.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteProject.mutate()}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Created date + badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Created {format(new Date(project.created_at), "MMM d, yyyy 'at' h:mm a")}
        </p>
        {projectCategory && (
          <Badge className={`text-xs border ${categoryBadgeClass}`}>{projectCategory}</Badge>
        )}
        {linkedIdeaId && (
          <Badge
            variant="outline"
            className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setShowLinkedIdea(true)}
          >
            <Lightbulb className="h-3 w-3" /> Linked Idea
          </Badge>
        )}
        {linkedBrainstorm && (
          <Badge
            variant="outline"
            className="text-xs gap-1 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/brainstorms/${linkedBrainstorm.id}`)}
          >
            <Brain className="h-3 w-3" /> Linked Brainstorm
          </Badge>
        )}
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Compiled Description - only show if no linked brainstorm */}
          {!brainstormId && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
              <EditableMarkdown
                value={description}
                onChange={setDescription}
                onSave={() => updateProject.mutate({ compiled_description: description })}
                placeholder="Project description…"
                minHeight="100px"
              />
            </div>
          )}

          {/* Execution Strategy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Execution Strategy</p>
            <EditableMarkdown
              value={executionStrategy}
              onChange={setExecutionStrategy}
              onSave={() => updateProject.mutate({ execution_strategy: executionStrategy } as any)}
              placeholder={brainstormId ? "Generating strategy…" : "Plan your execution strategy here…"}
              minHeight="80px"
            />
          </div>

          {/* Tasks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Tasks</h2>
                <Badge variant="secondary" className="text-[10px]">
                  {tasks.filter((t: any) => t.completed).length}/{tasks.length}
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => { setEditingTask(null); setTaskForm({ title: "", description: "", priority: "medium", due_date: "" }); setShowTaskDialog(true); }}>
                <Plus className="h-3 w-3" /> Add Task
              </Button>
            </div>

            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8">
                <CheckSquare className="mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-card/50 transition-colors hover:border-primary/20 ${task.completed ? "opacity-60" : ""}`}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) => toggleTaskComplete.mutate({ taskId: task.id, completed: !!checked })}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>}
                    </div>
                    <Badge className={`text-[10px] border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                      {task.priority}
                    </Badge>
                    {task.due_date && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), "MMM d")}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => {
                        setEditingTask(task);
                        setTaskForm({ title: task.title, description: task.description || "", priority: task.priority, due_date: task.due_date || "" });
                        setShowTaskDialog(true);
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteTask.mutate(task.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Resources</h2>
              <div className="flex items-center gap-1">
                <Select value={refSortMode} onValueChange={handleRefSortChange}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="az">A → Z</SelectItem>
                    <SelectItem value="za">Z → A</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className={`h-8 w-8 ${refViewMode === "grid" ? "text-primary" : ""}`} onClick={() => toggleRefViewMode("grid")}>
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className={`h-8 w-8 ${refViewMode === "list" ? "text-primary" : ""}`} onClick={() => toggleRefViewMode("list")}>
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 h-8">
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1" align="end">
                    {(["note", "link", "image", "video", "file"] as RefType[]).map((type) => {
                      const Icon = REF_ICONS[type];
                      const iconColor = REF_ICON_COLORS[type];
                      return (
                        <button key={type} onClick={() => setAddRefType(type)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent capitalize">
                          <Icon className={`h-4 w-4 ${iconColor}`} /> {type}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {references.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
                <StickyNote className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No resources yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedRefs.map((group) => {
                  const GroupIcon = REF_ICONS[group.type] || StickyNote;
                  const groupIconColor = REF_ICON_COLORS[group.type] || "text-muted-foreground";
                  const isGroupCollapsed = collapsedGroups.has(group.type);
                  return (
                    <Collapsible key={group.type} open={!isGroupCollapsed} onOpenChange={() => toggleGroupCollapse(group.type)}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 hover:text-primary transition-colors">
                        {isGroupCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        <GroupIcon className={`h-3.5 w-3.5 ${groupIconColor}`} />
                        <span className="text-sm font-medium">{group.label}</span>
                        <Badge variant="secondary" className="text-[10px] ml-1">{group.items.length}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className={refViewMode === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-2"}>
                          {group.items.map((ref: any) => {
                            const Icon = REF_ICONS[ref.type] || StickyNote;
                            const iconColor = REF_ICON_COLORS[ref.type] || "text-muted-foreground";
                            const thumbnail = getRefThumbnail(ref);

                            if (refViewMode === "list") {
                              return (
                                <div key={ref.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-card/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => handleRefClick(ref)}>
                                  <Icon className={`h-4 w-4 ${iconColor} shrink-0`} />
                                  <span className="text-sm font-medium truncate flex-1">{ref.title}</span>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleEditRef(ref); }}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteReference.mutate(ref.id); }}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <Card key={ref.id} className="border-border/50 bg-card/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => handleRefClick(ref)}>
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-3">
                                    {thumbnail ? (
                                      <div className="h-12 w-16 rounded overflow-hidden shrink-0 bg-muted">
                                        <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="h-12 w-16 rounded bg-muted/50 flex items-center justify-center shrink-0">
                                        <Icon className={`h-5 w-5 ${iconColor}/50`} />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{ref.title}</p>
                                      {ref.description && <p className="text-xs text-muted-foreground line-clamp-2">{ref.description}</p>}
                                    </div>
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleEditRef(ref); }}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteReference.mutate(ref.id); }}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expenses Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Expenses</h2>
                {totalExpenses > 0 && (
                  <Badge variant="secondary" className="text-xs">${totalExpenses.toFixed(2)}</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => { setEditingExpense(null); setExpenseForm({ title: "", description: "", amount: "", category: "General", date: format(new Date(), "yyyy-MM-dd") }); setReceiptFile(null); setShowExpenseDialog(true); }}>
                <Plus className="h-3 w-3" /> Add Expense
              </Button>
            </div>

            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8">
                <DollarSign className="mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No expenses tracked yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {expenses.map((expense: any) => (
                  <div key={expense.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-card/50 transition-colors hover:border-primary/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{expense.title}</p>
                        <Badge variant="secondary" className="text-[10px]">{expense.category}</Badge>
                      </div>
                      {expense.description && <p className="text-xs text-muted-foreground line-clamp-1">{expense.description}</p>}
                    </div>
                    <span className="text-sm font-semibold text-primary">${Number(expense.amount).toFixed(2)}</span>
                    {expense.date && (
                      <span className="text-[10px] text-muted-foreground">{format(new Date(expense.date), "MMM d")}</span>
                    )}
                    {expense.receipt_url && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => window.open(expense.receipt_url, "_blank")}>
                        <Receipt className="h-3 w-3" />
                      </Button>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => {
                        setEditingExpense(expense);
                        setExpenseForm({ title: expense.title, description: expense.description || "", amount: String(expense.amount), category: expense.category, date: expense.date || "" });
                        setShowExpenseDialog(true);
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteExpense.mutate(expense.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
            {projectTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {projectTags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">No tags</p>
            )}
          </div>

          {/* Brainstorm Callout */}
          {linkedBrainstorm && (
            <Collapsible
              open={brainstormCalloutOpen}
              onOpenChange={(open) => {
                setBrainstormCalloutOpen(open);
                localStorage.setItem(`proj-brainstorm-callout-${id}`, String(open));
              }}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 hover:text-primary transition-colors">
                {brainstormCalloutOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <Brain className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">Brainstorm</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-4">
                {linkedBrainstorm.compiled_description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                    <div className="rounded-lg bg-zinc-900/50 border border-white/5 p-4">
                      <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-gray-300 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5">
                        <ReactMarkdown>{linkedBrainstorm.compiled_description}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
                {linkedBrainstorm.bullet_breakdown && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bullet Breakdown</p>
                    <div className="rounded-lg bg-zinc-900/50 border border-white/5 p-4">
                      <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-gray-300 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5">
                        <ReactMarkdown>{linkedBrainstorm.bullet_breakdown}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
                {brainstormRefs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">References</p>
                    <div className="space-y-1.5">
                      {brainstormRefs.map((ref: any) => {
                        const Icon = REF_ICONS[ref.type] || StickyNote;
                        const iconColor = REF_ICON_COLORS[ref.type] || "text-muted-foreground";
                        return (
                          <div
                            key={ref.id}
                            className="flex items-center gap-2 p-1.5 rounded border border-border/30 bg-card/30 text-xs cursor-pointer hover:border-primary/30 transition-colors"
                            onClick={() => handleRefClick(ref)}
                          >
                            <Icon className={`h-3.5 w-3.5 ${iconColor} shrink-0`} />
                            <span className="truncate">{ref.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Bullet Breakdown - only show if no linked brainstorm */}
          {!brainstormId && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bullet Breakdown</p>
              <EditableMarkdown
                value={bullets}
                onChange={setBullets}
                onSave={() => updateProject.mutate({ bullet_breakdown: bullets })}
                placeholder="- Key point 1&#10;- Key point 2"
                minHeight="80px"
              />
            </div>
          )}

          {/* GitHub URL - Click to edit */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">GitHub Repository</p>
            {editingGithub ? (
              <Input
                value={githubDraft}
                onChange={(e) => setGithubDraft(e.target.value)}
                onBlur={handleSaveGithubUrl}
                onKeyDown={(e) => e.key === "Enter" && handleSaveGithubUrl()}
                placeholder="https://github.com/…"
                className="text-sm"
                autoFocus
              />
            ) : githubUrl ? (
              <p
                className="text-sm text-primary hover:underline cursor-pointer truncate"
                onClick={() => { setGithubDraft(githubUrl); setEditingGithub(true); }}
              >
                {githubUrl}
              </p>
            ) : (
              <p
                className="text-sm text-muted-foreground/60 italic cursor-pointer hover:text-muted-foreground"
                onClick={() => { setGithubDraft(""); setEditingGithub(true); }}
              >
                Click to add GitHub URL…
              </p>
            )}
          </div>

          {/* GitHub Activity Widget */}
          {githubData && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold hover:text-primary transition-colors truncate"
                  >
                    {githubData.repo.full_name}
                  </a>
                  {githubPagesUrl && (
                    <a
                      href={githubPagesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto"
                    >
                      <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-accent">
                        <ExternalLink className="h-2.5 w-2.5" /> View Site
                      </Badge>
                    </a>
                  )}
                </div>
                {githubData.repo.description && (
                  <p className="text-xs text-muted-foreground">{githubData.repo.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Star className="h-3 w-3" /> {githubData.repo.stargazers_count}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <GitFork className="h-3 w-3" /> {githubData.repo.forks_count}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" /> {githubData.repo.open_issues_count} issues
                  </Badge>
                </div>
                {githubData.commits.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Recent Commits</p>
                    <div className="space-y-1.5">
                      {githubData.commits.map((c: any) => (
                        <div key={c.sha} className="flex items-start gap-2 text-xs">
                          <GitCommit className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{c.commit.message.split("\n")[0]}</p>
                            <p className="text-muted-foreground/60">
                              {formatDistanceToNow(new Date(c.commit.author.date), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Collapsible open={showReadme} onOpenChange={setShowReadme}>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    {showReadme ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    README
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    {readmeContent ? (
                      <div className="rounded-lg bg-muted/30 border border-border/30 p-3 max-h-[400px] overflow-y-auto">
                        <div className="prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5">
                          <ReactMarkdown>{readmeContent}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">Loading README…</p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}
          {githubParsed && !githubData && (
            <p className="text-xs text-muted-foreground/60 italic">Could not fetch repository data</p>
          )}
        </div>
      </div>

      {/* Reference Viewer */}
      <ReferenceViewer reference={viewingRef} open={!!viewingRef} onOpenChange={(open) => { if (!open) setViewingRef(null); }} />

      {/* Add Resource Dialog */}
      <Dialog open={!!addRefType} onOpenChange={(open) => { if (!open) { setAddRefType(null); setRefForm({ title: "", url: "", description: "" }); setRefFile(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">Add {addRefType}</DialogTitle>
            <DialogDescription className="sr-only">Add a new resource</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={refForm.title} onChange={(e) => setRefForm(p => ({ ...p, title: e.target.value }))} />
            {addRefType === "image" ? (
              <Input type="file" accept="image/*" onChange={(e) => setRefFile(e.target.files?.[0] || null)} />
            ) : addRefType === "file" ? (
              <Input type="file" onChange={(e) => setRefFile(e.target.files?.[0] || null)} />
            ) : addRefType !== "note" ? (
              <Input placeholder="URL" value={refForm.url} onChange={(e) => setRefForm(p => ({ ...p, url: e.target.value }))} />
            ) : null}
            {addRefType === "note" ? (
              <RichTextNoteEditor
                value={refForm.description}
                onChange={(val) => setRefForm(p => ({ ...p, description: val }))}
                placeholder="Write your note…"
              />
            ) : (
              <Textarea placeholder="Description (optional)" value={refForm.description} onChange={(e) => setRefForm(p => ({ ...p, description: e.target.value }))} className="resize-none" />
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddRefType(null)}>Cancel</Button>
            <Button onClick={handleAddRef} disabled={!refForm.title.trim() || addReference.isPending}>
              {addReference.isPending ? "Adding…" : "Add Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={!!editingRef} onOpenChange={(open) => { if (!open) { setEditingRef(null); setRefForm({ title: "", url: "", description: "" }); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription className="sr-only">Edit an existing resource</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={refForm.title} onChange={(e) => setRefForm(p => ({ ...p, title: e.target.value }))} />
            {editingRef?.type !== "note" && editingRef?.type !== "image" && editingRef?.type !== "file" && (
              <Input placeholder="URL" value={refForm.url} onChange={(e) => setRefForm(p => ({ ...p, url: e.target.value }))} />
            )}
            {editingRef?.type === "note" ? (
              <RichTextNoteEditor
                value={refForm.description}
                onChange={(val) => setRefForm(p => ({ ...p, description: val }))}
                placeholder="Write your note…"
              />
            ) : (
              <Textarea placeholder="Description (optional)" value={refForm.description} onChange={(e) => setRefForm(p => ({ ...p, description: e.target.value }))} className="resize-none" />
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingRef(null)}>Cancel</Button>
            <Button onClick={() => updateReference.mutate({ refId: editingRef.id, fields: { title: refForm.title, url: refForm.url, description: refForm.description } })} disabled={!refForm.title.trim() || updateReference.isPending}>
              {updateReference.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={(open) => { if (!open) { setShowTaskDialog(false); setEditingTask(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
            <DialogDescription className="sr-only">{editingTask ? "Edit task details" : "Create a new task"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))} />
            <Textarea placeholder="Description (optional)" value={taskForm.description} onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))} className="resize-none min-h-[80px]" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Select value={taskForm.priority} onValueChange={(val) => setTaskForm(p => ({ ...p, priority: val }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm(p => ({ ...p, due_date: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editingTask) {
                  updateTask.mutate({ taskId: editingTask.id, fields: { title: taskForm.title, description: taskForm.description, priority: taskForm.priority, due_date: taskForm.due_date || null } });
                } else {
                  addTask.mutate({ title: taskForm.title, description: taskForm.description, priority: taskForm.priority, due_date: taskForm.due_date || null });
                }
              }}
              disabled={!taskForm.title.trim()}
            >
              {editingTask ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={(open) => { if (!open) { setShowExpenseDialog(false); setEditingExpense(null); setReceiptFile(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription className="sr-only">{editingExpense ? "Edit expense details" : "Track a new expense"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Expense title" value={expenseForm.title} onChange={(e) => setExpenseForm(p => ({ ...p, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount ($)</label>
                <Input type="number" step="0.01" placeholder="0.00" value={expenseForm.amount} onChange={(e) => setExpenseForm(p => ({ ...p, amount: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Select value={expenseForm.category} onValueChange={(val) => setExpenseForm(p => ({ ...p, category: val }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(p => ({ ...p, date: e.target.value }))} className="h-8 text-xs" />
            </div>
            <Textarea placeholder="Description (optional)" value={expenseForm.description} onChange={(e) => setExpenseForm(p => ({ ...p, description: e.target.value }))} className="resize-none min-h-[60px]" />
            {!editingExpense && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Receipt (image/PDF)</label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editingExpense) {
                  updateExpense.mutate({ expenseId: editingExpense.id, fields: { title: expenseForm.title, description: expenseForm.description, amount: parseFloat(expenseForm.amount) || 0, category: expenseForm.category, date: expenseForm.date || null } });
                } else {
                  handleAddExpense();
                }
              }}
              disabled={!expenseForm.title.trim() || !expenseForm.amount}
            >
              {editingExpense ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Linked Idea Overlay Dialog */}
      {linkedIdeaData && (
        <Dialog open={showLinkedIdea} onOpenChange={setShowLinkedIdea}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{linkedIdeaData.title || "Linked Idea"}</DialogTitle>
              <DialogDescription className="sr-only">View linked idea details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(linkedIdeaData.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
                {linkedIdeaData.category && (
                  <Badge className={`text-xs border ${CATEGORY_COLORS[linkedIdeaData.category] || "bg-secondary text-secondary-foreground"}`}>{linkedIdeaData.category}</Badge>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Raw Dump</p>
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                  {linkedIdeaData.raw_dump}
                </div>
              </div>

              {linkedIdeaData.processed_summary && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm leading-relaxed">{linkedIdeaData.processed_summary}</p>
                </div>
              )}

              {linkedIdeaData.key_features && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Key Features</p>
                  <div className="text-sm text-muted-foreground">
                    <div dangerouslySetInnerHTML={{ __html: linkedIdeaData.key_features.replace(/^- /gm, "• ").replace(/\n/g, "<br/>") }} />
                  </div>
                </div>
              )}

              {linkedIdeaData.tags && linkedIdeaData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {linkedIdeaData.tags.map((tag: string) => (
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
