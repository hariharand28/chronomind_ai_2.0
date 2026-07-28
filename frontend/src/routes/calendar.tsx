import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { Plus, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { seedEvents, type CalendarEvent } from "@/lib/mock-data";

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

function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ summary: "", date: format(new Date(), "yyyy-MM-dd"), start: "10:00", end: "11:00", location: "" });

  const dayEvents = events
    .filter((e) => date && isSameDay(new Date(e.start.dateTime), date))
    .sort((a, b) => a.start.dateTime.localeCompare(b.start.dateTime));

  const create = () => {
    if (!form.summary) return;
    const startISO = new Date(`${form.date}T${form.start}`).toISOString();
    const endISO = new Date(`${form.date}T${form.end}`).toISOString();
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
      },
    ]);
    setOpen(false);
    setForm({ summary: "", date: form.date, start: "10:00", end: "11:00", location: "" });
  };

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

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-auto p-6 md:grid-cols-[auto_1fr]">
        <div className="rounded-lg border p-3">
          <Calendar mode="single" selected={date} onSelect={setDate} className="pointer-events-auto" />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {date ? format(date, "EEEE, MMMM d") : "Select a day"}
          </h2>
          {dayEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No events on this day.
            </div>
          ) : (
            <ul className="space-y-2">
              {dayEvents.map((e) => (
                <li key={e.id} className="rounded-lg border bg-card p-3">
                  <div className="font-medium">{e.summary}</div>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(e.start.dateTime), "p")} – {format(new Date(e.end.dateTime), "p")}
                    </span>
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {e.location}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
