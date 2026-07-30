import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Calendar as CalendarIcon,
  ClipboardCheck,
  HelpCircle,
  Home,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
} from "lucide-react";
import { signOut } from "firebase/auth";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthUser } from "@/hooks/use-auth-user";
import { auth } from "@/lib/firebase";
import logoUrl from "@/assets/gethu.png";
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
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate({ to: "/login" });
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Guest";
  const email = user?.email || "";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[rgba(255,255,255,0.05)] bg-[#0C0D10] text-[#F5F5F5]"
    >
      {/* Header */}
      <SidebarHeader className="gap-4 p-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-1 pt-1">
          <img
            src={logoUrl}
            alt="Chronomind logo"
            width={55}
            height={55}
            className="rounded-md object-contain shrink-0"
          />
        {!collapsed && (
  <div className="flex flex-col leading-none select-none">
    <h1 className="text-[19px] font-black tracking-[-0.06em] text-white">
      CHRONO<span className="text-[#5B8CFF]">MIND</span>
    </h1>

    <div className="mt-1 h-px w-20 bg-gradient-to-r from-[#5B8CFF] via-[#7AA8FF] to-transparent" />

    <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
      SMART SCHEDULING AI
    </span>
  </div>
)}
        </div>

        {/* New Chat */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="New chat"
              className="h-9 rounded-lg bg-[#17181C] text-[#F5F5F5] font-medium text-[13px] border border-[rgba(255,255,255,0.05)] transition-all duration-150 ease-out hover:bg-[#1F2330] hover:border-[rgba(91,140,255,0.25)] active:scale-[0.98]"
            >
              <Link to="/chat">
                <Plus className="h-3.5 w-3.5 shrink-0 text-[#5B8CFF]" />
                <span>New chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Compact Profile */}
        <div
          className={
            collapsed
              ? "flex justify-center"
              : "group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors duration-150 hover:bg-[#17181C]"
          }
        >
          <div className="relative shrink-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F2330] text-[10px] font-medium text-[#F5F5F5]">
                {loading ? "" : initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#22C55E] ring-2 ring-[#0C0D10]" />
          </div>

          {!collapsed && (
            <>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[12.5px] font-medium text-[#F5F5F5]">
                  {loading ? "Loading…" : displayName}
                </span>
                {email && (
                  <span className="truncate text-[11px] text-[#8A8F98]">{email}</span>
                )}
              </div>
              <button
                type="button"
                aria-label="Settings"
                className="shrink-0 rounded-md p-1 text-[#8A8F98] opacity-0 transition-all duration-150 hover:bg-[#1F2330] hover:text-[#F5F5F5] group-hover:opacity-100"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`relative h-8 rounded-lg text-[13px] font-normal transition-all duration-150 ease-out ${
                        isActive
                          ? "bg-[#1F2330] text-[#F5F5F5] font-medium"
                          : "text-[#8A8F98] hover:bg-[#17181C] hover:text-[#F5F5F5]"
                      }`}
                    >
                      <Link to={item.url}>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[#5B8CFF]" />
                        )}
                        <item.icon className="h-[15px] w-[15px] shrink-0" />
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
          <SidebarGroup className="mt-3">
            <SidebarGroupLabel className="px-2 text-[10.5px] font-medium uppercase tracking-wider text-[#8A8F98]/70">
              Recent
            </SidebarGroupLabel>
            <SidebarGroupContent className="max-h-56 overflow-y-auto [scrollbar-width:thin]">
              <SidebarMenu className="gap-0.5">
                {seedConversations.map((c) => {
                  const timestamp = (c as { timestamp?: string }).timestamp;
                  return (
                    <SidebarMenuItem key={c.id}>
                      <SidebarMenuButton
                        asChild
                        className="h-7 rounded-md text-[#8A8F98] transition-colors duration-150 hover:bg-[#17181C] hover:text-[#F5F5F5]"
                      >
                        <Link to="/chat" className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-[12px]">{c.title}</span>
                          {timestamp && (
                            <span className="shrink-0 text-[10px] text-[#8A8F98]/70">{timestamp}</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-[rgba(255,255,255,0.05)] p-2">
        <div className={collapsed ? "flex flex-col items-center gap-1" : "flex items-center gap-0.5"}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Settings"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#8A8F98] transition-colors duration-150 hover:bg-[#17181C] hover:text-[#F5F5F5]"
                >
                  <Settings className="h-[15px] w-[15px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "top"}>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Help"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#8A8F98] transition-colors duration-150 hover:bg-[#17181C] hover:text-[#F5F5F5]"
                >
                  <HelpCircle className="h-[15px] w-[15px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "top"}>Help</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Log out"
                  onClick={handleLogout}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#8A8F98] transition-colors duration-150 hover:bg-[#17181C] hover:text-red-400"
                >
                  <LogOut className="h-[15px] w-[15px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "top"}>Log out</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!collapsed && <div className="ml-auto">{!collapsed && <ThemeToggle />}</div>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}