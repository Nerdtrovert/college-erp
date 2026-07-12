import { useEffect, useState } from 'react';
import { TrendingUp, Award } from 'lucide-react';
import API from '../../services/api';

function grade(pct: number) {
  if (pct >= 90) return { label: 'O', color: 'text-purple-700 bg-purple-100' };
  if (pct >= 80) return { label: 'A+', color: 'text-blue-700 bg-blue-100' };
  if (pct >= 70) return { label: 'A', color: 'text-green-700 bg-green-100' };
  if (pct >= 60) return { label: 'B+', color: 'text-teal-700 bg-teal-100' };
  if (pct >= 50) return { label: 'B', color: 'text-amber-700 bg-amber-100' };
  return { label: 'C', color: 'text-red-700 bg-red-100' };
}

export const StudentMarks: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const res = await API.get('/marks/student');
        setSubjects(res.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch marks records.');
      } finally {
        setLoading(false);
      }
    };
    fetchMarks();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-medium">Loading internal marks...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500 font-medium">{error}</div>;
  }

  // Calculate dynamic metrics
  let highestPct = 0;
  let highestSubjectName = 'N/A';
  let totalScored = 0;
  let totalMax = 0;
  let subjectsClearedCount = 0;
  let hasPendingMarks = false;

  subjects.forEach((sub) => {
    let subScored = 0;
    let subMax = 0;
    let subPending = false;

    sub.assessments.forEach((ass: any) => {
      if (ass.marks !== null) {
        subScored += ass.marks;
        subMax += ass.max;
      } else {
        subPending = true;
        hasPendingMarks = true;
      }
    });

    if (subMax > 0) {
      const pct = (subScored / subMax) * 100;
      if (pct > highestPct) {
        highestPct = pct;
        highestSubjectName = sub.name;
      }
      totalScored += subScored;
      totalMax += subMax;

      if (pct >= 50 && !subPending) {
        subjectsClearedCount++;
      }
    }
  });

  const averagePct = totalMax > 0 ? Math.round((totalScored / totalMax) * 100) : 0;
  const projectedSGPA = averagePct > 0 ? (averagePct / 10 + 0.8).toFixed(1) : '0.0';
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Internal Marks</h1>
        <p className="text-gray-500 text-sm mt-1">Semester 5 &middot; Academic Year 2024–25</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Highest Mark', value: `${Math.round(highestPct)}%`, sub: highestSubjectName, icon: <Award size={18} />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Average', value: `${averagePct}%`, sub: 'Across all subjects', icon: <TrendingUp size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Subjects Cleared', value: `${subjectsClearedCount}/${subjects.length}`, sub: hasPendingMarks ? 'Assessments pending' : 'All marks posted', icon: <TrendingUp size={18} />, color: 'text-green-600 bg-green-50' },
          { label: 'SGPA (projected)', value: projectedSGPA, sub: 'Based on internals', icon: <TrendingUp size={18} />, color: 'text-amber-600 bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Marks table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Marks Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                {['IA-1 (30)', 'IA-2 (30)', 'Assignment (10)', 'Lab (25)', 'Total', 'Grade'].map(h => (
                  <th key={h} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((s) => {
                const scored = s.assessments.reduce((acc: number, a: any) => acc + (a.marks ?? 0), 0);
                const maxScored = s.assessments.reduce((acc: number, a: any) => acc + (a.marks !== null ? a.max : 0), 0);
                const fullMax = s.assessments.reduce((acc: number, a: any) => acc + a.max, 0);
                const pct = maxScored > 0 ? Math.round((scored / maxScored) * 100) : 0;
                const g = grade(pct);

                return (
                  <tr key={s.code} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.code} &middot; {s.faculty}</div>
                    </td>
                    {s.assessments.map((a: any) => (
                      <td key={a.name} className="px-4 py-4 text-center">
                        {a.marks !== null ? (
                          <span className={`font-semibold ${a.marks / a.max >= 0.8 ? 'text-green-700' : a.marks / a.max >= 0.6 ? 'text-amber-700' : 'text-red-700'}`}>
                            {a.marks}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">Pending</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-4 text-center font-semibold text-gray-900">
                      {scored}/{fullMax}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${g.color}`}>{g.label}</span>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
          <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            O ≥ 90% &nbsp;·&nbsp; A+ ≥ 80% &nbsp;·&nbsp; A ≥ 70% &nbsp;·&nbsp; B+ ≥ 60% &nbsp;·&nbsp; B ≥ 50%
          </div>
      </div>
    </div>
  );
};
