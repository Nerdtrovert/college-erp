export type EventType = 'cie' | 'government' | 'general' | 'academic';

export interface CalendarEvent {
  date: string;
  endDate?: string;
  title: string;
  type: EventType;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { date: '2026-09-07', title: 'Commencement of classes for V semester', type: 'academic' },
  { date: '2026-09-07', endDate: '2026-09-08', title: 'Orientation', type: 'academic' },
  { date: '2026-09-09', endDate: '2026-09-11', title: 'Skill Lab', type: 'academic' },
  { date: '2026-09-14', title: 'Ganesha Chaturthi (Holiday)', type: 'government' },
  { date: '2026-09-15', title: "Engineers' Day", type: 'academic' },
  { date: '2026-09-16', endDate: '2026-09-18', title: 'Skill Lab', type: 'academic' },
  { date: '2026-09-19', title: 'III Saturday Holiday', type: 'government' },
  { date: '2026-09-21', endDate: '2026-09-25', title: 'Skill Lab', type: 'academic' },
  { date: '2026-09-28', title: 'Beginning of classes for V semester', type: 'academic' },
  { date: '2026-10-02', title: 'Gandhi Jayanti', type: 'government' },
  { date: '2026-10-03', title: 'I Saturday Holiday', type: 'government' },
  { date: '2026-10-05', endDate: '2026-10-10', title: 'Mentoring Week', type: 'academic' },
  { date: '2026-10-10', title: 'Mahalaya Amavasya (Holiday)', type: 'government' },
  { date: '2026-10-14', title: 'Class Committee Meeting', type: 'academic' },
  { date: '2026-10-17', title: 'III Saturday Holiday', type: 'government' },
  { date: '2026-10-20', title: 'Mahanavami (Holiday)', type: 'government' },
  { date: '2026-10-21', title: 'Vijayadashami (Holiday)', type: 'government' },
  { date: '2026-10-24', title: 'Working Saturday (Compensatory Skill Lab)', type: 'academic' },
  { date: '2026-10-26', endDate: '2026-10-29', title: 'CIE - I for I semester', type: 'cie' },
  { date: '2026-10-30', endDate: '2026-10-31', title: 'Science in Action', type: 'academic' },
  { date: '2026-11-02', endDate: '2026-11-04', title: 'CIE - I for V semester', type: 'cie' },
  { date: '2026-11-07', title: 'I Saturday Holiday', type: 'government' },
  { date: '2026-11-10', title: 'Balipadyami (Holiday)', type: 'government' },
  { date: '2026-11-14', title: 'PTM 1', type: 'academic' },
  { date: '2026-11-14', title: 'Phase 1 Evaluation of Mini Project', type: 'academic' },
  { date: '2026-11-21', title: 'III Saturday Holiday', type: 'government' },
  { date: '2026-11-25', title: 'Class Committee Meeting', type: 'academic' },
  { date: '2026-11-27', title: 'Kanakadasa Jayanti (Holiday)', type: 'government' },
  { date: '2026-11-28', title: 'Working Saturday (Compensatory Skill Lab)', type: 'academic' },
  { date: '2026-11-30', endDate: '2026-12-04', title: 'Mentoring Week', type: 'academic' },
  { date: '2026-12-05', title: 'I Saturday Holiday', type: 'government' },
  { date: '2026-12-12', title: 'Working Saturday (Compensatory Skill Lab)', type: 'academic' },
  { date: '2026-12-14', endDate: '2026-12-16', title: 'CIE - II for V semester', type: 'cie' },
  { date: '2026-12-18', title: 'Phase 2 Evaluation of Mini Project', type: 'academic' },
  { date: '2026-12-19', title: 'III Saturday Holiday', type: 'government' },
  { date: '2026-12-22', title: 'National Mathematics Day', type: 'academic' },
  { date: '2026-12-25', title: 'Christmas', type: 'government' },
  { date: '2026-12-26', title: 'Working Saturday (Compensatory Skill Lab)', type: 'academic' },
  { date: '2026-12-30', title: 'Last Working Day', type: 'academic' },
  { date: '2027-01-02', title: 'I Saturday Holiday', type: 'government' },
];

const CALENDAR_START_DATE = '2026-09-07';
const LEGACY_EVENT_SIGNATURES = new Set([
  '2026-09-14|Ganesh Chaturthi',
  '2026-10-20|Ayudha Puja / Dussehra',
  '2026-11-01|Karnataka Rajyotsava',
  '2026-11-08|Deepavali / Naraka Chaturdashi',
  '2026-11-09|Deepavali holiday',
  '2026-11-24|Guru Nanak Jayanti',
  '2026-11-27|Kanakadasa Jayanti',
]);

export const ACADEMIC_CALENDAR_STORAGE_KEY = 'academic-calendar-events';
export const ACADEMIC_CALENDAR_VERSION_KEY = 'academic-calendar-events-seed-v3';

export const migrateAcademicCalendarEvents = (storedEvents: CalendarEvent[]): CalendarEvent[] => {
  const sessionEvents = storedEvents.filter(
    (event) =>
      event.date >= CALENDAR_START_DATE &&
      !LEGACY_EVENT_SIGNATURES.has(`${event.date}|${event.title}`),
  );
  const existingKeys = new Set(
    sessionEvents.map((event) => `${event.date}|${event.endDate ?? ''}|${event.title}`),
  );
  const updatedEvents = [...sessionEvents];

  for (const event of CALENDAR_EVENTS) {
    const key = `${event.date}|${event.endDate ?? ''}|${event.title}`;
    if (!existingKeys.has(key)) {
      updatedEvents.push(event);
      existingKeys.add(key);
    }
  }

  return updatedEvents.sort((a, b) => a.date.localeCompare(b.date));
};
