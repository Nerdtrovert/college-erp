import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Edit3,
  GraduationCap,
  Landmark,
  Plus,
  PartyPopper,
  Save,
  Trash2,
  X,
} from 'lucide-react';

export type EventType = 'cie' | 'government' | 'general' | 'academic';

export interface CalendarEvent {
  date: string;
  title: string;
  type: EventType;
}

interface MonthDefinition {
  month: number;
  year: number;
  label: string;
}

const MONTHS: MonthDefinition[] = [
  { month: 8, year: 2025, label: 'September 2025' },
  { month: 9, year: 2025, label: 'October 2025' },
  { month: 10, year: 2025, label: 'November 2025' },
  { month: 11, year: 2025, label: 'December 2025' },
  { month: 0, year: 2026, label: 'January 2026' },
];

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { date: '2025-09-22', title: 'Commencement of classes for III semester', type: 'academic' },
  { date: '2025-09-24', title: 'Commencement of classes for I semester', type: 'academic' },
  { date: '2025-10-01', title: 'Dussehra', type: 'government' },
  { date: '2025-10-02', title: 'Gandhi Jayanti', type: 'government' },
  { date: '2025-10-07', title: 'Valmiki Jayanti', type: 'government' },
  { date: '2025-10-11', title: 'Tuesday time table', type: 'academic' },
  { date: '2025-10-15', title: 'Distinguished Lecture Series - 4', type: 'academic' },
  { date: '2025-10-16', title: 'Class Committee meeting', type: 'academic' },
  { date: '2025-10-20', title: 'Deepavali holiday', type: 'government' },
  { date: '2025-10-21', title: 'Deepavali holiday', type: 'government' },
  { date: '2025-10-22', title: 'Deepavali holiday', type: 'government' },
  { date: '2025-10-25', title: 'Tuesday time table', type: 'academic' },
  { date: '2025-10-30', title: 'Alumni Lecture Series - 3', type: 'academic' },
  { date: '2025-11-08', title: 'Tuesday time table', type: 'academic' },
  { date: '2025-11-10', title: 'CIE - I', type: 'cie' },
  { date: '2025-11-11', title: 'CIE - I', type: 'cie' },
  { date: '2025-11-12', title: 'CIE - I', type: 'cie' },
  { date: '2025-11-13', title: 'CIE - I', type: 'cie' },
  { date: '2025-11-18', title: 'Distinguished Lecture Series - 5', type: 'academic' },
  { date: '2025-11-22', title: 'PTM', type: 'academic' },
  { date: '2025-11-24', title: 'Alumni Lecture Series - 4', type: 'academic' },
  { date: '2025-12-13', title: 'Thursday time table', type: 'academic' },
  { date: '2025-12-19', title: 'Distinguished Lecture Series - 6', type: 'academic' },
  { date: '2025-12-25', title: 'Christmas', type: 'government' },
  { date: '2025-12-29', title: 'CIE - II', type: 'cie' },
  { date: '2025-12-30', title: 'CIE - II', type: 'cie' },
  { date: '2025-12-31', title: 'CIE - II', type: 'cie' },
  { date: '2026-01-01', title: 'CIE - II', type: 'cie' },
  { date: '2026-01-05', title: 'Lab CIE', type: 'cie' },
  { date: '2026-01-06', title: 'Lab CIE', type: 'cie' },
  { date: '2026-01-07', title: 'Lab CIE', type: 'cie' },
  { date: '2026-01-08', title: 'Lab CIE', type: 'cie' },
  { date: '2026-01-09', title: 'Lab CIE', type: 'cie' },
  { date: '2026-01-10', title: 'Wednesday time table', type: 'academic' },
  { date: '2026-01-13', title: 'Last working day for I and III semester', type: 'academic' },
];

const EVENT_STYLES: Record<EventType, { label: string; className: string; icon: React.ReactNode }> = {
  cie: { label: 'CIE / assessment', className: 'bg-amber-100 text-amber-800 border-amber-200', icon: <GraduationCap size={14} /> },
  government: { label: 'Government holiday', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: <Landmark size={14} /> },
  general: { label: 'General holiday', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: <PartyPopper size={14} /> },
  academic: { label: 'Academic activity', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: <CircleCheck size={14} /> },
};

const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const getEventsForDate = (events: CalendarEvent[], dateKey: string, dayOfWeek: number) => {
  const dateEvents = events.filter((event) => event.date === dateKey);
  if (dayOfWeek === 0 && dateEvents.length === 0) {
    return [{ date: dateKey, title: 'Sunday holiday', type: 'general' as EventType }];
  }
  return dateEvents;
};

interface AcademicCalendarProps {
  editable?: boolean;
  editableTypes?: EventType[];
}

interface EventForm {
  date: string;
  title: string;
  type: EventType;
}

const emptyForm: EventForm = { date: '', title: '', type: 'academic' };

export const AcademicCalendar: React.FC<AcademicCalendarProps> = ({ editable = false, editableTypes = ['cie', 'government', 'general', 'academic'] }) => {
  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const stored = localStorage.getItem('academic-calendar-events');
    if (!stored) return CALENDAR_EVENTS;
    try {
      const parsed = JSON.parse(stored) as CalendarEvent[];
      return Array.isArray(parsed) ? parsed : CALENDAR_EVENTS;
    } catch {
      return CALENDAR_EVENTS;
    }
  });
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const month = MONTHS[monthIndex];
  const eventLookup = useMemo(() => new Map(events.map((event) => [event.date, event])), [events]);
  const firstDay = new Date(month.year, month.month, 1).getDay();
  const daysInMonth = getDaysInMonth(month.year, month.month);
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    if (day < 1 || day > daysInMonth) return null;
    const dateKey = toDateKey(month.year, month.month, day);
    const date = new Date(month.year, month.month, day);
    return { day, dateKey, date, events: getEventsForDate(events, dateKey, date.getDay()) };
  });

  const persistEvents = (nextEvents: CalendarEvent[]) => {
    setEvents(nextEvents);
    localStorage.setItem('academic-calendar-events', JSON.stringify(nextEvents));
  };

  const openAddForm = (date = '') => {
    setEditingEvent(null);
    setForm({ ...emptyForm, date });
    setShowForm(true);
    setFeedback('');
  };

  const openEditForm = (event: CalendarEvent) => {
    setEditingEvent(event.date + event.title);
    setForm(event);
    setShowForm(true);
    setFeedback('');
  };

  const saveEvent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!form.date || !title || !editableTypes.includes(form.type)) {
      setFeedback('Choose a date and enter an event name.');
      return;
    }
    const nextEvent = { ...form, title };
    const nextEvents = editingEvent
      ? events.map((item) => (item.date + item.title === editingEvent ? nextEvent : item))
      : [...events, nextEvent];
    persistEvents(nextEvents);
    setShowForm(false);
    setForm(emptyForm);
    setFeedback('');
  };

  const deleteEvent = (event: CalendarEvent) => {
    if (!editableTypes.includes(event.type)) return;
    if (!window.confirm(`Remove "${event.title}" from the academic calendar?`)) return;
    persistEvents(events.filter((item) => item.date + item.title !== event.date + event.title));
  };

  const canEditEvent = (event: CalendarEvent) =>
    editable && editableTypes.includes(event.type) && !(event.type === 'general' && event.title === 'Sunday holiday');

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-7">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
            <CalendarDays size={17} />
            BE I / III Semester
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Academic Calendar</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Session: September 2025 - January 2026. View CIE windows, government holidays and academic activities by month.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && (
            <button type="button" onClick={() => openAddForm()} className="inline-flex min-h-10 min-w-32 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-200">
              <Plus size={15} />
              Add event
            </button>
          )}
        </div>
      </header>

      {editable && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Edit3 size={18} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-950">Calendar management</p>
              <p className="mt-1 text-xs leading-relaxed text-blue-800">
                {editableTypes.includes('government')
                  ? 'Add new events or use the edit and delete controls on existing events. Updates are saved in this browser and are immediately visible across the portals.'
                  : 'Faculty can manage academic activities and CIE assessments. Government and general holidays remain protected.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {showForm && editable && (
        <form onSubmit={saveEvent} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{editingEvent ? 'Edit calendar event' : 'Add calendar event'}</h2>
              <p className="mt-1 text-xs text-gray-500">Changes apply to the shared calendar view.</p>
            </div>
            <button type="button" aria-label="Close event form" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.6fr_1fr_auto] lg:items-end">
            <label className="text-xs font-medium text-gray-700">
              Date
              <input required type="date" min="2025-09-01" max="2026-01-31" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Event name
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. CIE - III" className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Category
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as EventType })} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {Object.entries(EVENT_STYLES).filter(([type]) => editableTypes.includes(type as EventType) && type !== 'general').map(([type, style]) => <option key={type} value={type}>{style.label}</option>)}
              </select>
            </label>
            <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-100 px-4 text-sm font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-200"><Save size={16} /> Save</button>
          </div>
          {feedback && <p role="alert" className="mt-3 text-xs font-medium text-rose-600">{feedback}</p>}
        </form>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Previous month"
              disabled={monthIndex === 0}
              onClick={() => setMonthIndex((current) => Math.max(0, current - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="min-w-0 text-center text-lg font-semibold text-gray-900">{month.label}</h2>
            <button
              type="button"
              aria-label="Next month"
              disabled={monthIndex === MONTHS.length - 1}
              onClick={() => setMonthIndex((current) => Math.min(MONTHS.length - 1, current + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:justify-end">
            {Object.entries(EVENT_STYLES).map(([type, style]) => (
              <span key={type} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${style.className}`}>
                {style.icon}
                {style.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="border-b border-gray-200 bg-gray-50 px-0.5 py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-gray-500 sm:px-2 sm:text-xs">
              {day}
            </div>
          ))}
          {cells.map((cell, index) => {
            if (!cell) {
              return <div key={`empty-${index}`} className="min-h-14 border-b border-r border-gray-100 bg-gray-50/40 sm:min-h-32" />;
            }
            const primaryEvent = eventLookup.get(cell.dateKey);
            const hasSundayHoliday = cell.date.getDay() === 0 && !primaryEvent;
            return (
              <button type="button" key={cell.dateKey} onClick={() => setSelectedDate(cell.dateKey)} className={`group relative min-h-14 border-b border-r border-gray-100 p-1 text-left sm:min-h-32 sm:p-2 ${selectedDate === cell.dateKey ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : hasSundayHoliday ? 'bg-slate-50/70' : 'bg-white'}`}>
                <div className="mb-2 flex items-center justify-between gap-1">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs ${primaryEvent?.type === 'cie' ? 'bg-amber-500 text-white' : primaryEvent?.type === 'government' ? 'bg-rose-100 text-rose-700' : hasSundayHoliday ? 'text-gray-400' : 'text-gray-700'}`}>
                    {cell.day}
                  </div>
                  {editable && (
                    <span role="button" aria-label={`Add event on ${cell.dateKey}`} onClick={(event) => { event.stopPropagation(); openAddForm(cell.dateKey); }} className="hidden h-7 w-7 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-200 hover:bg-blue-100 sm:flex" title="Add event on this date">
                      <Plus size={14} />
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {cell.events.map((event) => {
                    const style = EVENT_STYLES[event.type];
                    const isSundayHoliday = event.type === 'general' && event.title === 'Sunday holiday';
                    return (
                      <span key={`${event.date}-${event.title}`} title={event.title} className={`block h-1.5 rounded-full sm:h-auto sm:rounded-lg sm:border sm:px-1.5 sm:py-1 sm:text-[11px] sm:font-medium sm:leading-tight ${style.className}`}>
                        <span className="hidden sm:line-clamp-3 sm:block">{event.title}</span>
                        {canEditEvent(event) && !isSundayHoliday && (
                          <span className="mt-1 hidden gap-1 border-t border-current/10 pt-1 sm:flex">
                            <span role="button" aria-label={`Edit ${event.title}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); openEditForm(event); }} className="rounded p-1 hover:bg-white/70"><Edit3 size={11} /></span>
                            <span role="button" aria-label={`Delete ${event.title}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); deleteEvent(event); }} className="rounded p-1 hover:bg-white/70"><Trash2 size={11} /></span>
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>

        {selectedDate && (() => {
          const selectedCell = cells.find((cell) => cell?.dateKey === selectedDate);
          if (!selectedCell) return null;
          return (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:hidden">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-blue-900">{selectedCell.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                  <div className="mt-2 space-y-1.5">
                    {selectedCell.events.map((event) => {
                      const isSundayHoliday = event.type === 'general' && event.title === 'Sunday holiday';
                      return (
                        <div key={`${event.date}-${event.title}`} className="rounded-lg border border-blue-100 bg-white/70 px-2.5 py-2">
                          <p className="break-words text-xs leading-relaxed text-blue-800">{event.title}</p>
                          {canEditEvent(event) && !isSundayHoliday && (
                            <span className="mt-2 flex items-center justify-end gap-1 border-t border-blue-100 pt-2">
                              <button type="button" aria-label={`Edit ${event.title}`} onClick={() => openEditForm(event)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-white text-blue-700 hover:bg-blue-50"><Edit3 size={14} /></button>
                              <button type="button" aria-label={`Delete ${event.title}`} onClick={() => deleteEvent(event)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {selectedCell.events.length === 0 && <p className="text-xs text-blue-700">No events scheduled.</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {editable && <button type="button" onClick={() => openAddForm(selectedDate)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50" aria-label="Add event"><Plus size={14} /> Add</button>}
                  <button type="button" onClick={() => setSelectedDate(null)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50" aria-label="Close selected date"><X size={16} /></button>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'CIE windows', value: String(new Set(events.filter((event) => event.type === 'cie').map((event) => event.title)).size), detail: 'Assessment and lab evaluation days', icon: <GraduationCap size={18} />, color: 'text-amber-700 bg-amber-50' },
          { title: 'Government holidays', value: String(events.filter((event) => event.type === 'government').length), detail: 'Declared holidays in this session', icon: <Landmark size={18} />, color: 'text-rose-700 bg-rose-50' },
          { title: 'Working period', value: 'Sep - Jan', detail: 'Last working day: 13 January 2026', icon: <CalendarDays size={18} />, color: 'text-blue-700 bg-blue-50' },
        ].map((summary) => (
          <div key={summary.title} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${summary.color}`}>{summary.icon}</div>
            <p className="text-xs font-medium text-gray-500">{summary.title}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{summary.value}</p>
            <p className="mt-1 text-xs text-gray-500">{summary.detail}</p>
          </div>
        ))}
      </section>
    </div>
  );
};
