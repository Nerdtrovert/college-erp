import React, { useState, useEffect } from 'react';
import API, { getAnyFacultyTimetable, getCurrentFacultyStatus } from '../../services/api';
import { CalendarDays, CalendarRange, Users, ClipboardList, LayoutDashboard, Clock } from 'lucide-react';
import { CALENDAR_EVENTS, type CalendarEvent } from '../AcademicCalendar';
import { getTimeBasedGreeting } from '../../utils/greeting';

interface Props {
  user: any;
  onNavigate: (id: string) => void;
}

export const SupervisorHome: React.FC<Props> = ({ user, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  // New state for dashboard cards
  const [myTodaySchedule, setMyTodaySchedule] = useState<any>(null);
  const [facultyStatus, setFacultyStatus] = useState<any>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    // Fetch supervisor's today's schedule
    const fetchMyTodaySchedule = async () => {
      setScheduleLoading(true);
      try {
        // Get today's schedule for the logged-in supervisor
        // We'll use the getAnyFacultyTimetable endpoint with the supervisor's own ID
        // and get today's date to filter for current day
        const today = new Date();
        const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

        // For now, we'll get the active semester timetable and filter for today
        // A more sophisticated approach would be to create a specific endpoint for today's schedule
        const res = await API.get('/timetable/teacher'); // Gets logged-in teacher's timetable for active semester
        if (res && res.length > 0) {
          // Filter for today's schedule
          const todaySchedule = res.filter(daySlot =>
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
  }, [user.id]); // Re-fetch when user ID changes

  // Fetch faculty status for current time
  useEffect(() => {
    const fetchFacultyStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await getCurrentFacultyStatus();
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

  return (
    <div className="space-y-5 sm:space-y-7">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{getTimeBasedGreeting()}, {user.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{user.role === 'dean' ? 'Dean Portal' : 'Principal Portal'} &middot; {user.department}</p>
      </div>

      {/* New Dashboard Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {/* My Today's Schedule Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-indigo-600" />
              My Today's Schedule
            </h2>
            {scheduleLoading ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 animate-spin">
                <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
              </div>
            ) : (
              <span className="text-xs font-semibold text-gray-600">
                {myTodaySchedule === null ? 'No data' : 'Updated just now'}
              </span>
            )}
          </div>

          {scheduleLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="flex space-x-4">
                <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : myTodaySchedule === null ? (
            <p className="text-center text-gray-500">Unable to load schedule</p>
          ) : myTodaySchedule.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No classes scheduled for today</p>
              <p className="text-xs text-gray-400 mt-2"> Enjoy your free day! </p>
            </div>
          ) : (
            <>
              {myTodaySchedule.map((daySlot, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <CalendarDays size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{daySlot.day}</h3>
                      <p className="text-xs text-gray-500">{daySlot.slots
                        .filter(slot => slot !== null)
                        .map(slot => slot?.subject || 'Free')
                        .join(' • ') || 'No classes'}</p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {daySlot.slots.map((slot, slotIndex) => {
                      const periodLabel = ['8:30–9:30', '9:30–10:30', 'Break', '11:00–12:00', '12:00–1:00', 'Lunch', '1:45–2:45', '2:45–3:45'][slotIndex];
                      const isBreakOrLunch = slotIndex === 2 || slotIndex === 5;

                      if (!slot) {
                        return (
                          <div key={slotIndex} className={`text-center p-2 ${isBreakOrLunch ? 'bg-gray-50' : 'bg-gray-100'} rounded`}>
                            <span className="block text-xs font-semibold text-gray-400">{periodLabel}</span>
                            <span className="block text-xs text-gray-500">{isBreakOrLunch ? (slotIndex === 2 ? 'Break' : 'Lunch') : 'Free'}</span>
                          </div>
                        );
                      }

                      return (
                        <div key={slotIndex} className={`p-2 rounded-lg border ${slot.subject ? 'bg-blue-50 text-blue-700' : 'bg-gray-50'}`}>
                          <span className="block text-xs font-semibold text-gray-700">{periodLabel}</span>
                          <span className="block text-xs text-gray-600">{slot.subject}</span>
                          {slot.room && <span className="block text-xs text-gray-500">{slot.room}</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              ))}
              {/* Semester Info */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500">
                  Active Semester: {myTodaySchedule[0]?.slots[0]?.semester?.name || 'Checking...'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Faculty Status Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              Faculty Status
            </h2>
            {statusLoading ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 animate-spin">
                <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
              }
            ) : (
              <span className="text-xs font-semibold text-gray-600">
                {facultyStatus === null ? 'No data' : 'Live updates'}
              </span>
            )}
          </div>

          {statusLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="flex space-x-4">
                <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : facultyStatus === null ? (
            <p className="text-center text-gray-500">Unable to load faculty status</p>
          ) : facultyStatus.facultyStatus.length === 0 ? (
            <p className="text-center text-gray-500">No faculty data available</p>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <span className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <CalendarDays size={12} className="text-indigo-600" />
                  </span>
                  <span>Today: {facultyStatus.currentDay}, {facultyStatus.currentTime}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mt-1">
                  <span className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <CalendarDays size={12} className="text-indigo-600" />
                  </span>
                  <span>Period: {facultyStatus.currentPeriodLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mt-1">
                  <span className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <CalendarDays size={12} className="text-indigo-600" />
                  </span>
                  <span>Semester: {facultyStatus.semester?.name || 'Active'}</span>
                </div>
              </div>

              <div className="space-y-2">
                {facultyStatus.facultyStatus.map((faculty, index) => (
                  <div key={faculty.facultyId} className={`p-3 rounded-lg border ${faculty.status === 'free' ? 'border-dashed border-gray-300' : 'border-solid border-gray-200'} mb-2 last:mb-0`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                        {faculty.status === 'free' ? (
                          <span className="w-4 h-4 bg-gray-400 rounded-full" />
                        ) : (
                          <CalendarDays size={14} className="text-indigo-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">{faculty.facultyName}</h3>
                          <span className="text-xs font-medium text-gray-500">{faculty.department}</span>
                        </div>
                        {faculty.status === 'free' ? (
                          <p className="text-xs text-gray-500">Free period</p>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-800">{faculty.subjectName}</p>
                            <p className="text-xs text-gray-600">
                              {faculty.room} • {faculty.classGroup}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reports Generator (replacing Quick Actions) */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-gray-400" />
            Reports Generator
          </h2>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Reports generator functionality coming soon...</p>
          <p className="text-xs text-gray-400 mt-2">This feature will allow supervisors to generate various reports.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-600" />
            Upcoming Events
          </h2>
          <button onClick={() => onNavigate('academic-calendar')} className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
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
  );
};
