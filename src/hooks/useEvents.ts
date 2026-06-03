import { useState, useEffect } from "react";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  category: "Exam" | "Interview" | "Meeting" | "Deadline" | "Personal";
}

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const loadEvents = () => {
    try {
      const stored = localStorage.getItem("fp_events");
      if (stored) {
        setEvents(JSON.parse(stored));
      } else {
        setEvents([]);
      }
    } catch (e) {
      setEvents([]);
    }
  };

  useEffect(() => {
    loadEvents();

    const handleUpdate = () => {
      loadEvents();
    };

    window.addEventListener("fp_events_updated", handleUpdate);
    return () => {
      window.removeEventListener("fp_events_updated", handleUpdate);
    };
  }, []);

  const saveEvents = (newEvents: CalendarEvent[]) => {
    localStorage.setItem("fp_events", JSON.stringify(newEvents));
    setEvents(newEvents);
    window.dispatchEvent(new Event("fp_events_updated"));
  };

  const addEvent = (event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    };
    saveEvents([...events, newEvent]);
  };

  const updateEvent = (id: string, updated: Partial<CalendarEvent>) => {
    const updatedEvents = events.map((e) => (e.id === id ? { ...e, ...updated } : e));
    saveEvents(updatedEvents);
  };

  const deleteEvent = (id: string) => {
    const updatedEvents = events.filter((e) => e.id !== id);
    saveEvents(updatedEvents);
  };

  return {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
  };
}
