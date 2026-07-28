import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_PROPOSAL, ProposalSummary } from "./types";

interface ProposalResultCardProps {
  onReview: () => void;
  proposal?: ProposalSummary;
}

/** Shown once the mock processing timeline finishes. */
export function ProposalResultCard({ onReview, proposal = MOCK_PROPOSAL }: ProposalResultCardProps) {
  const groups: { label: string; items: string[] }[] = [
    { label: "Subjects", items: proposal.subjects },
    { label: "Assignments", items: proposal.assignments },
    { label: "Exams", items: proposal.exams },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Found:
      </div>
      <ul className="mb-4 space-y-1.5 text-sm text-muted-foreground">
        {groups.map((group) => (
          <li key={group.label}>
            <span className="font-medium text-foreground">{group.label}:</span>{" "}
            {group.items.join(", ")}
          </li>
        ))}
      </ul>
      <Button onClick={onReview} className="w-full">
        Review Proposal
      </Button>
    </motion.div>
  );
}
