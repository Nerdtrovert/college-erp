import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import * as docx from 'docx';
import { AlertTriangle, Download, FileText, RefreshCw } from 'lucide-react';
import API from '../../services/api';

interface ReportStudent {
  id: string;
  name: string;
  department: string;
  classGroup?: string;
  numberOfBacklogs: number;
  best2CieAvg: number;
  cieScaled: number;
  assignmentTotal: number;
  labTotal: number;
  totalScore: number;
  vergeStatus: 'SAFE' | 'AT_RISK';
}

const ReportsDashboard: React.FC = () => {
  const [data, setData] = useState<ReportStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    semesterId: '',
    department: '',
    classGroup: '',
    vergeThreshold: '13'
  });
  const [semesters, setSemesters] = useState<{ id: string; name: string }[]>([]);

  // Fetch verge of backlog report
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.semesterId) queryParams.append('semesterId', filters.semesterId);
      if (filters.department) queryParams.append('department', filters.department);
      if (filters.classGroup) queryParams.append('classGroup', filters.classGroup);
      if (filters.vergeThreshold) queryParams.append('vergeThreshold', filters.vergeThreshold);

      const response = await API.get(`/reports/verge-of-backlog?${queryParams.toString()}`);
      setData(response.data);
      /*
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      */
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBacklog = async (studentId: string, newCountStr: string) => {
    const newCount = parseInt(newCountStr, 10);
    if (isNaN(newCount)) return;

    // Optimistically update state
    setData(prev => prev.map(s => s.id === studentId ? { ...s, numberOfBacklogs: newCount } : s));

    try {
      await API.put(`/reports/backlogs/${studentId}`, { numberOfBacklogs: newCount });
      /*
      const response = await fetch(`http://localhost:5001/api/reports/backlogs/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ numberOfBacklogs: newCount })
      });

      if (!response.ok) {
        throw new Error('Failed to update backlog');
      }*/
    } catch (err) {
      console.error('Error updating backlog:', err);
      // Revert if error
      fetchReport();
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    if (data.length === 0) return;

    const doc = new jsPDF();
    // Set title to bold and black
    doc.setFontSize(18);
    doc.setTextColor(0); // Black color
    doc.text('Verge of Backlog Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = data.map(student => [
      student.id,
      student.name,
      student.department,
      student.classGroup || '-',
      student.numberOfBacklogs,
      student.best2CieAvg,
      student.cieScaled,
      student.assignmentTotal,
      student.labTotal,
      student.totalScore,
      student.vergeStatus
    ]);

    // Use basic table with borders, no colors (black and white only)
    (doc as any).autoTable({
      startY: 40,
      head: [['ID', 'Name', 'Department', 'Class Group', '# Backlogs', 'Best 2 CIE Avg', 'CIE Scaled', 'Assign Total', 'Lab Total', 'Total Score', 'Verge Status']],
      body: tableData,
      theme: 'grid', // Enforce all borders
      headStyles: {
        fillColor: [255, 255, 255], // White background
        textColor: [0, 0, 0], // Black text
        fontStyle: 'bold', // Bold header
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      bodyStyles: {
        textColor: [0, 0, 0], // Black text
        fillColor: [255, 255, 255] // White background
      },
      margin: { top: 20 },
      // Ensure borders are visible
      styles: {
        lineColor: [0, 0, 0], // Black borders
        lineWidth: 0.1
      }
    });

    doc.save('verge-of-backlog-report.pdf');
  };

  // Export to Word (DOCX)
  const exportToWord = async () => {
    if (data.length === 0) return;

    const tableRows = data.map(student => {
      return new docx.TableRow({
        children: [
          new docx.TableCell({ children: [new docx.Paragraph(student.id)] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.name)] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.department)] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.classGroup || '-')] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.numberOfBacklogs.toString())] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.best2CieAvg.toString())] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.cieScaled.toString())] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.assignmentTotal.toString())] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.labTotal.toString())] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.totalScore.toString())] }),
          new docx.TableCell({ children: [new docx.Paragraph(student.vergeStatus)] })
        ]
      });
    });

    const table = new docx.Table({
      rows: [
        new docx.TableRow({
          children: [
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'ID', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Name', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Department', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Class Group', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: '# Backlogs', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Best 2 CIE Avg', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'CIE Scaled', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Assign Total', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Lab Total', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Total Score', bold: true })] })] }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Verge Status', bold: true })] })] })
          ]
        }),
        ...tableRows
      ],
      // Table properties for borders
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      borders: {
        top: { style: docx.BorderStyle.SINGLE, size: 4, color: '000000' },
        bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: '000000' },
        left: { style: docx.BorderStyle.SINGLE, size: 4, color: '000000' },
        right: { style: docx.BorderStyle.SINGLE, size: 4, color: '000000' },
        insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 2, color: '000000' },
        insideVertical: { style: docx.BorderStyle.SINGLE, size: 2, color: '000000' }
      }
    });

    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: [
          new docx.Paragraph({
            children: [new docx.TextRun({ text: 'Verge of Backlog Report', bold: true, size: 36 })],
            
            alignment: docx.AlignmentType.CENTER,
            spacing: { after: 200 } // Add space after title
          }),
          new docx.Paragraph({
            text: `Generated on: ${new Date().toLocaleString()}`,
            alignment: docx.AlignmentType.CENTER,
            spacing: { after: 200 } // Add space after date
          }),
          table
        ]
      }]
    });

    const blob = await docx.Packer.toBlob(doc);
    saveAs(blob, 'verge-of-backlog-report.docx');
  };

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Initial data load
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const response = await API.get('/semesters');
        setSemesters(response.data || []);
      } catch (err) {
        console.error('Failed to fetch semesters', err);
      }
    };

    fetchSemesters();
    fetchReport();
  }, []);

  const atRiskCount = data.filter((student) => student.vergeStatus === 'AT_RISK').length;
  const totalBacklogs = data.reduce((total, student) => total + student.numberOfBacklogs, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verge of Backlog Report</h1>
          <p className="text-gray-500 text-sm mt-1">Review students at risk based on academic performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportToPDF}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-100 px-4 h-[42px] text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || data.length === 0}
          >
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            Export PDF
          </button>
          <button
            onClick={exportToWord}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-100 px-4 h-[42px] text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || data.length === 0}
          >
            <FileText size={16} strokeWidth={2} aria-hidden="true" />
            Export Word
          </button>
          <button
            onClick={fetchReport}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 h-[42px] text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw size={16} strokeWidth={2} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Students reviewed</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{data.length}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">At risk</p>
          <p className="mt-2 text-2xl font-bold text-red-900">{atRiskCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total backlogs</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{totalBacklogs}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-900">Report filters</h2>
            <p className="text-xs text-gray-500 mt-1">Narrow the report by semester, department, or class.</p>
          </div>
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-blue-50 text-blue-700 items-center justify-center">
            <FileText size={18} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Semester</label>
            <select
              name="semesterId"
              value={filters.semesterId}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 appearance-none"
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 appearance-none"
            >
              <option value="">All Departments</option>
              <option value="Computer Science & Engineering">CSE</option>
              <option value="Information Science">ISE</option>
              <option value="Artificial Intelligence">AI&DS</option>
              <option value="Electronics & Communication">EC</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Class Group</label>
            <input
              type="text"
              name="classGroup"
              placeholder="e.g. CSE-A (Optional)"
              value={filters.classGroup}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Verge Threshold</label>
            <select
              name="vergeThreshold"
              value={filters.vergeThreshold}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 appearance-none"
            >
              <option value="5">5+ Backlogs (Critical)</option>
              <option value="10">10+ Backlogs</option>
              <option value="13">13+ Backlogs (Year Back)</option>
              <option value="15">15+ Backlogs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Loading report data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={28} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p className="font-medium text-gray-700">No students match these filters</p>
            <p className="mt-1 text-sm text-gray-500">Try broadening the department, class, or threshold.</p>
          </div>
        ) : (
          <>
          <div className="grid gap-3 p-4 md:hidden">
            {data.map((student) => (
              <article key={student.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 break-words">{student.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-500">{student.id}</p>
                  </div>
                  <span className={student.vergeStatus === 'AT_RISK'
                    ? 'shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-800'
                    : 'shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-800'}
                  >
                    {student.vergeStatus}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500 break-words">
                  {student.department} · {student.classGroup || 'No class group'}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                    <p className="text-gray-400">Backlogs</p>
                    <input
                      type="number"
                      min="0"
                      defaultValue={student.numberOfBacklogs}
                      onBlur={(event) => {
                        if (event.target.value !== String(student.numberOfBacklogs)) {
                          handleUpdateBacklog(student.id, event.target.value);
                        }
                      }}
                      className={`mt-1 w-16 rounded border px-2 py-1 text-center font-semibold focus:outline-none focus:ring-2 ${
                        student.numberOfBacklogs === 0
                          ? 'border-green-300 bg-green-100 text-green-800 focus:ring-green-500'
                          : student.numberOfBacklogs >= 5
                            ? 'border-red-900 bg-red-700 text-white focus:ring-red-500'
                            : 'border-red-300 bg-red-100 text-red-800 focus:ring-red-500'
                      }`}
                    />
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                    <p className="text-gray-400">Total score</p>
                    <p className="mt-1 font-semibold text-gray-800">{student.totalScore}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                    <p className="text-gray-400">Best 2 CIE avg</p>
                    <p className="mt-1 font-semibold text-gray-800">{student.best2CieAvg}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                    <p className="text-gray-400">CIE scaled</p>
                    <p className="mt-1 font-semibold text-gray-800">{student.cieScaled}</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>Assignment: <strong className="text-gray-700">{student.assignmentTotal}</strong></span>
                  <span>Lab: <strong className="text-gray-700">{student.labTotal}</strong></span>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <caption className="sr-only">Students at risk of backlog</caption>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Backlogs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best 2 CIE Avg</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CIE Scaled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assign Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lab Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verge Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((student, index) => (
                  <tr key={student.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.classGroup || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <input 
                        type="number" 
                        min="0"
                        className={`w-16 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 ${
                          student.numberOfBacklogs === 0 
                            ? 'bg-green-100 text-green-800 border-green-300 focus:ring-green-500' 
                            : student.numberOfBacklogs >= 5 
                              ? 'bg-red-700 text-white border-red-900 font-bold focus:ring-red-500' 
                              : 'bg-red-100 text-red-800 border-red-300 focus:ring-red-500'
                        }`}
                        defaultValue={student.numberOfBacklogs}
                        onBlur={(e) => {
                          if (e.target.value !== String(student.numberOfBacklogs)) {
                            handleUpdateBacklog(student.id, e.target.value);
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.best2CieAvg}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.cieScaled}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.assignmentTotal}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.labTotal}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.totalScore}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm px-2 inline-flex items-center">
                      <span className={student.vergeStatus === 'AT_RISK' ? 'bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded' : 'bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded'}>
                        {student.vergeStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;