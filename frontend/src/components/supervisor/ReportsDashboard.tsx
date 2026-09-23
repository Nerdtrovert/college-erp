import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import * as docx from 'docx';
import { AlertTriangle, Download, FileText, RefreshCw } from 'lucide-react';
import API from '../../services/api';

interface SubjectMarkDetail {
  subjectCode: string;
  subjectName: string;
  cie1: number | null;
  cie2: number | null;
  cie3: number | null;
  assignment: number | null;
  lab: number | null;
  total: number;
  isVerge: boolean;
}

interface ReportStudent {
  id: string;
  name: string;
  department: string;
  classGroup?: string;
  numberOfBacklogs: number;
  backlogSubjects: string[];
  totalScore: number;
  vergeStatus: 'SAFE' | 'AT_RISK';
  atRiskSubjects: string[];
  subjects: SubjectMarkDetail[];
}

interface Props {
  user: any; 
}

const ReportsDashboard: React.FC<Props> = ({ user }) => {
  const [data, setData] = useState<ReportStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Cascading Options State
  const [reportCategory, setReportCategory] = useState<'marks' | 'backlogs' | 'attendance' | ''>('');
  const [reportDetail, setReportDetail] = useState<'verge' | 'current_backlogs' | 'all' | 'cie_total' | 'specific_cie' | 'low_attendance' | 'missing_assignments' | ''>('');
  const [specificCie, setSpecificCie] = useState<'cie1' | 'cie2' | 'cie3' | ''>('');
  
  const [filters, setFilters] = useState({
    semesterId: '',
    department: '',
    classGroup: '',
    hasBacklogs: 'all'
  });
  const [semesters, setSemesters] = useState<{ id: string; name: string }[]>([]);
  const [attendanceThreshold, setAttendanceThreshold] = useState('75');

  // Fetch report
  const fetchReport = async () => {
    if (!reportCategory || !reportDetail) {
      setError("Please select a report category and type.");
      return;
    }
    setHasSearched(true);
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.semesterId) queryParams.append('semesterId', filters.semesterId);
      if (filters.department) queryParams.append('department', filters.department);
      if (filters.classGroup) queryParams.append('classGroup', filters.classGroup);
      if (reportCategory === 'backlogs' && filters.hasBacklogs !== 'all') {
         queryParams.append('hasBacklogs', filters.hasBacklogs);
      }

      if (reportCategory === 'attendance') {
        queryParams.append('type', reportDetail);
        queryParams.append('threshold', attendanceThreshold);
      }
      const response = await API.get(reportCategory === 'attendance'
        ? `/reports/attendance-assignments?${queryParams.toString()}`
        : `/reports/verge-of-backlog?${queryParams.toString()}`);
      setData(response.data || []);
    } catch (err: any) {
      console.error('Error fetching report:', err);
      setError(err.response?.data?.error || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBacklog = async (studentId: string, newCountStr: string) => {
    const newCount = parseInt(newCountStr, 10);
    if (isNaN(newCount)) return;

    setData(prev => prev.map(s => s.id === studentId ? { ...s, numberOfBacklogs: newCount } : s));

    try {
      await API.put(`/reports/backlogs/${studentId}`, { numberOfBacklogs: newCount });
    } catch (err) {
      console.error('Failed to update backlog count', err);
    }
  };

  // Helper to format Department to Acronym
  const formatDept = (dept?: string) => dept?.match(/\((.*?)\)/)?.[1] || dept || '-';

  const subjectCodes = Array.from(new Set(data.flatMap(s => (s.subjects || []).map(sub => sub.subjectCode)))).sort();

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
      head = [['USN', 'Name', 'Dept', 'Sec', 'Subject', 'Present', 'Total', 'Attendance %']];
      tableData = (data as any[]).map((row) => [row.studentId, row.studentName, formatDept(row.department), row.classGroup || '-', `${row.subjectCode} — ${row.subjectName}`, row.present, row.total, `${row.percentage}%`]);
    } else if (reportDetail === 'missing_assignments') {
      head = [['USN', 'Name', 'Dept', 'Sec', 'Subject', 'Missing']];
      tableData = (data as any[]).map((row) => [row.studentId, row.studentName, formatDept(row.department), row.classGroup || '-', `${row.subjectCode} — ${row.subjectName}`, [row.missingAssignment1 && 'Assignment 1', row.missingAssignment2 && 'Assignment 2'].filter(Boolean).join(', ') || 'Assignment']);
    } else if (reportDetail === 'verge') {
      head = [['ID', 'Name', 'Dept', 'Sec', '# Backlogs', 'At Risk Subjects', 'Total Score', 'Status']];
      tableData = data.map(s => [
        s.id, s.name, formatDept(s.department), s.classGroup || '-',
        s.numberOfBacklogs, s.atRiskSubjects.join(', ') || '-', s.totalScore, s.vergeStatus
      ]);
    } else if (reportDetail === 'current_backlogs') {
      head = [['ID', 'Name', 'Dept', 'Sec', '# Backlogs', 'Backlog Subjects']];
      tableData = data.map(s => [
        s.id, s.name, formatDept(s.department), s.classGroup || '-',
        s.numberOfBacklogs, s.backlogSubjects?.join(', ') || '-'
      ]);
    } else if (reportDetail === 'all') {
      head = [['ID', 'Name', 'Dept', 'Sec', ...subjectCodes.map(c => `${c} (Total)`)]];
      tableData = data.map(s => {
        const row: any[] = [s.id || (s as any).studentId, s.name || (s as any).studentName, formatDept(s.department), s.classGroup || '-'];
        subjectCodes.forEach(code => {
          const sub = (s.subjects || []).find(x => x.subjectCode === code);
          row.push(sub?.total ?? '-');
        });
        return row;
      });
    } else if (reportDetail === 'cie_total') {
      head = [['ID', 'Name', 'Dept', 'Sec', ...subjectCodes.map(c => `${c} (CIE)`)]];
      tableData = data.map(s => {
        const row: any[] = [s.id || (s as any).studentId, s.name || (s as any).studentName, formatDept(s.department), s.classGroup || '-'];
        subjectCodes.forEach(code => {
          const sub = (s.subjects || []).find(x => x.subjectCode === code);
          const cieScore = (sub?.cie1 || 0) + (sub?.cie2 || 0) + (sub?.cie3 || 0);
          row.push(sub ? cieScore : '-');
        });
        return row;
      });
    } else if (reportDetail === 'specific_cie') {
      head = [['ID', 'Name', 'Dept', 'Sec', ...subjectCodes.map(c => `${c} (${specificCie.toUpperCase()})`)]];
      tableData = data.map(s => {
        const row: any[] = [s.id || (s as any).studentId, s.name || (s as any).studentName, formatDept(s.department), s.classGroup || '-'];
        subjectCodes.forEach(code => {
          const sub = (s.subjects || []).find(x => x.subjectCode === code);
          row.push(sub?.[specificCie as 'cie1' | 'cie2' | 'cie3'] ?? '-');
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
        createCell(formatDept(student.department)),
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
        cells.push(createCell(student.numberOfBacklogs));
        cells.push(createCell(student.atRiskSubjects.join(', ') || '-'));
        cells.push(createCell(student.totalScore));
        cells.push(createCell(student.vergeStatus));
      } else if (reportDetail === 'current_backlogs') {
        cells.push(createCell(student.numberOfBacklogs));
        cells.push(createCell(student.backlogSubjects?.join(', ') || '-'));
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
          cells.push(createCell(sub?.[specificCie as 'cie1' | 'cie2' | 'cie3'] ?? '-'));
        });
      }

      return new docx.TableRow({ children: cells });
    });

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

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const response = await API.get('/semesters');
        setSemesters(response.data || []);
      } catch (err) {
        console.error('Failed to load semesters:', err);
        setError('Unable to load semesters. Report filters may be incomplete.');
      }
    };
    fetchSemesters();
  }, []);

  const totalBacklogs = reportCategory === 'backlogs'
    ? data.reduce((sum, student) => sum + (student.numberOfBacklogs || 0), 0)
    : 0;

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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase">Students in View</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{data.length}</p>
            </div>
          </div>
          <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 shadow-sm">
            <p className="text-xs font-semibold text-orange-600 tracking-wide uppercase">
              {reportDetail === 'low_attendance' ? 'Low Attendance Entries' : reportDetail === 'missing_assignments' ? 'Missing Assignment Entries' : 'Total Backlogs in Selection'}
            </p>
            <p className="mt-2 text-3xl font-bold text-orange-700">{reportCategory === 'attendance' ? data.length : totalBacklogs}</p>
          </div>
        </div>

        {/* Filters - Cascading */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Report Settings & Filters</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select a category to reveal specific report options.</p>
            </div>
          </div>
          
          {/* Row 1: Category & Detail Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">1. Report Category</label>
              <select
                value={reportCategory}
                onChange={(e) => {
                  const val = e.target.value as 'marks' | 'backlogs' | 'attendance' | '';
                  setReportCategory(val);
                  setReportDetail(''); // Reset detail on category change
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-blue-200 text-sm font-medium text-blue-900 bg-white shadow-sm focus:outline-none focus:border-blue-500"
              >
                <option value="" disabled>Select Category...</option>
                <option value="backlogs">At Risk & Backlogs</option>
                <option value="marks">Performance & Marks</option>
                <option value="attendance">Attendance & Assignments</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">2. Specific Report</label>
              <select
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value as any)}
                disabled={!reportCategory}
                className="w-full px-4 py-2.5 rounded-xl border border-blue-200 text-sm font-medium text-blue-900 bg-white shadow-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="" disabled>Select Report Type...</option>
                {reportCategory === 'backlogs' && (
                  <>
                    <option value="verge">Verge of Backlog (At Risk)</option>
                    <option value="current_backlogs">Current Backlogs List</option>
                  </>
                )}
                {reportCategory === 'marks' && (
                  <>
                    <option value="all">Overall Performance (All Marks)</option>
                    <option value="cie_total">Total CIE Scores</option>
                    <option value="specific_cie">Specific CIE (CIE-1/2/3)</option>
                  </>
                )}
                {reportCategory === 'attendance' && (
                  <>
                    <option value="low_attendance">Low Attendance List</option>
                    <option value="missing_assignments">Missing Assignments List</option>
                  </>
                )}
              </select>
            </div>

            {reportDetail === 'specific_cie' && (
              <div>
                <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">3. Which CIE?</label>
                <select
                  value={specificCie}
                  onChange={(e) => setSpecificCie(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-blue-200 text-sm font-medium text-blue-900 bg-white shadow-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>Select...</option>
                  <option value="cie1">CIE-1 Only</option>
                  <option value="cie2">CIE-2 Only</option>
                  <option value="cie3">CIE-3 Only</option>
                </select>
              </div>
            )}
            
            {reportCategory === 'backlogs' && user?.role !== 'teacher' && (
              <div>
                <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">3. Include</label>
                <select
                  name="hasBacklogs"
                  value={filters.hasBacklogs}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-blue-200 text-sm font-medium text-blue-900 bg-white shadow-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Students</option>
                  <option value="yes">Yes (Has Backlogs)</option>
                  <option value="no">No (Clear Record)</option>
                </select>
              </div>
            )}
            {reportDetail === 'low_attendance' && (
              <div>
                <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Attendance below</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" value={attendanceThreshold} onChange={(e) => setAttendanceThreshold(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-blue-200 text-sm bg-white" />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Audience Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Semester</label>
              <select
                name="semesterId"
                value={filters.semesterId}
                onChange={handleFilterChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Semesters (Default Active)</option>
                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Department</label>
              <select
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Departments</option>
                <option value="Computer Science & Engineering">CSE</option>
                <option value="Computer Science and Engineering (CSE)">Computer Science and Engineering (CSE) (legacy)</option>
                <option value="Information Science and Engineering (ISE)">Information Science and Engineering (ISE)</option>
                <option value="Artificial Intelligence and Data Science (AI&DS)">Artificial Intelligence and Data Science (AI&DS)</option>
                <option value="Electronics & Communication">EC</option>
                <option value="Electronics and Communication Engineering (ECE)">Electronics and Communication Engineering (ECE) (legacy)</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Section</label>
              <input
                type="text"
                name="classGroup"
                placeholder="e.g. CSE-A"
                value={filters.classGroup}
                onChange={handleFilterChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={fetchReport}
                disabled={!reportCategory || !reportDetail || (reportDetail === 'specific_cie' && !specificCie) || loading}
                className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
              <button onClick={exportToPDF} disabled={data.length === 0} title={data.length === 0 ? 'Generate a report first' : 'Export the current filtered report'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 shadow-sm ring-1 ring-inset ring-blue-100 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                <Download size={16} /> PDF
              </button>
              <button onClick={exportToWord} disabled={data.length === 0} title={data.length === 0 ? 'Generate a report first' : 'Export the current filtered report'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-green-600 shadow-sm ring-1 ring-inset ring-green-100 hover:bg-green-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto pb-4">
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
              <p className="font-medium text-gray-700">No students match these filters</p>
              <p className="mt-1 text-sm text-gray-500">Try broadening the department, section, or options.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">USN</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dept</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sec</th>
                  
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
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"># Backlogs</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">At Risk Subjects</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </>
                  )}
                  
                  {reportDetail === 'current_backlogs' && (
                    <>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"># Backlogs</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Backlog Subjects</th>
                    </>
                  )}

                  {reportDetail === 'all' && subjectCodes.map(code => (
                    <th key={code} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{code} (Total)</th>
                  ))}

                  {reportDetail === 'cie_total' && subjectCodes.map(code => (
                    <th key={code} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{code} (CIE)</th>
                  ))}

                  {reportDetail === 'specific_cie' && subjectCodes.map(code => (
                    <th key={code} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{code} ({specificCie.toUpperCase()})</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {data.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.id || (student as any).studentId}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{student.name || (student as any).studentName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium whitespace-nowrap">{formatDept(student.department)}</td>
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
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <input
                            type="number"
                            min="0"
                            defaultValue={student.numberOfBacklogs}
                            onBlur={(event) => {
                              if (event.target.value !== String(student.numberOfBacklogs)) {
                                handleUpdateBacklog(student.id, event.target.value);
                              }
                            }}
                            className={`w-16 rounded border px-2 py-1 text-center font-semibold focus:outline-none focus:ring-2 ${
                              student.numberOfBacklogs === 0
                                ? 'border-green-300 bg-green-50 text-green-700'
                                : 'border-red-300 bg-red-50 text-red-700'
                            }`}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{student.atRiskSubjects.join(', ') || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={student.vergeStatus === 'AT_RISK' ? 'bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded' : 'bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded'}>
                            {student.vergeStatus}
                          </span>
                        </td>
                      </>
                    )}

                    {reportDetail === 'current_backlogs' && (
                      <>
                        <td className="px-6 py-4 text-sm font-semibold text-red-600">{student.numberOfBacklogs > 0 ? student.numberOfBacklogs : '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{student.backlogSubjects?.join(', ') || '-'}</td>
                      </>
                    )}

                    {reportDetail === 'all' && subjectCodes.map(code => {
                      const sub = student.subjects.find((x: any) => x.subjectCode === code);
                      return <td key={code} className="px-6 py-4 text-sm text-gray-700">{sub?.total ?? '-'}</td>;
                    })}

                    {reportDetail === 'cie_total' && subjectCodes.map(code => {
                      const sub = student.subjects.find((x: any) => x.subjectCode === code);
                      const cieScore = sub ? (sub.cie1 || 0) + (sub.cie2 || 0) + (sub.cie3 || 0) : '-';
                      return <td key={code} className="px-6 py-4 text-sm text-gray-700">{cieScore}</td>;
                    })}

                    {reportDetail === 'specific_cie' && subjectCodes.map(code => {
                      const sub = student.subjects.find((x: any) => x.subjectCode === code);
                      return <td key={code} className="px-6 py-4 text-sm text-gray-700">{sub?.[specificCie as 'cie1' | 'cie2' | 'cie3'] ?? '-'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
