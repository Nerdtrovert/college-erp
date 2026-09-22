import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Clock3, Plus, Save, X, XCircle } from 'lucide-react';
import API from '../../services/api';

type AttendanceStatus = 'present' | 'absent';
type AttendanceMap = Record<string, AttendanceStatus>;

interface SubjectItem {
  code: string;
  name: string;
  classGroup: string;
}

interface TeacherClass {
  id: string;
  subjectCode: string;
  subjectName: string;
  classGroup: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  source: 'timetable' | 'manual';
  attendanceMarked?: boolean;
}

interface StudentItem {
  roll: string;
  name: string;
  status: AttendanceStatus;
}

const emptyClassForm = { subjectCode: '', startTime: '', endTime: '', room: '' };

export const TeacherAttendance: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [showClassForm, setShowClassForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId),
    [classes, selectedClassId],
  );

  useEffect(() => {
    API.get('/timetable/teacher-subjects')
      .then((res) => {
        setSubjects(res.data);
        setClassForm((current) => ({ ...current, subjectCode: res.data[0]?.code || '' }));
      })
      .catch((err) => console.error('Error fetching teacher subjects:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingRoster(true);
      try {
        const res = await API.get(`/attendance/teacher-classes?date=${date}`);
        setClasses(res.data);
        setSelectedClassId((current) => res.data.some((item: TeacherClass) => item.id === current)
          ? current
          : res.data[0]?.id || '');
        setSaved(false);
      } catch (err) {
        console.error('Error fetching timetable classes:', err);
      } finally {
        setLoadingRoster(false);
      }
    };
    fetchClasses();
  }, [date]);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setAttendance({});
      return;
    }
    const fetchRoster = async () => {
      setLoadingRoster(true);
      try {
        const query = new URLSearchParams({
          date,
          startTime: selectedClass.startTime,
          endTime: selectedClass.endTime,
        });
        const res = await API.get(`/attendance/teacher/${selectedClass.subjectCode}?${query}`);
        setStudents(res.data.students);
        setAttendance(Object.fromEntries(res.data.students.map((student: StudentItem) => [student.roll, student.status])));
        setSaved(false);
      } catch (err) {
        console.error('Error fetching attendance roster:', err);
      } finally {
        setLoadingRoster(false);
      }
    };
    fetchRoster();
  }, [date, selectedClass]);

  const addClass = () => {
    const subject = subjects.find((item) => item.code === classForm.subjectCode);
    if (!subject || !classForm.startTime || !classForm.endTime) return;
    if (classForm.startTime >= classForm.endTime) {
      alert('Class end time must be after the start time.');
      return;
    }
    const manualClass: TeacherClass = {
      id: `manual-${Date.now()}`,
      subjectCode: subject.code,
      subjectName: subject.name,
      classGroup: subject.classGroup,
      startTime: classForm.startTime,
      endTime: classForm.endTime,
      room: classForm.room || null,
      source: 'manual',
    };
    setClasses((current) => [...current, manualClass].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    setSelectedClassId(manualClass.id);
    setShowClassForm(false);
    setSaved(false);
  };

  const toggle = (roll: string) => {
    setSaved(false);
    setAttendance((prev) => ({ ...prev, [roll]: prev[roll] === 'present' ? 'absent' : 'present' }));
  };

  const markAll = (status: AttendanceStatus) => {
    setSaved(false);
    setAttendance(Object.fromEntries(students.map((student) => [student.roll, status])));
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      await API.post('/attendance/teacher', {
        subjectCode: selectedClass.subjectCode,
        date,
        classGroup: selectedClass.classGroup,
        startTime: selectedClass.startTime,
        endTime: selectedClass.endTime,
        room: selectedClass.room || undefined,
        records: Object.entries(attendance).map(([studentId, status]) => ({ studentId, status })),
      });
      setSaved(true);
      setClasses((current) => current.map((item) => item.id === selectedClass.id
        ? { ...item, attendanceMarked: true }
        : item));
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500 font-medium">Loading attendance...</div>;

  const presentCount = Object.values(attendance).filter((value) => value === 'present').length;
  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Choose a scheduled class or add a class taken outside the timetable.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowClassForm((current) => !current)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100"
          >
            {showClassForm ? <X size={16} /> : <Plus size={16} />}
            {showClassForm ? 'Close' : 'Add class'}
          </button>
        </div>

        {showClassForm && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock3 size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Add a class for this date</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={classForm.subjectCode}
                onChange={(event) => setClassForm({ ...classForm, subjectCode: event.target.value })}
                className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => <option key={subject.code} value={subject.code}>{subject.code} — {subject.name}</option>)}
              </select>
              <input type="time" value={classForm.startTime} onChange={(event) => setClassForm({ ...classForm, startTime: event.target.value })} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm" aria-label="Class start time" />
              <input type="time" value={classForm.endTime} onChange={(event) => setClassForm({ ...classForm, endTime: event.target.value })} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm" aria-label="Class end time" />
              <input type="text" value={classForm.room} onChange={(event) => setClassForm({ ...classForm, room: event.target.value })} placeholder="Room (optional)" className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm" />
            </div>
            <button type="button" onClick={addClass} disabled={!classForm.subjectCode || !classForm.startTime || !classForm.endTime} className="mt-3 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm font-semibold hover:bg-blue-100 disabled:opacity-50">
              Add and mark this class
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Classes for {new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' })}</label>
          {classes.length === 0 ? (
            <p className="text-sm text-gray-500 rounded-xl bg-gray-50 px-4 py-3">No timetable class is assigned for this day. Use Add class for a class taken at a random time.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classes.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => { setSelectedClassId(item.id); setSaved(false); }}
                  className={`text-left px-3 py-2 rounded-xl border text-sm ${selectedClassId === item.id ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'}`}
                >
                  <span className="font-semibold">{item.subjectCode}</span>
                  <span className="block text-xs mt-0.5">{item.startTime}–{item.endTime} · {item.classGroup}{item.attendanceMarked ? ' · Saved' : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedClass && (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedClass.subjectCode} · {selectedClass.subjectName}</h2>
              <p className="text-sm text-gray-500">{selectedClass.classGroup} · {selectedClass.startTime}–{selectedClass.endTime}{selectedClass.room ? ` · ${selectedClass.room}` : ''}</p>
            </div>
            <div className="flex items-center gap-3 sm:ml-auto">
              <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-full">{presentCount} Present</span>
              <span className="text-sm font-semibold text-red-700 bg-red-100 px-3 py-1.5 rounded-full">{absentCount} Absent</span>
              <span className="text-sm text-gray-500">{students.length} total</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={() => markAll('present')} className="text-xs font-medium px-3 py-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50">All Present</button>
              <button onClick={() => markAll('absent')} className="text-xs font-medium px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">All Absent</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingRoster ? <div className="p-8 text-center text-gray-500">Loading students...</div> : (
              <div className="divide-y divide-gray-100">
                {students.map((student, index) => {
                  const isPresent = attendance[student.roll] === 'present';
                  return (
                    <div key={student.roll} className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-gray-50 cursor-pointer ${isPresent ? '' : 'bg-red-50/40'}`} onClick={() => toggle(student.roll)}>
                      <span className="text-xs text-gray-400 w-5 font-mono">{String(index + 1).padStart(2, '0')}</span>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{student.name.split(' ').map((name) => name[0]).join('')}</div>
                      <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-gray-900">{student.name}</div><div className="text-xs text-gray-400 font-mono">{student.roll}</div></div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isPresent ? 'Present' : 'Absent'}</span>
                      {isPresent ? <CheckCircle2 size={18} className="text-green-500" /> : <XCircle size={18} className="text-red-400" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving || saved || students.length === 0} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border font-semibold text-sm transition-colors ${saved ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-60'}`}>
              <Save size={16} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Attendance'}
            </button>
            {saved && <span className="text-sm text-green-700 font-medium"><CheckCircle2 size={14} className="inline mr-1" />Attendance saved for this class</span>}
          </div>
        </>
      )}
    </div>
  );
};
