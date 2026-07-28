// Types shaped to mirror Google Calendar / Google Tasks so a future
// real-provider swap only replaces the data source, not the UI.

export type UIMessagePart = { type: "text"; text: string } | { type: "file"; name: string; size: number; mime: string };

export type UIMessage = {
  id: string;
  role: "user" | "assistant";
  parts: UIMessagePart[];
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: UIMessage[];
};

export type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  calendarId: string;
  source: "local" | "google";
};

export type Reminder = {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: "needsAction" | "completed";
  priority: "low" | "medium" | "high";
  taskListId: string;
  source: "local" | "google";
};

// --- mock seed ---

const now = new Date();
const isoAt = (dayOffset: number, hour: number, minute = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const seedConversations: Conversation[] = [
  {
    id: "c1",
    title: "Project ingestion pipeline",
    updatedAt: isoAt(0, 9),
    messages: [
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "Summarize the ingestion layer for me." }],
        createdAt: isoAt(0, 9),
      },
      {
        id: "m2",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "The **ingestion layer** parses input, routes text vs. documents, runs OCR (paddleOCR) on scans, then structures everything into typed objects for the reasoning engine.",
          },
        ],
        createdAt: isoAt(0, 9, 1),
      },
    ],
  },
  { id: "c2", title: "Weekly planning", updatedAt: isoAt(-1, 15), messages: [] },
  { id: "c3", title: "OCR benchmarks", updatedAt: isoAt(-2, 11), messages: [] },
  { id: "c4", title: "Prompt assembly draft", updatedAt: isoAt(-4, 18), messages: [] },
];

export const seedEvents: CalendarEvent[] = [
  {
    id: "e1",
    summary: "Design review",
    location: "Zoom",
    start: { dateTime: isoAt(0, 10) },
    end: { dateTime: isoAt(0, 11) },
    calendarId: "primary",
    source: "local",
  },
  {
    id: "e2",
    summary: "1:1 with Alex",
    start: { dateTime: isoAt(0, 14) },
    end: { dateTime: isoAt(0, 14, 30) },
    calendarId: "primary",
    source: "local",
  },
  {
    id: "e3",
    summary: "Sprint demo",
    location: "Room 4B",
    start: { dateTime: isoAt(1, 15) },
    end: { dateTime: isoAt(1, 16) },
    calendarId: "primary",
    source: "local",
  },
  {
    id: "e4",
    summary: "Dentist",
    start: { dateTime: isoAt(3, 9) },
    end: { dateTime: isoAt(3, 10) },
    calendarId: "primary",
    source: "local",
  },
];

export const seedReminders: Reminder[] = [
  {
    id: "r1",
    title: "Submit expense report",
    due: isoAt(0, 17),
    status: "needsAction",
    priority: "high",
    taskListId: "@default",
    source: "local",
  },
  {
    id: "r2",
    title: "Reply to onboarding email",
    notes: "Follow up on doc access",
    due: isoAt(1, 9),
    status: "needsAction",
    priority: "medium",
    taskListId: "@default",
    source: "local",
  },
  {
    id: "r3",
    title: "Buy groceries",
    due: isoAt(2, 18),
    status: "needsAction",
    priority: "low",
    taskListId: "@default",
    source: "local",
  },
  {
    id: "r4",
    title: "Renew library card",
    status: "completed",
    priority: "low",
    taskListId: "@default",
    source: "local",
  },
];

export const cannedReply = (userText: string) =>
  `Got it — you said: "${userText.slice(0, 120)}"${userText.length > 120 ? "…" : ""}\n\nThis is a mocked assistant response. Real LLM wiring lands later.`;
