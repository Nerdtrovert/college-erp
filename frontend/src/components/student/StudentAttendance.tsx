import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import API from '../../services/api';

function classesNeeded(present: number, total: number): string {
  if (total === 0) return 'No sessions recorded yet';
  const current = Math.round((present / total) * 100);
  if (current >= 75) return `${Math.max(0, Math.ceil((0.75 * total - present) / 0.25))} more classes can be missed`;
  const needed = Math.ceil((0.75 * total - present) / 0.25);
  return `Attend ${needed} more class${needed !== 1 ? 'es' : ''} to reach 75%`;
}

export const StudentAttendance: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await API.get('/attendance/student');
        setSubjects(res.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch attendance records.');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-medium">Loading attendance records...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500 font-medium">{error}</div>;
  }

  const overall = subjects.length > 0
    ? Math.round(subjects.reduce((s, sub) => s + (sub.total > 0 ? (sub.present / sub.total) * 100 : 100), 0) / subjects.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Semester 5 &middot; Nov 2024</p>
      </div>

      {/* Overall card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3.2" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={overall >= 85 ? '#16a34a' : overall >= 75 ? '#d97706' : '#dc2626'}
              strokeWidth="3.2"
              strokeDasharray={`${overall} ${100 - overall}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{overall}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-gray-900">Overall Attendance</div>
          <div className="text-sm text-gray-500 mt-0.5">Across all 5 subjects this semester</div>
          <div className="flex items-start sm:items-center gap-2 mt-2">
            {overall >= 75
              ? <><CheckCircle2 size={14} className="text-green-600" /><span className="text-sm text-green-700 font-medium">You are eligible for examinations</span></>
              : <><AlertTriangle size={14} className="text-red-600" /><span className="text-sm text-red-700 font-medium">Risk of exam detention</span></>
            }
          </div>
        </div>
      </div>

      {/* Subject cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {subjects.map((s) => {
          const pct = Math.round((s.present / s.total) * 100);
          const status = pct >= 85 ? 'good' : pct >= 75 ? 'moderate' : 'low';
          return (
            <div key={s.code} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm leading-tight">{s.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.code} &middot; {s.faculty}</div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  status === 'good' ? 'bg-green-100 text-green-700' :
                  status === 'moderate' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {pct}%
                </span>
              </div>

              <div className="h-1.5 bg-gray-100 rounded-full mb-3">
                <div className="h-full rounded-full" style={{
                  width: `${pct}%`,
                  background: status === 'good' ? '#16a34a' : status === 'moderate' ? '#d97706' : '#dc2626'
                }} />
              </div>

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 mb-3">
                <span>{s.present} present / {s.absent} absent</span>
                <span>{s.total} total classes</span>
              </div>

              {/* Mini session dots */}
              <div className="flex flex-wrap gap-1.5">
                {s.sessions.map((session: any, i: number) => (
                  <div
                    key={i}
                    title={`${session.date} — ${session.status}`}
                    className={`w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center ${
                      session.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {session.status === 'present' ? 'P' : 'A'}
                  </div>
                ))}
                <div className="w-5 h-5 rounded-md bg-gray-100 text-gray-400 text-xs font-bold flex items-center justify-center">
                  +{s.total - s.sessions.length}
                </div>
              </div>

              <div className={`mt-3 flex items-center gap-1.5 text-xs ${
                pct >= 75 ? 'text-green-700' : 'text-red-700'
              }`}>
                <Info size={11} />
                {classesNeeded(s.present, s.total)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};
