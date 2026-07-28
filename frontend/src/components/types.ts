export interface SummaryCardData {
  id: string;
  label: string;
  value: string | number;
  icon: "deadline" | "proposal" | "hours" | "reminder";
  hint: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "upload" | "proposal" | "reminder";
}

export interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  durationMinutes: number;
  subject: string;
}
