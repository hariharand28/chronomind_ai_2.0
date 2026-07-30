/**
 * Types describing the backend Proposal model.
 */

export interface ScheduledSlot {
  id: string;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  notes: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
}

export interface Reminder {
  id: string;
  time: string;
  message: string;
}

export interface Proposal {
  id?: string;
  title: string;
  description: string;
  scheduled_slots: ScheduledSlot[];
  calendar_events: CalendarEvent[];
  reminders: Reminder[];
  explanation: string;
}