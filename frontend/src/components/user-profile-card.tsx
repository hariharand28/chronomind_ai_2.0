import { Link } from "@tanstack/react-router";
import { Settings, User as UserIcon } from "lucide-react";
import type { User } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserProfileCardProps {
  user: User | null;
  loading: boolean;
  collapsed: boolean;
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
    return initials.toUpperCase();
  }
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

export function UserProfileCard({ user, loading, collapsed }: UserProfileCardProps) {
  if (loading) {
    return (
      <div className={collapsed ? "flex justify-center px-1" : "px-1"}>
        <div
          className={
            collapsed
              ? "flex justify-center"
              : "flex items-center gap-2.5 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 backdrop-blur-sm"
          }
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          {!collapsed && (
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = getInitials(user.displayName, user.email);

  const avatar = (
    <Avatar className="h-9 w-9 shrink-0 border border-sidebar-border/60">
      <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
      <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-center px-1">{avatar}</div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{user.displayName ?? "User"}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1.5 px-1">
      {/* Glassmorphism profile card */}
      <div className="flex items-center gap-2.5 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 backdrop-blur-md shadow-sm">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {user.displayName ?? "User"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            <span className="text-[11px] text-muted-foreground">Online</span>
          </div>
        </div>
      </div>

      {/* Quick account menu */}
      <div className="grid grid-cols-2 gap-1.5">
     
      </div>
    </div>
  );
}