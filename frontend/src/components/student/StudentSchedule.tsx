import { useMemo } from 'react';

// Color palette for subjects - each subject gets a unique, soft pastel style
const subjectColors: Record<string, { bg: string; text: string; border: string }> = {
  'Data Structures': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  'Operating Systems': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  'Computer Networks': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
  'Database Systems': { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-100' },
  'Software Engineering': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  'Mathematics': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
  'DS Lab': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  'Networks Lab': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
  'OS Lab': { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-100' },
};

const defaultColor = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100' };

interface ScheduleSlot {
  subject: string;
  room: string;
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

const schedule: DaySchedule[] = [
  {
    day: 'Monday',
    slots: [
      { subject: 'Data Structures', room: 'LH-3' },
      { subject: 'Operating Systems', room: 'LH-3' },
      null, // Break
      { subject: 'Computer Networks', room: 'LH-5' },
      null,
      null, // Lunch
      { subject: 'DS Lab', room: 'Lab-2' },
      { subject: 'DS Lab', room: 'Lab-2' },
    ],
  },
  {
    day: 'Tuesday',
    slots: [
      { subject: 'Database Systems', room: 'LH-2' },
      { subject: 'Software Engineering', room: 'LH-2' },
      null,
      { subject: 'Data Structures', room: 'LH-3' },
      null,
      null,
      { subject: 'Networks Lab', room: 'Lab-4' },
      { subject: 'Networks Lab', room: 'Lab-4' },
    ],
  },
  {
    day: 'Wednesday',
    slots: [
      { subject: 'Computer Networks', room: 'LH-5' },
      { subject: 'Operating Systems', room: 'LH-5' },
      null,
      { subject: 'Database Systems', room: 'LH-2' },
      null,
      null,
      null,
      null,
    ],
  },
  {
    day: 'Thursday',
    slots: [
      { subject: 'Software Engineering', room: 'LH-4' },
      { subject: 'Data Structures', room: 'LH-3' },
      null,
      { subject: 'Operating Systems', room: 'LH-5' },
      null,
      null,
      { subject: 'OS Lab', room: 'Lab-1' },
      { subject: 'OS Lab', room: 'Lab-1' },
    ],
  },
  {
    day: 'Friday',
    slots: [
      { subject: 'Computer Networks', room: 'LH-5' },
      { subject: 'Database Systems', room: 'LH-2' },
      null,
      { subject: 'Software Engineering', room: 'LH-4' },
      null,
      null,
      null,
      null,
    ],
  },
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

// Border-left color classes for today cards (maps to subject)
const subjectBorderLeft: Record<string, string> = {
  'Data Structures': 'border-l-red-400',
  'Operating Systems': 'border-l-purple-400',
  'Computer Networks': 'border-l-green-500',
  'Database Systems': 'border-l-red-400',
  'Software Engineering': 'border-l-purple-400',
  'Mathematics': 'border-l-yellow-500',
  'DS Lab': 'border-l-blue-400',
  'Networks Lab': 'border-l-green-500',
  'OS Lab': 'border-l-purple-400',
};

// Text color for time labels in today section
const subjectTimeColor: Record<string, string> = {
  'Data Structures': 'text-red-500',
  'Operating Systems': 'text-purple-500',
  'Computer Networks': 'text-green-600',
  'Database Systems': 'text-red-500',
  'Software Engineering': 'text-purple-500',
  'Mathematics': 'text-yellow-600',
  'DS Lab': 'text-blue-500',
  'Networks Lab': 'text-green-600',
  'OS Lab': 'text-purple-500',
};

// Background color for today cards
const subjectTodayBg: Record<string, string> = {
  'Data Structures': 'bg-red-50',
  'Operating Systems': 'bg-purple-50',
  'Computer Networks': 'bg-green-50',
  'Database Systems': 'bg-red-50',
  'Software Engineering': 'bg-purple-50',
  'Mathematics': 'bg-yellow-50',
  'DS Lab': 'bg-blue-50',
  'Networks Lab': 'bg-green-50',
  'OS Lab': 'bg-purple-50',
};

export const StudentSchedule: React.FC = () => {
  const todayIndex = useMemo(() => {
    const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    return dayOfWeek >= 1 && dayOfWeek <= 5 ? dayOfWeek - 1 : -1;
  }, []);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const todaySchedule = todayIndex >= 0 ? schedule[todayIndex] : schedule[0];
  const todayName = todayIndex >= 0 ? dayNames[todayIndex] : dayNames[0];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-gray-500 text-sm mt-1">Semester 5 &middot; Even weeks schedule</p>
      </div>

      {/* ── Today's Schedule Section ── */}
      <div className="bg-white rounded-2xl border border-dashed border-blue-200 shadow-sm p-5 pb-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
          Today — {todayName}
        </p>

        <div className="flex gap-3 overflow-x-auto pb-3">
          {todaySchedule.slots.map((slot, idx) => {
            const headerType = timeHeaders[idx]?.type;

            // Break card
            if (headerType === 'break') {
              return (
                <div
                  key={idx}
                  className="min-w-[80px] flex-[0.5] rounded-xl bg-gray-50 border border-gray-100 px-3 py-4 flex flex-col items-center justify-center text-center"
                >
                  <span className="text-sm font-semibold text-gray-400">Break</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">{timeRanges[idx]}</span>
                </div>
              );
            }

            // Lunch card
            if (headerType === 'lunch') {
              return (
                <div
                  key={idx}
                  className="min-w-[80px] flex-[0.5] rounded-xl bg-gray-50 border border-gray-100 px-3 py-4 flex flex-col items-center justify-center text-center"
                >
                  <span className="text-sm font-semibold text-gray-400">Lunch</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">{timeRanges[idx]}</span>
                </div>
              );
            }

            // Class card
            if (slot) {
              const borderLeft = subjectBorderLeft[slot.subject] || 'border-l-gray-300';
              const timeColor = subjectTimeColor[slot.subject] || 'text-gray-500';
              const todayBg = subjectTodayBg[slot.subject] || 'bg-gray-50';

              return (
                <div
                  key={idx}
                  className={`min-w-[130px] flex-1 rounded-xl ${todayBg} border border-gray-100 border-l-4 ${borderLeft} px-4 py-4 flex flex-col justify-center`}
                >
                  <span className={`text-[11px] font-semibold ${timeColor}`}>{timeRanges[idx]}</span>
                  <span className="text-sm font-bold text-gray-800 mt-1.5 leading-tight">{slot.subject}</span>
                  <span className="text-xs text-gray-400 mt-1.5">Room {slot.room}</span>
                </div>
              );
            }

            // Empty slot
            return (
              <div
                key={idx}
                className="min-w-[80px] flex-[0.5] rounded-xl bg-gray-50 border border-gray-100 px-3 py-4 flex flex-col items-center justify-center text-center"
              >
                <span className="text-gray-300 text-lg">—</span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: (() => {
                const now = new Date();
                const h = now.getHours();
                const m = now.getMinutes();
                const mins = h * 60 + m;
                const start = 8 * 60 + 30; // 8:30 AM
                const end = 15 * 60 + 45;  // 3:45 PM
                if (mins <= start) return '0%';
                if (mins >= end) return '100%';
                return `${Math.round(((mins - start) / (end - start)) * 100)}%`;
              })(),
              background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
            }}
          />
        </div>
      </div>

      {/* ── Weekly Schedule Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                return (
                  <tr
                    key={row.day}
                    className={`border-t border-gray-100 ${isToday ? 'bg-blue-50/30' : ''}`}
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

                      // Break column
                      if (headerType === 'break') {
                        return (
                          <td
                            key={slotIdx}
                            className="px-2 py-5 text-center align-middle"
                          >
                            <span className="text-xs text-gray-400 font-medium">
                              Break
                            </span>
                          </td>
                        );
                      }

                      // Lunch column
                      if (headerType === 'lunch') {
                        return (
                          <td
                            key={slotIdx}
                            className="px-2 py-5 text-center align-middle"
                          >
                            <span className="text-xs text-gray-400 font-medium">
                              Lunch
                            </span>
                          </td>
                        );
                      }

                      // Class slot
                      if (slot) {
                        const color =
                          subjectColors[slot.subject] || defaultColor;
                        return (
                          <td key={slotIdx} className="px-2 py-3 align-middle">
                            <div
                              className={`${color.bg} border ${color.border} rounded-xl px-3 py-3 min-h-[60px] flex flex-col justify-center`}
                            >
                              <div
                                className={`font-semibold text-sm ${color.text} leading-tight`}
                              >
                                {slot.subject}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {slot.room}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // Empty slot (no class)
                      return (
                        <td
                          key={slotIdx}
                          className="px-2 py-5 text-center align-middle"
                        >
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
