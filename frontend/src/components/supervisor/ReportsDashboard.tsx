import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import * as docx from 'docx';
import { AlertTriangle, Download, FileText, RefreshCw } from 'lucide-react';
import API from '../../services/api';
import { PROGRAM_LABELS, SECTION_OPTIONS, STUDENT_PROGRAMS } from '../../constants/program';
import { filterAtRiskRows, sortReportRows } from '../../utils/reportSorting';
import { formatCieMarkOutOf50, getCieMarkColorClass } from '../../utils/reportCieMarks';
import { DropdownSelect } from '../ui/DropdownSelect';

interface SubjectMarkDetail {
  subjectCode: string;
  subjectName: string;
  cie1: number | null;
  cie1MaxScore: number | null;
  cie2: number | null;
  cie2MaxScore: number | null;
  cie3: number | null;
  assignment: number | null;
  lab: number | null;
  total: number;
  isVerge: boolean;
}

interface ReportStudent {
  id: string;
  name: string;
  currentSemester?: number;
  semester?: { id: string; name: string };
  classGroup?: string;
  vergeStatus: 'SAFE' | 'AT_RISK';
  atRiskSubjects: string[];
  projectedSgpa: string;
  subjects: SubjectMarkDetail[];
}

interface Props {
  user: any;
}

const ReportsDashboard: React.FC<Props> = ({ user }) => {
  const [data, setData] = useState<ReportStudent[]>([]);
  const [activeSemester, setActiveSemester] = useState<{ id: string; name: string; status: string } | null>(null);
  const [semesterNumbers, setSemesterNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const reportRequestId = useRef(0);
  
  // Cascading Options State
  const [reportCategory, setReportCategory] = useState<'risk' | 'marks' | 'attendance' | ''>('');
  const [reportDetail, setReportDetail] = useState<'verge' | 'all' | 'cie_total' | 'specific_cie' | 'low_attendance' | 'missing_assignments' | ''>('');
  const [selectedCie, setSelectedCie] = useState<'cie1' | 'cie2'>('cie1');
  
  const [filters, setFilters] = useState({
    program: '',
    classGroup: '',
    semesterId: '',
    semesterNumber: '',
  });
  const [attendanceThreshold, setAttendanceThreshold] = useState('75');
  const [activeSemester, setActiveSemester] = useState<any>(null);
  const [semesterNumbers, setSemesterNumbers] = useState<number[]>([]);

  useEffect(() => {
    const fetchSemesterOptions = async () => {
      try {
        const semesterResponse = await API.get('/semesters');
        const semestersData = Array.isArray(semesterResponse.data) ? semesterResponse.data : [];
        
        const activeSem = semestersData.find(semester => semester.status === 'ACTIVE');
        setActiveSemester(activeSem || null);
        if (!activeSem) return;

        setFilters(prev => ({ ...prev, semesterId: prev.semesterId || activeSem.id, semesterNumber: prev.semesterNumber || '' }));

        const canListStudents = ['dean', 'principal', 'hod'].includes(String(user?.role ?? '').toLowerCase());
        if (!canListStudents) return;

        const activeSemesterNumbers = new Set<number>();
        try {
          const studentResponse = await API.get('/auth/users?role=student');
          const students = Array.isArray(studentResponse.data) ? studentResponse.data : [];
          students.forEach((student: any) => {
            const enrollment = student.enrollments?.find((item: any) => item.semesterId === activeSem.id);
            if (enrollment?.semesterNumber) activeSemesterNumbers.add(enrollment.semesterNumber);
          });
        } catch (err) {
          console.error('Failed to load student semester filters for reports:', err);
          setError('Semester-specific student filters could not be loaded. You can still generate a report for all active-semester students.');
          return;
        }
        
        const numbers = Array.from(activeSemesterNumbers)
          .filter(n => n % 2 !== 0) // only ODD semesters
          .sort((a, b) => a - b);
        setSemesterNumbers(numbers);
      } catch (err) {
        console.error('Failed to load semesters for reports:', err);
        setError('Unable to load semester options. Refresh the page and try again.');
      }
    };
    void fetchSemesterOptions();
  }, [user?.role]);

  const semesterOptions = [
    { value: `${activeSemester?.id || ''}|`, label: 'All Semesters (Currently Active)' },
    ...semesterNumbers.map(semesterNumber => {
      const ordinal = semesterNumber === 1 ? '1st'
        : semesterNumber === 2 ? '2nd'
        : semesterNumber === 3 ? '3rd'
        : `${semesterNumber}th`;
      return {
        value: `${activeSemester?.id || ''}|${semesterNumber}`,
        label: `${ordinal} Sem students`,
      };
    })
  ].filter(opt => opt.value.split('|')[0] !== ''); // Ensure we have an active semester ID
  const selectedSemesterValue = filters.semesterId
    ? `${filters.semesterId}|${filters.semesterNumber}`
    : '';

  // Fetch report
  const fetchReport = async () => {
    if (!reportCategory || !reportDetail) {
      setError("Please select a report category and type.");
      return;
    }
    if (!filters.semesterId) {
      setError('Please select a semester before generating the report.');
      return;
    }
    const requestId = ++reportRequestId.current;
    const requestedCategory = reportCategory;
    setHasSearched(true);
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('semesterId', filters.semesterId);
      queryParams.append('semesterNumber', filters.semesterNumber);
      if (filters.program) queryParams.append('program', filters.program);
      if (filters.classGroup) queryParams.append('classGroup', filters.classGroup);

      if (reportCategory === 'attendance') {
        queryParams.append('type', reportDetail);
        queryParams.append('threshold', attendanceThreshold);
      } else if (reportCategory === 'risk') {
        queryParams.append('atRiskOnly', 'true');
      }
      const response = await API.get(reportCategory === 'attendance'
        ? `/reports/attendance-assignments?${queryParams.toString()}`
        : `/reports/verge-of-backlog?${queryParams.toString()}`);
      if (requestId !== reportRequestId.current) return;
      const reportRows = Array.isArray(response.data) ? response.data : [];
      const visibleRows = requestedCategory === 'risk' ? filterAtRiskRows(reportRows) : reportRows;
      setData(sortReportRows(visibleRows));
      setCurrentPage(1);
    } catch (err: any) {
      if (requestId !== reportRequestId.current) return;
      console.error('Error fetching report:', err);
      setError(err.response?.data?.error || 'Failed to load report data');
    } finally {
      if (requestId === reportRequestId.current) setLoading(false);
    }
  };

  const subjectCodes = Array.from(new Set(data.flatMap(s => (s.subjects || []).map(sub => sub.subjectCode)))).sort();
  const pageCount = Math.ceil(data.length / pageSize);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(pageStart, pageStart + pageSize);

  // Export to PDF
  const exportToPDF = () => {
    if (data.length === 0) {
      setError('Generate a report with results before exporting.');
      return;
    }
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`Student Report (${reportDetail.toUpperCase()})`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    let head: any[] = [];
    let tableData: any[] = [];

    if (reportDetail === 'low_attendance') {
      head = [['USN', 'Name', 'Current Semester', 'Section', 'Subject', 'Present', 'Total', 'Attendance %']];
      tableData = (data as any[]).map((row) => [row.studentId, row.studentName, row.currentSemester ?? '-', row.classGroup || '-', `${row.subjectCode} — ${row.subjectName}`, row.present, row.total, `${row.percentage}%`]);
    } else if (reportDetail === 'missing_assignments') {
      head = [['USN', 'Name', 'Current Semester', 'Section', 'Subject', 'Missing']];
      tableData = (data as any[]).map((row) => [row.studentId, row.studentName, row.currentSemester ?? '-', row.classGroup || '-', `${row.subjectCode} — ${row.subjectName}`, [row.missingAssignment1 && 'Assignment 1', row.missingAssignment2 && 'Assignment 2'].filter(Boolean).join(', ') || 'Assignment']);
    } else if (reportDetail === 'verge') {
      head = [['ID', 'Name', 'Current Semester', 'Section', 'At Risk Subjects', 'Status']];
      tableData = data.map(s => [
        s.id, s.name, (s as any).currentSemester ?? '-', s.classGroup || '-',
        s.atRiskSubjects.join(', ') || '-', s.vergeStatus
      ]);
    } else if (reportCategory === 'marks') {
      head = [[
        'USN',
        'Name',
        'Current Semester',
        'Section',
        ...subjectCodes.map((code) => `${code} (${selectedCie.toUpperCase()} / 50)`),
      ]];
      tableData = data.map((student) => [
        student.id,
        student.name,
        student.currentSemester ?? '-',
        student.classGroup || '-',
        ...subjectCodes.map((code) => {
          const subject = student.subjects.find((item) => item.subjectCode === code);
          const score = formatCieMarkOutOf50(
            subject?.[selectedCie],
            subject?.[`${selectedCie}MaxScore` as 'cie1MaxScore' | 'cie2MaxScore'],
          );
          return score === '-' ? score : `${score} / 50`;
        }),
      ]);
    } else if (reportDetail === 'all') {
      head = [['ID', 'Name', 'Current Semester', 'Section', ...subjectCodes.map(c => `${c} (Total)`)]];
      tableData = data.map(s => {
        const row: any[] = [s.id || (s as any).studentId, s.name || (s as any).studentName, s.currentSemester ?? '-', s.classGroup || '-'];
        subjectCodes.forEach(code => {
          const sub = (s.subjects || []).find(x => x.subjectCode === code);
          row.push(sub?.total ?? '-');
        });
        return row;
      });
    } else if (reportDetail === 'cie_total') {
      head = [['ID', 'Name', 'Current Semester', 'Section', ...subjectCodes.map(c => `${c} (CIE)`)]];
      tableData = data.map(s => {
        const row: any[] = [s.id || (s as any).studentId, s.name || (s as any).studentName, s.currentSemester ?? '-', s.classGroup || '-'];
        subjectCodes.forEach(code => {
          const sub = (s.subjects || []).find(x => x.subjectCode === code);
          const cieScore = (sub?.cie1 || 0) + (sub?.cie2 || 0) + (sub?.cie3 || 0);
          row.push(sub ? cieScore : '-');
        });
        return row;
      });
    } else if (reportDetail === 'specific_cie') {
      head = [['ID', 'Name', 'Current Semester', 'Section', ...subjectCodes.map(c => `${c} (${selectedCie.toUpperCase()})`)]];
      tableData = data.map(s => {
        const row: any[] = [s.id || (s as any).studentId, s.name || (s as any).studentName, s.currentSemester ?? '-', s.classGroup || '-'];
        subjectCodes.forEach(code => {
          const sub = (s.subjects || []).find(x => x.subjectCode === code);
          row.push(sub?.[selectedCie] ?? '-');
        });
        return row;
      });
    }

    autoTable(doc, {
      startY: 40,
      head,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1 },
      bodyStyles: { textColor: [0, 0, 0], fillColor: [255, 255, 255] },
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1 }
    });

    doc.save(`report-${reportDetail}.pdf`);
  };

  const exportToWord = async () => {
    // Basic word export just containing table data as strings for now
    if (data.length === 0) {
      setError('Generate a report with results before exporting.');
      return;
    }
    
    const createCell = (text: any) => new docx.TableCell({ children: [new docx.Paragraph({ text: String(text ?? '-') })] });

    const tableRows = data.map((student: any) => {
      let cells = [
        createCell(student.id || (student as any).studentId),
        createCell(student.name || (student as any).studentName),
        createCell(student.currentSemester ?? '-'),
        createCell(student.classGroup || '-')
      ];

      if (reportDetail === 'low_attendance') {
        cells.push(createCell(`${student.subjectCode} — ${student.subjectName}`));
        cells.push(createCell(student.present));
        cells.push(createCell(student.total));
        cells.push(createCell(`${student.percentage}%`));
      } else if (reportDetail === 'missing_assignments') {
        cells.push(createCell(`${student.subjectCode} — ${student.subjectName}`));
        cells.push(createCell([student.missingAssignment1 && 'Assignment 1', student.missingAssignment2 && 'Assignment 2'].filter(Boolean).join(', ') || 'Assignment'));
      } else if (reportDetail === 'verge') {
        cells.push(createCell(student.atRiskSubjects.join(', ') || '-'));
        cells.push(createCell(student.vergeStatus));
      } else if (reportCategory === 'marks') {
        subjectCodes.forEach((code) => {
          const subject = (student.subjects || []).find((item: SubjectMarkDetail) => item.subjectCode === code);
          const score = formatCieMarkOutOf50(
            subject?.[selectedCie],
            subject?.[`${selectedCie}MaxScore` as 'cie1MaxScore' | 'cie2MaxScore'],
          );
          cells.push(createCell(score === '-' ? score : `${score} / 50`));
        });
      } else if (reportDetail === 'all') {
        subjectCodes.forEach(code => {
          const sub = (student.subjects || []).find((x: any) => x.subjectCode === code);
          cells.push(createCell(sub?.total ?? '-'));
        });
      } else if (reportDetail === 'cie_total') {
        subjectCodes.forEach(code => {
          const sub = (student.subjects || []).find((x: any) => x.subjectCode === code);
          const cieScore = sub ? (sub.cie1 || 0) + (sub.cie2 || 0) + (sub.cie3 || 0) : '-';
          cells.push(createCell(cieScore));
        });
      } else if (reportDetail === 'specific_cie') {
        subjectCodes.forEach(code => {
          const sub = (student.subjects || []).find((x: any) => x.subjectCode === code);
          cells.push(createCell(sub?.[selectedCie] ?? '-'));
        });
      }

      return new docx.TableRow({ children: cells });
    });
    if (reportCategory === 'marks') {
      tableRows.unshift(new docx.TableRow({
        children: [
          'USN',
          'Name',
          'Current Semester',
          'Section',
          ...subjectCodes.map((code) => `${code} (${selectedCie.toUpperCase()} / 50)`),
        ].map(createCell),
      }));
    }

    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: [
          new docx.Paragraph({ text: `Student Report (${reportDetail})`, heading: docx.HeadingLevel.HEADING_1 }),
          new docx.Table({ rows: tableRows })
        ]
      }]
    });

    const blob = await docx.Packer.toBlob(doc);
    saveAs(blob, `report-${reportDetail}.docx`);
  };

  const updateAudienceFilter = (filter: 'program' | 'classGroup', value: string) => {
    reportRequestId.current += 1;
    setData([]);
    setHasSearched(false);
    setLoading(false);
    setError(null);
    setCurrentPage(1);
    setFilters((previous) => {
      const nextFilters = { ...previous, [filter]: value };
      if (filter === 'program' && value && !SECTION_OPTIONS[value as keyof typeof SECTION_OPTIONS].includes(previous.classGroup)) {
        nextFilters.classGroup = '';
      }
      return nextFilters;
    });
  };

  const updateSemesterFilter = (value: string) => {
    const [semesterId = '', semesterNumber = ''] = value.split('|');
    reportRequestId.current += 1;
    setData([]);
    setHasSearched(false);
    setLoading(false);
    setError(null);
    setCurrentPage(1);
    setFilters((previous) => ({ ...previous, semesterId, semesterNumber }));
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Custom Reports Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Filter, review, and download detailed academic reports.</p>
          </div>
        </div>

        {/* Filters - Cascading */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Report Settings & Filters</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select a report category and audience filters.</p>
            </div>
          </div>
          
          {/* Row 1: Category & Detail Options */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">1. Report Category</label>
              <DropdownSelect
                value={reportCategory}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const val = e.target.value as 'risk' | 'marks' | 'attendance' | '';
                  reportRequestId.current += 1;
                  setData([]);
                  setHasSearched(false);
                  setLoading(false);
                  setError(null);
                  setCurrentPage(1);
                  setReportCategory(val);
                  setReportDetail(val === 'risk' ? 'verge' : val === 'marks' ? 'all' : val === 'attendance' ? 'low_attendance' : '');
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-blue-200 text-sm font-medium text-blue-900 bg-white shadow-sm focus:outline-none focus:border-blue-500"
              >
                <option value="" disabled>Select Category...</option>
                <option value="risk">At Risk</option>
                <option value="marks">Performance & Marks</option>
                <option value="attendance">Attendance & Assignments</option>
              </DropdownSelect>
            </div>

            {reportDetail === 'low_attendance' && (
              <div>
                <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Attendance below</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" value={attendanceThreshold} onChange={(e) => setAttendanceThreshold(e.target.value)} className="h-11 w-full rounded-xl border border-blue-200 bg-white px-4 text-sm focus:outline-none focus:border-blue-500" />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
            )}
            {reportCategory === 'marks' && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-blue-600">CIE Test</label>
                <DropdownSelect
                  ariaLabel="Select CIE test"
                  value={selectedCie}
                  options={[
                    { value: 'cie1', label: 'CIE 1' },
                    { value: 'cie2', label: 'CIE 2' },
                  ]}
                  onChange={(value: string | React.ChangeEvent<HTMLSelectElement>) => {
                    const nextCie = typeof value === 'string' ? value : value.target.value;
                    if (nextCie !== 'cie1' && nextCie !== 'cie2') return;
                    reportRequestId.current += 1;
                    setSelectedCie(nextCie);
                    setData([]);
                    setHasSearched(false);
                    setLoading(false);
                    setCurrentPage(1);
                  }}
                  className="h-12 min-h-12 rounded-xl py-3"
                />
              </div>
            )}
          </div>

          {/* Row 2: Audience Filters */}
          <div className="grid grid-cols-1 items-start gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <label className="mb-2 block min-h-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Semester
              </label>
              <DropdownSelect
                ariaLabel="Filter by semester"
                value={selectedSemesterValue}
                options={semesterOptions}
                onChange={(value: string | React.ChangeEvent<HTMLSelectElement>) => {
                  updateSemesterFilter(typeof value === 'string' ? value : value.target.value);
                }}
                className="h-12 min-h-12 rounded-xl bg-gray-50 py-3"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-2 block min-h-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Program</label>
              <DropdownSelect
                ariaLabel="Filter by program"
                value={filters.program}
                options={[
                  { value: '', label: 'All Programs' },
                  ...STUDENT_PROGRAMS.map((program) => ({
                    value: program,
                    label: PROGRAM_LABELS[program],
                  })),
                ]}
                onChange={(value: string | React.ChangeEvent<HTMLSelectElement>) => {
                  updateAudienceFilter('program', typeof value === 'string' ? value : value.target.value);
                }}
                className="h-12 min-h-12 rounded-xl bg-gray-50 py-3"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-2 block min-h-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Section
              </label>
              <DropdownSelect
                ariaLabel="Filter by section"
                value={filters.classGroup}
                options={[
                  { value: '', label: 'All Sections' },
                  ...Array.from(new Set(
                    filters.program
                      ? SECTION_OPTIONS[filters.program as keyof typeof SECTION_OPTIONS]
                      : STUDENT_PROGRAMS.flatMap((program) => SECTION_OPTIONS[program]),
                  )).map((section) => ({ value: section, label: section })),
                ]}
                onChange={(value: string | React.ChangeEvent<HTMLSelectElement>) => {
                  updateAudienceFilter('classGroup', typeof value === 'string' ? value : value.target.value);
                }}
                className="h-12 min-h-12 rounded-xl bg-gray-50 py-3"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
              <button
                onClick={fetchReport}
                disabled={!reportCategory || !reportDetail || !filters.semesterId || loading}
                className="glossy-action inline-flex h-11 min-w-[14rem] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
              <button onClick={exportToPDF} disabled={data.length === 0} title={data.length === 0 ? 'Generate a report first' : 'Export the current filtered report'} className="glossy-action inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-blue-300 bg-blue-100 px-4 py-2.5 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                <Download size={16} /> PDF
              </button>
              <button onClick={exportToWord} disabled={data.length === 0} title={data.length === 0 ? 'Generate a report first' : 'Export the current filtered report'} className="glossy-action inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-green-300 bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800 shadow-sm hover:bg-green-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                <FileText size={16} /> Word
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">Loading report data...</p>
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-16">
              <FileText size={48} className="mx-auto mb-4 text-gray-200" aria-hidden="true" />
              <p className="text-lg font-medium text-gray-900">Ready to Generate Report</p>
              <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">Select your desired report type and filters above, then click Generate Report to fetch the data.</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={32} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
              <p className="font-medium text-gray-700">
                {reportCategory === 'risk' ? 'No at-risk students match these filters' : 'No students match these filters'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {reportCategory === 'risk'
                  ? 'Only students with recorded below-threshold assessments appear in this report.'
                  : 'Try broadening the section or report options.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">USN</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Semester</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Section</th>
                  
                  {reportDetail === 'low_attendance' && (
                    <>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Present</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendance</th>
                    </>
                  )}
                  {reportDetail === 'missing_assignments' && (
                    <>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Missing</th>
                    </>
                  )}
                  {reportDetail === 'verge' && (
                    <>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">At Risk Subjects</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </>
                  )}

                  {reportCategory === 'marks' && subjectCodes.map((code) => {
                    const subject = data.flatMap((student) => student.subjects).find((item) => item.subjectCode === code);
                    return (
                      <th key={code} className="min-w-32 max-w-40 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <span
                          className="block max-w-32 truncate text-[11px] font-semibold leading-4 text-gray-800"
                          title={subject?.subjectName ?? code}
                        >
                          {subject?.subjectName ?? code}
                        </span>
                        <span className="mt-1 block whitespace-nowrap text-[10px] font-medium tracking-normal">{code} · {selectedCie.toUpperCase()} / 50</span>
                      </th>
                    );
                  })}

                  {reportCategory !== 'marks' && reportDetail === 'all' && subjectCodes.map(code => (
                    <th key={code} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{code} (Total)</th>
                  ))}

                  {reportCategory !== 'marks' && reportDetail === 'cie_total' && subjectCodes.map(code => (
                    <th key={code} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{code} (CIE)</th>
                  ))}

                  {reportCategory !== 'marks' && reportDetail === 'specific_cie' && subjectCodes.map(code => (
                    <th key={code} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{code} ({selectedCie.toUpperCase()})</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {paginatedData.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.id || (student as any).studentId}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{student.name || (student as any).studentName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{student.currentSemester ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{student.classGroup || '-'}</td>
                    
                    {reportDetail === 'low_attendance' && (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-700">{(student as any).subjectCode} — {(student as any).subjectName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{(student as any).present}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{(student as any).total}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-red-700">{(student as any).percentage}%</td>
                      </>
                    )}
                    {reportDetail === 'missing_assignments' && (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-700">{(student as any).subjectCode} — {(student as any).subjectName}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-amber-700">{[(student as any).missingAssignment1 && 'Assignment 1', (student as any).missingAssignment2 && 'Assignment 2'].filter(Boolean).join(', ') || 'Assignment'}</td>
                      </>
                    )}
                    {reportDetail === 'verge' && (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{student.atRiskSubjects.join(', ') || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={student.vergeStatus === 'AT_RISK' ? 'bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded' : 'bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded'}>
                            {student.vergeStatus}
                          </span>
                        </td>
                      </>
                    )}

                    {reportCategory === 'marks' && subjectCodes.map((code) => {
                      const subject = student.subjects.find((item) => item.subjectCode === code);
                      const score = formatCieMarkOutOf50(
                        subject?.[selectedCie],
                        subject?.[`${selectedCie}MaxScore` as 'cie1MaxScore' | 'cie2MaxScore'],
                      );
                      return (
                        <td key={code} className="whitespace-nowrap px-6 py-4 text-sm font-semibold tabular-nums">
                          <span className={`inline-flex min-w-20 justify-center rounded-lg px-2.5 py-1 ${getCieMarkColorClass(score)}`}>
                            {score === '-' ? score : `${score} / 50`}
                          </span>
                        </td>
                      );
                    })}

                    {reportCategory !== 'marks' && reportDetail === 'all' && subjectCodes.map(code => {
                      const sub = student.subjects.find((x: any) => x.subjectCode === code);
                      return <td key={code} className="px-6 py-4 text-sm text-gray-700">{sub?.total ?? '-'}</td>;
                    })}

                    {reportCategory !== 'marks' && reportDetail === 'cie_total' && subjectCodes.map(code => {
                      const sub = student.subjects.find((x: any) => x.subjectCode === code);
                      const cieScore = sub ? (sub.cie1 || 0) + (sub.cie2 || 0) + (sub.cie3 || 0) : '-';
                      return <td key={code} className="px-6 py-4 text-sm text-gray-700">{cieScore}</td>;
                    })}

                    {reportCategory !== 'marks' && reportDetail === 'specific_cie' && subjectCodes.map(code => {
                      const sub = student.subjects.find((x: any) => x.subjectCode === code);
                      return <td key={code} className="px-6 py-4 text-sm text-gray-700">{sub?.[selectedCie] ?? '-'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {!loading && data.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                <span>
                  Showing <span className="font-semibold text-gray-900">{pageStart + 1}-{Math.min(pageStart + pageSize, data.length)}</span> of{' '}
                  <span className="font-semibold text-gray-900">{data.length}</span> students
                </span>
                <label className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <div className="w-20">
                    <DropdownSelect
                      ariaLabel="Rows per page"
                      value={String(pageSize)}
                      options={[
                        { value: '10', label: '10' },
                        { value: '15', label: '15' },
                      ]}
                      onChange={(value: string | React.ChangeEvent<HTMLSelectElement>) => {
                        if (typeof value !== 'string') return;
                        setPageSize(Number(value));
                        setCurrentPage(1);
                      }}
                      className="h-10 min-h-10 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </label>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="min-w-20 text-center text-sm text-gray-600" aria-live="polite">
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                  disabled={currentPage === pageCount}
                  className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
