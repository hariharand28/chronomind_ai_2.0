import type { StudyProposal } from "../types/proposal";

export const mockProposals: StudyProposal[] = [
  {
    id: "prop-1",
    subject: "CS 301 — Algorithms",
    studyTime: "Today, 2:00 PM",
    deadline: "Mar 14, 2025",
    priority: "High",
    aiReason:
      "Assignment 3 is due in 3 days and covers dynamic programming, a topic you scored lowest on in the last quiz.",
    estimatedDuration: "1h 30m",
    durationHours: 1.5,
    status: "pending",
    hasConflict: true,
  },
  {
    id: "prop-2",
    subject: "Calculus II",
    studyTime: "Today, 4:00 PM",
    deadline: "Mar 16, 2025",
    priority: "Medium",
    aiReason:
      "Practice set on integration by parts hasn't been reviewed in 9 days. Spacing this out now improves retention before the midterm.",
    estimatedDuration: "1h",
    durationHours: 1,
    status: "pending",
  },
  {
    id: "prop-3",
    subject: "Modern History",
    studyTime: "Today, 6:30 PM",
    deadline: "Mar 18, 2025",
    priority: "Low",
    aiReason:
      "Reading Chapter 4 is ahead of schedule. Light review session to keep pace with the syllabus timeline.",
    estimatedDuration: "45m",
    durationHours: 0.75,
    status: "pending",
  },
  {
    id: "prop-4",
    subject: "Organic Chemistry",
    studyTime: "Tomorrow, 9:00 AM",
    deadline: "Mar 15, 2025",
    priority: "High",
    aiReason:
      "Lab report draft is due in 2 days and overlaps with your Calculus II session — flagged for rescheduling.",
    estimatedDuration: "2h",
    durationHours: 2,
    status: "pending",
    hasConflict: true,
  },
  {
    id: "prop-5",
    subject: "Intro to Statistics",
    studyTime: "Tomorrow, 1:00 PM",
    deadline: "Mar 20, 2025",
    priority: "Medium",
    aiReason:
      "Homework 5 covers hypothesis testing, building directly on last week's material. Best reviewed while still fresh.",
    estimatedDuration: "1h 15m",
    durationHours: 1.25,
    status: "pending",
  },
];
