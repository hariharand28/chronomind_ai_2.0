import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface WelcomeSectionProps {
  userName?: string;
}

export function WelcomeSection({ userName = "there" }: WelcomeSectionProps) {
  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent p-6"
    >
      <p className="text-sm text-muted-foreground">{formattedDate}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {greeting}, {userName}
      </h1>
      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <span>Upload a syllabus to generate your study plan</span>
      </div>
    </motion.section>
  );
}
