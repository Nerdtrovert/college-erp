import { CalendarDays, BarChart2, Bell, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { User } from '../../types';

const SUBJECT_ATTENDANCE = [
  { name: 'Data Structures', code: 'CS2301', percent: 87, present: 26, total: 30 },
  { name: 'Operating Systems', code: 'CS2302', percent: 73, present: 22, total: 30 },
  { name: 'Computer Networks', code: 'CS2303', percent: 90, present: 27, total: 30 },
  { name: 'Database Systems', code: 'CS2304', percent: 67, present: 20, total: 30 },
  { name: 'Software Engineering', code: 'CS2305', percent: 83, present: 25, total: 30 },
];

const ANNOUNCEMENTS = [
  { title: 'Mid-semester exams begin Nov 18', time: '2 days ago', type: 'exam' },
  { title: 'Lab record submission deadline extended to Nov 15', time: '3 days ago', type: 'info' },
  { title: 'Guest lecture on AI/ML — Nov 14, 2 PM, Seminar Hall', time: '4 days ago', type: 'event' },
];

function AttendanceBadge({ percent }: { percent: number }) {
  if (percent >= 85) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Good</span>;
  if (percent >= 75) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Moderate</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Low</span>;
}

interface Props {
  user: User;
  onNavigate: (id: string) => void;
}

export const StudentHome: React.FC<Props> = ({ user, onNavigate }) => {
  const overall = Math.round(SUBJECT_ATTENDANCE.reduce((s, a) => s + a.percent, 0) / SUBJECT_ATTENDANCE.length);
  const lowCount = SUBJECT_ATTENDANCE.filter(a => a.percent < 75).length;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{user.department} &middot; {user.id} &middot; 3rd Year, Semester 5</p>
      </div>

      {/* Alert */}
      {lowCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Attendance warning</p>
            <p className="text-sm text-red-700 mt-0.5">
              {lowCount} subject{lowCount > 1 ? 's are' : ' is'} below 75%. Attend classes to avoid detention.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Attendance', value: `${overall}%`, icon: <CalendarDays size={18} />, color: overall >= 85 ? 'text-green-600 bg-green-50' : overall >= 75 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50' },
          { label: 'CGPA (Current)', value: '8.4', icon: <TrendingUp size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Subjects', value: '5', icon: <BarChart2 size={18} />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Announcements', value: '3', icon: <Bell size={18} />, color: 'text-orange-600 bg-orange-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Attendance breakdown */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="font-semibold text-gray-900">Attendance by Subject</h2>
            <button onClick={() => onNavigate('attendance')} className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <div className="space-y-4">
            {SUBJECT_ATTENDANCE.map((s) => (
              <div key={s.code}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1.5">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{s.code}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">{s.present}/{s.total}</span>
                    <span className="text-sm font-semibold text-gray-800">{s.percent}%</span>
                    <AttendanceBadge percent={s.percent} />
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.percent}%`,
                      background: s.percent >= 85 ? '#16a34a' : s.percent >= 75 ? '#d97706' : '#dc2626'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="font-semibold text-gray-900">Announcements</h2>
            <button onClick={() => onNavigate('announcements')} className="text-xs text-blue-600 hover:underline">All</button>
          </div>
          <div className="space-y-4">
            {ANNOUNCEMENTS.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 font-medium leading-snug">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-start sm:items-center gap-2 text-green-700">
              <CheckCircle size={15} />
              <span className="text-xs font-medium">Next exam: Nov 18 — Data Structures</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
