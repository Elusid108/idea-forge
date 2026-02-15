import { Megaphone, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const statusColumns = ["asset_creation", "pre_launch", "active_campaign", "fulfillment", "evergreen"];
const statusLabels: Record<string, string> = {
  asset_creation: "Asset Creation",
  pre_launch: "Pre-Launch",
  active_campaign: "Active Campaign",
  fulfillment: "Fulfillment",
  evergreen: "Evergreen",
};

const CHANNEL_COLORS: Record<string, string> = {
  Shopify: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Etsy: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  GitHub: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Gumroad: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Amazon: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Website: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function CampaignsPage() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const navigate = useNavigate();

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
    const channelClass = c.primary_channel ? CHANNEL_COLORS[c.primary_channel] || "bg-secondary text-secondary-foreground" : "";

    return (
      <Card
        key={c.id}
        onClick={() => navigate(`/campaigns/${c.id}`)}
        className="cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:bg-card/80"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            {c.primary_channel ? (
              <Badge className={`text-xs border ${channelClass}`}>{c.primary_channel}</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">No Channel</Badge>
            )}
            <Badge variant="outline" className="text-xs">{statusLabels[c.status] || c.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-bold leading-snug">{c.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{c.units_sold || 0} sold</span>
            <span>${c.revenue || 0}</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            {format(new Date(c.created_at), "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Go-to-market pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("kanban")} className={viewMode === "kanban" ? "text-primary" : ""}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "text-primary" : ""}>
            <List className="h-4 w-4" />
          </Button>
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
              {campaigns.filter((c: any) => c.status === status).map(renderCampaignCard)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(renderCampaignCard)}
        </div>
      )}
    </div>
  );
}
