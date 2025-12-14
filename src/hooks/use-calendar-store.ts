"use client";

import { useState, useCallback } from "react";
import { Calendar, CalendarEvent, CalendarView } from "@/types/calendar";
import { getNextDate, getPreviousDate } from "@/lib/date-utils";

// Mock data
const mockCalendars: Calendar[] = [
  { id: "1", name: "Personal", color: "bg-blue-500", isVisible: true },
  { id: "2", name: "Work", color: "bg-green-500", isVisible: true },
  { id: "3", name: "Family", color: "bg-purple-500", isVisible: true },
];

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    calendarId: "1",
    title: "Morning Run",
    start: new Date().toISOString(),
    end: new Date(Date.now() + 3600000).toISOString(),
    allDay: false,
  },
  {
    id: "2",
    calendarId: "2",
    title: "Team Meeting",
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    allDay: false,
    location: "Conference Room A",
  },
];

export function useCalendarStore() {
  const [currentView, setCurrentView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>(mockCalendars);
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => getNextDate(prev, currentView));
  }, [currentView]);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => getPreviousDate(prev, currentView));
  }, [currentView]);

  const toggleCalendarVisibility = useCallback((calendarId: string) => {
    setCalendars((prev) =>
      prev.map((cal) =>
        cal.id === calendarId ? { ...cal, isVisible: !cal.isVisible } : cal
      )
    );
  }, []);

  const createEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: Date.now().toString(),
    };
    setEvents((prev) => [...prev, newEvent]);
    return newEvent;
  }, []);

  const updateEvent = useCallback((eventId: string, updates: Partial<CalendarEvent>) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === eventId ? { ...event, ...updates } : event))
    );
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
    }
  }, [selectedEventId]);

  return {
    currentView,
    setCurrentView,
    currentDate,
    setCurrentDate,
    selectedEventId,
    setSelectedEventId,
    selectedDate,
    setSelectedDate,
    calendars,
    setCalendars,
    events,
    setEvents,
    goToToday,
    goToNext,
    goToPrevious,
    toggleCalendarVisibility,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}

