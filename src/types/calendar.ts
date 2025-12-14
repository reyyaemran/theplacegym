export type CalendarId = string;

export type Calendar = {
  id: CalendarId;
  name: string;
  color: string; // Tailwind-compatible, e.g. "bg-blue-500"
  isVisible: boolean;
};

export type EventId = string;

export type CalendarEvent = {
  id: EventId;
  calendarId: CalendarId;
  title: string;
  start: string; // ISO date
  end: string; // ISO date
  allDay?: boolean;
  location?: string;
  notes?: string;
};

export type CalendarView = "day" | "week" | "month" | "year";

