import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  ScanLine,
  ListChecks,
  BrainCircuit,
  FileCheck2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import type { ProcessingStage, StageId, StageStatus } from "../types/processing";

const STAGE_ICONS: Record<StageId, LucideIcon> = {
  uploading: Upload,
  ocr: ScanLine,
  extracting: ListChecks,
  reasoning: BrainCircuit,
  proposal: FileCheck2,
  completed: CheckCircle2,
};

const STATUS_STYLES: Record<
  StageStatus,
  { ring: string; icon: string; label: string; line: string }
> = {
  waiting: {
    ring: "border-white/10 bg-white/[0.03]",
    icon: "text-muted-foreground",
    label: "text-muted-foreground",
    line: "bg-white/10",
  },
  active: {
    ring: "border-violet-400/60 bg-violet-500/10",
    icon: "text-violet-400",
    label: "text-foreground",
    line: "bg-white/10",
  },
  completed: {
    ring: "border-emerald-400/40 bg-emerald-500/10",
    icon: "text-emerald-400",
    label: "text-foreground",
    line: "bg-emerald-500/40",
  },
};

interface ProcessingTimelineProps {
  stages: ProcessingStage[];
  isComplete?: boolean;
  className?: string;
}

export function ProcessingTimeline({
  stages,
  isComplete = false,
  className = "",
}: ProcessingTimelineProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-card/50 px-4 py-4 backdrop-blur ${className}`}
    >
      <div className="flex items-start gap-1 overflow-x-auto pb-1 sm:gap-2">
        {stages.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id];
          const styles = STATUS_STYLES[stage.status];
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.id} className="flex flex-1 items-start last:flex-none">
              <div className="flex min-w-[76px] flex-col items-center gap-2 sm:min-w-[92px]">
                <div className="relative flex h-9 w-9 items-center justify-center">
                  {stage.status === "active" && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-violet-500/20"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                  <motion.div
                    initial={false}
                    animate={
                      stage.status === "active"
                        ? { scale: [1, 1.08, 1] }
                        : { scale: 1 }
                    }
                    transition={
                      stage.status === "active"
                        ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.2 }
                    }
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full border ${styles.ring}`}
                  >
                    <Icon className={`h-4 w-4 ${styles.icon}`} />
                  </motion.div>
                </div>
                <span
                  className={`text-center text-[11px] leading-tight sm:text-xs ${styles.label}`}
                >
                  {stage.label}
                </span>
              </div>

              {!isLast && (
                <div className="mt-[18px] h-px flex-1 min-w-[16px]">
                  <div className={`h-full w-full ${styles.line}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4" />
            Study Plan Generated Successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
