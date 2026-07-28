import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { seedReminders, type Reminder } from "@/lib/mock-data";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders — Chronomind" },
      { name: "description", content: "Track tasks and due dates. Google Reminders sync coming soon." },
      { property: "og:title", content: "Reminders — Chronomind" },
      { property: "og:description", content: "Track tasks and due dates. Google Reminders sync coming soon." },
    ],
  }),
  component: RemindersPage,
});

const priorityColor: Record<Reminder["priority"], string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-muted text-muted-foreground",
};

function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>(seedReminders);
  const [tab, setTab] = useState<"all" | "upcoming" | "completed">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", notes: "", due: "", priority: "medium" as Reminder["priority"] });

  const filtered = reminders.filter((r) => {
    if (tab === "completed") return r.status === "completed";
    if (tab === "upcoming") return r.status === "needsAction" && r.due && new Date(r.due) >= new Date();
    return true;
  });

  const toggle = (id: string) =>
    setReminders((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: r.status === "completed" ? "needsAction" : "completed" } : r)),
    );

  const create = () => {
    if (!form.title) return;
    setReminders((rs) => [
      {
        id: crypto.randomUUID(),
        title: form.title,
        notes: form.notes || undefined,
        due: form.due ? new Date(form.due).toISOString() : undefined,
        status: "needsAction",
        priority: form.priority,
        taskListId: "@default",
        source: "local",
      },
      ...rs,
    ]);
    setOpen(false);
    setForm({ title: "", notes: "", due: "", priority: "medium" });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reminders</h1>
          <p className="text-sm text-muted-foreground">Local reminders. Google Reminders sync coming soon.</p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" size="sm" disabled>
                    Connect Google Reminders
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> New reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New reminder</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="r-title">Title</Label>
                  <Input id="r-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="r-notes">Notes</Label>
                  <Textarea id="r-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="r-due">Due</Label>
                  <Input id="r-due" type="datetime-local" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="r-prio">Priority</Label>
                  <select
                    id="r-prio"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Reminder["priority"] })}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nothing here.
                </div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((r) => (
                    <li key={r.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                      <Checkbox
                        checked={r.status === "completed"}
                        onCheckedChange={() => toggle(r.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className={r.status === "completed" ? "line-through text-muted-foreground" : "font-medium"}>
                          {r.title}
                        </div>
                        {r.notes && <div className="text-xs text-muted-foreground mt-0.5">{r.notes}</div>}
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          {r.due && (
                            <span className="text-muted-foreground">
                              Due {format(new Date(r.due), "PPp")}
                            </span>
                          )}
                          <Badge variant="outline" className={priorityColor[r.priority]}>
                            {r.priority}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
