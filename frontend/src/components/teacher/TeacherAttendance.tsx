import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Save, ChevronDown } from 'lucide-react';
import API from '../../services/api';

type AttendanceMap = Record<string, 'present' | 'absent'>;

interface SubjectItem {
  code: string;
  name: string;
  classGroup: string;
}

interface StudentItem {
  roll: string;
  name: string;
  status: 'present' | 'absent';
}

export const TeacherAttendance: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch subjects taught by the teacher
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await API.get('/timetable/teacher-subjects');
        setSubjects(res.data);
        if (res.data.length > 0) {
          setSelectedClass(res.data[0].code);
        }
      } catch (err) {
        console.error('Error fetching teacher subjects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch student roster and attendance statuses when class or date changes
  useEffect(() => {
    if (!selectedClass) return;
    const fetchRoster = async () => {
      try {
        const res = await API.get(`/attendance/teacher/${selectedClass}?date=${date}`);
        setStudents(res.data.students);
        setAttendance(
          Object.fromEntries(res.data.students.map((s: any) => [s.roll, s.status]))
        );
      } catch (err) {
        console.error('Error fetching attendance roster:', err);
      }
    };
    fetchRoster();
  }, [selectedClass, date]);

  const toggle = (roll: string) => {
    setSaved(false);
    setAttendance((prev) => ({
      ...prev,
      [roll]: prev[roll] === 'present' ? 'absent' : 'present',
    }));
  };

  const markAll = (status: 'present' | 'absent') => {
    setSaved(false);
    setAttendance(Object.fromEntries(students.map((s) => [s.roll, status])));
  };

  const presentCount = Object.values(attendance).filter((v) => v === 'present').length;
  const absentCount = students.length - presentCount;

  const handleSave = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const selectedSubj = subjects.find((s) => s.code === selectedClass);
      const records = Object.entries(attendance).map(([roll, status]) => ({
        studentId: roll,
        status,
      }));

      await API.post('/attendance/teacher', {
        subjectCode: selectedClass,
        date,
        classGroup: selectedSubj ? selectedSubj.classGroup : 'CSE-B',
        records,
      });

      setSaved(true);
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-medium">Loading subjects...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Select a class and date, then mark each student</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Class</label>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSaved(false) }}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 pr-10"
              >
                {subjects.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.classGroup})</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setSaved(false) }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary + bulk actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
            {presentCount} Present
          </span>
          <span className="text-sm font-semibold text-red-700 bg-red-100 px-3 py-1.5 rounded-full">
            {absentCount} Absent
          </span>
          <span className="text-sm text-gray-500">{students.length} total</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <button onClick={() => markAll('present')} className="text-xs font-medium px-3 py-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50">
            All Present
          </button>
          <button onClick={() => markAll('absent')} className="text-xs font-medium px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
            All Absent
          </button>
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {students.map((s, i) => {
            const isPresent = attendance[s.roll] === 'present';
            return (
              <div
                key={s.roll}
                className={`flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-gray-50 cursor-pointer ${isPresent ? '' : 'bg-red-50/40'}`}
                onClick={() => toggle(s.roll)}
              >
                <span className="text-xs text-gray-400 w-5 flex-shrink-0 font-mono">{String(i + 1).padStart(2, '0')}</span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  isPresent 
                    ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                }`}
                >
                  {s.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{s.roll}</div>
                </div>
                <div className="flex items-center justify-end gap-2 w-full sm:w-auto sm:flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isPresent ? 'Present' : 'Absent'}
                  </span>
                  {isPresent
                    ? <CheckCircle2 size={18} className="text-green-500" />
                    : <XCircle size={18} className="text-red-400" />
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm shadow-sm ${
            saved ? 'bg-green-600 text-white' : 'bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60'
          }`}
        >
          <Save size={16} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Attendance'}
        </button>
        {saved && (
          <span className="text-sm text-green-700 font-medium flex items-start sm:items-center gap-1.5">
            <CheckCircle2 size={14} />
            Attendance saved for {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
};
