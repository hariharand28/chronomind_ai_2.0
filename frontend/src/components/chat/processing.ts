export type StageStatus = "waiting" | "active" | "completed";

export type StageId =
  | "uploading"
  | "ocr"
  | "extracting"
  | "reasoning"
  | "proposal"
  | "completed";

export interface ProcessingStage {
  id: StageId;
  label: string;
  status: StageStatus;
}
