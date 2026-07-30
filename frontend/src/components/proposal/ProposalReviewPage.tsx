"use client";

import * as React from "react";
import {
  Sparkles,
  Bell,
  CalendarClock,
  Clock,
  Target,
  BookOpen,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { Proposal } from "./proposal.types.ts";

interface ProposalReviewPageProps {
  proposal: Proposal;
  /** Called when the user accepts the proposal. Should trigger the actual accept mutation upstream. */
  onAccept: () => void;
  /** Called when the user rejects the proposal. Should trigger the actual reject mutation upstream. */
  onReject: () => void;
  /** Disables both actions while a request is in flight. */
  isSubmitting?: boolean;
  className?: string;
}

/** Groups calendar events by their `day` field, preserving first-seen order. */
function groupEventsByDay(
  slots: Proposal["scheduled_slots"]
) {
  const order: string[] = [];
  const groups = new Map<string, Proposal["scheduled_slots"]>();

  for (const slot of slots) {
    if (!groups.has(slot.day)) {
      groups.set(slot.day, []);
      order.push(slot.day);
    }

    groups.get(slot.day)!.push(slot);
  }

  return order.map((day) => ({
    day,
    events: groups.get(day)!.sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    ),
  }));
}

export default function ProposalReviewPage({
  proposal,
  onAccept,
  onReject,
  isSubmitting = false,
  className,
}: ProposalReviewPageProps) {
  const { title, description, scheduled_slots, calendar_events, reminders, explanation } =
    proposal;

const dayGroups = React.useMemo(
  () => groupEventsByDay(scheduled_slots),
  [scheduled_slots]
);

  return (
    <div className={cn("mx-auto w-full max-w-5xl space-y-6 pb-28", className)}>
      {/* 1. Proposal Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Proposal
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </header>

      {/* 2. Study Plan Table */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-medium">Study Plan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Goal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduled_slots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      No sessions scheduled yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  scheduled_slots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium text-foreground">
                        {slot.day}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {slot.start_time} - {slot.end_time}
                      </TableCell>

                      <TableCell className="text-foreground">
                        {slot.title}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {slot.duration_minutes} mins
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {slot.notes}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 4. Calendar Preview */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Calendar Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {dayGroups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No calendar events for this proposal.
              </p>
            ) : (
              <ScrollArea className="h-80 pr-4">
                <div className="space-y-6">
                  {dayGroups.map(({ day, events }) => (
                    <div key={day} className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {day}
                      </p>
                      <ol className="space-y-3 border-l border-border pl-4">
                        {events.map((slot) => (
                          <li key={slot.id} className="relative">
                            <span
                              aria-hidden
                              className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary"
                            />
                            <p className="text-sm font-medium text-foreground">{slot.title}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {slot.start_time} – {slot.end_time}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* 5. Reminder List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No reminders set for this proposal.
              </p>
            ) : (
              <ul className="space-y-1">
                {reminders.map((reminder, i) => (
                  <React.Fragment key={reminder.id}>
                    <li className="flex items-start gap-3 py-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bell className="h-3.5 w-3.5 text-primary" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{reminder.time}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {reminder.message}
                        </p>
                      </div>
                    </li>
                    {i < reminders.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. AI Explanation Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Target className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-medium">Why this plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">{explanation}</p>
        </CardContent>
      </Card>

      {/* 6. Action Bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-5xl flex-col-reverse items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            className="gap-2"
            onClick={onReject}
            disabled={isSubmitting}
          >
            <XCircle className="h-4 w-4" />
            Reject Proposal
          </Button>
          <Button className="gap-2" onClick={onAccept} disabled={isSubmitting}>
            <CheckCircle2 className="h-4 w-4" />
            Accept Proposal
          </Button>
        </div>
      </div>
    </div>
  );
}