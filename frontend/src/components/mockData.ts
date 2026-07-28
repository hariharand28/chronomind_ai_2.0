import type { ActivityItem, ScheduleItem, SummaryCardData } from "./types";

export const summaryCardsData: SummaryCardData[] = [
  {
    id: "deadlines",
    label: "Upcoming Deadlines",
    value: 4,
    icon: "deadline",
    hint: "Next: Calculus problem set — in 2 days",
  },
  {
    id: "proposals",
    label: "Pending Proposals",
    value: 2,
    icon: "proposal",
    hint: "Awaiting your review",
  },
  {
    id: "hours",
    label: "Today's Study Hours",
    value: "3.5h",
    icon: "hours",
    hint: "Goal: 4h",
  },
  {
    id: "reminders",
    label: "Active Reminders",
    value: 6,
    icon: "reminder",
    hint: "1 due in the next hour",
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: "act-1",
    title: "Syllabus uploaded",
    description: "CS 301 — Algorithms & Data Structures",
    timestamp: "10 min ago",
    type: "upload",
  },
  {
    id: "act-2",
    title: "Study plan proposal generated",
    description: "6-week plan covering 8 topics",
    timestamp: "9 min ago",
    type: "proposal",
  },
  {
    id: "act-3",
    title: "Reminder created",
    description: "Review Chapter 4 — tomorrow at 6:00 PM",
    timestamp: "5 min ago",
    type: "reminder",
  },
];

export const upcomingSchedule: ScheduleItem[] = [
  {
    id: "sch-1",
    title: "Algorithms review",
    time: "2:00 PM",
    durationMinutes: 45,
    subject: "CS 301",
  },
  {
    id: "sch-2",
    title: "Practice problem set",
    time: "4:00 PM",
    durationMinutes: 60,
    subject: "Calculus II",
  },
  {
    id: "sch-3",
    title: "Reading: Chapter 4",
    time: "6:30 PM",
    durationMinutes: 30,
    subject: "Modern History",
  },
];
