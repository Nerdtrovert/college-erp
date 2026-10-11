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

  const getAssessmentMarks = (assessmentName: string) => {
    const values = subjects
      .flatMap((sub) => sub.assessments ?? [])
      .filter((ass: any) => ass && typeof ass.name === 'string' && ass.name.toLowerCase() === assessmentName.toLowerCase())
      .map((ass: any) => ass.marks)
      .filter((marks: unknown) => marks !== null && marks !== undefined)
      .map((marks: unknown) => Number(marks))
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const cie1Marks = getAssessmentMarks('CIE1');
  const cie2Marks = getAssessmentMarks('CIE2');
  const cieAverage = cie1Marks !== null && cie2Marks !== null
    ? ((cie1Marks + cie2Marks) / 2).toFixed(1)
    : null;
  const getAssessment = (subject: any, name: string) =>
    subject.assessments?.find((assessment: any) => assessment.name.toLowerCase() === name.toLowerCase());
  const getSubjectTotal = (subject: any) => {
    const cie1 = getAssessment(subject, 'CIE1');
    const cie2 = getAssessment(subject, 'CIE2');
    if (cie1?.marks == null || cie2?.marks == null) return null;

    return ['CIE', 'Assignment', 'Lab'].reduce((total, name) => {
      const marks = getAssessment(subject, name)?.marks;
      return total + (marks == null ? 0 : Number(marks));
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Internal Marks</h1>
        <p className="text-gray-500 text-sm mt-1">Current academic period</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <TrendingUp size={18} />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">CIE overview</div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-gray-500">CIE1</div>
              <div className="text-2xl font-bold text-gray-900">
                {cie1Marks !== null ? `${cie1Marks.toFixed(1)}/50` : '—'}
              </div>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div>
              <div className="text-xs text-gray-500">CIE2</div>
              <div className="text-2xl font-bold text-gray-900">
                {cie2Marks !== null ? `${cie2Marks.toFixed(1)}/50` : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Award size={18} />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Average CIE</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {cieAverage !== null ? `${cieAverage}/50` : '—'}
          </div>
          <div className="text-sm text-gray-500">
            {cieAverage !== null ? 'Average of CIE1 and CIE2' : 'Waiting for both CIE marks'}
          </div>
        </div>
      </div>

      {/* Marks table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Marks Breakdown</h2>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {subjects.map((s) => {
            const total = getSubjectTotal(s);
            const g = total !== null ? grade((total / 50) * 100) : null;

            return (
              <article key={s.code} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-snug text-gray-900">{s.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">{s.code} · {s.faculty}</p>
                  </div>
                  {g ? (
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${g.color}`}>{g.label}</span>
                  ) : (
                    <span className="shrink-0 text-xs text-gray-400">—</span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {['CIE1', 'CIE2', 'Assignment', 'Lab'].map((name) => {
                    const a = getAssessment(s, name);
                    if (!a) return null;
                    return (
                      <div key={a.name} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                          {name === 'CIE1' ? 'CIE-1' : name === 'CIE2' ? 'CIE-2' : name}
                        </p>
                        <p className={`mt-1 text-sm font-semibold ${
                          a.max === 0 || a.marks === null
                            ? 'text-gray-400'
                            : a.marks / a.max >= 0.8
                              ? 'text-green-700'
                              : a.marks / a.max >= 0.6
                                ? 'text-amber-700'
                                : 'text-red-700'
                        }`}>
                          {a.max === 0 ? '—' : a.marks !== null ? `${a.marks}/${a.max}` : 'Pending'}
                        </p>
                      </div>
                    );
                  })}
                  <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-blue-600">Total</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{total !== null ? `${total}/50` : '—'}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10 shadow-[0_1px_0_0_#e5e7eb]">
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                {['CIE-1', 'CIE-2', 'Assignment', 'Lab', 'Total (50)', 'Grade'].map(h => (
                  <th key={h} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((s) => {
                const total = getSubjectTotal(s);
                const g = total !== null ? grade((total / 50) * 100) : null;

                return (
                  <tr key={s.code} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.code} &middot; {s.faculty}</div>
                    </td>
                    {['CIE1', 'CIE2', 'Assignment', 'Lab'].map((name) => {
                      const a = getAssessment(s, name);
                      if (!a) return <td key={name} className="px-4 py-4 text-center text-gray-400">—</td>;
                      return (
                        <td key={a.name} className="px-4 py-4 text-center">
                          {a.max === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : a.marks !== null ? (
                            <span className={`font-semibold ${a.marks / a.max >= 0.8 ? 'text-green-700' : a.marks / a.max >= 0.6 ? 'text-amber-700' : 'text-red-700'}`}>
                              {a.marks}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">Pending</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-center font-semibold text-gray-900">
                      {total !== null ? `${total}/50` : '—'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {g ? (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${g.color}`}>{g.label}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
