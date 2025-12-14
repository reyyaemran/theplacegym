import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isSameMonth,
  getWeek,
} from "date-fns";

/**
 * Get a matrix of dates for a month view (6 weeks × 7 days)
 */
export function getMonthMatrix(date: Date): Date[][] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks: Date[][] = [];

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}

/**
 * Get the week range (start and end dates) for a given date
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return { start: weekStart, end: weekEnd };
}

/**
 * Get all days in a week
 */
export function getWeekDays(date: Date): Date[] {
  const { start, end } = getWeekRange(date);
  return eachDayOfInterval({ start, end });
}

/**
 * Check if a date is today
 */
export function isTodayDate(date: Date): boolean {
  return isToday(date);
}

/**
 * Check if two dates are the same day
 */
export function isSameDayDate(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

/**
 * Check if a date is in the same month
 */
export function isSameMonthDate(date: Date, month: Date): boolean {
  return isSameMonth(date, month);
}

/**
 * Format date for display
 */
export function formatDate(date: Date, formatStr: string): string {
  return format(date, formatStr);
}

/**
 * Navigate to next period based on view
 */
export function getNextDate(date: Date, view: "day" | "week" | "month" | "year"): Date {
  switch (view) {
    case "day":
      return addDays(date, 1);
    case "week":
      return addWeeks(date, 1);
    case "month":
      return addMonths(date, 1);
    case "year":
      return addMonths(date, 12);
    default:
      return date;
  }
}

/**
 * Navigate to previous period based on view
 */
export function getPreviousDate(date: Date, view: "day" | "week" | "month" | "year"): Date {
  switch (view) {
    case "day":
      return subDays(date, 1);
    case "week":
      return subWeeks(date, 1);
    case "month":
      return subMonths(date, 1);
    case "year":
      return subMonths(date, 12);
    default:
      return date;
  }
}

/**
 * Get time slots for day/week view (hourly from 0 to 23)
 */
export function getTimeSlots(): Date[] {
  const today = new Date();
  const slots: Date[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const slot = new Date(today);
    slot.setHours(hour, 0, 0, 0);
    slots.push(slot);
  }
  return slots;
}

/**
 * Get events for a specific day
 */
export function getEventsForDay(events: any[], day: Date): any[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  
  return events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart <= dayEnd && eventEnd >= dayStart;
  });
}

/**
 * Get events for a specific week
 */
export function getEventsForWeek(events: any[], weekStart: Date): any[] {
  const { end: weekEnd } = getWeekRange(weekStart);
  const weekStartDay = startOfDay(weekStart);
  const weekEndDay = endOfDay(weekEnd);
  
  return events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart <= weekEndDay && eventEnd >= weekStartDay;
  });
}

