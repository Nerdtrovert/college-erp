import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import * as docx from 'docx';
import { AlertTriangle, Download, FileText, RefreshCw, Loader, CheckCircle } from 'lucide-react';
import API from '../../services/api';
import { PROGRAM_LABELS, STUDENT_PROGRAMS, type StudentProgram } from '../../constants/program';
import { Button } from '../ui/button';
import { DropdownSelect } from '../ui/DropdownSelect';

interface ReportStudent {
  id: string;
  name: string;
  program?: StudentProgram;
  semester?: { id: string; name: string };
  classGroup?: string;
  numberOfBacklogs: number;
  backlogSubjects: string[];
  totalScore: number;
  vergeStatus: 'SAFE' | 'AT_RISK';
  atRiskSubjects: string[];
  subjects: {
    subjectCode: string;
    subjectName: string;
    cie1: number | null;
    cie2: number | null;
    cie3: number | null;
    assignment: number | null;
    lab: number | null;
    total: number;
    isVerge: boolean;
  }[];
}

interface Props {}

export const BacklogsManagement: React.FC<Props> = () => {
  const [data, setData] = useState<ReportStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters State (simplified for backlogs only)
  const [filters, setFilters] = useState({
    semesterId: '',
    program: '',
    classGroup: ''
  });
  const [semesters, setSemesters] = useState<{ id: string; name: string }[]>([]);

  // Fetch backlogs report (using the verge-of-backlog endpoint but displaying actual backlog data)
  const fetchBacklogsReport = async (e?: React.MouseEvent) => {
    if (e) {
      setHasSearched(true);
    }
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.semesterId) queryParams.append('semesterId', filters.semesterId);
      if (filters.program) queryParams.append('program', filters.program);
      if (filters.classGroup) queryParams.append('classGroup', filters.classGroup);
      // Always show students with backlogs when generating report
      queryParams.append('hasBacklogs', 'yes');
      const response = await API.get(`/reports/verge-of-backlog?${queryParams.toString()}`);
      setData(response.data || []);
    } catch (err: any) {
      console.error('Error fetching backlogs report:', err);
      setError(err.response?.data?.error || 'Failed to load backlogs data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBacklog = async (studentId: string, newCountStr: string) => {
    const newCount = parseInt(newCountStr, 10);
    if (isNaN(newCount)) return;
    const previousCount = data.find(student => student.id === studentId)?.numberOfBacklogs ?? 0;

    // Optimistically update the UI
    setData(prev => prev.map(s => s.id === studentId ? { ...s, numberOfBacklogs: newCount } : s));

    try {
      await API.put(`/reports/backlogs/${studentId}`, { numberOfBacklogs: newCount });
    } catch (err) {
      console.error('Failed to update backlog count', err);
      // Revert optimistic update on error
      setData(prev => prev.map(s => s.id === studentId ? { ...s, numberOfBacklogs: previousCount } : s));
      setError('Failed to update backlog count. Please try again.');
    }
  };

  const handleUpdateBacklogSubjects = async (studentId: string, newSubjectsStr: string) => {
    const newSubjects = newSubjectsStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
    const newCount = newSubjects.length;

    const previousSubjects = data.find(student => student.id === studentId)?.backlogSubjects ?? [];
    const previousCount = data.find(student => student.id === studentId)?.numberOfBacklogs ?? 0;

    // Optimistically update the UI
    setData(prev => prev.map(s => s.id === studentId ? { ...s, backlogSubjects: newSubjects, numberOfBacklogs: newCount } : s));

    try {
      await API.put(`/reports/backlogs/${studentId}`, { numberOfBacklogs: newCount, backlogSubjects: newSubjects });
    } catch (err) {
      console.error('Failed to update backlog subjects', err);
      // Revert optimistic update on error
      setData(prev => prev.map(s => s.id === studentId ? { ...s, backlogSubjects: previousSubjects, numberOfBacklogs: previousCount } : s));
      setError('Failed to update backlog subjects. Please try again.');
    }
  };

  // Extract all unique subject codes for table headers
  // Export to PDF
  const exportToPDF = () => {
    if (data.length === 0) {
      setError('Generate a backlogs report with results before exporting.');
      return;
    }
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`Backlogs Report`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    let head: any[] = [];
    let tableData: any[] = [];

    head = [['ID', 'Name', 'Semester', 'Section', '# Backlogs', 'Backlog Subjects']];
    tableData = data.map(s => [
      s.id,
      s.name,
      s.semester?.name || '-',
      s.classGroup || '-',
      s.numberOfBacklogs,
      s.backlogSubjects?.join(', ') || '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1 },
      bodyStyles: { textColor: [0, 0, 0], fillColor: [255, 255, 255] },
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1 }
    });

    doc.save(`backlogs-report.pdf`);
  };

  const exportToWord = async () => {
    if (data.length === 0) {
      setError('Generate a backlogs report with results before exporting.');
      return;
    }

    const createCell = (text: any) => new docx.TableCell({ children: [new docx.Paragraph({ text: String(text ?? '-') })] });

    const tableRows = data.map((student: any) => {
      let cells = [
        createCell(student.id),
        createCell(student.name),
        createCell(student.semester?.name || '-'),
        createCell(student.classGroup || '-'),
        createCell(student.numberOfBacklogs),
        createCell(student.backlogSubjects?.join(', ') || '-')
      ];

      return new docx.TableRow({ children: cells });
    });

    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: [
          new docx.Paragraph({ text: `Backlogs Report`, heading: docx.HeadingLevel.HEADING_1 }),
          new docx.Table({ rows: tableRows })
        ]
      }]
    });

    const blob = await docx.Packer.toBlob(doc);
    saveAs(blob, `backlogs-report.docx`);
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
    fetchBacklogsReport(); // Auto-fetch on initial load
  }, []);

  const totalBacklogs = data.reduce((sum, student) => sum + (student.numberOfBacklogs || 0), 0);
  const studentsWithBacklogs = data.filter(student => student.numberOfBacklogs > 0).length;

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Backlogs Management</h1>
            <p className="mt-1 text-sm text-gray-500">View, manage, and export student backlog records.</p>

          </div>

        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 shadow-sm">
            <p className="text-xs font-semibold text-orange-600 tracking-wide uppercase">
              Students with Backlogs
            </p>
            <p className="mt-2 text-3xl font-bold text-orange-700">{studentsWithBacklogs}</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
            <p className="text-xs font-semibold text-blue-600 tracking-wide uppercase">
              Total Backlogs
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{totalBacklogs}</p>
          </div>

        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Backlogs Filters</h2>
              <p className="text-xs text-gray-500 mt-0.5">Filter students to view and manage their backlog records.</p>

            </div>

          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Semester</label>
              <DropdownSelect
                name="semesterId"
                value={filters.semesterId}
                onChange={handleFilterChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Semesters (Default Active)</option>
                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </DropdownSelect>

            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Program</label>
              <DropdownSelect
                name="program"
                value={filters.program}
                onChange={handleFilterChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Programs</option>
                {STUDENT_PROGRAMS.map(program => <option key={program} value={program}>{PROGRAM_LABELS[program]}</option>)}
              </DropdownSelect>

            </div>
            <div className="min-w-0">
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


          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap items-center justify-start gap-2">
            <button
              onClick={fetchBacklogsReport}
              disabled={loading}
              className="glossy-action inline-flex h-11 min-w-[14rem] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Generate Backlogs Report'}
            </button>
            <button onClick={exportToPDF} disabled={data.length === 0} title={data.length === 0 ? 'Generate a report first' : 'Export the current backlogs report'} className="glossy-action inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-blue-300 bg-blue-100 px-4 py-2.5 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
              <Download size={16} /> PDF
            </button>
            <button onClick={exportToWord} disabled={data.length === 0} title={data.length === 0 ? 'Generate a report first' : 'Export the current backlogs report'} className="glossy-action inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-green-300 bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800 shadow-sm hover:bg-green-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
              <FileText size={16} /> Word
            </button>
          </div>

          {/* Gradecard Upload Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upload Gradecard (PDF/Excel/Word)</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.doc,.docx"
                  multiple
                  id="gradecard-upload"
                  className="block w-full text-sm text-gray-900 border border-gray-200 rounded-xl cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2.5 file:px-4 file:rounded-l-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
                />
                <button
                  onClick={async () => {
                    const fileInput = document.getElementById('gradecard-upload') as HTMLInputElement;
                    const files = Array.from(fileInput?.files || []);
                    if (files.length === 0) {
                      alert('Please select at least one file first.');
                      return;
                    }

                    const formData = new FormData();
                    files.forEach(file => formData.append('files', file));

                    try {
                      setLoading(true);
                      // Step 1: Upload and parse
                      const uploadRes = await API.post('/backlogs/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });

                      // Step 2: Process the parsed data
                      const processRes = await API.post('/backlogs/process', {
                        gradecardData: { students: uploadRes.data.students }
                      });

                      alert(processRes.data.message || `Successfully processed ${processRes.data.processedStudents.length} student records with backlogs!`);
                      // Reset file input
                      fileInput.value = '';
                      // Refresh the report
                      fetchBacklogsReport();
                    } catch (err: any) {
                      console.error('Error uploading gradecard:', err);
                      alert(err.response?.data?.error || 'Failed to upload gradecard. Please try again.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader className="animate-spin" size={16} /> : <FileText size={16} />}
                  Process Upload
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Select one or more files. USNs/names are matched automatically and 'F' grades update each student's backlog record.</p>
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
              <p className="text-gray-500 text-sm">Loading backlogs data...</p>

            </div>
          ) : !hasSearched ? (
            <div className="text-center py-16">
              <FileText size={48} className="mx-auto mb-4 text-gray-200" aria-hidden="true" />
              <p className="text-lg font-medium text-gray-900">Ready to Generate Backlogs Report</p>
              <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">Set your filters above, then click Generate Backlogs Report to fetch the data.</p>

            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={32} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
              <p className="font-medium text-gray-700">No students match these filters</p>
              <p className="mt-1 text-sm text-gray-500">Try broadening the filters.</p>

            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Semester</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Section</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"># Backlogs</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Backlog Subjects</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {data.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{student.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{student.semester?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{student.classGroup || '-'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">{student.numberOfBacklogs > 0 ? student.numberOfBacklogs : '-'}</td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        key={student.backlogSubjects?.join(', ') || 'empty'}
                        defaultValue={student.backlogSubjects?.join(', ') || ''}
                        onBlur={(event) => {
                          if (event.target.value !== (student.backlogSubjects?.join(', ') || '')) {
                            handleUpdateBacklogSubjects(student.id, event.target.value);
                          }
                        }}
                        className="w-full min-w-[150px] rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. CS2101, CS2102"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        key={`num-${student.numberOfBacklogs}`}
                        defaultValue={student.numberOfBacklogs}
                        onBlur={(event) => {
                          if (event.target.value !== String(student.numberOfBacklogs)) {
                            handleUpdateBacklog(student.id, event.target.value);
                          }
                        }}
                        className={`w-20 rounded border px-2 py-1 text-center font-semibold focus:outline-none focus:ring-2 ${
                          student.numberOfBacklogs === 0
                            ? 'border-green-300 bg-green-50 text-green-700'
                            : 'border-red-300 bg-red-50 text-red-700'
                        }`}
                      />
                    </td>
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