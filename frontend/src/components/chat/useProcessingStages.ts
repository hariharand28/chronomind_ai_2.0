import { useEffect, useState } from "react";
import type { ProcessingStage } from "../types/processing";

const STAGE_ORDER: Omit<ProcessingStage, "status">[] = [
  { id: "uploading", label: "Uploading Document" },
  { id: "ocr", label: "OCR Processing" },
  { id: "extracting", label: "Extracting Tasks" },
  { id: "reasoning", label: "AI Reasoning" },
  { id: "proposal", label: "Proposal Generation" },
  { id: "completed", label: "Completed" },
];

const STEP_DURATION_MS = 1600;

const LAST_INDEX = STAGE_ORDER.length - 1;

function buildStages(activeIndex: number): ProcessingStage[] {
  return STAGE_ORDER.map((stage, index) => ({
    ...stage,
    status:
      index < activeIndex || (index === activeIndex && index === LAST_INDEX)
        ? "completed"
        : index === activeIndex
        ? "active"
        : "waiting",
  }));
}

interface UseProcessingStagesResult {
  stages: ProcessingStage[];
  isComplete: boolean;
  restart: () => void;
}

/**
 * Mock-only hook that simulates a document processing pipeline by
 * auto-advancing through stages on a timer. Swap this out for real
 * status updates (e.g. via polling or websockets) later — the
 * ProcessingTimeline component only cares about the `stages` shape.
 */
export function useProcessingStages(autoStart = true): UseProcessingStagesResult {
  const [activeIndex, setActiveIndex] = useState(autoStart ? 0 : -1);

  useEffect(() => {
    if (activeIndex < 0 || activeIndex >= STAGE_ORDER.length - 1) return;

    const timer = setTimeout(() => {
      setActiveIndex((prev) => Math.min(prev + 1, LAST_INDEX));
    }, STEP_DURATION_MS);

    return () => clearTimeout(timer);
  }, [activeIndex]);

  const stages =
    activeIndex < 0
      ? STAGE_ORDER.map((s) => ({ ...s, status: "waiting" as const }))
      : buildStages(activeIndex);

  const isComplete = activeIndex === LAST_INDEX;

  function restart() {
    setActiveIndex(0);
  }

  return { stages, isComplete, restart };
}
