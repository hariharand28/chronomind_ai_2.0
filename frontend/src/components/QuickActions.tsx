import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Upload, MessageCircle, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: typeof Upload;
}

const actions: QuickAction[] = [
  { id: "upload", label: "Upload Document", href: "/upload", icon: Upload },
  { id: "chat", label: "Open AI Chat", href: "/chat", icon: MessageCircle },
  { id: "calendar", label: "View Calendar", href: "/calendar", icon: CalendarDays },
];

export function QuickActions() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      {actions.map((action) => (
        <Button
          key={action.id}
          asChild
          variant="secondary"
          className="w-full justify-start gap-2 border border-white/10 bg-card/50 sm:w-auto"
        >
          <Link to={action.href}>
            <action.icon className="h-4 w-4 text-violet-400" />
            {action.label}
          </Link>
        </Button>
      ))}
    </motion.section>
  );
}
