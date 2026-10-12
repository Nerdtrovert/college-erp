import { useMemo, useState, useEffect } from 'react';
import API from '../../services/api';
import { CALENDAR_EVENTS } from '../../data/academicCalendar';

const subjectPalette = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', borderLeft: 'border-l-blue-400', timeColor: 'text-blue-600' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', borderLeft: 'border-l-amber-400', timeColor: 'text-amber-600' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', borderLeft: 'border-l-emerald-400', timeColor: 'text-emerald-600' },
  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', borderLeft: 'border-l-violet-400', timeColor: 'text-violet-600' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', borderLeft: 'border-l-rose-400', timeColor: 'text-rose-600' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', borderLeft: 'border-l-cyan-400', timeColor: 'text-cyan-600' },
];

const getSubjectColor = (subjectCode: string | null | undefined) => {
  if (!subjectCode) return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', borderLeft: 'border-l-gray-300', timeColor: 'text-gray-500' };

  const paletteIndex = Array.from(subjectCode).reduce((sum, char) => sum + char.charCodeAt(0), 0) % subjectPalette.length;
  return subjectPalette[paletteIndex];
};

const defaultColor = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', borderLeft: 'border-l-gray-300', timeColor: 'text-gray-500' };

interface ScheduleSlot {
  subjectCode: string | null;
  activityType: string | null;
  room: string | null;
  class: string;
  teacherId?: string;
}

interface DaySchedule {
  day: string;
  slots: (ScheduleSlot | null)[];
}

const timeHeaders = [
  { label: '8:30–9:30', type: 'class' as const },
  { label: '9:30–10:30', type: 'class' as const },
  { label: '10:30–\n11:00', type: 'break' as const },
  { label: '11:00–12:00', type: 'class' as const },
  { label: '12:00–1:00', type: 'class' as const },
  { label: '1:00–\n1:45', type: 'lunch' as const },
  { label: '1:45–2:45', type: 'class' as const },
  { label: '2:45–3:45', type: 'class' as const },
];


// Time range labels for the today section cards
const timeRanges = [
  '8:30–9:30',
  '9:30–10:30',
  '10:30–11:00',
  '11:00–12:00',
  '12:00–1:00',
  '1:00–1:45',
  '1:45–2:45',
  '2:45–3:45',
];

const classEndMinutes = [9 * 60 + 30, 10 * 60 + 30, 11 * 60, 12 * 60, 13 * 60, 13 * 60 + 45, 14 * 60 + 45, 15 * 60 + 45];
const isClassPeriodComplete = (slotIndex: number, now: Date) =>
  timeHeaders[slotIndex]?.type === 'class' && now.getHours() * 60 + now.getMinutes() >= classEndMinutes[slotIndex];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isDateWithinAcademicWindow = (dateKey: string, event: { date: string; endDate?: string }) => {
  if (dateKey === event.date) return true;
  if (!event.endDate) return false;
  return dateKey >= event.date && dateKey <= event.endDate;
};

interface TeacherTimetableProps {
  teacherId?: string;
}

export const TeacherTimetable: React.FC<TeacherTimetableProps> = ({ teacherId }) => {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setLoading(true);
        const endpoint = teacherId ? `/timetable/faculty/${teacherId}` : '/timetable/teacher';
        const res = await API.get(endpoint);
        setSchedule(res.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load timetable.');
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, [teacherId]);

  const todayIndex = useMemo(() => {
    const dayOfWeek = now.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5 ? dayOfWeek - 1 : -1;
  }, [now]);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const isTodayHoliday = useMemo(() => {
    const dayOfWeek = now.getDay();
    const dateKey = formatDateKey(now);

    if (dayOfWeek === 0 || dayOfWeek === 6) return true;

    return CALENDAR_EVENTS.some((event) => {
      if (!event.date || !event.type || event.type === 'academic') return false;
      return isDateWithinAcademicWindow(dateKey, event);
    });
  }, [now]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-medium">Loading timetable...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500 font-medium">{error}</div>;
  }

  if (schedule.length === 0) {
    return <div className="p-6 text-center text-gray-500 font-medium">No timetable schedule loaded.</div>;
  }

  const todaySchedule = todayIndex >= 0 ? schedule[todayIndex] : undefined;
  const todayName = todayIndex >= 0 ? dayNames[todayIndex] : '';
  const hasClassesToday = !!todaySchedule?.slots.some((slot) => slot && slot.subjectCode);
  const scheduledTodaySlotIndexes = todaySchedule?.slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot?.subjectCode)
    .map(({ index }) => index) ?? [];
  const allClassesTodayComplete = scheduledTodaySlotIndexes.length > 0
    && scheduledTodaySlotIndexes.every((index) => isClassPeriodComplete(index, now));
  const shouldShowTodaySection = todayIndex >= 0 && !isTodayHoliday && hasClassesToday;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-gray-500 text-sm mt-1">Your weekly teaching schedule · Classes and sections assigned to you</p>
      </div>

      {/* ── Today's Schedule Section ── */}
      {shouldShowTodaySection && todaySchedule && (
        <div className="hidden md:block bg-white rounded-2xl border border-dashed border-blue-200 shadow-sm p-5 pb-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            Today — {todayName}
          </p>

          <div className="flex gap-3 overflow-x-auto pb-3">
            {todaySchedule.slots.map((slot, idx) => {
              const headerType = timeHeaders[idx]?.type;
              const isMuted = allClassesTodayComplete || isClassPeriodComplete(idx, now);

              if (headerType === 'break') {
                return (
                  <div
                    key={idx}
                    className={`min-w-[80px] flex-[0.5] rounded-xl border px-3 py-4 flex flex-col items-center justify-center text-center ${allClassesTodayComplete ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <span className="text-sm font-semibold text-gray-400">Break</span>
                    <span className="text-[11px] text-gray-400 mt-0.5">{timeRanges[idx]}</span>
                  </div>
                );
              }

              if (headerType === 'lunch') {
                return (
                  <div
                    key={idx}
                    className={`min-w-[80px] flex-[0.5] rounded-xl border px-3 py-4 flex flex-col items-center justify-center text-center ${allClassesTodayComplete ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <span className="text-sm font-semibold text-gray-400">Lunch</span>
                    <span className="text-[11px] text-gray-400 mt-0.5">{timeRanges[idx]}</span>
                  </div>
                );
              }

              if (slot) {
                const color = getSubjectColor(slot.subjectCode);
                const borderLeft = color.borderLeft;
                const timeColor = color.timeColor;
                const todayBg = color.bg;

                return (
                  <div
                    key={idx}
                    className={`min-w-[130px] flex-1 rounded-xl border border-l-4 px-4 py-4 flex flex-col justify-center ${isMuted ? 'bg-gray-100 border-gray-200 border-l-gray-300' : `${todayBg} border-gray-100 ${borderLeft}`}`}
                  >
                    <span className={`text-[11px] font-semibold ${isMuted ? 'text-gray-500' : timeColor}`}>{timeRanges[idx]}</span>
                    <span className={`mt-1.5 text-sm font-bold leading-tight ${isMuted ? 'text-gray-500' : 'text-gray-800'}`}>{slot.subjectCode ?? '-'}</span>
                    <span className={`mt-1 block text-[11px] ${isMuted ? 'text-gray-400' : 'text-gray-500'}`}>{slot.activityType ?? '-'}</span>
                    <span className={`mt-1.5 text-xs ${isMuted ? 'text-gray-400' : 'text-gray-500'}`}>Room {slot.room ?? '-'} · {slot.class}</span>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={`min-w-[80px] flex-[0.5] rounded-xl border px-3 py-4 flex flex-col items-center justify-center text-center ${allClassesTodayComplete ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-100'}`}
                >
                  <span className="text-gray-300 text-lg">—</span>
                </div>
              );
            })}
          </div>

          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: (() => {
                  const h = now.getHours();
                  const m = now.getMinutes();
                  const mins = h * 60 + m;
                  const start = 8 * 60 + 30;
                  const end = 15 * 60 + 45;
                  if (mins <= start) return '0%';
                  if (mins >= end) return '100%';
                  return `${Math.round(((mins - start) / (end - start)) * 100)}%`;
                })(),
                background: allClassesTodayComplete ? '#9ca3af' : 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
              }}
            />
          </div>
        </div>
      )}

      {/* Compact mobile agenda: one readable card per class instead of a wide table. */}
      <div className="md:hidden space-y-3">
        {schedule.map((row, dayIdx) => {
          const classes = row.slots
            .map((slot, slotIdx) => ({ slot, slotIdx }))
            .filter(({ slot }) => slot);
          const isToday = dayIdx === todayIndex;
          const dayClassIndexes = row.slots
            .map((slot, index) => ({ slot, index }))
            .filter(({ slot }) => slot?.subjectCode)
            .map(({ index }) => index);
          const isDayComplete = isToday && dayClassIndexes.length > 0
            && dayClassIndexes.every((index) => isClassPeriodComplete(index, now));

          return (
            <section
              key={row.day}
              className={`overflow-hidden rounded-2xl border shadow-sm ${
                isDayComplete ? 'border-gray-200 bg-gray-100' : `bg-white ${isToday ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'}`
              }`}
            >
              <div className={`flex items-center justify-between px-4 py-3 ${
                isDayComplete ? 'bg-gray-200/70' : isToday ? 'bg-blue-50/70' : 'bg-gray-50/70'
              }`}>
                <h2 className="text-sm font-bold text-gray-900">{row.day}</h2>
                {isToday && <span className="text-[11px] font-semibold text-blue-600">Today</span>}
              </div>
              <div className="divide-y divide-gray-100">
                {classes.length > 0 ? classes.map(({ slot, slotIdx }) => {
                  const color = getSubjectColor(slot!.subjectCode);
                  const isMuted = isToday && (isDayComplete || isClassPeriodComplete(slotIdx, now));
                  return (
                    <div key={slotIdx} className="flex items-start gap-3 px-4 py-3.5">
                      <span className="w-[4.25rem] shrink-0 pt-0.5 text-[11px] font-semibold text-gray-400">
                        {timeRanges[slotIdx]}
                      </span>
                      <div className={`${isMuted ? 'border-gray-200 bg-gray-100' : `${color.bg} ${color.border}`} min-w-0 flex-1 rounded-xl border px-3 py-2.5`}>
                        <p className={`text-sm font-semibold leading-snug ${isMuted ? 'text-gray-500' : color.text}`}>{slot!.subjectCode ?? '-'}</p>
                        <p className={`mt-1 text-xs ${isMuted ? 'text-gray-400' : 'text-gray-500'}`}>{slot!.activityType ?? '-'}</p>
                        <p className={`mt-1 text-xs ${isMuted ? 'text-gray-400' : 'text-gray-500'}`}>Room {slot!.room ?? '-'} · {slot!.class}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="px-4 py-4 text-xs text-gray-400">No classes scheduled</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Weekly Schedule Table ── */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            {/* Header Row */}
            <thead>
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-[130px]">
                  Day
                </th>
                {timeHeaders.map((header, idx) => (
                  <th
                    key={idx}
                    className={`px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider whitespace-pre-line ${
                      header.type === 'break' || header.type === 'lunch'
                        ? 'text-gray-400 w-[70px]'
                        : 'text-gray-400'
                    }`}
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {schedule.map((row, dayIdx) => {
                const isToday = dayIdx === todayIndex;
                const dayClassIndexes = row.slots
                  .map((slot, index) => ({ slot, index }))
                  .filter(({ slot }) => slot?.subjectCode)
                  .map(({ index }) => index);
                const isDayComplete = isToday && dayClassIndexes.length > 0
                  && dayClassIndexes.every((index) => isClassPeriodComplete(index, now));
                return (
                  <tr
                    key={row.day}
                    className={`border-t border-gray-100 ${isDayComplete ? 'bg-gray-100' : isToday ? 'bg-blue-50/30' : ''}`}
                  >
                    {/* Day Label */}
                    <td className="px-5 py-5 text-left align-middle">
                      <span className="font-semibold text-gray-800 text-sm">
                        {row.day}
                      </span>
                      {isToday && (
                        <span className="ml-2 text-xs font-medium text-blue-500">
                          (Today)
                        </span>
                      )}
                    </td>

                    {/* Slot Cells */}
                    {row.slots.map((slot, slotIdx) => {
                      const headerType = timeHeaders[slotIdx]?.type;

                      if (headerType === 'break') {
                        return (
                          <td key={slotIdx} className={`px-2 py-5 text-center align-middle ${isDayComplete ? 'bg-gray-100' : ''}`}>
                            <span className="text-xs text-gray-400 font-medium">Break</span>
                          </td>
                        );
                      }

                      if (headerType === 'lunch') {
                        return (
                          <td key={slotIdx} className={`px-2 py-5 text-center align-middle ${isDayComplete ? 'bg-gray-100' : ''}`}>
                            <span className="text-xs text-gray-400 font-medium">Lunch</span>
                          </td>
                        );
                      }

                      if (slot) {
                        const color = getSubjectColor(slot.subjectCode) || defaultColor;
                        const isMuted = isToday && (isDayComplete || isClassPeriodComplete(slotIdx, now));
                        return (
                          <td key={slotIdx} className="px-2 py-3 align-middle">
                            <div
                              className={`${isMuted ? 'bg-gray-100 border-gray-200' : `${color.bg} border ${color.border}`} rounded-xl border px-3 py-3 min-h-[60px] flex flex-col justify-center`}
                            >
                              <div className={`font-semibold text-sm ${isMuted ? 'text-gray-500' : color.text} leading-tight`}>
                                {slot.subjectCode ?? '-'}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {slot.activityType ?? '-'}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Room {slot.room ?? '-'} · Class {slot.class}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={slotIdx} className="px-2 py-5 text-center align-middle">
                          <span className="text-gray-300 text-lg">—</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};