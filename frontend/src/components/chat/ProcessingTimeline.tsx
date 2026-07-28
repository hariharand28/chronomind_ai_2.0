import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { PROCESSING_STEPS, ProcessingStepId } from "./types";

interface ProcessingTimelineProps {
  fileName: string;
  onComplete: () => void;
}

/**
 * Plays through PROCESSING_STEPS one-by-one with mock timing,
 * then calls onComplete. Pure presentational — no real processing happens.
 */
export function ProcessingTimeline({ fileName, onComplete }: ProcessingTimelineProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [doneIds, setDoneIds] = useState<Set<ProcessingStepId>>(new Set());

  useEffect(() => {
    if (activeIndex >= PROCESSING_STEPS.length) {
      onComplete();
      return;
    }
    const step = PROCESSING_STEPS[activeIndex];
    const timer = setTimeout(() => {
      setDoneIds((prev) => new Set(prev).add(step.id));
      setActiveIndex((i) => i + 1);
    }, step.duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 truncate text-xs text-muted-foreground">
        Processing <span className="font-medium text-foreground">{fileName}</span>
      </p>
      <ol className="space-y-2">
        {PROCESSING_STEPS.map((step, index) => {
          const isDone = doneIds.has(step.id);
          const isActive = index === activeIndex && !isDone;
          const isPending = index > activeIndex;

          return (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2.5 text-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  {isDone ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Check className="h-3 w-3" />
                    </motion.span>
                  ) : isActive ? (
                    <motion.span key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </motion.span>
                  ) : (
                    <motion.span key="pending" className="text-base leading-none opacity-60">
                      {step.emoji}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className={isDone ? "text-foreground" : isActive ? "font-medium text-foreground" : "text-muted-foreground"}>
                {step.emoji} {step.label}
              </span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
