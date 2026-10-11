import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, Pencil, Plus, Save, Search, UserPlus, X } from 'lucide-react';
import API from '../../services/api';
import { DropdownSelect } from '../ui/DropdownSelect';
import { STUDENT_PROGRAMS } from '../../constants/program';

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
  studentSemesterNumber: string;
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
  studentSemesterNumber: '',
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

  // Helper function to get faculty name by ID, email, or original name string
  const getFacultyName = (teacherId: string): string => {
    const facultyMember = faculty.find((f) => f.id === teacherId || f.email === teacherId || f.name === teacherId);
    return facultyMember ? facultyMember.name : teacherId; // fallback to original string if not found
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

  // Faculty resolution state for import
  const [facultyResolutions, setFacultyResolutions] = useState<Record<string, { id: string | null; name: string; email?: string }>>({});
  const [unresolvedFacultyList, setUnresolvedFacultyList] = useState<Array<{
    name: string;
    suggestions: Array<{ id: string; name: string; department?: string; classGroup?: string }>;
  }>>([]);
  const [resolvingFacultyName, setResolvingFacultyName] = useState<string | null>(null);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [facultySearchResults, setFacultySearchResults] = useState<Array<{ id: string; name: string; department?: string; email?: string }>>([]);
  const [searchingFaculty, setSearchingFaculty] = useState(false);

  // Create new faculty modal state
  const [showCreateFacultyModal, setShowCreateFacultyModal] = useState(false);
  const [createFacultyName, setCreateFacultyName] = useState('');
  const [createFacultyEmail, setCreateFacultyEmail] = useState('');
  const [createFacultyPassword, setCreateFacultyPassword] = useState('');
  const [createFacultyDepartment, setCreateFacultyDepartment] = useState('');
  const [createFacultyLoading, setCreateFacultyLoading] = useState(false);
  const [createFacultyError, setCreateFacultyError] = useState<string | null>(null);

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
            API.get('/auth/users?role=teacher,dean,principal,hod'),
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

          const facultyResponse = await API.get('/auth/users?role=teacher,dean,principal,hod');
          setFaculty(facultyResponse.data || []);
        }
      } catch (error) {
        console.error('Failed to load active semester:', error);
        // Fallback to loading all semesters
        Promise.all([
          API.get('/semesters'),
          API.get('/auth/users?role=teacher,dean,principal,hod'),
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
      // Keep every supported program selectable, including programs without
      // enrollments yet for this semester.
      setPrograms([...new Set([...STUDENT_PROGRAMS, ...data])]);
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
      let queryParams = `classGroup=${encodeURIComponent(section || '')}`;
      if (selectedStudentSemester) {
        queryParams += `&studentSemesterNumber=${selectedStudentSemester}`;
      }
      const response = await API.get(`/timetable/semester/${effectiveSemesterId}?${queryParams}`);
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
      studentSemesterNumber: slot?.studentSemesterNumber ? String(slot?.studentSemesterNumber) : (selectedStudentSemester || ''),
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
        studentSemesterNumber: slotForm.studentSemesterNumber || selectedStudentSemester,
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
    setFacultyResolutions({});
    setUnresolvedFacultyList([]);
    setResolvingFacultyName(null);
    setShowCreateFacultyModal(false);
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
      const entries: any[] = data.entries || [];
      setImportPreview(entries);
      setSubjectsNeedingConfiguration(data.subjectsNeedingConfiguration || []);
      setCourseTypeSelections(Object.fromEntries(
        (data.subjectsNeedingConfiguration || []).map((subject: { code: string }) => [subject.code, '']),
      ));
      setImportInvalidEntries(data.invalidEntries || []);
      setImportSuccess(null);

      // Initialize faculty resolutions
      const unresolved: Array<{
        name: string;
        suggestions: Array<{ id: string; name: string; department?: string; classGroup?: string }>;
      }> = data.unresolvedFaculty || [];
      setUnresolvedFacultyList(unresolved);

      const initialResolutions: Record<string, { id: string | null; name: string; email?: string }> = {};

      // Seed resolved faculty from preview entries that already matched a facultyUserIds
      for (const entry of entries) {
        if (entry.facultyNames && Array.isArray(entry.facultyNames)) {
          entry.facultyNames.forEach((name: string, idx: number) => {
            const matchedUserId = entry.facultyUserIds?.[idx];
            if (matchedUserId && !initialResolutions[name]) {
              const matchedFaculty = faculty.find(f => f.id === matchedUserId);
              initialResolutions[name] = {
                id: matchedUserId,
                name: matchedFaculty?.name || name,
                email: matchedFaculty?.email,
              };
            }
          });
        }
      }
      setFacultyResolutions(initialResolutions);
    } catch (error: any) {
      setImportError(error.response?.data?.error || 'Failed to parse timetable');
      setImportPreview([]);
      setSubjectsNeedingConfiguration([]);
      setCourseTypeSelections({});
      setImportInvalidEntries([]);
      setFacultyResolutions({});
      setUnresolvedFacultyList([]);
    } finally {
      setImportLoading(false);
    }
  };

  // Autocomplete faculty search handler
  const handleSearchFaculty = async (query: string) => {
    setFacultySearchQuery(query);
    if (!query.trim()) {
      setFacultySearchResults([]);
      return;
    }
    setSearchingFaculty(true);
    try {
      const response = await API.post('/timetable/faculty/search', { name: query.trim() });
      const similar = response.data?.similar || [];
      // Also filter local faculty list for matching names/emails to give instant comprehensive suggestions
      const q = query.toLowerCase();
      const localMatches = faculty
        .filter(f => (f.name?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q)))
        .map(f => ({ id: f.id, name: f.name, department: f.department, email: f.email }));

      const combined = [...similar];
      for (const m of localMatches) {
        if (!combined.some(c => c.id === m.id)) {
          combined.push(m);
        }
      }
      setFacultySearchResults(combined);
    } catch (err) {
      // Fallback to local faculty filter
      const q = query.toLowerCase();
      const localMatches = faculty
        .filter(f => (f.name?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q)))
        .map(f => ({ id: f.id, name: f.name, department: f.department, email: f.email }));
      setFacultySearchResults(localMatches);
    } finally {
      setSearchingFaculty(false);
    }
  };

  // Assign resolved faculty to a PDF name
  const handleAssignFaculty = (pdfName: string, selected: { id: string | null; name: string; email?: string }) => {
    setFacultyResolutions(prev => ({
      ...prev,
      [pdfName]: selected,
    }));
    setResolvingFacultyName(null);
    setFacultySearchQuery('');
    setFacultySearchResults([]);
  };

  // Create new faculty account and automatically assign it
  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFacultyName.trim() || !createFacultyEmail.trim() || !createFacultyPassword.trim()) {
      setCreateFacultyError('Name, email, and password are required.');
      return;
    }

    setCreateFacultyLoading(true);
    setCreateFacultyError(null);
    try {
      const response = await API.post('/timetable/faculty/create', {
        name: createFacultyName.trim(),
        email: createFacultyEmail.trim(),
        password: createFacultyPassword.trim(),
        department: createFacultyDepartment.trim() || undefined,
      });

      const newUser = response.data?.user;
      if (newUser) {
        // Add to faculty list
        setFaculty(prev => [...prev, newUser]);
        // If resolving for a specific PDF name, link it
        if (resolvingFacultyName) {
          handleAssignFaculty(resolvingFacultyName, {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
          });
        }
        setShowCreateFacultyModal(false);
        setCreateFacultyName('');
        setCreateFacultyEmail('');
        setCreateFacultyPassword('');
        setCreateFacultyDepartment('');
      }
    } catch (err: any) {
      setCreateFacultyError(err.response?.data?.error || 'Failed to create faculty member');
    } finally {
      setCreateFacultyLoading(false);
    }
  };

  // Open the resolution modal for a specific faculty name
  const openResolveModal = (pdfName: string) => {
    setResolvingFacultyName(pdfName);
    setFacultySearchQuery(pdfName);
    handleSearchFaculty(pdfName);
  };

  const handleConfirmImport = async () => {
    if (!importFile || importPreview.length === 0) return;
    if (!activeSemesterId || !selectedStudentSemester || !selectedProgram || !selectedSection) {
      setImportError('Select the semester, program, and section before importing.');
      return;
    }
    if (importInvalidEntries.length) {
      setImportError('Resolve all timetable validation errors before importing.');
      return;
    }
    if (subjectsNeedingConfiguration.some(subject => !courseTypeSelections[subject.code])) {
      setImportError('Select a course type for every subject that needs configuration.');
      return;
    }

    // Check if any extracted faculty name remains unresolved
    const allExtractedFacultyNames = Array.from(
      new Set(
        importPreview.flatMap(entry => (entry.facultyNames && Array.isArray(entry.facultyNames)) ? entry.facultyNames : [])
      )
    );
    const unresolvedNames = allExtractedFacultyNames.filter(name => !facultyResolutions[name]);
    if (unresolvedNames.length > 0) {
      setImportError(`Please resolve all faculty names before importing (${unresolvedNames.join(', ')}). You may assign an existing faculty, create a new one, or set as Unassigned.`);
      return;
    }

    setImportLoading(true);
    setImportError(null);

    try {
      // Map resolutions into entry.facultyUserIds
      const entriesToImport = importPreview.map(entry => {
        const names: string[] = Array.isArray(entry.facultyNames) ? entry.facultyNames : [];
        const userIds = names.map(n => facultyResolutions[n]?.id || null);
        return {
          ...entry,
          facultyUserIds: userIds,
        };
      });

      await API.post('/timetable/import', {
        entries: entriesToImport,
        courseTypes: courseTypeSelections,
        semesterId: activeSemesterId,
        studentSemesterNumber: Number(selectedStudentSemester),
        program: selectedProgram,
        classGroup: selectedSection,
      });

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
    setFacultyResolutions({});
    setUnresolvedFacultyList([]);
    setResolvingFacultyName(null);
    setShowCreateFacultyModal(false);
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

          {/* Unresolved Faculty Banner / Action Section */}
          {importPreview.length > 0 && !importLoading && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-950 flex items-center gap-1.5">
                    <UserPlus size={16} className="text-indigo-600" />
                    Faculty Account Resolution
                  </h3>
                  <p className="text-xs text-indigo-800/80 mt-0.5">
                    Match faculty extracted from the PDF with system accounts or create new accounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResolvingFacultyName(null);
                    setCreateFacultyName('');
                    setCreateFacultyEmail('');
                    setCreateFacultyPassword('Welcome@123');
                    setCreateFacultyDepartment('');
                    setCreateFacultyError(null);
                    setShowCreateFacultyModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
                >
                  <Plus size={14} />
                  Create Faculty Account
                </button>
              </div>

              {/* Status List for Distinct Faculty Names */}
              {(() => {
                const uniqueNames = Array.from(
                  new Set(
                    importPreview.flatMap(entry => (entry.facultyNames && Array.isArray(entry.facultyNames)) ? entry.facultyNames : [])
                  )
                );
                if (uniqueNames.length === 0) return null;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {uniqueNames.map(name => {
                      const res = facultyResolutions[name];
                      const isResolved = Boolean(res);
                      const isUnassigned = res && res.id === null;

                      return (
                        <div
                          key={name}
                          className={`flex items-center justify-between p-2.5 rounded-lg border bg-white text-xs ${
                            isResolved
                              ? isUnassigned
                                ? 'border-gray-200 text-gray-700'
                                : 'border-emerald-200 text-emerald-900 bg-emerald-50/20'
                              : 'border-amber-200 text-amber-900 bg-amber-50/40'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold truncate">{name}</div>
                            <div className="text-[11px] text-gray-500 truncate">
                              {isResolved
                                ? isUnassigned
                                  ? 'Marked as Unassigned'
                                  : `→ ${res.name}${res.email ? ` (${res.email})` : ''}`
                                : 'Needs matching or account creation'}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => openResolveModal(name)}
                              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                                isResolved
                                  ? 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {isResolved ? 'Change' : 'Resolve'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                        Resolved Faculty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((entry, index) => {
                      const facultyNames: string[] = entry.facultyNames || [];

                      return (
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
                          <td className="px-4 py-2 text-sm text-gray-600">{facultyNames.join(' / ') || '-'}</td>
                          <td className="px-4 py-2 text-sm">
                            {facultyNames.length === 0 ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              <div className="space-y-1">
                                {facultyNames.map((name, i) => {
                                  const res = facultyResolutions[name];
                                  if (!res) {
                                    return (
                                      <div key={i} className="inline-flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                          <AlertCircle size={12} />
                                          Unresolved
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => openResolveModal(name)}
                                          className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium"
                                        >
                                          Resolve
                                        </button>
                                      </div>
                                    );
                                  }
                                  if (res.id === null) {
                                    return (
                                      <div key={i} className="inline-flex items-center gap-1.5">
                                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                          Unassigned
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => openResolveModal(name)}
                                          className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={i} className="inline-flex items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                        <CheckCircle2 size={12} />
                                        {res.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => openResolveModal(name)}
                                        className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                                      >
                                        Change
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <button
                  disabled={
                    importLoading ||
                    !activeSemesterId ||
                    !selectedStudentSemester ||
                    !selectedProgram ||
                    !selectedSection ||
                    importInvalidEntries.length > 0 ||
                    subjectsNeedingConfiguration.some(subject => !courseTypeSelections[subject.code]) ||
                    importPreview.some(entry => (entry.facultyNames || []).some((n: string) => !facultyResolutions[n]))
                  }
                  onClick={handleConfirmImport}
                  className="w-flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-200 disabled:opacity-60"
                >
                  {importLoading ? <Clock3 size={16} className="animate-spin" /> : ''}
                  {importLoading ? 'Importing...' : 'Confirm Import'}
                </button>
              </div>
            </>
          )}

          {/* Resolve Faculty Modal */}
          {resolvingFacultyName && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Resolve Faculty Member</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Name extracted from PDF: <span className="font-semibold text-gray-800">{resolvingFacultyName}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResolvingFacultyName(null)}
                    className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Advisory Fuzzy Suggestions */}
                {(() => {
                  const item = unresolvedFacultyList.find(u => u.name === resolvingFacultyName);
                  const suggestions = item?.suggestions || [];
                  if (suggestions.length === 0) return null;

                  return (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-gray-700">Recommended Matches (Advisory):</div>
                      <div className="space-y-1.5">
                        {suggestions.map(s => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100/60 transition-colors"
                          >
                            <div>
                              <div className="text-xs font-semibold text-gray-900">{s.name}</div>
                              <div className="text-[11px] text-gray-500">
                                {s.department ? `Dept: ${s.department}` : 'Faculty Member'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAssignFaculty(resolvingFacultyName, { id: s.id, name: s.name })}
                              className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                            >
                              Select
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Faculty Search & Autocomplete */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Search System Faculty:</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      value={facultySearchQuery}
                      onChange={e => handleSearchFaculty(e.target.value)}
                      placeholder="Search by faculty name or email..."
                      className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {searchingFaculty && (
                    <div className="text-xs text-gray-500 flex items-center gap-1.5 py-1">
                      <Clock3 size={12} className="animate-spin" /> Searching...
                    </div>
                  )}

                  {facultySearchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border rounded-xl divide-y text-xs">
                      {facultySearchResults.map(f => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-gray-800">{f.name}</div>
                            {f.email && <div className="text-[11px] text-gray-500">{f.email}</div>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssignFaculty(resolvingFacultyName, { id: f.id, name: f.name, email: f.email })}
                            className="px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-50"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Options: Unassigned or Create New */}
                <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleAssignFaculty(resolvingFacultyName, { id: null, name: 'Unassigned' })}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Mark as Unassigned
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateFacultyName(resolvingFacultyName);
                      setCreateFacultyEmail('');
                      setCreateFacultyPassword('Welcome@123');
                      setCreateFacultyDepartment('');
                      setCreateFacultyError(null);
                      setShowCreateFacultyModal(true);
                    }}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    Create New Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create New Faculty Modal */}
          {showCreateFacultyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Create Faculty Account</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Register a new faculty member account in the system
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateFacultyModal(false)}
                    className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
                  >
                    <X size={18} />
                  </button>
                </div>

                {createFacultyError && (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                    {createFacultyError}
                  </div>
                )}

                <form onSubmit={handleCreateFaculty} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={createFacultyName}
                      onChange={e => setCreateFacultyName(e.target.value)}
                      placeholder="e.g. Dr. Jane Doe"
                      className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={createFacultyEmail}
                      onChange={e => setCreateFacultyEmail(e.target.value)}
                      placeholder="faculty@hnnce.in"
                      className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Password *</label>
                    <input
                      type="text"
                      required
                      value={createFacultyPassword}
                      onChange={e => setCreateFacultyPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Department (Optional)</label>
                    <input
                      type="text"
                      value={createFacultyDepartment}
                      onChange={e => setCreateFacultyDepartment(e.target.value)}
                      placeholder="e.g. CSE"
                      className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateFacultyModal(false)}
                      className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createFacultyLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {createFacultyLoading && <Clock3 size={14} className="animate-spin" />}
                      Create & Assign
                    </button>
                  </div>
                </form>
              </div>
            </div>
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
