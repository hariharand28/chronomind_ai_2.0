import { motion } from "framer-motion";
import { Clock, BookOpen, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudyProposal } from "./proposal";

interface ProposalSummaryProps {
  proposals: StudyProposal[];
}

export function ProposalSummary({ proposals }: ProposalSummaryProps) {
  const totalHours = proposals.reduce((sum, p) => sum + p.durationHours, 0);
  const subjectCount = new Set(proposals.map((p) => p.subject)).size;
  const conflictCount = proposals.filter((p) => p.hasConflict).length;

  const stats = [
    {
      id: "hours",
      label: "Total Study Hours",
      value: `${totalHours.toFixed(1)}h`,
      icon: Clock,
    },
    {
      id: "subjects",
      label: "Number of Subjects",
      value: subjectCount,
      icon: BookOpen,
    },
    {
      id: "conflicts",
      label: "Conflicts Detected",
      value: conflictCount,
      icon: AlertTriangle,
      alert: conflictCount > 0,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.05 }}
        >
          <Card className="border-white/10 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon
                className={`h-4 w-4 ${
                  stat.alert ? "text-amber-400" : "text-violet-400"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-semibold ${
                  stat.alert ? "text-amber-400" : "text-foreground"
                }`}
              >
                {stat.value}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}
