import React, { useState, useEffect } from 'react';
import API, { getAnyFacultyTimetable, getCurrentFacultyStatus } from '../../services/api';
import { CalendarDays, Users, ClipboardList, Clock, BarChart3 } from 'lucide-react';
import { CALENDAR_EVENTS, type CalendarEvent } from '../AcademicCalendar';
import { getTimeBasedGreeting } from '../../utils/greeting';
import type { User } from '../../types';

interface Props {
  user: User;
  onNavigate: (id: string) => void;
}

interface ScheduleSlot {
  subject?: string;
  room?: string;
  semester?: { name?: string } | null;
}

interface ScheduleDay {
  day: string;
  slots: (ScheduleSlot | null)[];
}

interface FacultyStatusEntry {
  facultyId: string;
  facultyName: string;
  department: string;
  status?: string;
  periodIndex: number;
  subjectName?: string | null;
  room?: string | null;
  classGroup?: string | null;
}

interface FacultyStatusResponse {
  currentDay: string;
  currentTime: string;
  currentPeriodIndex: number;
  currentPeriodLabel: string;
  semester?: { name?: string } | null;
  facultyStatus: FacultyStatusEntry[];
}

export const SupervisorHome: React.FC<Props> = ({ user, onNavigate }) => {
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(CALENDAR_EVENTS);
  const [myTodaySchedule, setMyTodaySchedule] = useState<ScheduleDay[] | null>(null);
  const [facultyStatus, setFacultyStatus] = useState<FacultyStatusResponse | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    // Fetch today's schedule
    const fetchMyTodaySchedule = async () => {
      setScheduleLoading(true);
      try {
        // Get today's schedule for the logged-in user
        let schedule: ScheduleDay[];
        if (user.role === 'teacher') {
          // For teachers, use the teacher endpoint
          const response = await API.get('/timetable/teacher');
          schedule = response.data as ScheduleDay[];
        } else {
          // For supervisors (dean, principal, hod), use the faculty endpoint with their ID
          schedule = await getAnyFacultyTimetable(user.id);
        }
        if (!Array.isArray(schedule)) {
          throw new Error('Unexpected timetable response');
        }

        if (schedule && schedule.length > 0) {
          // Filter for today's schedule
          const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const todaySchedule = schedule.filter((daySlot) =>
            daySlot.day.toLowerCase() === dayOfWeek.toLowerCase()
          );
          setMyTodaySchedule(todaySchedule);
        } else {
          setMyTodaySchedule([]);
        }
      } catch (err) {
        console.error('Failed to fetch today\'s schedule', err);
        setMyTodaySchedule(null);
      } finally {
        setScheduleLoading(false);
      }
    };
    fetchMyTodaySchedule();
  }, [user.id, user.role]); // Re-fetch when user identity or role changes

  // Fetch faculty status for current time
  useEffect(() => {
    const fetchFacultyStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await getCurrentFacultyStatus();
        if (!res || !Array.isArray(res.facultyStatus)) {
          throw new Error('Unexpected faculty status response');
        }
        setFacultyStatus(res);
      } catch (err) {
        console.error('Failed to fetch faculty status', err);
        setFacultyStatus(null);
      } finally {
        setStatusLoading(false);
      }
    };
    fetchFacultyStatus();

    // Set up interval to update faculty status every minute
    const interval = setInterval(fetchFacultyStatus, 60 * 1000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('academic-calendar-events');
    let events = CALENDAR_EVENTS;

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CalendarEvent[];
        if (Array.isArray(parsed)) events = parsed;
      } catch {
        events = CALENDAR_EVENTS;
      }
    }
    setCalendarEvents(events);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = events
      .filter((event) => {
        const eventDate = new Date(`${event.date}T00:00:00`);
        return !Number.isNaN(eventDate.getTime()) && eventDate >= today;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);

    setUpcomingEvents(upcoming);
  }, []);

  const formatEventDate = (date: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(`${date}T00:00:00`),
    );
  const currentlyTeaching = facultyStatus?.facultyStatus.filter((faculty) => faculty.status !== 'free') ?? [];
  const currentlyFree = facultyStatus?.facultyStatus.filter((faculty) => faculty.status === 'free') ?? [];
  const today = new Date();
  const todayDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isWorkingDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(facultyStatus?.currentDay ?? '');
  const isHoliday = calendarEvents.some(
    (event) => event.date === todayDateKey && (event.type === 'government' || /holiday/i.test(event.title)),
  );

  return (
    <div className="space-y-5 sm:space-y-7">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{getTimeBasedGreeting()}, {user.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{user.role === 'dean' ? 'Dean Portal' : user.role === 'hod' ? 'HOD Portal' : 'Principal Portal'} &middot; {user.department}</p>
      </div>

      {/* New Dashboard Cards */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* My Today's Schedule Card */}
        <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <Clock size={18} className="text-indigo-600" />
              My Today's Schedule
            </h2>
            {scheduleLoading ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" aria-label="Loading schedule">
              </div>
            ) : (
              <span className="shrink-0 text-xs font-medium text-gray-500">
                {myTodaySchedule === null ? 'No data' : 'Updated just now'}
              </span>
            )}
          </div>

          {scheduleLoading ? (
            <div className="flex h-32 items-center justify-center gap-2" role="status" aria-label="Loading schedule">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gray-300"></div>
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gray-300"></div>
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gray-300"></div>
            </div>
          ) : myTodaySchedule === null ? (
            <p className="rounded-xl bg-amber-50 px-4 py-5 text-center text-sm text-amber-800">Unable to load schedule. Please try again later.</p>
          ) : myTodaySchedule.length === 0 ? (
            <div className="rounded-xl bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-700">No classes scheduled for today</p>
              <p className="mt-1 text-xs text-gray-500">Enjoy your free day.</p>
            </div>
          ) : (
            <>
              {myTodaySchedule.map((daySlot, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                      <CalendarDays size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{daySlot.day}</h3>
                      <p className="text-xs text-gray-500">Today's periods</p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {daySlot.slots.map((slot, slotIndex) => {
                      const periodLabel = ['8:30–9:30', '9:30–10:30', 'Break', '11:00–12:00', '12:00–1:00', 'Lunch', '1:45–2:45', '2:45–3:45'][slotIndex];
                      const isBreakOrLunch = slotIndex === 2 || slotIndex === 5;

                      if (!slot) {
                        return (
                          <div key={slotIndex} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2.5 ${isBreakOrLunch ? 'border-gray-100 bg-gray-50' : 'border-gray-100 bg-white'}`}>
                            <span className={`text-xs font-medium ${isBreakOrLunch ? 'text-gray-500' : 'text-gray-600'}`}>{periodLabel}</span>
                            <span className={`text-xs ${isBreakOrLunch ? 'text-gray-500' : 'text-gray-400'}`}>{isBreakOrLunch ? (slotIndex === 2 ? 'Break' : 'Lunch') : 'Free'}</span>
                          </div>
                        );
                      }

                      return (
                        <div key={slotIndex} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5">
                          <div className="min-w-0">
                            <span className="block break-words text-xs font-semibold text-gray-800">{slot.subject}</span>
                            {slot.room && <span className="mt-0.5 block text-xs text-gray-500">{slot.room}</span>}
                          </div>
                          <span className="shrink-0 text-xs font-medium tabular-nums text-blue-700">{periodLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Semester Info */}
              <div className="mt-4 border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-500">
                  Active semester: <span className="font-medium text-gray-700">{myTodaySchedule
                    .flatMap((daySlot) => daySlot.slots)
                    .find((slot) => slot?.semester?.name)?.semester?.name || 'Unavailable'}</span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Current Classes Card */}
        <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <Users size={18} className="text-blue-600" />
              Currently Teaching
            </h2>
            {statusLoading ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" aria-label="Loading faculty status">
              </div>
            ) : (
              facultyStatus && facultyStatus.currentPeriodIndex >= 0 && (
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {currentlyTeaching.length} {currentlyTeaching.length === 1 ? 'teacher' : 'teachers'}
                </span>
              )
            )}
          </div>

          {statusLoading ? (
            <div className="flex h-32 items-center justify-center gap-2" role="status" aria-label="Loading faculty status">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gray-300"></div>
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gray-300"></div>
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gray-300"></div>
            </div>
          ) : facultyStatus === null ? (
            <p className="rounded-xl bg-amber-50 px-4 py-5 text-center text-sm text-amber-800">Unable to load faculty status. Please try again later.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-indigo-600" />
                  {facultyStatus.currentDay}, {facultyStatus.currentTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-600" />
                  {facultyStatus.currentPeriodLabel}
                </span>
              </div>

              {facultyStatus.currentPeriodIndex < 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-gray-700">
                    {facultyStatus.currentPeriodLabel === 'After college hours'
                      ? 'Classes have ended for today'
                      : facultyStatus.currentPeriodLabel === 'Break' || facultyStatus.currentPeriodLabel === 'Lunch break'
                        ? `${facultyStatus.currentPeriodLabel} — no classes in session`
                        : facultyStatus.currentPeriodLabel}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Current classes will appear here during teaching periods.</p>
                </div>
              ) : currentlyTeaching.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-gray-700">No classes in session right now</p>
                  <p className="mt-1 text-xs text-gray-500">See available teachers below.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentlyTeaching.map((faculty) => (
                    <div key={faculty.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                        <CalendarDays size={15} className="text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-semibold leading-5 text-gray-900">{faculty.facultyName}</h3>
                        <p className="mt-0.5 break-words text-xs leading-4 text-gray-500">{faculty.department}</p>
                        <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="break-words text-xs font-medium text-gray-800">{faculty.subjectName}</p>
                          <p className="break-words text-xs text-gray-500">{faculty.room} · {faculty.classGroup}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!statusLoading && facultyStatus && facultyStatus.currentPeriodIndex >= 0 && isWorkingDay && !isHoliday && (
        <section className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="available-faculty-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="available-faculty-heading" className="flex items-center gap-2 font-semibold text-gray-900">
                <Users size={18} className="text-emerald-600" />
                Available This Period
              </h2>
              <p className="mt-1 text-xs text-gray-500">Teachers not currently assigned to a class.</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {currentlyFree.length} available
            </span>
          </div>
          {currentlyFree.length === 0 ? (
            <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">All teachers are teaching this period.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {currentlyFree.map((faculty) => (
                <div key={faculty.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium leading-5 text-gray-900">{faculty.facultyName}</p>
                    <p className="mt-0.5 break-words text-xs leading-4 text-gray-500">{faculty.department}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">Free</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Reports Generator */}
        <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <ClipboardList size={18} className="text-gray-400" />
              Reports Generator
            </h2>
          </div>
          <div className="text-center py-6">
            <p className="text-gray-600 font-medium mb-3">The advanced reporting module is fully connected and ready to use!</p>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">Generate detailed insights into student attendance, CIE marks, class progress, and departmental performance.</p>
            <button
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
            >
              <BarChart3 size={16} />
              Launch Reports Dashboard
            </button>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <CalendarDays size={18} className="text-blue-600" />
              Upcoming Events
            </h2>
            <button onClick={() => onNavigate('academic-calendar')} className="rounded-md text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              View calendar
            </button>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <div key={`${event.date}-${event.title}`} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <div className="min-w-[4.75rem] text-xs font-semibold text-blue-700">{formatEventDate(event.date)}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                  <p className="mt-0.5 text-xs capitalize text-gray-500">{event.type} event</p>
                </div>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-500">
                No upcoming events scheduled.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
