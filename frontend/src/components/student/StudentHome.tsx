import { useEffect, useState } from 'react';
import { BarChart2, AlertTriangle, Clock, Info } from 'lucide-react';
import type { User } from '../../types';
import { getTimeBasedGreeting } from '../../utils/greeting';
import API from '../../services/api';

const AttendanceBadge = ({ percent }: { percent: number }) => {
  if (percent >= 85) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Good</span>;
  if (percent >= 75) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Moderate</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Low</span>;
};

interface Props {
  user: User;
  onNavigate: (id: string) => void;
}

export const StudentHome: React.FC<Props> = ({ user, onNavigate }) => {
  const [subjectAttendance, setSubjectAttendance] = useState<Array<{
    name: string;
    code: string;
    present: number;
    total: number;
  }>>([]);

  const [timetable, setTimetable] = useState<any[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<{
    subject: string | null;
    room: string | null;
    time: string | null
  }>({ subject: null, room: null, time: null });
  const [nextClass, setNextClass] = useState<{
    subject: string | null;
    room: string | null;
    time: string | null
  }>({ subject: null, room: null, time: null });
  const [announcements, setAnnouncements] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);

      try {
        // Fetch attendance data
        const attendanceResponse = await API.get('/attendance/student');
        setSubjectAttendance(attendanceResponse.data);

        // Fetch timetable data
        const timetableResponse = await API.get('/timetable/student');
        setTimetable(timetableResponse.data);

        // Fetch announcements data
        const announcementsResponse = await API.get('/announcements');
        setAnnouncements(announcementsResponse.data);

        // Process data for current/next class and attendance risk
        processStudentData(timetableResponse.data);
      } catch (err: any) {
        console.error('Failed to load student data:', err);
        // Handle API errors gracefully - show empty states instead of error messages
        setSubjectAttendance([]);
        setTimetable([]);
        setAnnouncements([]);
        processStudentData([]); // Process empty data to show clean empty states
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  const processStudentData = (timetableData: any[]) => {
    // Process timetable for current and next class
    if (timetableData.length > 0) {
      const { current, next } = getCurrentAndNextClass(timetableData);
      setCurrentPeriod(current);
      setNextClass(next);
    } else {
      // Empty states for timetable data
      setCurrentPeriod({ subject: null, room: null, time: null });
      setNextClass({ subject: null, room: null, time: null });
    }
  };

  // Helper function to get current and next class based on timetable and current time
  const getCurrentAndNextClass = (timetable: any[]) => {
    // Get current day and time in IST
    const now = new Date();
    const istOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    };
    const istTimeParts = new Intl.DateTimeFormat('en-US', istOptions).formatToParts(now);
    const istTimeObj = Object.fromEntries(istTimeParts.map(({ type, value }) => [type, value]));
    const currentDay = istTimeObj.weekday;
    const currentHours = Number(istTimeObj.hour);
    const currentMinutes = Number(istTimeObj.minute);
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    // Define period boundaries (matching PERIOD_TIMES from attendance controller)
    const PERIOD_TIMES = [
      ['08:30', '09:30'], // Period 0
      ['09:30', '10:30'], // Period 1
      [null, null],       // Break (no class)
      ['11:00', '12:00'], // Period 2
      ['12:00', '13:00'], // Period 3
      [null, null],       // Lunch (no class)
      ['13:45', '14:45'], // Period 4
      ['14:45', '15:45'], // Period 5
    ] as const;

    // Find current period index
    let currentPeriodIndex = -1;
    for (let i = 0; i < PERIOD_TIMES.length; i++) {
      const [startTime, endTime] = PERIOD_TIMES[i];
      if (!startTime || !endTime) continue; // Skip break/lunch periods

      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes;

      if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
        currentPeriodIndex = i;
        break;
      }
    }

    // Get current class
    let currentClass: { subject: string | null; room: string | null; time: string | null } = { subject: null, room: null, time: null };
    if (currentPeriodIndex >= 0) {
      const daySlots = timetable.filter((slot: any) =>
        slot.day.toLowerCase() === currentDay.toLowerCase() &&
        slot.slotIndex === currentPeriodIndex
      );

      if (daySlots.length > 0) {
        const slot = daySlots[0];
        currentClass = {
          subject: slot.subject ?? null,
          room: slot.room ?? null,
          time: `${PERIOD_TIMES[currentPeriodIndex][0]}–${PERIOD_TIMES[currentPeriodIndex][1]}`
        };
      }
    }

    // Get next class
    let nextClass: { subject: string | null; room: string | null; time: string | null } = { subject: null, room: null, time: null };

    // Look for next class in same day
    if (currentPeriodIndex >= 0) {
      for (let i = currentPeriodIndex + 1; i < PERIOD_TIMES.length; i++) {
        const [startTime, endTime] = PERIOD_TIMES[i];
        if (!startTime || !endTime) continue; // Skip break/lunch periods

        const daySlots = timetable.filter((slot: any) =>
          slot.day.toLowerCase() === currentDay.toLowerCase() &&
          slot.slotIndex === i
        );

        if (daySlots.length > 0) {
          const slot = daySlots[0];
          nextClass = {
            subject: slot.subject ?? null,
            room: slot.room ?? null,
            time: `${startTime}–${endTime}`
          };
          break;
        }
      }
    }

    // If no next class today, look for first class tomorrow
    if (!nextClass.subject) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const currentDayIndex = days.findIndex(day => day.toLowerCase() === currentDay.toLowerCase());

      for (let offset = 1; offset <= 5; offset++) {
        const nextDayIndex = (currentDayIndex + offset) % 5;
        const nextDay = days[nextDayIndex];

        // Skip weekends (though our timetable only has Mon-Fri)
        if (nextDay === 'Saturday' || nextDay === 'Sunday') continue;

        // Find first period of the day
        for (let i = 0; i < PERIOD_TIMES.length; i++) {
          const [startTime, endTime] = PERIOD_TIMES[i];
          if (!startTime || !endTime) continue; // Skip break/lunch periods

          const daySlots = timetable.filter((slot: any) =>
            slot.day.toLowerCase() === nextDay.toLowerCase() &&
            slot.slotIndex === i
          );

          if (daySlots.length > 0) {
            const slot = daySlots[0];
            nextClass = {
              subject: slot.subject ?? null,
              room: slot.room ?? null,
              time: `${startTime}–${endTime}`
            };
            break;
          }
        }

        if (nextClass.subject) break; // Found next class
      }
    }

    return { current: currentClass, next: nextClass };
  };

  const lowAttendanceSubjects = subjectAttendance.filter(
    (subject) => subject.total > 0 && (subject.present / subject.total) * 100 < 75,
  );
  const hasTimetableEntries = timetable.some(
    (day) => Array.isArray(day.slots) && day.slots.some(Boolean),
  );

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 font-medium">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{getTimeBasedGreeting()}, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{user.program || 'Program'} · {user.classGroup || 'Section'} · {user.email || '—'}</p>
      </div>

      {/* Show an alert only when at least one subject is below the attendance threshold. */}
      {lowAttendanceSubjects.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 sm:p-4 bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl">
          <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Attendance warning</p>
            <p className="text-sm text-red-700 mt-0.5">
              {`${lowAttendanceSubjects.length} subject${lowAttendanceSubjects.length > 1 ? 's are' : ' is'} below 75%. Attend classes to avoid detention.`}
            </p>
          </div>
        </div>
      )}

      {/* Stats - replaced with Current/Next Class and Attendance Risk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Current/Next Class Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={18} />
              Current & Next Class
            </h2>
          </div>
          {!hasTimetableEntries ? (
            <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Info size={17} className="mt-0.5 shrink-0" />
              <p>No timetable has been published for <span className="font-semibold">{user.classGroup || 'your class'}</span> yet. Please contact your department administrator.</p>
            </div>
          ) : <div className="space-y-3">
            {/* Current Class */}
            <div className="border-b pb-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">Now</p>
                  {timetable.length > 0 && currentPeriod.subject ? (
                    <>
                      <h3 className="mb-1 text-lg font-semibold text-gray-900">{currentPeriod.subject}</h3>
                      <p className="text-gray-600 text-sm">{currentPeriod.room || 'TBA'}</p>
                      <p className="text-xs text-gray-500 mt-1">{currentPeriod.time || '--:--'}</p>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No upcoming classes.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Next Class */}
            <div className="pt-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">Next</p>
                  {timetable.length > 0 && nextClass.subject ? (
                    <>
                      <h3 className="mb-1 text-lg font-semibold text-gray-900">{nextClass.subject}</h3>
                      <p className="text-gray-600 text-sm">{nextClass.room || 'TBA'}</p>
                      <p className="text-xs text-gray-500 mt-1">{nextClass.time || '--:--'}</p>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No upcoming classes.</p>
                  )}
                </div>
              </div>
            </div>
          </div>}
        </div>

        {/* Attendance Risk Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart2 size={18} />
              Attendance Risk
            </h2>
          </div>
          <div className="space-y-4">
            {subjectAttendance.length > 0 ? (
              <>
                {subjectAttendance.filter(subject => subject.total > 0 && (subject.present / subject.total) * 100 < 75).length > 0 ? (
                  <div className="space-y-3">
                    {subjectAttendance
                      .filter(subject => subject.total > 0 && (subject.present / subject.total) * 100 < 75)
                      .map((subject, index) => {
                        const percent = Math.round((subject.present / subject.total) * 100);
                        return (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{subject.name}</p>
                              <p className="text-gray-600 text-sm">{subject.code}</p>
                              <p className="text-xs font-semibold text-gray-800 mt-1">{percent}%</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center text-gray-600 py-8">
                    You're on track — no subjects currently below the attendance threshold.
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-600 py-8">
                No attendance data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance breakdown - keep existing section that handles empty data correctly */}
      <div className="md:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <h2 className="font-semibold text-gray-900">Attendance by Subject</h2>
          <button onClick={() => onNavigate('attendance')} className="text-xs text-blue-600 hover:underline">View all</button>
        </div>
        <div className="space-y-4">
          {subjectAttendance.length > 0 ? (
            subjectAttendance.map((subject) => {
              const percent = subject.total > 0 ? Math.round((subject.present / subject.total) * 100) : 100;
              return (
                <div key={subject.code}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1.5">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-800">{subject.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{subject.code}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">{subject.present}/{subject.total}</span>
                      <span className="text-sm font-semibold text-gray-800">{percent}%</span>
                      <AttendanceBadge percent={percent} />
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percent}%`,
                        background: percent >= 85 ? '#16a34a' : percent >= 75 ? '#d97706' : '#dc2626'
                      }}
                    />
                  </div>
                </div>
                );
              })
          ) : (
            <div className="text-center py-8 text-gray-500">
              No attendance data available
            </div>
          )}
        </div>
      </div>

      {/* Announcements - keep existing section that handles empty data correctly */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <h2 className="font-semibold text-gray-900">Announcements</h2>
          <button onClick={() => onNavigate('announcements')} className="text-xs text-blue-600 hover:underline">All</button>
        </div>
        <div className="space-y-4">
          {announcements.length > 0 ? (
            announcements.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 font-medium leading-snug">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.time}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No announcements yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};