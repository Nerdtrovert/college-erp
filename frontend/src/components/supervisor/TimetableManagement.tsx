import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Pencil, Plus, Save } from 'lucide-react';
import API from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
  { label: '8:30–9:30', kind: 'class' },
  { label: '9:30–10:30', kind: 'class' },
  { label: '10:30–11:00', kind: 'break' },
  { label: '11:00–12:00', kind: 'class' },
  { label: '12:00–1:00', kind: 'class' },
  { label: '1:00–1:45', kind: 'lunch' },
  { label: '1:45–2:45', kind: 'class' },
  { label: '2:45–3:45', kind: 'class' },
] as const;

const subjectColors = [
  ['bg-blue-50', 'border-blue-200', 'text-blue-700'],
  ['bg-orange-50', 'border-orange-200', 'text-orange-700'],
  ['bg-green-50', 'border-green-200', 'text-green-700'],
  ['bg-purple-50', 'border-purple-200', 'text-purple-700'],
  ['bg-rose-50', 'border-rose-200', 'text-rose-700'],
];

interface SlotForm {
  day: string;
  slotIndex: string;
  classGroup: string;
  subjectCode: string;
  room: string;
  teacherId: string;
}

const emptyForm: SlotForm = {
  day: 'Monday',
  slotIndex: '0',
  classGroup: '',
  subjectCode: '',
  room: '',
  teacherId: '',
};

export const TimetableManagement: React.FC = () => {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [classGroups, setClassGroups] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedClassGroup, setSelectedClassGroup] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ day: string; slotIndex: number } | null>(null);
  const [slotForm, setSlotForm] = useState<SlotForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    Promise.all([
      API.get('/semesters'),
      API.get('/auth/users?role=teacher'),
    ]).then(([semesterResponse, facultyResponse]) => {
      setSemesters(semesterResponse.data || []);
      setFaculty(facultyResponse.data || []);
    }).catch((error) => {
      console.error('Failed to load timetable setup:', error);
      setMessage({ text: 'Unable to load timetable setup.', type: 'error' });
    }).finally(() => setLoading(false));
  }, []);

  const fetchTimetable = async (semesterId: string, classGroup: string) => {
    if (!semesterId || !classGroup) {
      setTimetable([]);
      return;
    }
    try {
      setLoading(true);
      const response = await API.get(`/timetable/semester/${semesterId}?classGroup=${encodeURIComponent(classGroup)}`);
      setTimetable(response.data || []);
    } catch (error) {
      console.error('Failed to fetch timetable:', error);
      setTimetable([]);
      setMessage({ text: 'Unable to load this class timetable.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const selectSemester = async (semesterId: string) => {
    setSelectedSemester(semesterId);
    setSelectedCell(null);
    setSlotForm(emptyForm);
    if (!semesterId) {
      setClassGroups([]);
      setSelectedClassGroup('');
      setTimetable([]);
      return;
    }
    try {
      setLoading(true);
      const response = await API.get(`/timetable/semester/${semesterId}/classes`);
      const groups = response.data || [];
      setClassGroups(groups);
      setSelectedClassGroup(groups[0] || '');
      await fetchTimetable(semesterId, groups[0] || '');
    } catch (error) {
      console.error('Failed to load sections:', error);
      setClassGroups([]);
      setSelectedClassGroup('');
      setTimetable([]);
    } finally {
      setLoading(false);
    }
  };

  const selectClassGroup = (classGroup: string) => {
    setSelectedClassGroup(classGroup);
    setSelectedCell(null);
    setSlotForm((current) => ({ ...current, classGroup }));
    fetchTimetable(selectedSemester, classGroup);
  };

  const getSlot = (day: string, slotIndex: number) => {
    const row = timetable.find((item) => item.day === day);
    return row?.slots?.[slotIndex] || null;
  };

  const selectCell = (day: string, slotIndex: number) => {
    if (PERIODS[slotIndex].kind !== 'class') return;
    const slot = getSlot(day, slotIndex);
    setSelectedCell({ day, slotIndex });
    setSlotForm({
      day,
      slotIndex: String(slotIndex),
      classGroup: selectedClassGroup,
      subjectCode: slot?.subjectCode || '',
      room: slot?.room === 'LH-N/A' ? '' : slot?.room || '',
      teacherId: slot?.teacherId || '',
    });
    setMessage(null);
  };

  const saveSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSemester || !selectedClassGroup || !slotForm.subjectCode || !slotForm.teacherId) return;
    setSaving(true);
    setMessage(null);
    try {
      await API.put('/timetable/slot', {
        ...slotForm,
        classGroup: selectedClassGroup,
        semesterId: selectedSemester,
        slotIndex: Number(slotForm.slotIndex),
      });
      await fetchTimetable(selectedSemester, selectedClassGroup);
      setMessage({ text: 'Timetable updated successfully.', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.response?.data?.error || 'Unable to save timetable slot.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const currentSemester = useMemo(
    () => semesters.find((semester) => semester.id === selectedSemester),
    [semesters, selectedSemester],
  );

  if (loading && semesters.length === 0) {
    return <div className="p-6 text-center text-gray-500 font-medium">Loading timetables...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetables</h1>
        <p className="text-gray-500 text-sm mt-1">Select a class and click a period to view or edit its allocation.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Semester</label>
            <select
              value={selectedSemester}
              onChange={(event) => selectSemester(event.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Select semester</option>
              {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name} ({semester.status})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Section</label>
            <select
              value={selectedClassGroup}
              onChange={(event) => selectClassGroup(event.target.value)}
              disabled={!selectedSemester}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Select section</option>
              {classGroups.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!selectedSemester || !selectedClassGroup ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
          Select a semester and section to view the weekly timetable.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedClassGroup} weekly timetable</h2>
                <p className="text-xs text-gray-500 mt-1">{currentSemester?.name || 'Selected semester'} · Click any class period to edit</p>
              </div>
              <CalendarDays size={19} className="text-blue-600" />
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {DAYS.map((day) => (
                <section key={day} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50/60">
                  <div className="border-b border-gray-100 bg-white px-4 py-3">
                    <h3 className="text-sm font-bold text-gray-900">{day}</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {PERIODS.map((period, slotIndex) => {
                      if (period.kind !== 'class') {
                        return (
                          <div key={period.label} className="flex items-center justify-between px-4 py-2.5 text-xs text-gray-400">
                            <span>{period.label}</span>
                            <span>{period.kind === 'break' ? 'Break' : 'Lunch'}</span>
                          </div>
                        );
                      }
                      const slot = getSlot(day, slotIndex);
                      const color = subjectColors[(day.length + slotIndex) % subjectColors.length];
                      const selected = selectedCell?.day === day && selectedCell.slotIndex === slotIndex;
                      return (
                        <button
                          key={period.label}
                          type="button"
                          onClick={() => selectCell(day, slotIndex)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left ${selected ? 'bg-blue-50' : 'bg-white'}`}
                        >
                          <span className="w-[4.5rem] shrink-0 text-[11px] font-semibold text-gray-400">{period.label}</span>
                          {slot ? (
                            <span className={`min-w-0 flex-1 rounded-lg border px-3 py-2 ${color[0]} ${color[1]}`}>
                              <span className={`block text-sm font-semibold ${color[2]}`}>{slot.subjectCode}</span>
                              <span className="mt-0.5 block truncate text-xs text-gray-500">{slot.room || 'Room TBD'} · {slot.teacherId}</span>
                            </span>
                          ) : (
                            <span className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
                              <Plus size={14} className="mr-1" /> Add class
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="bg-gray-50/70">
                    <th className="w-[120px] px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Day</th>
                    {PERIODS.map((period) => (
                      <th key={period.label} className={`px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${period.kind === 'class' ? 'text-gray-500' : 'text-gray-300'}`}>
                        {period.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day} className="border-t border-gray-100">
                      <td className="px-5 py-4 text-sm font-semibold text-gray-800">{day}</td>
                      {PERIODS.map((period, slotIndex) => {
                        if (period.kind !== 'class') {
                          return <td key={period.label} className="px-2 py-3 text-center text-xs text-gray-300">{period.kind === 'break' ? 'Break' : 'Lunch'}</td>;
                        }
                        const slot = getSlot(day, slotIndex);
                        const color = subjectColors[(day.length + slotIndex) % subjectColors.length];
                        const selected = selectedCell?.day === day && selectedCell.slotIndex === slotIndex;
                        return (
                          <td key={period.label} className="px-2 py-2 align-middle">
                            <button
                              type="button"
                              onClick={() => selectCell(day, slotIndex)}
                              className={`w-full min-h-[76px] rounded-xl border px-3 py-3 text-left transition-all ${slot ? `${color[0]} ${color[1]}` : 'bg-gray-50 border-dashed border-gray-200'} ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:border-blue-300 hover:shadow-sm'}`}
                            >
                              {slot ? (
                                <>
                                  <span className={`block text-sm font-semibold leading-tight ${color[2]}`}>{slot.subjectCode}</span>
                                  <span className="block text-[11px] text-gray-500 mt-1 truncate">{slot.room || 'Room TBD'}</span>
                                  <span className="block text-[11px] text-gray-400 mt-1 truncate">{slot.teacherId}</span>
                                </>
                              ) : (
                                <span className="flex h-full min-h-[50px] items-center justify-center text-gray-300"><Plus size={17} /></span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedCell && (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><Pencil size={17} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900">Edit period</h2>
                  <p className="text-xs text-gray-500">{slotForm.day} · {PERIODS[Number(slotForm.slotIndex)].label}</p>
                </div>
              </div>
              <form onSubmit={saveSlot} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subject code</label>
                  <input required value={slotForm.subjectCode} onChange={(event) => setSlotForm({ ...slotForm, subjectCode: event.target.value })} placeholder="e.g. CS2301" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Faculty</label>
                  <select required value={slotForm.teacherId} onChange={(event) => setSlotForm({ ...slotForm, teacherId: event.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Select faculty</option>
                    {faculty.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.id})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Room</label>
                  <input value={slotForm.room} onChange={(event) => setSlotForm({ ...slotForm, room: event.target.value })} placeholder="Optional" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <button type="submit" disabled={saving} className="h-[42px] inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-100 px-4 text-sm font-semibold text-blue-800 hover:bg-blue-200 disabled:opacity-60">
                  {saving ? <Clock3 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : 'Save period'}
                </button>
              </form>
              {message && <div className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.type === 'success' && <Check size={15} />}{message.text}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
};
