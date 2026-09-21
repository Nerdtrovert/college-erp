import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import * as docx from 'docx';

const ReportsDashboard: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    semesterId: '',
    department: '',
    classGroup: '',
    vergeThreshold: '13'
  });

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

      const response = await fetch(`/api/reports/verge-of-backlog?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
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
      }
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
    fetchReport();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Verge of Backlog Report</h1>
        <div className="flex space-x-3">
          <button
            onClick={exportToPDF}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded flex items-center space-x-1"
            disabled={loading || data.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
          <button
            onClick={exportToWord}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded flex items-center space-x-1"
            disabled={loading || data.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Word
          </button>
          <button
            onClick={fetchReport}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded flex items-center space-x-1"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Semester ID</label>
            <input
              type="text"
              name="semesterId"
              value={filters.semesterId}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <input
              type="text"
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Class Group</label>
            <input
              type="text"
              name="classGroup"
              value={filters.classGroup}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Verge Threshold</label>
            <input
              type="number"
              name="vergeThreshold"
              value={filters.vergeThreshold}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading report data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No data available. Please check your filters or try again later.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                  <tr key={index} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
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
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;