import { TrendingUp, Award } from 'lucide-react';

const SUBJECTS = [
  {
    name: 'Data Structures & Algorithms',
    code: 'CS2301',
    faculty: 'Dr. Priya Sharma',
    assessments: [
      { name: 'IA-1', marks: 28, max: 30 },
      { name: 'IA-2', marks: 25, max: 30 },
      { name: 'Assignment', marks: 9, max: 10 },
      { name: 'Lab', marks: 24, max: 25 },
    ]
  },
  {
    name: 'Operating Systems',
    code: 'CS2302',
    faculty: 'Prof. Ramesh Iyer',
    assessments: [
      { name: 'IA-1', marks: 21, max: 30 },
      { name: 'IA-2', marks: 24, max: 30 },
      { name: 'Assignment', marks: 7, max: 10 },
      { name: 'Lab', marks: 20, max: 25 },
    ]
  },
  {
    name: 'Computer Networks',
    code: 'CS2303',
    faculty: 'Dr. Anita Raj',
    assessments: [
      { name: 'IA-1', marks: 29, max: 30 },
      { name: 'IA-2', marks: 27, max: 30 },
      { name: 'Assignment', marks: 10, max: 10 },
      { name: 'Lab', marks: 23, max: 25 },
    ]
  },
  {
    name: 'Database Systems',
    code: 'CS2304',
    faculty: 'Mr. Vijay Kumar',
    assessments: [
      { name: 'IA-1', marks: 18, max: 30 },
      { name: 'IA-2', marks: 22, max: 30 },
      { name: 'Assignment', marks: 8, max: 10 },
      { name: 'Lab', marks: 19, max: 25 },
    ]
  },
  {
    name: 'Software Engineering',
    code: 'CS2305',
    faculty: 'Dr. Meena Nair',
    assessments: [
      { name: 'IA-1', marks: 26, max: 30 },
      { name: 'IA-2', marks: null, max: 30 },
      { name: 'Assignment', marks: 9, max: 10 },
      { name: 'Lab', marks: 22, max: 25 },
    ]
  },
];

function grade(pct: number) {
  if (pct >= 90) return { label: 'O', color: 'text-purple-700 bg-purple-100' };
  if (pct >= 80) return { label: 'A+', color: 'text-blue-700 bg-blue-100' };
  if (pct >= 70) return { label: 'A', color: 'text-green-700 bg-green-100' };
  if (pct >= 60) return { label: 'B+', color: 'text-teal-700 bg-teal-100' };
  if (pct >= 50) return { label: 'B', color: 'text-amber-700 bg-amber-100' };
  return { label: 'C', color: 'text-red-700 bg-red-100' };
}

export const StudentMarks: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Internal Marks</h1>
        <p className="text-gray-500 text-sm mt-1">Semester 5 &middot; Academic Year 2024–25</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Highest Mark', value: '89%', sub: 'Computer Networks', icon: <Award size={18} />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Average', value: '76%', sub: 'Across all subjects', icon: <TrendingUp size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Subjects Cleared', value: '4/5', sub: 'IA-2 pending in SE', icon: <TrendingUp size={18} />, color: 'text-green-600 bg-green-50' },
          { label: 'SGPA (projected)', value: '8.4', sub: 'Based on internals', icon: <TrendingUp size={18} />, color: 'text-amber-600 bg-amber-50' },
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
              {SUBJECTS.map((s) => {
                const scored = s.assessments.reduce((acc, a) => acc + (a.marks ?? 0), 0);
                const maxScored = s.assessments.reduce((acc, a) => acc + (a.marks !== null ? a.max : 0), 0);
                const fullMax = s.assessments.reduce((acc, a) => acc + a.max, 0);
                const pct = Math.round((scored / maxScored) * 100);
                const g = grade(pct);

                return (
                  <tr key={s.code} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.code} &middot; {s.faculty}</div>
                    </td>
                    {s.assessments.map((a) => (
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
