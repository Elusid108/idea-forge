import { Megaphone, LayoutGrid, List, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const statusColumns = ["foundation_ip", "infrastructure_production", "asset_creation_prelaunch", "active_campaign", "operations_fulfillment"];
const statusLabels: Record<string, string> = {
  foundation_ip: "Foundation & IP",
  infrastructure_production: "Infrastructure & Production",
  asset_creation_prelaunch: "Asset Creation & Pre-Launch",
  active_campaign: "Active Campaign",
  operations_fulfillment: "Operations & Fulfillment",
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

export default function CampaignsPage() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [sortMode, setSortMode] = useState<string>(
    () => localStorage.getItem("campaigns-sort-mode") || "newest"
  );
  const navigate = useNavigate();

  const handleSortChange = (val: string) => {
    setSortMode(val);
    localStorage.setItem("campaigns-sort-mode", val);
  };

  const sortItems = (items: any[]) => {
    const sorted = [...items];
    switch (sortMode) {
      case "category": return sorted.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      case "newest": return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "alpha": return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      case "recent": return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      default: return sorted;
    }
  };

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns" as any)
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const renderCampaignCard = (c: any) => {
    const catClass = c.category ? CATEGORY_COLORS[c.category] || "bg-secondary text-secondary-foreground" : "";
    const tags: string[] = c.tags || [];
    const visibleTags = tags.slice(0, 4);
    const overflowCount = tags.length - 4;

    return (
      <Card
        key={c.id}
        onClick={() => navigate(`/campaigns/${c.id}`)}
        className="cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:bg-card/80"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <Badge className={`text-xs border ${catClass}`}>{c.category || "Uncategorized"}</Badge>
            {viewMode === "list" && (
              <Badge variant="outline" className="text-xs">{statusLabels[c.status] || c.status}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-bold leading-snug">{c.title}</p>
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {visibleTags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
              ))}
              {overflowCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{overflowCount}</Badge>
              )}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/60">
            {format(new Date(c.created_at), "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Go-to-market pipeline</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("kanban")} className={viewMode === "kanban" ? "text-primary" : ""}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "text-primary" : ""}>
            <List className="h-4 w-4" />
          </Button>
          <Select value={sortMode} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Created Date</SelectItem>
              <SelectItem value="recent">Recently Edited</SelectItem>
              <SelectItem value="alpha">Alphabetical</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Megaphone className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No campaigns yet</p>
          <p className="text-sm text-muted-foreground/70">Promote a project with status "Done" to launch a campaign</p>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {statusColumns.map((status) => (
            <div key={status} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {statusLabels[status]}
                <Badge variant="secondary" className="ml-2">
                  {campaigns.filter((c: any) => c.status === status).length}
                </Badge>
              </h3>
              {sortItems(campaigns.filter((c: any) => c.status === status)).map(renderCampaignCard)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortItems(campaigns).map(renderCampaignCard)}
        </div>
      )}
    </div>
  );
}
