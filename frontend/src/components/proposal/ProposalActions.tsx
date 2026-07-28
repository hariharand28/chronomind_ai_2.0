import { motion } from "framer-motion";
import { CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProposalActionsProps {
  onApproveAll: () => void;
  onRegenerate: () => void;
  disabled?: boolean;
}

export function ProposalActions({
  onApproveAll,
  onRegenerate,
  disabled,
}: ProposalActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25 }}
      className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end"
    >
      <Button
        variant="secondary"
        className="gap-2 border border-white/10 bg-white/5"
        onClick={onRegenerate}
      >
        <RefreshCw className="h-4 w-4" />
        Regenerate Plan
      </Button>
      <Button
        className="gap-2 bg-violet-600 hover:bg-violet-500"
        onClick={onApproveAll}
        disabled={disabled}
      >
        <CheckCheck className="h-4 w-4" />
        Approve All
      </Button>
    </motion.div>
  );
}
