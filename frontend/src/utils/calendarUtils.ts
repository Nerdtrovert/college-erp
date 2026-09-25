import { CalendarEvent, EventType } from '../components/AcademicCalendar';

/**
 * Check if an event is a duplicate based on date and title
 * @param events - Array of existing events
 * @param newEvent - Event to check for duplication
 * @returns true if duplicate exists
 */
export const isDuplicateEvent = (events: CalendarEvent[], newEvent: CalendarEvent): boolean => {
  return events.some(event => event.date === newEvent.date && event.title === newEvent.title);
};

/**
 * Merge new events with existing events, avoiding duplicates
 * @param existingEvents - Current events in calendar
 * @param newEvents - Events to add
 * @returns Merged array of events
 */
export const mergeEvents = (existingEvents: CalendarEvent[], newEvents: CalendarEvent[]): CalendarEvent[] => {
  const existingKeys = new Set(existingEvents.map(event => `${event.date}|${event.title}`));
  const uniqueNewEvents = newEvents.filter(event => !existingKeys.has(`${event.date}|${event.title}`));
  return [...existingEvents, ...uniqueNewEvents];
};

/**
 * Sort events by date (ascending)
 * @param events - Array of events to sort
 * @returns Sorted array of events
 */
export const sortEventsByDate = (events: CalendarEvent[]): CalendarEvent[] => {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get events for a specific date
 * @param events - Array of events to search
 * @param dateKey - Date string in YYYY-MM-DD format
 * @param dayOfWeek - Day of week (0-6, where 0 is Sunday)
 * @returns Array of events for the date, or Sunday holiday event if no events and it's Sunday
 */
export const getEventsForDate = (events: CalendarEvent[], dateKey: string, dayOfWeek: number): CalendarEvent[] => {
  const eventsForDate = events.filter(event => event.date === dateKey);

  // If no events and it's Sunday (dayOfWeek === 0), return Sunday holiday
  if (eventsForDate.length === 0 && dayOfWeek === 0) {
    return [{ date: dateKey, title: 'Sunday holiday', type: 'general' }];
  }

  return eventsForDate;
};

/**
 * Convert year, month, day to date key in YYYY-MM-DD format
 * @param year - Full year (e.g., 2025)
 * @param month - Month index (0-11, where 0 is January)
 * @param day - Day of month (1-31)
 * @returns Date string in YYYY-MM-DD format
 */
export const toDateKey = (year: number, month: number, day: number): string => {
  const monthStr = (month + 1).toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

/**
 * Get number of days in a month
 * @param year - Full year (e.g., 2025)
 * @param month - Month index (0-11, where 0 is January)
 * @returns Number of days in the month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Event styles for different event types
 */
export const EVENT_STYLES = {
  cie: {
    className: 'bg-amber-100 text-amber-800',
    label: 'CIE'
  },
  government: {
    className: 'bg-rose-50 text-rose-800',
    label: 'Government'
  },
  general: {
    className: 'bg-slate-100 text-slate-800',
    label: 'General'
  },
  academic: {
    className: 'bg-blue-50 text-blue-800',
    label: 'Academic'
  }
};