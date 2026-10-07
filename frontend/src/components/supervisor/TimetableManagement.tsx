import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Pencil, Plus, Save } from 'lucide-react';
import API from '../../services/api';
import { DropdownSelect } from '../ui/DropdownSelect';

// Helper function to get ordinal suffix for numbers
function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

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
  classGroup: string; // Represents the section
  subjectCode: string;
  activityType: string;
  room: string;
  teacherId: string;
  coTeacherId: string;
}

const emptyForm: SlotForm = {
  day: 'Monday',
  slotIndex: '0',
  classGroup: '', // Will be set to section when needed
  subjectCode: '',
  activityType: '',
  room: '',
  teacherId: '',
  coTeacherId: '',
};

export const TimetableManagement: React.FC = () => {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [studentSemesters, setStudentSemesters] = useState<any[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<string>('');
  const [selectedStudentSemester, setSelectedStudentSemester] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ day: string; slotIndex: number } | null>(null);
  const [slotForm, setSlotForm] = useState<SlotForm>(emptyForm);

  // Helper function to get faculty name by ID
  const getFacultyName = (teacherId: string): string => {
    const facultyMember = faculty.find((f) => f.id === teacherId);
    return facultyMember ? facultyMember.name : teacherId; // fallback to ID if not found
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Import feature state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [subjectsNeedingConfiguration, setSubjectsNeedingConfiguration] = useState<Array<{ code: string; name: string; isNew?: boolean }>>([]);
  const [courseTypeSelections, setCourseTypeSelections] = useState<Record<string, string>>({});
  const [importInvalidEntries, setImportInvalidEntries] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);

  // Get active semester on component load
  useEffect(() => {
    const loadActiveSemester = async () => {
      try {
        // Use the existing faculty status endpoint which returns the active semester
        const response = await API.get('/timetable/faculty-status');
        if (response.data?.semester?.id) {
          setActiveSemesterId(response.data.semester.id);

          // Also load semesters and faculty for dropdowns
          const [semesterResponse, facultyResponse] = await Promise.all([
            API.get('/semesters'),
            API.get('/auth/users?role=teacher'),
          ]);
          setSemesters(semesterResponse.data || []);
          setFaculty(facultyResponse.data || []);
        } else {
          // Fallback: get all semesters and find the active one
          const semesterResponse = await API.get('/semesters');
          const activeSemester = (semesterResponse.data || []).find((s: any) => s.status === 'ACTIVE');
          if (activeSemester) {
            setActiveSemesterId(activeSemester.id);
          }
          setSemesters(semesterResponse.data || []);

          const facultyResponse = await API.get('/auth/users?role=teacher');
          setFaculty(facultyResponse.data || []);
        }
      } catch (error) {
        console.error('Failed to load active semester:', error);
        // Fallback to loading all semesters
        Promise.all([
          API.get('/semesters'),
          API.get('/auth/users?role=teacher'),
        ]).then(([semesterResponse, facultyResponse]) => {
          setSemesters(semesterResponse.data || []);
          setFaculty(facultyResponse.data || []);

          // Try to find active semester from the list
          const activeSemester = (semesterResponse.data || []).find((s: any) => s.status === 'ACTIVE');
          if (activeSemester) {
            setActiveSemesterId(activeSemester.id);
          }
        }).catch((error) => {
          console.error('Failed to load timetable setup:', error);
          setMessage({ text: 'Unable to load timetable setup.', type: 'error' });
        });
      } finally {
        setLoading(false);
      }
    };

    loadActiveSemester();
  }, []);

  // Load student semesters for the current active academic term once resolved
  useEffect(() => {
    if (activeSemesterId) {
      loadStudentSemestersForSemester(activeSemesterId);
    }
  }, [activeSemesterId]);

  const loadStudentSemestersForSemester = async (semesterId: string) => {
    if (!semesterId) {
      setStudentSemesters([]);
      setSelectedStudentSemester('');
      setPrograms([]);
      setSelectedProgram('');
      setSections([]);
      setSelectedSection('');
      setTimetable([]);
      return;
    }
    try {
      const response = await API.get(`/semesters/${semesterId}/student-semesters`);
      const data = response.data || [];
      setStudentSemesters(data);
      // Do not auto-select first student semester - let user choose
    } catch (error) {
      console.error('Failed to load student semesters for semester:', error);
      setStudentSemesters([]);
    }
  };

  const loadProgramsForSemesterAndStudentSemester = async (semesterId: string, studentSemesterId: string) => {
    if (!semesterId || !studentSemesterId) {
      setPrograms([]);
      setSelectedProgram('');
      setSections([]);
      setSelectedSection('');
      setTimetable([]);
      return;
    }
    try {
      const response = await API.get(`/semesters/${semesterId}/student-semesters/${studentSemesterId}/programs`);
      const data = response.data || [];
      setPrograms(data);
    } catch (error) {
      console.error('Failed to load programs for semester and student semester:', error);
      setPrograms([]);
    }
  };

  const loadSectionsForSemesterStudentSemesterAndProgram = async (semesterId: string, studentSemesterId: string, program: string) => {
    if (!semesterId || !studentSemesterId || !program) {
      setSections([]);
      setSelectedSection('');
      setTimetable([]);
      return;
    }
    try {
      const response = await API.get(`/semesters/${semesterId}/student-semesters/${studentSemesterId}/programs/${program}/sections`);
      const sections = response.data || [];
      setSections(sections);

      // Auto-select section if only one exists, otherwise reset selection
      if (sections.length === 1) {
        setSelectedSection(sections[0]);
        // Load timetable for the selected semester, program, and section
        fetchTimetable(semesterId, sections[0]);
      } else if (sections.length > 1) {
        setSelectedSection('');
        setTimetable([]);
      } else {
        // No sections exist - leave section selection empty and allow optional section
        setSelectedSection('');
        setTimetable([]);
      }
    } catch (error) {
      console.error('Failed to load sections for semester, student semester, and program:', error);
      setSections([]);
      setSelectedSection('');
      setTimetable([]);
    }
  };

  const fetchTimetable = async (semesterId: string, section: string) => {
    // Use the active semester ID for fetching timetable
    const effectiveSemesterId = activeSemesterId || semesterId;
    // Section is required as classGroup for the timetable endpoint
    if (!effectiveSemesterId) {
      setTimetable([]);
      return;
    }
    try {
      setLoading(true);
      // The backend expects classGroup as query parameter, which corresponds to our section
      const response = await API.get(`/timetable/semester/${effectiveSemesterId}?classGroup=${encodeURIComponent(section || '')}`);
      setTimetable(response.data || []);
    } catch (error) {
      console.error('Failed to fetch timetable:', error);
      setTimetable([]);
      setMessage({ text: 'Unable to load this class timetable.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const selectStudentSemester = async (studentSemesterId: string) => {
    setSelectedStudentSemester(studentSemesterId);
    setSelectedProgram('');
    setSelectedSection('');
    setSelectedCell(null);
    setSlotForm(emptyForm);

    // Load programs for the selected active semester and student semester
    await loadProgramsForSemesterAndStudentSemester(activeSemesterId, studentSemesterId);
  };

  const selectProgram = async (program: string) => {
    setSelectedProgram(program);
    setSelectedSection('');
    setSelectedCell(null);
    setSlotForm(emptyForm);

    // Load sections for the selected active semester, student semester, and program
    await loadSectionsForSemesterStudentSemesterAndProgram(activeSemesterId, selectedStudentSemester, program);
  };

  const selectSection = (section: string) => {
    setSelectedSection(section);
    setSelectedCell(null);
    setSlotForm((current) => ({ ...current, classGroup: section })); // Keep classGroup for form compatibility
    // Load timetable for the selected active semester, program, and section
    fetchTimetable(activeSemesterId, section);
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
      classGroup: selectedSection, // Use section for classGroup in the form
      subjectCode: slot?.subjectCode || '',
      activityType: slot?.activityType || '',
      room: slot?.room === 'LH-N/A' ? '' : slot?.room || '',
      teacherId: slot?.teacherId || '',
      coTeacherId: slot?.coTeacherId || '',
    });
    setMessage(null);
  };

  const saveSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeSemesterId || !selectedProgram || !slotForm.subjectCode || !slotForm.teacherId) return;
    setSaving(true);
    setMessage(null);
    try {
      await API.put('/timetable/slot', {
        ...slotForm,
        classGroup: selectedSection, // Use section for classGroup in the form
        semesterId: activeSemesterId,
        slotIndex: Number(slotForm.slotIndex),
      });
      await fetchTimetable(activeSemesterId, selectedSection);
      setMessage({ text: 'Timetable updated successfully.', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.response?.data?.error || 'Unable to save timetable slot.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const currentSemester = useMemo(
    () => semesters.find((semester) => semester.id === activeSemesterId),
    [semesters, activeSemesterId]
  );

  // Import feature handlers
  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setImportFile(null);
      return;
    }
    const file = files[0];
    if (file.type !== 'application/pdf') {
      setImportError('Please upload a PDF file');
      setImportFile(null);
      return;
    }
    setImportFile(file);
    setImportError(null);
    setImportSuccess(null);
    setImportPreview([]);
    setSubjectsNeedingConfiguration([]);
    setCourseTypeSelections({});
    setImportInvalidEntries([]);
  };

  const handleParseImport = async () => {
    if (!importFile) return;

    setImportLoading(true);
    setImportError(null);
    setImportPreview([]);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await API.post('/timetable/parse', formData);
      const data = response.data || {};
      setImportPreview(data.entries || []);
      setSubjectsNeedingConfiguration(data.subjectsNeedingConfiguration || []);
      setCourseTypeSelections(Object.fromEntries(
        (data.subjectsNeedingConfiguration || []).map((subject: { code: string }) => [subject.code, '']),
      ));
      setImportInvalidEntries(data.invalidEntries || []);
      setImportSuccess(null);
    } catch (error: any) {
      setImportError(error.response?.data?.error || 'Failed to parse timetable');
      setImportPreview([]);
      setSubjectsNeedingConfiguration([]);
      setCourseTypeSelections({});
      setImportInvalidEntries([]);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile || importPreview.length === 0) return;
    if (importInvalidEntries.length) {
      setImportError('Resolve all timetable validation errors before importing.');
      return;
    }
    if (subjectsNeedingConfiguration.some(subject => !courseTypeSelections[subject.code])) {
      setImportError('Select a course type for every subject that needs configuration.');
      return;
    }

    setImportLoading(true);
    setImportError(null);

    try {
      await API.post('/timetable/import', { entries: importPreview, courseTypes: courseTypeSelections });

      setImportSuccess(true);
      setImportError(null);
      // Refresh timetable data after successful import
      if (activeSemesterId) {
        await fetchTimetable(activeSemesterId, selectedSection);
      }
    } catch (error: any) {
      setImportSuccess(false);
      setImportError(error.response?.data?.error || 'Failed to import timetable');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCancelImport = () => {
    setImportFile(null);
    setImportPreview([]);
    setSubjectsNeedingConfiguration([]);
    setCourseTypeSelections({});
    setImportInvalidEntries([]);
    setImportError(null);
    setImportSuccess(null);
    // Reset file input
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) {
      (fileInput as HTMLInputElement).value = '';
    }
  };

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
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Semester</label>
            <DropdownSelect
              value={selectedStudentSemester}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => selectStudentSemester(event.target.value)}
              disabled={!activeSemesterId}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Select semester</option>
              {studentSemesters.map((sem) => <option key={sem.id} value={sem.id}>{sem.name}</option>)}
            </DropdownSelect>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Program</label>
            <DropdownSelect
              value={selectedProgram}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => selectProgram(event.target.value)}
              disabled={!activeSemesterId || !selectedStudentSemester}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Select program</option>
              {programs.map((program) => <option key={program} value={program}>{program}</option>)}
            </DropdownSelect>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Section</label>
            <DropdownSelect
              value={selectedSection}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => selectSection(event.target.value)}
              disabled={!activeSemesterId || !selectedStudentSemester || !selectedProgram}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              {sections.length === 0 ? <option value="">(Optional)</option> : (sections.length > 1 ? <option value="">Select Section...</option> : null)}
              {sections.map((section) => <option key={section} value={section}>{section}</option>)}
            </DropdownSelect>
          </div>
        </div>
      </div>

      {!activeSemesterId || !selectedStudentSemester || !selectedProgram ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
          Select a semester and program to view the weekly timetable.
        </div>
      ) : (
        <>
          {selectedCell && (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><Pencil size={17} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900">Edit period</h2>
                  <p className="text-xs text-gray-500">{slotForm.day} · {PERIODS[Number(slotForm.slotIndex)].label}</p>
                </div>
              </div>
              <form onSubmit={saveSlot} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subject code</label>
                  <input required value={slotForm.subjectCode} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSlotForm({ ...slotForm, subjectCode: event.target.value })} placeholder="e.g. SUBJECT101" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Faculty</label>
                  <DropdownSelect required value={slotForm.teacherId} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSlotForm({ ...slotForm, teacherId: event.target.value })} className="w-full rounded-xl px-4 py-2.5">
                    <option value="">Select faculty</option>
                    {faculty.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.email || '—'})</option>)}
                  </DropdownSelect>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Co-Teacher</label>
                  <DropdownSelect value={slotForm.coTeacherId || ''} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSlotForm({ ...slotForm, coTeacherId: event.target.value })} className="w-full rounded-xl px-4 py-2.5">
                    <option value="">None</option>
                    {faculty.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.email || '—'})</option>)}
                  </DropdownSelect>
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

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {selectedSection ? `${getOrdinalSuffix(parseInt(selectedStudentSemester))} Semester · ${selectedProgram} · ${selectedSection}` : `${getOrdinalSuffix(parseInt(selectedStudentSemester))} Semester · ${selectedProgram}`} weekly timetable
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {currentSemester?.name || 'Active semester'} ·
                  {selectedProgram} ·
                  {selectedSection || ''} ·
                  Click any class period to edit
                </p>
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
                              <div className="flex flex-col">
                                <span className={`block text-sm font-semibold ${color[2]}`}>{slot.subjectCode}</span>
                                <span className="block text-[11px] text-gray-500 mt-1">{slot.activityType}</span>
                              </div>
                              <span className="block text-[11px] text-gray-500 mt-1 truncate">{slot.room || 'Room TBD'}</span>
                              <span className="block text-[11px] text-gray-400 mt-1 truncate">{getFacultyName(slot.teacherId || '')}</span>
                              {slot.coTeacherId && (
                                <span className="block text-[11px] text-gray-400 mt-1 truncate">{getFacultyName(slot.coTeacherId || '')}</span>
                              )}
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
                          <td key={period.label} className={`px-2 py-2 align-middle ${selected ? 'bg-blue-50' : ''}`}>
                            <button
                              type="button"
                              onClick={() => selectCell(day, slotIndex)}
                              className="w-full min-h-[76px] rounded-xl border px-3 py-3 text-left"
                            >
                              {slot ? (
                                <>
                                  <div className="flex flex-col">
                                    <span className={`block text-sm font-semibold leading-tight ${color[2]}`}>{slot.subjectCode}</span>
                                    <span className="block text-[11px] text-gray-500 mt-1">{slot.activityType}</span>
                                  </div>
                                  <span className="block text-[11px] text-gray-500 mt-1 truncate">{slot.room || 'Room TBD'}</span>
                                  <span className="block text-[11px] text-gray-500 mt-1 truncate">{getFacultyName(slot.teacherId || '')}</span>
                                  {slot.coTeacherId && (
                                    <span className="block text-[11px] text-gray-400 mt-1 truncate">{getFacultyName(slot.coTeacherId || '')}</span>
                                  )}
                                </>
                              ) : (
                                <span className="flex h-full min-h-[50px] items-center justify-center text-gray-300"><Plus size={14} className="mr-1" /> Add class</span>
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

        </>
      )}

      {/* Import Feature Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Import Timetable from PDF</h2>
            {importSuccess === true && (
              <button
                onClick={handleCancelImport}
                className="text-sm font-semibold text-green-600 hover:text-green-500"
              >
                Import another
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Semester</label>
              <DropdownSelect
                value={selectedStudentSemester}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => selectStudentSemester(event.target.value)}
                disabled={!activeSemesterId}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Select semester</option>
                {studentSemesters.map((sem) => <option key={sem.id} value={sem.id}>{sem.name}</option>)}
              </DropdownSelect>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Program</label>
              <DropdownSelect
                value={selectedProgram}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => selectProgram(event.target.value)}
                disabled={!activeSemesterId || !selectedStudentSemester}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Select program</option>
                {programs.map((program) => <option key={program} value={program}>{program}</option>)}
              </DropdownSelect>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Section</label>
              <DropdownSelect
                value={selectedSection}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => selectSection(event.target.value)}
                disabled={!activeSemesterId || !selectedStudentSemester || !selectedProgram}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                {sections.length === 0 ? <option value="">(Optional)</option> : (sections.length > 1 ? <option value="">Select Section...</option> : null)}
                {sections.map((section) => <option key={section} value={section}>{section}</option>)}
              </DropdownSelect>
            </div>
          </div>
          {/* File Upload */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Upload PDF Timetable
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="import-file-input"
                type="file"
                accept=".pdf"
                onChange={handleImportFileChange}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                disabled={!importFile || importLoading}
                onClick={handleParseImport}
                className="px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-100 text-sm font-semibold text-blue-800 hover:bg-blue-200 disabled:opacity-60"
              >
                {importLoading ? 'Parsing...' : 'Parse PDF'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {importError && (
            <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
              {importError}
            </div>
          )}

          {/* Success Message */}
          {importSuccess === true && (
            <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm">
              Timetable imported successfully!
            </div>
          )}

          {subjectsNeedingConfiguration.length > 0 && !importLoading && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-amber-900">New Subjects Detected</h3>
                <p className="mt-1 text-xs text-amber-800">
                  Choose a course type for each unconfigured subject. Subject codes come directly from the PDF.
                </p>
              </div>
              {subjectsNeedingConfiguration.map(subject => (
                <div key={subject.code} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{subject.code}</div>
                    {!subject.isNew && <div className="text-xs text-gray-500">Existing subject needs configuration</div>}
                  </div>
                  <select
                    value={courseTypeSelections[subject.code] || ''}
                    onChange={event => setCourseTypeSelections(current => ({ ...current, [subject.code]: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    aria-label={`Course type for ${subject.code}`}
                  >
                    <option value="">Select course type</option>
                    <option value="STANDALONE">Standalone (theory-only or lab-only)</option>
                    <option value="INTEGRATED">Integrated (theory + lab)</option>
                    <option value="PROJECT">Project</option>
                  </select>
                </div>
              ))}
            </section>
          )}

          {importInvalidEntries.length > 0 && !importLoading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">{importInvalidEntries.length} timetable entries need attention before import.</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {importInvalidEntries.map((item, index) => (
                  <li key={`${item.entry?.subjectCode || 'entry'}-${index}`}>
                    {item.entry?.subjectCode || 'Entry'} ({item.entry?.day || 'unknown day'}): {(item.errors || []).join('; ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Section */}
          {importPreview.length > 0 && !importLoading && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
                <button
                  onClick={handleCancelImport}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-400"
                >
                  Cancel
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Semester
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Section
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Effective Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Day
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Start Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        End Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Subject Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Activity Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Room
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Faculty from PDF
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((entry, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.semester || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.section || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.effectiveDate || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.day || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.startTime || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.endTime || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.subjectCode || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.activityType || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.room || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{entry.facultyNames?.join(' / ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <button
                  disabled={importLoading || importInvalidEntries.length > 0 || subjectsNeedingConfiguration.some(subject => !courseTypeSelections[subject.code])}
                  onClick={handleConfirmImport}
                  className="w-flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-200 disabled:opacity-60"
                >
                  {importLoading ? <Clock3 size={16} className="animate-spin" /> : ''}
                  {importLoading ? 'Importing...' : 'Confirm Import'}
                </button>
              </div>
            </>
          )}

          {/* Help Text */}
          {!importFile && importPreview.length === 0 && (
            <p className="text-xs text-gray-500">
              Upload a PDF timetable to parse and import. The backend will handle
              extraction, validation, and transactional import.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
