export type ProposalPriority = "High" | "Medium" | "Low";

export type ProposalStatus = "pending" | "approved" | "rejected";

export interface StudyProposal {
  id: string;
  subject: string;
  studyTime: string;
  deadline: string;
  priority: ProposalPriority;
  aiReason: string;
  estimatedDuration: string;
  durationHours: number;
  status: ProposalStatus;
  hasConflict?: boolean;
}