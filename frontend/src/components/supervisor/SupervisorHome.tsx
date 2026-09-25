import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { CalendarDays, CalendarRange, Users, ClipboardList, LayoutDashboard } from 'lucide-react';
import { CALENDAR_EVENTS, type CalendarEvent } from '../AcademicCalendar';
import { getTimeBasedGreeting } from '../../utils/greeting';

interface Props {
  user: any;
  onNavigate: (id: string) => void;
}

export const SupervisorHome: React.FC<Props> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({ students: 0, faculty: 0, semesters: 'Active' });
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/vip/api-stats');
        setStats({
          students: res.data.userStats?.totalStudents || 0,
          faculty: res.data.userStats?.totalFaculty || 0,
          marks: res.data.userStats?.totalMarks || 0
        } as any);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
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

  const actions = [
    { id: 'semesters', title: 'Semester Management', description: 'Create, copy, and manage academic semesters across the institution.', icon: <CalendarRange size={20} />, color: 'text-blue-600 bg-blue-50' },
    { id: 'faculty', title: 'Faculty Management', description: 'Add new faculty members and assign supervisory access roles.', icon: <Users size={20} />, color: 'text-purple-600 bg-purple-50' },
    { id: 'timetable', title: 'Timetable Management', description: 'Review and manage class schedules and faculty timetables.', icon: <ClipboardList size={20} />, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="space-y-5 sm:space-y-7">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{getTimeBasedGreeting()}, {user.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{user.role === 'dean' ? 'Dean Portal' : 'Principal Portal'} &middot; {user.department}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Enrolled Students', value: loading ? '...' : stats.students.toString(), icon: <Users size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Registered Faculty', value: loading ? '...' : stats.faculty.toString(), icon: <Users size={18} />, color: 'text-green-600 bg-green-50' },
          { label: 'Assessments Recorded', value: loading ? '...' : (stats as any).marks?.toString() || '0', icon: <ClipboardList size={18} />, color: 'text-purple-600 bg-purple-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-gray-100">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center mb-2.5 sm:mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-[11px] sm:text-xs leading-tight text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LayoutDashboard size={18} className="text-gray-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className="flex flex-col text-left p-4 sm:p-5 rounded-xl border border-gray-100 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${action.color} group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <h3 className="font-semibold text-gray-900">{action.title}</h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{action.description}</p>
              <span className="mt-auto pt-4 inline-block text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                Manage {action.title.split(' ')[0].toLowerCase()} &rarr;
              </span>
            </button>
          ))}
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
