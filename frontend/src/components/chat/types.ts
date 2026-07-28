export type ProcessingStepId =
  | "uploading"
  | "ocr"
  | "extracting_subjects"
  | "ai_reasoning"
  | "generating_plan"
  | "ready";

export interface ProcessingStep {
  id: ProcessingStepId;
  label: string;
  emoji: string;
  /** Mock duration in ms for the demo animation */
  duration: number;
}

export interface ProposalSummary {
  subjects: string[];
  assignments: string[];
  exams: string[];
}

export const PROCESSING_STEPS: ProcessingStep[] = [
  { id: "uploading", label: "Uploading", emoji: "📄", duration: 900 },
  { id: "ocr", label: "OCR Processing", emoji: "🔍", duration: 1400 },
  { id: "extracting_subjects", label: "Extracting Subjects", emoji: "📚", duration: 1300 },
  { id: "ai_reasoning", label: "AI Reasoning", emoji: "🧠", duration: 1600 },
  { id: "generating_plan", label: "Generating Study Plan", emoji: "📅", duration: 1300 },
  { id: "ready", label: "Proposal Ready", emoji: "✅", duration: 600 },
];

/** Mock extraction result — replace with real API response later */
export const MOCK_PROPOSAL: ProposalSummary = {
  subjects: ["Mathematics", "Physics", "Computer Science"],
  assignments: ["Calculus Problem Set 4", "Physics Lab Report"],
  exams: ["Midterm - Linear Algebra (Aug 12)", "Final - Data Structures (Sep 3)"],
};

export const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

export function isAcceptedFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.type === "image/jpeg" ||
    file.type === "image/png"
  );
}
