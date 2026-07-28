import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { format, isSameDay } from "date-fns";
import { Plus, MapPin, Clock, Brain, Check, X, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CalendarEvent } from "@/lib/mock-data";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Chronomind" },
      { name: "description", content: "See your day at a glance. Google Calendar sync coming soon." },
      { property: "og:title", content: "Calendar — Chronomind" },
      { property: "og:description", content: "See your day at a glance. Google Calendar sync coming soon." },
    ],
  }),
  component: CalendarPage,
});

type Priority = "High" | "Medium" | "Low";
type SessionStatus = "pending" | "completed" | "skipped";

interface StudySession extends CalendarEvent {
  priority: Priority;
  aiSuggested: boolean;
  durationMinutes: number;
  reason: string;
  deadline: string;
  notes: string;
  status: SessionStatus;
  tag?: "exam" | "assignment";
}

function iso(daysOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const priorityStyles: Record<Priority, string> = {
  High: "bg-red-500/15 text-red-400 border-red-500/30",
  Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Low: "bg-green-500/15 text-green-400 border-green-500/30",
};

// Mock AI-generated study sessions — no backend.
const seedStudySessions: StudySession[] = [
  {
    id: "ai-1",
    summary: "CS 301 — Algorithms Review",
    location: undefined,
    start: { dateTime: iso(0, 14, 0) },
    end: { dateTime: iso(0, 15, 0) },
    calendarId: "primary",
    source: "local",
    priority: "High",
    aiSuggested: true,
    durationMinutes: 60,
    reason: "Assignment 3 is due in 3 days and covers dynamic programming, your lowest-scoring quiz topic.",
    deadline: "Mar 14, 2025",
    notes: "Focus on memoization patterns before attempting the practice set.",
    status: "pending",
  },
  {
    id: "ai-2",
    summary: "Calculus II — Practice Set",
    location: undefined,
    start: { dateTime: iso(0, 16, 0) },
    end: { dateTime: iso(0, 17, 0) },
    calendarId: "primary",
    source: "local",
    priority: "Medium",
    aiSuggested: true,
    durationMinutes: 60,
    reason: "Integration by parts hasn't been reviewed in 9 days. Spacing this out improves retention.",
    deadline: "Mar 16, 2025",
    notes: "Redo problems 4–9 from the last problem set.",
    status: "pending",
  },
  {
    id: "ai-3",
    summary: "Modern History — Reading",
    location: undefined,
    start: { dateTime: iso(0, 18, 30) },
    end: { dateTime: iso(0, 19, 15) },
    calendarId: "primary",
    source: "local",
    priority: "Low",
    aiSuggested: true,
    durationMinutes: 45,
    reason: "You're ahead of schedule. Light review keeps pace with the syllabus timeline.",
    deadline: "Mar 18, 2025",
    notes: "Chapter 4, sections 1–3.",
    status: "pending",
  },
  {
    id: "ai-4",
    summary: "Organic Chemistry Midterm",
    location: "Room 214",
    start: { dateTime: iso(2, 9, 0) },
    end: { dateTime: iso(2, 11, 0) },
    calendarId: "primary",
    source: "local",
    priority: "High",
    aiSuggested: false,
    durationMinutes: 120,
    reason: "Manually added exam — not AI generated.",
    deadline: "Mar 15, 2025",
    notes: "Bring calculator and periodic table sheet.",
    status: "pending",
    tag: "exam",
  },
  {
    id: "ai-5",
    summary: "Statistics — Homework 5",
    location: undefined,
    start: { dateTime: iso(1, 13, 0) },
    end: { dateTime: iso(1, 14, 15) },
    calendarId: "primary",
    source: "local",
    priority: "Medium",
    aiSuggested: true,
    durationMinutes: 75,
    reason: "Covers hypothesis testing, building directly on last week's material.",
    deadline: "Mar 20, 2025",
    notes: "Submit via course portal before midnight.",
    status: "pending",
    tag: "assignment",
  },
  {
    id: "ai-6",
    summary: "Physics Lab Report",
    location: undefined,
    start: { dateTime: iso(3, 10, 0) },
    end: { dateTime: iso(3, 11, 0) },
    calendarId: "primary",
    source: "local",
    priority: "Medium",
    aiSuggested: true,
    durationMinutes: 60,
    reason: "Lab report draft is due soon and overlaps with your Calculus II session.",
    deadline: "Mar 17, 2025",
    notes: "Include error analysis section.",
    status: "pending",
    tag: "assignment",
  },
];

function CalendarPage() {
  const [events, setEvents] = useState<StudySession[]>(seedStudySessions);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ summary: "", date: format(new Date(), "yyyy-MM-dd"), start: "10:00", end: "11:00", location: "" });
  const [detailsSession, setDetailsSession] = useState<StudySession | null>(null);

  const dayEvents = events
    .filter((e) => date && isSameDay(new Date(e.start.dateTime), date))
    .sort((a, b) => a.start.dateTime.localeCompare(b.start.dateTime));

  const create = () => {
    if (!form.summary) return;
    const startISO = new Date(`${form.date}T${form.start}`).toISOString();
    const endISO = new Date(`${form.date}T${form.end}`).toISOString();
    const durationMinutes = Math.max(
      0,
      Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000)
    );
    setEvents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        summary: form.summary,
        location: form.location || undefined,
        start: { dateTime: startISO },
        end: { dateTime: endISO },
        calendarId: "primary",
        source: "local",
        priority: "Medium",
        aiSuggested: false,
        durationMinutes,
        reason: "Manually added event.",
        deadline: "—",
        notes: "",
        status: "pending",
      },
    ]);
    setOpen(false);
    setForm({ summary: "", date: form.date, start: "10:00", end: "11:00", location: "" });
  };

  const setStatus = (id: string, status: SessionStatus) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  };

  const totalStudyHours = (
    events.reduce((sum, e) => sum + e.durationMinutes, 0) / 60
  ).toFixed(1);
  const upcomingExams = events.filter((e) => e.tag === "exam").length;
  const assignments = events.filter((e) => e.tag === "assignment").length;
  const aiGeneratedCount = events.filter((e) => e.aiSuggested).length;

  const statCards = [
    { id: "hours", label: "Total Study Hours", value: `${totalStudyHours}h` },
    { id: "exams", label: "Upcoming Exams", value: upcomingExams },
    { id: "assignments", label: "Assignments", value: assignments },
    { id: "ai", label: "AI Generated Sessions", value: aiGeneratedCount },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Local events. Google Calendar sync coming soon.</p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" size="sm" disabled>
                    Connect Google Calendar
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> New event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New event</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="e-title">Title</Label>
                  <Input id="e-title" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="e-date">Date</Label>
                  <Input id="e-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="e-start">Start</Label>
                    <Input id="e-start" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="e-end">End</Label>
                    <Input id="e-end" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="e-loc">Location</Label>
                  <Input id="e-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex flex-col gap-4 overflow-auto p-6">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-300"
        >
          <Brain className="h-4 w-4 shrink-0" />
          <span>ChronoMind AI generated today's study schedule based on your syllabus.</span>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Calendar grid (unchanged layout) */}
        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-[auto_1fr]">
          <div className="rounded-lg border p-3">
            <Calendar mode="single" selected={date} onSelect={setDate} className="pointer-events-auto" />
          </div>
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {date ? format(date, "EEEE, MMMM d") : "Select a day"}
              </h2>
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> High
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" /> Medium
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Low
                </span>
              </div>
            </div>

            {dayEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No events on this day.
              </div>
            ) : (
              <ul className="space-y-2">
                {dayEvents.map((e, index) => (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                    className={`rounded-lg border bg-card p-3 ${
                      e.status === "skipped" ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="font-medium">📚 {e.summary}</div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={priorityStyles[e.priority]}>
                          🎯 {e.priority}
                        </Badge>
                        {e.aiSuggested && (
                          <Badge variant="outline" className="gap-1 border-violet-500/30 bg-violet-500/10 text-violet-300">
                            <Brain className="h-3 w-3" /> AI Suggested
                          </Badge>
                        )}
                        {e.status === "completed" && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                            Completed
                          </Badge>
                        )}
                        {e.status === "skipped" && (
                          <Badge variant="outline" className="border-white/10 bg-white/5 text-muted-foreground">
                            Skipped
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ⏰ {format(new Date(e.start.dateTime), "p")} – {format(new Date(e.end.dateTime), "p")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Est. {formatDuration(e.durationMinutes)}
                      </span>
                      {e.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {e.location}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        disabled={e.status === "completed"}
                        onClick={() => setStatus(e.id, "completed")}
                      >
                        <Check className="h-3.5 w-3.5" /> Completed
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        disabled={e.status === "skipped"}
                        onClick={() => setStatus(e.id, "skipped")}
                      >
                        <X className="h-3.5 w-3.5" /> Skip
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setDetailsSession(e)}
                      >
                        <Info className="h-3.5 w-3.5" /> Details
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Details dialog */}
      <Dialog open={detailsSession !== null} onOpenChange={(v) => !v && setDetailsSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailsSession?.summary}</DialogTitle>
          </DialogHeader>
          {detailsSession && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Reason generated by AI</p>
                <p className="mt-0.5">{detailsSession.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Deadline</p>
                  <p className="mt-0.5">{detailsSession.deadline}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Study Duration</p>
                  <p className="mt-0.5">{formatDuration(detailsSession.durationMinutes)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Priority</p>
                <Badge variant="outline" className={`mt-0.5 ${priorityStyles[detailsSession.priority]}`}>
                  {detailsSession.priority}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="mt-0.5">{detailsSession.notes || "No additional notes."}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailsSession(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}