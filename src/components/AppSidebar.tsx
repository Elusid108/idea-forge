import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Lightbulb, Brain, Wrench, ChevronRight, Plus, LogOut, User, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const sections = [
  {
    label: "Ideas",
    icon: Lightbulb,
    href: "/ideas",
    emoji: "💡",
  },
  {
    label: "Brainstorms",
    icon: Brain,
    href: "/brainstorms",
    emoji: "🧠",
  },
  {
    label: "Projects",
    icon: Wrench,
    href: "/projects",
    emoji: "🔧",
  },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Ideas: true,
    Brainstorms: true,
    Projects: true,
  });

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <span className="font-semibold text-sidebar-foreground">Brainstormer</span>
      </div>

      <SidebarContent className="px-2 py-3">
        {sections.map((section) => (
          <Collapsible
            key={section.label}
            open={openSections[section.label]}
            onOpenChange={() => toggleSection(section.label)}
          >
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-sidebar-accent">
                  <span className="flex items-center gap-2">
                    <span>{section.emoji}</span>
                    {section.label}
                  </span>
                  <ChevronRight className={`h-3 w-3 transition-transform ${openSections[section.label] ? "rotate-90" : ""}`} />
                </SidebarGroupLabel>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={section.href}
                          end
                          className="text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-primary font-medium"
                        >
                          View all {section.label.toLowerCase()}
                          <ChevronRight className="ml-auto h-3 w-3" />
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/trash"
                    className="text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Trash
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="flex-1 truncate text-sm text-sidebar-foreground">{user?.email}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
