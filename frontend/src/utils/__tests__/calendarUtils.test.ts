import { 
  getEventsForDate, 
  isDuplicateEvent, 
  mergeEvents, 
  sortEventsByDate,
  EVENT_STYLES
} from '../calendarUtils';
import { CALENDAR_EVENTS, migrateAcademicCalendarEvents } from '../../data/academicCalendar';

describe('calendarUtils', () => {
  const mockEvents = [
    { date: '2025-09-22', title: 'Commencement of classes', type: 'academic' as const },
    { date: '2025-09-24', title: 'CIE - I', type: 'cie' as const },
    { date: '2025-09-24', title: 'CIE - I (Duplicate)', type: 'cie' as const },
    { date: '2025-09-25', title: 'Gandhi Jayanti', type: 'government' as const },
  ];

  describe('getEventsForDate', () => {
    it('should return events for a specific date', () => {
      const result = getEventsForDate(mockEvents, '2025-09-24', 2); // Wednesday
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('CIE - I');
      expect(result[1].title).toBe('CIE - I (Duplicate)');
    });

    it('should return Sunday holiday when no events and it is Sunday', () => {
      const result = getEventsForDate(mockEvents, '2025-09-28', 0); // Sunday
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Sunday holiday');
      expect(result[0].type).toBe('general');
    });

    it('should return empty array when no events and not Sunday', () => {
      const result = getEventsForDate(mockEvents, '2025-09-30', 1); // Monday
      expect(result.length).toBe(0);
    });

    it('should show multi-day events throughout their date range', () => {
      const rangedEvents = [
        { date: '2026-10-26', endDate: '2026-10-29', title: 'CIE - I', type: 'cie' as const },
      ];

      expect(getEventsForDate(rangedEvents, '2026-10-26', 1)).toHaveLength(1);
      expect(getEventsForDate(rangedEvents, '2026-10-28', 3)[0].title).toBe('CIE - I');
      expect(getEventsForDate(rangedEvents, '2026-10-30', 5)).toHaveLength(0);
    });

    it('should not add a Sunday holiday over an existing multi-day event', () => {
      const rangedEvents = [
        { date: '2026-11-29', endDate: '2026-12-04', title: 'Mentoring Week', type: 'academic' as const },
      ];

      expect(getEventsForDate(rangedEvents, '2026-11-29', 0)[0].title).toBe('Mentoring Week');
    });
  });

  describe('isDuplicateEvent', () => {
    it('should detect duplicate events', () => {
      const duplicate = { date: '2025-09-24', title: 'CIE - I', type: 'cie' as const };
      expect(isDuplicateEvent(mockEvents, duplicate)).toBe(true);
    });

    it('should not detect different events as duplicates', () => {
      const different = { date: '2025-09-24', title: 'Different Event', type: 'cie' as const };
      expect(isDuplicateEvent(mockEvents, different)).toBe(false);
    });

    it('should be case insensitive when comparing titles', () => {
      const duplicate = { date: '2025-09-24', title: 'cie - i', type: 'cie' as const };
      expect(isDuplicateEvent(mockEvents, duplicate)).toBe(true);
    });

    it('should ignore whitespace when comparing titles', () => {
      const duplicate = { date: '2025-09-24', title: '  CIE - I  ', type: 'cie' as const };
      expect(isDuplicateEvent(mockEvents, duplicate)).toBe(true);
    });
  });

  describe('mergeEvents', () => {
    it('should merge events without duplicates', () => {
      const newEvents = [
        { date: '2025-09-26', title: 'New Event', type: 'academic' as const },
        { date: '2025-09-24', title: 'CIE - I Updated', type: 'cie' as const }, // Will replace existing
      ];
      
      const result = mergeEvents(mockEvents, newEvents);
      
      // Should have 4 original + 2 new - 1 duplicate = 5 events
      expect(result.length).toBe(5);
      
      // Should contain the updated event
      const updatedEvent = result.find(e => e.title === 'CIE - I Updated');
      expect(updatedEvent).toBeDefined();
      expect(updatedEvent?.date).toBe('2025-09-24');
      
      // Should contain the new event
      const newEvent = result.find(e => e.title === 'New Event');
      expect(newEvent).toBeDefined();
      expect(newEvent?.date).toBe('2025-09-26');
    });

    it('should preserve original events when no new events', () => {
      const result = mergeEvents(mockEvents, []);
      expect(result.length).toBe(mockEvents.length);
    });
  });

  describe('sortEventsByDate', () => {
    it('should sort events by date ascending', () => {
      const unsorted = [
        { date: '2025-09-25', title: 'Later Event', type: 'academic' as const },
        { date: '2025-09-22', title: 'Earlier Event', type: 'academic' as const },
        { date: '2025-09-24', title: 'Middle Event', type: 'academic' as const },
      ];
      
      const result = sortEventsByDate(unsorted);
      
      expect(result[0].date).toBe('2025-09-22');
      expect(result[1].date).toBe('2025-09-24');
      expect(result[2].date).toBe('2025-09-25');
    });
  });

  describe('EVENT_STYLES', () => {
    it('should have all event types defined', () => {
      expect(EVENT_STYLES.cie).toBeDefined();
      expect(EVENT_STYLES.government).toBeDefined();
      expect(EVENT_STYLES.general).toBeDefined();
      expect(EVENT_STYLES.academic).toBeDefined();
    });

    it('should have correct class names', () => {
      expect(EVENT_STYLES.cie.className).toContain('bg-amber-100');
      expect(EVENT_STYLES.government.className).toContain('bg-rose-50');
      expect(EVENT_STYLES.general.className).toContain('bg-slate-100');
      expect(EVENT_STYLES.academic.className).toContain('bg-blue-50');
    });

    describe('academic calendar migration', () => {
      it('replaces old built-in dates and keeps user events in the new session', () => {
        const migrated = migrateAcademicCalendarEvents([
          { date: '2025-11-22', title: 'Old calendar PTM', type: 'academic' },
          { date: '2026-11-01', title: 'Karnataka Rajyotsava', type: 'government' },
          { date: '2026-10-08', title: 'User-added event', type: 'academic' },
        ]);

        expect(migrated.some((event) => event.title === 'Old calendar PTM')).toBe(false);
        expect(migrated.some((event) => event.title === 'Karnataka Rajyotsava')).toBe(false);
        expect(migrated.some((event) => event.title === 'User-added event')).toBe(true);
        expect(migrated).toEqual(expect.arrayContaining(CALENDAR_EVENTS));
      });

      it('includes the semester dates and CIE periods from the supplied calendar', () => {
        expect(CALENDAR_EVENTS).toEqual(expect.arrayContaining([
          expect.objectContaining({
            date: '2026-09-07',
            title: 'Commencement of classes for V semester',
          }),
          expect.objectContaining({
            date: '2026-11-02',
            endDate: '2026-11-04',
            title: 'CIE - I for V semester',
          }),
          expect.objectContaining({
            date: '2026-12-14',
            endDate: '2026-12-16',
            title: 'CIE - II for V semester',
          }),
          expect.objectContaining({
            date: '2027-01-02',
            title: 'I Saturday Holiday',
          }),
        ]));
      });
    });
  });
});
