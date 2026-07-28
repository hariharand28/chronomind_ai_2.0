import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Calendar as CalendarIcon, ClipboardCheck, ClipboardList, Home, MessageSquare, Plus, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import logoUrl from "@/assets/logo.png";
import { seedConversations } from "@/lib/mock-data";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Calendar", url: "/calendar", icon: CalendarIcon },
  { title: "Reminders", url: "/reminders", icon: Bell },

  { title: "Proposal Review", url: "/proposal", icon: ClipboardCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Sidebar Header */}
      <SidebarHeader className="gap-3 p-3">
        <div className="flex items-center gap-2.5 px-1">
          <img
            src={logoUrl}
            alt="Chronomind logo"
            width={28}
            height={28}
            className="rounded-lg object-contain shrink-0"
          />
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground transition-opacity">
              Chronomind
            </span>
          )}
        </div>

        {/* Primary Action Button */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="New chat"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-medium shadow-xs transition-colors"
            >
              <Link to="/chat">
                <Plus className="h-4 w-4 shrink-0" />
                <span>New chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Content & Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Conversations */}
        {!collapsed && (
          <SidebarGroup className="mt-2">
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-2">
              Recent chats
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {seedConversations.map((c) => (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton asChild className="text-muted-foreground hover:text-foreground">
                      <Link to="/chat" className="flex items-center gap-2 truncate">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span className="truncate text-xs">{c.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer & Integration */}
      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <div className="flex items-center justify-between gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={collapsed ? "w-auto" : "w-full"}>
                  {collapsed ? (
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8 opacity-60">
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="w-full justify-start gap-2 text-xs font-normal"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">Connect Google</span>
                    </Button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "top"}>Coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}