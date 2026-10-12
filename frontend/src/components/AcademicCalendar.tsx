import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Upload,
} from 'lucide-react';

import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  EVENT_STYLES,
  getEventsForDate,
  getDaysInMonth,
  isDuplicateEvent,
  mergeEvents,
  sortEventsByDate,
  toDateKey,
} from '../utils/calendarUtils';
import { parsePDFForEvents } from '../utils/pdfParser';
import { DropdownSelect } from './ui/DropdownSelect';
import API from '../services/api';
import {
  ACADEMIC_CALENDAR_STORAGE_KEY,
  ACADEMIC_CALENDAR_VERSION_KEY,
  CALENDAR_EVENTS,
  migrateAcademicCalendarEvents,
  type CalendarEvent,
  type EventType,
} from '../data/academicCalendar';

export type { CalendarEvent, EventType } from '../data/academicCalendar';
export { CALENDAR_EVENTS } from '../data/academicCalendar';

interface AcademicCalendarProps {
  editable?: boolean;
  editableTypes?: EventType[];
}

interface EventForm {
  date: string;
  endDate: string;
  title: string;
  type: EventType;
}

const emptyForm: EventForm = { date: '', endDate: '', title: '', type: 'academic' };

export const AcademicCalendar: React.FC<AcademicCalendarProps> = ({
  editable = false,
  editableTypes = ['cie', 'government', 'general', 'academic']
}) => {
  const [activeSemester, setActiveSemester] = useState<any>(null);
  const [today, setToday] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>(ACADEMIC_CALENDAR_STORAGE_KEY, CALENDAR_EVENTS);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const fetchSemester = async () => {
      try {
        const response = await API.get('/semesters');
        if (response.data && Array.isArray(response.data)) {
          const active = response.data.find((s: any) => s.status === 'ACTIVE');
          if (active) setActiveSemester(active);
        }
      } catch (error) {
        console.error('Failed to fetch active semester:', error);
      }
    };
    fetchSemester();
  }, []);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeoutId = window.setTimeout(
      () => setToday(new Date()),
      nextMidnight.getTime() - now.getTime(),
    );

    return () => window.clearTimeout(timeoutId);
  }, [today]);
  useEffect(() => {
    if (!showForm) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowForm(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showForm]);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(ACADEMIC_CALENDAR_VERSION_KEY) === 'complete') return;

      const restoredEvents = migrateAcademicCalendarEvents(events);
      if (JSON.stringify(restoredEvents) !== JSON.stringify(events)) {
        setEvents(sortEventsByDate(restoredEvents));
      }
      window.localStorage.setItem(ACADEMIC_CALENDAR_VERSION_KEY, 'complete');
    } catch (error) {
      console.error('Unable to restore the default academic calendar events:', error);
      setImportFeedback({
        message: 'Could not restore the default academic calendar events. Check browser storage permissions and reload.',
        type: 'error',
      });
    }
  }, [events, setEvents]);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(year, month);
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    if (day < 1 || day > daysInMonth) return null;
    const dateKey = toDateKey(year, month, day);
    const date = new Date(year, month, day);
    return { day, dateKey, date, events: getEventsForDate(events, dateKey, date.getDay()) };
  });

  const persistEvents = (nextEvents: CalendarEvent[]) => {
    const sortedEvents = sortEventsByDate(nextEvents);
    setEvents(sortedEvents);
    // useLocalStorage handles the localStorage persistence automatically
  };

  const openAddForm = (date = '') => {
    setEditingEvent(null);
    setForm({ ...emptyForm, date });
    setShowForm(true);
    setFeedback('');
    setImportFeedback(null);
  };

  const openEditForm = (event: CalendarEvent) => {
    setEditingEvent(event.date + event.title);
    setForm({ ...event, endDate: event.endDate ?? '' });
    setShowForm(true);
    setFeedback('');
    setImportFeedback(null);
  };

  const saveEvent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!form.date || !title || !editableTypes.includes(form.type)) {
      setFeedback('Choose a date and enter an event name.');
      return;
    }
    if (form.endDate && form.endDate < form.date) {
      setFeedback('The end date must be on or after the start date.');
      return;
    }
    const { endDate, ...eventForm } = form;
    const nextEvent: CalendarEvent = { ...eventForm, title, ...(endDate ? { endDate } : {}) };
    const nextEvents = editingEvent
      ? events.map((item) => (item.date + item.title === editingEvent ? nextEvent : item))
      : [...events, nextEvent];
    persistEvents(nextEvents);
    setShowForm(false);
    setForm(emptyForm);
    setFeedback('');
    setImportFeedback(null);
  };

  const deleteEvent = (event: CalendarEvent) => {
    if (!editableTypes.includes(event.type)) return;
    if (!window.confirm(`Remove "${event.title}" from the academic calendar?`)) return;
    persistEvents(events.filter((item) => item.date + item.title !== event.date + event.title));
    setImportFeedback(null);
  };

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setImportFeedback({ message: 'Please select a PDF file', type: 'error' });
      return;
    }

    setImporting(true);
    setImportFeedback({ message: 'Parsing PDF...', type: 'info' });

    try {
      const parsedEvents = await parsePDFForEvents(file);

      if (parsedEvents.length === 0) {
        setImportFeedback({ message: 'No events found in the PDF', type: 'info' });
        return;
      }

      // Filter out duplicates and merge with existing events
      const newEvents = parsedEvents.filter(event => !isDuplicateEvent(events, event));
      const mergedEvents = mergeEvents(events, newEvents);

      if (newEvents.length === 0) {
        setImportFeedback({ message: 'All events from PDF already exist in the calendar', type: 'info' });
        return;
      }

      persistEvents(mergedEvents);
      setImportFeedback({
        message: `Successfully imported ${newEvents.length} events from PDF`,
        type: 'success'
      });
    } catch (error) {
      setImportFeedback({
        message: `Failed to import PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const canEditEvent = (event: CalendarEvent) =>
    editable && editableTypes.includes(event.type) && !(event.type === 'general' && event.title === 'Sunday holiday');

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-7">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
            <CalendarDays size={17} />
            {activeSemester?.name || 'Academic Semester'}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Academic Calendar</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {activeSemester ? (
              `Session: ${new Date(activeSemester.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - ${new Date(activeSemester.endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. View CIE periods, holidays and academic activities by month.`
            ) : (
              'Loading semester data...'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && (
            <>
              <button type="button" onClick={() => openAddForm()} className="inline-flex min-h-10 min-w-32 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-200">
                <Plus size={15} />
                Add event
              </button>

              <label className="inline-flex items-center gap-2">
                <button type="button"
                  onClick={() => document.getElementById('pdf-import-input')?.click()}
                  disabled={importing}
                  className={`inline-flex min-h-10 min-w-32 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-200 ${importing ? 'opacity-70' : ''}`}
                >
                  <Upload size={15} />
                  Import PDF
                </button>
                <input
                  type="file"
                  id="pdf-import-input"
                  accept=".pdf"
                  onChange={handlePDFImport}
                  className="hidden"
                />
              </label>
            </>
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

      {showForm && editable && createPortal(
        <div
          className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowForm(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-form-title"
            onSubmit={saveEvent}
            className="animate-slide-up my-auto w-full max-w-xl rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id="calendar-event-form-title" className="text-lg font-semibold text-gray-900">{editingEvent ? 'Edit calendar event' : 'Add calendar event'}</h2>
                <p className="mt-1 text-sm text-gray-500">Changes apply to the shared calendar view.</p>
              </div>
              <button type="button" aria-label="Close event form" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Start date
                <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-medium text-gray-700">
                End date (optional)
                <input type="date" min={form.date || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Event name
                <input autoFocus required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. CIE - III" className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Category
                <DropdownSelect value={form.type} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, type: event.target.value as EventType })} className="mt-1.5 h-11 rounded-xl px-3">
                  {Object.entries(EVENT_STYLES).filter(([type]) => editableTypes.includes(type as EventType) && type !== 'general').map(([type, style]) => <option key={type} value={type}>{style.label}</option>)}
                </DropdownSelect>
              </label>
            </div>
            {feedback && <p role="alert" className="mt-3 text-sm font-medium text-rose-600">{feedback}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">Cancel</button>
              <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-100 px-5 text-sm font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-200"><Save size={16} /> Save</button>
            </div>
          </form>
        </div>,
        document.body,
      )}

      {importFeedback && (
        <div className={`mt-3 p-3 rounded-lg
          ${importFeedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          importFeedback.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'}`}
          role="alert"
        >
          {importFeedback.message}
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="min-w-0 text-center text-lg font-semibold text-gray-900">{visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:justify-end">
            {Object.entries(EVENT_STYLES).map(([type, style]) => (
              <span key={type} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${style.className}`}>
                {(type === 'cie' && <GraduationCap size={14} />) ||
                 (type === 'government' && <Landmark size={14} />) ||
                 (type === 'general' && <PartyPopper size={14} />) ||
                 (type === 'academic' && <CircleCheck size={14} />)}
                {style.label}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="grid grid-cols-7">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="border-b border-r border-gray-200 bg-gray-50 px-0.5 py-2 text-center text-[9px] font-semibold uppercase text-gray-500 last:border-r-0 sm:px-2 sm:text-xs sm:tracking-wide">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[5.5rem] sm:auto-rows-[9rem] [&>*:nth-child(7n)]:border-r-0">
            {cells.map((cell, index) => {
              if (!cell) {
                return <div key={`empty-${index}`} className="border-b border-r border-gray-100 bg-gray-50/40 last:border-r-0" />;
              }
              const primaryEvent = cell.events[0];
              const hasSundayHoliday = cell.date.getDay() === 0 && !cell.events.some((event) => event.title === 'Sunday holiday');
              const isToday = cell.date.getFullYear() === today.getFullYear() && cell.date.getMonth() === today.getMonth() && cell.day === today.getDate();
              return (
                <div key={cell.dateKey} className={`group relative flex h-full min-h-0 flex-col overflow-hidden border-b border-r border-gray-100 p-1.5 text-left last:border-r-0 sm:p-2 ${selectedDate === cell.dateKey ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : hasSundayHoliday ? 'bg-slate-50/70' : 'bg-white'}`}>
                  <button type="button" aria-current={isToday ? 'date' : undefined} aria-label={`${isToday ? 'Today, ' : ''}${cell.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${cell.events.length ? `, ${cell.events.map((event) => event.title).join(', ')}` : ''}`} onClick={() => setSelectedDate(cell.dateKey)} className="absolute inset-0 z-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-[-2px]" />
                  <div className="pointer-events-none relative z-10 mb-1 flex min-h-7 shrink-0 items-center gap-1 pr-8">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs ${isToday ? 'bg-blue-600 text-white ring-2 ring-blue-100' : primaryEvent?.type === 'cie' ? 'bg-amber-500 text-white' : primaryEvent?.type === 'government' ? 'bg-rose-100 text-rose-700' : hasSundayHoliday ? 'text-gray-400' : 'text-gray-700'}`}>
                      {cell.day}
                    </div>
                  </div>
                  {editable && (
                    <button type="button" aria-label={`Add event on ${cell.dateKey}`} onClick={() => openAddForm(cell.dateKey)} className="absolute right-1.5 top-1.5 z-20 hidden h-7 w-7 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-200 hover:bg-blue-100 sm:flex" title="Add event on this date">
                      <Plus size={14} />
                    </button>
                  )}
                  <div className="pointer-events-none relative z-10 mt-auto hidden min-h-0 space-y-0.5 sm:block">
                    {cell.events.slice(0, 3).map((event) => {
                      const style = EVENT_STYLES[event.type];
                      const isSundayHoliday = event.type === 'general' && event.title === 'Sunday holiday';
                      return (
                        <div key={`${event.date}-${event.title}`} title={event.title} className={`pointer-events-none flex h-6 min-w-0 items-center gap-1 rounded px-1.5 text-[10px] font-medium leading-none sm:rounded-md sm:border sm:text-[11px] ${style.className}`}>
                          <span className="min-w-0 flex-1 truncate">{event.title}</span>
                          {canEditEvent(event) && !isSundayHoliday && (
                            <div className="pointer-events-auto flex shrink-0 items-center">
                              <button type="button" aria-label={`Edit ${event.title}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); openEditForm(event); }} className="rounded p-0.5 hover:bg-white/70"><Edit3 size={9} /></button>
                              <button type="button" aria-label={`Delete ${event.title}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); deleteEvent(event); }} className="rounded p-0.5 hover:bg-white/70"><Trash2 size={9} /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {cell.events.length > 3 && (
                      <span className="block truncate px-1 text-[9px] leading-4 text-gray-500" title={`${cell.events.length - 3} more events`}>
                        +{cell.events.length - 3} more
                      </span>
                    )}
                  </div>
                  {cell.events.length > 0 && (
                    <div aria-hidden="true" className="flex min-h-2 items-center gap-1 px-0.5 sm:hidden">
                      {cell.events.slice(0, 3).map((event) => (
                        <span key={`${event.date}-${event.title}`} className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          event.type === 'cie' ? 'bg-amber-500' :
                          event.type === 'government' ? 'bg-rose-500' :
                          event.type === 'academic' ? 'bg-blue-500' : 'bg-slate-400'
                        }`} />
                      ))}
                      {cell.events.length > 3 && <span className="text-[9px] font-semibold leading-none text-gray-500">+{cell.events.length - 3}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selectedDate && (() => {
          const selectedCell = cells.find((cell) => cell?.dateKey === selectedDate);
          if (!selectedCell) return null;
          return (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:hidden">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 text-sm font-semibold text-blue-900">{selectedCell.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {editable && <button type="button" onClick={() => openAddForm(selectedDate)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50" aria-label="Add event"><Plus size={14} /> Add</button>}
                  <button type="button" onClick={() => setSelectedDate(null)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50" aria-label="Close selected date"><X size={16} /></button>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {selectedCell.events.map((event) => {
                  const isSundayHoliday = event.type === 'general' && event.title === 'Sunday holiday';
                  return (
                    <div key={`${event.date}-${event.title}`} className="flex min-w-0 items-start gap-3 rounded-lg border border-blue-100 bg-white/80 px-3 py-2.5">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        event.type === 'cie' ? 'bg-amber-500' :
                        event.type === 'government' ? 'bg-rose-500' :
                        event.type === 'academic' ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm leading-snug text-gray-900">{event.title}</p>
                        <p className="mt-1 text-xs capitalize text-gray-500">{EVENT_STYLES[event.type].label}</p>
                      </div>
                      {canEditEvent(event) && !isSundayHoliday && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" aria-label={`Edit ${event.title}`} onClick={() => openEditForm(event)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-white text-blue-700 hover:bg-blue-50"><Edit3 size={15} /></button>
                          <button type="button" aria-label={`Delete ${event.title}`} onClick={() => deleteEvent(event)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {selectedCell.events.length === 0 && <p className="rounded-lg bg-white/70 px-3 py-3 text-sm text-blue-700">No events scheduled.</p>}
              </div>
            </div>
          );
        })()}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'CIE periods', value: String(new Set(events.filter((event) => event.type === 'cie').map((event) => event.title)).size), detail: 'Scheduled examination periods', icon: <GraduationCap size={18} />, color: 'text-amber-700 bg-amber-50' },
          { title: 'Government holidays', value: String(events.filter((event) => event.type === 'government').length), detail: 'Declared holidays in this session', icon: <Landmark size={18} />, color: 'text-rose-700 bg-rose-50' },
          {
            title: 'Working days',
            value: '91',
            detail: `Per calendar · Last working day: ${activeSemester ? new Date(activeSemester.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Loading...'}`,
            icon: <CalendarDays size={18} />,
            color: 'text-blue-700 bg-blue-50'
          },
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
