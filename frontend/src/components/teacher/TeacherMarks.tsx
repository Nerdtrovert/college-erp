import { useState, useEffect } from 'react';
import { Save, CheckCircle2, ChevronDown, Download, Upload } from 'lucide-react';
import API from '../../services/api';
import * as XLSX from 'xlsx';

const STANDALONE_ASSESSMENTS = [
  { id: 'cie1', label: 'CIE-1', max: 50 },
  { id: 'cie2', label: 'CIE-2', max: 50 },
  { id: 'cie3', label: 'CIE-3', max: 50 },
  { id: 'assignment', label: 'Assignment', max: 25 },
];

const INTEGRATED_ASSESSMENTS = [
  { id: 'cie1', label: 'CIE-1', max: 50 },
  { id: 'cie2', label: 'CIE-2', max: 50 },
  { id: 'cie3', label: 'CIE-3', max: 50 },
  { id: 'assignment', label: 'Assignment', max: 10 },
  { id: 'lab', label: 'Lab', max: 25 },
];

type MarksMap = Record<string, string>; // Maps roll -> score string

interface SubjectItem {
  code: string;
  name: string;
  classGroup: string;
  type?: string;
}

interface StudentMarkItem {
  roll: string;
  name: string;
  score: number | null;
}

export const TeacherMarks: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('cie1');
  const [students, setStudents] = useState<StudentMarkItem[]>([]);
  const [marks, setMarks] = useState<MarksMap>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  // Fetch student marks roster when class or assessment type changes
  useEffect(() => {
    if (!selectedClass || !selectedAssessment) return;
    const fetchMarksRoster = async () => {
      try {
        const res = await API.get(`/marks/teacher/${selectedClass}/${selectedAssessment}`);
        setStudents(res.data.students);
        setMarks(
          Object.fromEntries(
            res.data.students.map((s: any) => [s.roll, s.score !== null ? String(s.score) : ''])
          )
        );
      } catch (err) {
        console.error('Error fetching marks roster:', err);
      }
    };
    fetchMarksRoster();
  }, [selectedClass, selectedAssessment]);

  const currentSubject = subjects.find(s => s.code === selectedClass);
  const activeAssessments = currentSubject?.type === 'INTEGRATED'
    ? INTEGRATED_ASSESSMENTS
    : STANDALONE_ASSESSMENTS;

  // Reset selected assessment if it is not valid for the current subject type
  useEffect(() => {
    if (activeAssessments.length > 0 && !activeAssessments.some(a => a.id === selectedAssessment)) {
      setSelectedAssessment(activeAssessments[0].id);
    }
  }, [selectedClass, activeAssessments, selectedAssessment]);

  const assessment = activeAssessments.find(a => a.id === selectedAssessment) || activeAssessments[0];

  const updateMark = (roll: string, value: string) => {
    const num = parseInt(value);
    if (value !== '' && (isNaN(num) || num < 0 || num > assessment.max)) return;
    setSaved(false);
    setMarks(prev => ({ ...prev, [roll]: value }));
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet);

        const newMarks = { ...marks };
        let matchCount = 0;

        rows.forEach((row) => {
          const rollKey = Object.keys(row).find((k) =>
            /^(roll|id|usn|student\s*id|roll\s*no|roll\s*number|rollno)$/i.test(k)
          );
          const scoreKey = Object.keys(row).find((k) =>
            /^(mark|marks|score|cie|cie1|cie2|cie3|ia1|ia2|ia3|ia-1|ia-2|ia-3|assignment|lab)$/i.test(k) ||
            k.toLowerCase() === selectedAssessment.toLowerCase()
          );

          if (rollKey && scoreKey) {
            const rollVal = String(row[rollKey]).trim().toUpperCase();
            const scoreVal = String(row[scoreKey]).trim();
            const scoreNum = parseFloat(scoreVal);

            const studentExists = students.some((s) => s.roll === rollVal);
            if (studentExists && !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= assessment.max) {
              newMarks[rollVal] = String(scoreNum);
              matchCount++;
            }
          }
        });

        setMarks(newMarks);
        setSaved(false);
        alert(`Successfully imported ${matchCount} student marks from Excel sheet!`);
      } catch (err) {
        console.error('Error parsing Excel file:', err);
        alert('Failed to parse Excel file. Please ensure it has Roll No and Marks columns.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input value to allow re-upload of same file
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const records = Object.entries(marks).map(([roll, scoreStr]) => ({
        studentId: roll,
        score: scoreStr === '' ? null : Number(scoreStr),
      }));

      await API.post('/marks/teacher', {
        subjectCode: selectedClass,
        type: selectedAssessment,
        maxScore: assessment.max,
        records,
      });

      setSaved(true);
    } catch (err) {
      console.error('Error saving marks:', err);
      alert('Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!selectedClass || exporting) return;

    setExporting(true);
    try {
      const response = await API.get(
        `/marks/teacher/${encodeURIComponent(selectedClass)}/${encodeURIComponent(selectedAssessment)}/export`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedClass}-${selectedAssessment}-marks.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting marks:', err);
      alert('Failed to export marks.');
    } finally {
      setExporting(false);
    }
  };

  const filled = students.filter(s => marks[s.roll] !== undefined && marks[s.roll] !== '').length;
  const avg = (() => {
    const vals = students.map(s => parseInt(marks[s.roll] ?? '')).filter(v => !isNaN(v));
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
  })();

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-medium">Loading subjects...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Update Internal Marks</h1>
        <p className="text-gray-500 text-sm mt-1">Enter marks for each student. Click a cell to edit.</p>
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assessment</label>
            <div className="flex gap-2 flex-wrap">
              {activeAssessments.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedAssessment(a.id); setSaved(false) }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                    selectedAssessment === a.id
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {a.label} <span className="opacity-60 text-xs">/{a.max}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <span className="text-gray-500">Filled: </span>
          <span className="font-semibold text-gray-900">{filled}/{students.length}</span>
        </div>
        {avg !== null && (
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
            <span className="text-gray-500">Class avg: </span>
            <span className="font-semibold text-gray-900">{avg}/{assessment.max}</span>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <span className="text-gray-500">Max marks: </span>
          <span className="font-semibold text-gray-900">{assessment.max}</span>
        </div>
      </div>

      {/* Marks table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <span className="font-semibold text-gray-900">{assessment.label}</span>
            <span className="text-gray-400 text-sm ml-2">— out of {assessment.max}</span>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {students.map((s, i) => {
            const val = marks[s.roll] ?? '';
            const num = parseInt(val);
            const pct = !isNaN(num) ? num / assessment.max : null;
            return (
              <div key={s.roll} className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-gray-50">
                <span className="text-xs text-gray-400 w-5 flex-shrink-0 font-mono">{String(i + 1).padStart(2, '0')}</span>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                  {s.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{s.roll}</div>
                </div>
                <div className="flex items-center justify-end gap-3 w-full sm:w-auto sm:flex-shrink-0">
                  {pct !== null && (
                    <div className="hidden sm:block w-20 h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, pct * 100)}%`,
                          background: pct >= 0.8 ? '#16a34a' : pct >= 0.6 ? '#d97706' : '#dc2626'
                        }}
                      />
                    </div>
                  )}
                  <input
                    type="number"
                    min={0}
                    max={assessment.max}
                    value={val}
                    onChange={(e) => updateMark(s.roll, e.target.value)}
                    placeholder="—"
                    className="w-16 text-center px-2 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50"
                  />
                  <span className="text-xs text-gray-400">/{assessment.max}</span>
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
            saved ? 'border border-emerald-200 bg-emerald-100 text-emerald-800' : 'border border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-60'
          }`}
        >
          <Save size={16} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Marks'}
        </button>
        <label className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer transition-colors duration-150">
          <Upload size={16} />
          Upload Marks Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
          />
        </label>
        <button
          onClick={handleExport}
          disabled={exporting || !selectedClass}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-blue-300 bg-blue-100 text-blue-800 font-semibold hover:bg-blue-200 disabled:opacity-60"
        >
          <Download size={16} />
          {exporting ? 'Exporting...' : 'Export Marks PDF'}
        </button>
        {saved && (
          <span className="text-sm text-green-700 font-medium flex items-start sm:items-center gap-1.5">
            <CheckCircle2 size={14} />
            Marks updated successfully
          </span>
        )}
      </div>
    </div>
  );
};