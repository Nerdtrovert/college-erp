import React, { useState, useEffect, useMemo } from 'react';
import {
  Upload, Search, Edit2, Trash2, CheckCircle2, AlertCircle,
  ChevronDown, HelpCircle, Loader2, X, Plus, ShieldCheck,
  Download
} from 'lucide-react';
import API from '../../services/api';

interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface StudentUser {
  id: string; // roll number
  name: string;
  role: string;
  department: string;
  classGroup: string;
  semesterId?: string;
  semester?: {
    id: string;
    name: string;
  };
}

export const StudentManagement: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [defaultDepartment, setDefaultDepartment] = useState('Computer Science and Engineering (CSE)');
  const [defaultClassGroup, setDefaultClassGroup] = useState('CSE-B');
  const [file, setFile] = useState<File | null>(null);
  
  // App UI states
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [uploadSummary, setUploadSummary] = useState<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    details: any;
  } | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Edit / Add state
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);
  const [newStudent, setNewStudent] = useState<{ id: string; name: string; department: string; classGroup: string; semesterId: string; numberOfBacklogs?: number; backlogSubjects?: string } | null>(null);
  const [studentPassword, setStudentPassword] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  // Report type state
  const [reportType, setReportType] = useState<'students' | 'faculty-marks'>('students');
  // Export format state
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf' | 'json'>('csv');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [semRes, studRes] = await Promise.all([
        API.get('/semesters'),
        API.get('/auth/users?role=student')
      ]);
      setSemesters(semRes.data);
      setStudents(studRes.data);

      // Set default selected semester if active is present
      const activeSem = semRes.data.find((s: Semester) => s.status === 'ACTIVE');
      if (activeSem) {
        setSelectedSemester(activeSem.id);
      } else if (semRes.data.length > 0) {
        setSelectedSemester(semRes.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching student management data:', err);
      showToast('Failed to load semesters or students list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadSummary(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      showToast('Please select a file to upload.', 'error');
      return;
    }
    if (!selectedSemester) {
      showToast('Please select a target semester.', 'error');
      return;
    }

    setUploading(true);
    setUploadSummary(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('semesterId', selectedSemester);
    formData.append('defaultDepartment', defaultDepartment);
    formData.append('defaultClassGroup', defaultClassGroup);

    try {
      const res = await API.post('/auth/students/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      showToast(res.data.message || 'Students imported successfully!', 'success');
      setUploadSummary(res.data.summary ? { ...res.data.summary, details: res.data.details } : null);
      setFile(null);
      // Reset input element
      const fileInput = document.getElementById('student-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Reload table
      const studRes = await API.get('/auth/users?role=student');
      setStudents(studRes.data);
    } catch (err: any) {
      console.error('Error uploading students:', err);
      const errMsg = err.response?.data?.error || 'Failed to parse and import students.';
      showToast(errMsg, 'error');
    } finally {
      setUploading(false);
    }
  };



  const handleDownloadReport = async () => {
    try {
      if (reportType === 'students') {
        const filtered = filteredStudents;
        if (filtered.length === 0) {
          showToast('No students match the current filters to export.', 'error');
          return;
        }

        // Call backend endpoint with format parameter and filters
        const response = await API.get('/vip/students/report', {
          params: {
            search: searchQuery,
            semesterId: filterSemester !== 'all' ? filterSemester : undefined,
            classGroup: filterSection !== 'all' ? filterSection : undefined,
            format: exportFormat
          },
          responseType: exportFormat === 'csv' || exportFormat === 'json' ? 'text' : 'blob'
        });

        // Handle different response types
        let blob: Blob;
        let filename: string;

        if (exportFormat === 'csv') {
          blob = new Blob([response.data], { type: 'text/csv' });
          filename = `students-report${filterSemester !== 'all' ? `-${filterSemester}` : ''}${filterSection !== 'all' ? `-${filterSection}` : ''}${searchQuery ? `-search` : ''}.csv`;
        } else if (exportFormat === 'json') {
          blob = new Blob([response.data], { type: 'application/json' });
          filename = `students-report${filterSemester !== 'all' ? `-${filterSemester}` : ''}${filterSection !== 'all' ? `-${filterSection}` : ''}${searchQuery ? `-search` : ''}.json`;
        } else if (exportFormat === 'excel') {
          blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          filename = `students-report${filterSemester !== 'all' ? `-${filterSemester}` : ''}${filterSection !== 'all' ? `-${filterSection}` : ''}${searchQuery ? `-search` : ''}.xlsx`;
        } else if (exportFormat === 'pdf') {
          blob = new Blob([response.data], { type: 'application/pdf' });
          filename = `students-report${filterSemester !== 'all' ? `-${filterSemester}` : ''}${filterSection !== 'all' ? `-${filterSection}` : ''}${searchQuery ? `-search` : ''}.pdf`;
        } else {
          throw new Error(`Unsupported student report format: ${exportFormat}`);
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (reportType === 'faculty-marks') {
        // Fetch faculty-wise marks report from backend with format parameter
        const response = await API.get('/vip/faculty-marks-report', {
          params: { format: exportFormat },
          responseType: exportFormat === 'csv' || exportFormat === 'json' ? 'text' : 'blob'
        });

        // Handle different response types
        let blob: Blob;
        let filename: string;

        if (exportFormat === 'csv') {
          blob = new Blob([response.data], { type: 'text/csv' });
          filename = `faculty-marks-report.csv`;
        } else if (exportFormat === 'json') {
          blob = new Blob([response.data], { type: 'application/json' });
          filename = `faculty-marks-report.json`;
        } else if (exportFormat === 'excel') {
          blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          filename = `faculty-marks-report.xlsx`;
        } else if (exportFormat === 'pdf') {
          blob = new Blob([response.data], { type: 'application/pdf' });
          filename = `faculty-marks-report.pdf`;
        } else {
          throw new Error(`Unsupported faculty marks report format: ${exportFormat}`);
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error generating report:', err);
      showToast('Failed to generate report.', 'error');
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingStudent) {
        // Edit student
        const res = await API.patch(`/auth/users/${editingStudent.id}`, {
          name: editingStudent.name,
          department: editingStudent.department,
          classGroup: editingStudent.classGroup,
          semesterId: editingStudent.semesterId || null,
          ...(studentPassword ? { password: studentPassword } : {})
        });
        showToast(res.data.message || 'Student updated successfully', 'success');
      } else if (newStudent) {
        // Add single student manual register
        const res = await API.post('/auth/register', {
          id: newStudent.id,
          name: newStudent.name,
          password: studentPassword,
          role: 'student',
          department: newStudent.department,
          classGroup: newStudent.classGroup,
        });

        // If a semester is linked, update their semester
        if (newStudent.semesterId) {
          await API.patch(`/auth/users/${newStudent.id}`, {
            semesterId: newStudent.semesterId
          });
        }

        showToast(res.data.message || 'Student registered successfully', 'success');
      }
      setShowFormModal(false);
      setEditingStudent(null);
      setNewStudent(null);
      setStudentPassword('');
      
      // Reload table
      const studRes = await API.get('/auth/users?role=student');
      setStudents(studRes.data);
    } catch (err: any) {
      console.error('Error saving student:', err);
      const errMsg = err.response?.data?.error || 'Failed to save student record.';
      showToast(errMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm(`Are you sure you want to delete student ${studentId}? All attendance and marks records will be permanently removed.`)) {
      return;
    }
    try {
      const res = await API.delete(`/auth/users/${studentId}`);
      showToast(res.data.message || 'Student deleted successfully', 'success');
      setStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (err: any) {
      console.error('Error deleting student:', err);
      const errMsg = err.response?.data?.error || 'Failed to delete student.';
      showToast(errMsg, 'error');
    }
  };

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSemester =
        filterSemester === 'all' ||
        s.semesterId === filterSemester;

      const matchesSection =
        filterSection === 'all' ||
        (s.classGroup && s.classGroup.toLowerCase() === filterSection.toLowerCase());

      return matchesSearch && matchesSemester && matchesSection;
    });
  }, [students, searchQuery, filterSemester, filterSection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Generate unique list of classGroup sections for filter dropdown
  const sections = Array.from(
    new Set(
      students
        .map(s => s.classGroup)
        .filter((c): c is string => c !== null && c !== undefined && c !== '')
    )
  ).sort();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 font-medium">
        <Loader2 className="animate-spin text-blue-700 mb-3" size={32} />
        Loading Student Management portal...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all duration-300 animate-slide-in ${
          toast.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Directory Management</h1>
          <p className="text-gray-500 text-sm mt-1">Enroll students semester-wise by uploading lists or manage individual accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewStudent({
                id: '',
                name: '',
                department: defaultDepartment,
                classGroup: defaultClassGroup,
                semesterId: selectedSemester || (semesters[0]?.id || '')
              });
              setEditingStudent(null);
              setStudentPassword('');
              setShowFormModal(true);
            }}
            className="flex items-center justify-center gap-2 border border-blue-200 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold text-sm px-4 h-[42px] rounded-2xl transition-colors duration-150 whitespace-nowrap"
          >
            <Plus size={16} />
            Add Single Student
          </button>
          <div className="flex items-center gap-2">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as "students" | "faculty-marks")}
              className="px-3 h-[42px] rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="students">Student List</option>
              <option value="faculty-marks">Faculty-wise Marks</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as "json" | "csv" | "excel" | "pdf")}
              className="px-3 h-[42px] rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <button
            onClick={handleDownloadReport}
            disabled={loading || uploading}
            className="flex items-center justify-center gap-2 border border-emerald-300 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold text-sm px-4 h-[42px] rounded-2xl transition-colors duration-150 whitespace-nowrap"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Main Grid: Upload & Instructions */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Upload Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Upload size={18} className="text-blue-700" />
            <h2 className="font-bold text-gray-900 text-base">Bulk Upload Student Roster</h2>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Target Semester</label>
                <div className="relative">
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 pr-10"
                  >
                    <option value="" disabled>Select target semester...</option>
                    {semesters.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Default Section (Fallback)</label>
                <input
                  type="text"
                  value={defaultClassGroup}
                  onChange={(e) => setDefaultClassGroup(e.target.value)}
                  placeholder="e.g. CSE-B"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Default Department (Fallback)</label>
              <input
                type="text"
                value={defaultDepartment}
                onChange={(e) => setDefaultDepartment(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors duration-150 bg-gray-50/50">
              <input
                type="file"
                id="student-file-input"
                accept=".xlsx,.xls,.docx,.doc,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="student-file-input" className="cursor-pointer flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                  <Upload size={20} />
                </div>
                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Click to upload or drag & drop</p>
                    <p className="text-xs text-gray-400 mt-1">Accepts Excel (.xlsx, .xls), Word (.docx), or PDF (.pdf)</p>
                  </div>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading || !file || !selectedSemester}
              className="w-full flex items-center justify-center gap-2 border border-blue-200 bg-blue-100 hover:bg-blue-200 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 text-blue-800 font-semibold text-sm py-3 rounded-2xl transition-colors duration-150"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Processing Student Records...
                </>
              ) : (
                'Import & Enroll Students'
              )}
            </button>
          </form>
        </div>

        {/* Documentation / Templates Help Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <HelpCircle size={18} className="text-amber-700" />
            <h2 className="font-bold text-gray-900 text-base">File Formats Supported</h2>
          </div>

          <div className="space-y-3.5 text-xs text-gray-600">
            <div>
              <p className="font-bold text-gray-800 mb-1">1. Excel Spreadsheets (.xlsx, .xls)</p>
              <p className="leading-relaxed">Provide column headers. Columns are mapped automatically (case-insensitive):</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1 font-mono text-[10px]">
                <li><strong className="text-gray-700">Roll Number:</strong> Roll No, ID, USN, Roll</li>
                <li><strong className="text-gray-700">Name:</strong> Name, Student Name, Full Name</li>
                <li><strong className="text-gray-700">Section:</strong> Section, Class, Section</li>
                <li><strong className="text-gray-700">Department:</strong> Department, Dept, Branch</li>
                <li><strong className="text-gray-700">Backlogs (Opt):</strong> Backlogs, numberOfBacklogs</li>
                <li><strong className="text-gray-700">Backlog Subjs (Opt):</strong> Backlog Subjects</li>
              </ul>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="font-bold text-gray-800 mb-1">2. Word (.docx) & PDF (.pdf)</p>
              <p className="leading-relaxed mb-1.5">Reads both block key-value files and comma/tab-separated sheets.</p>
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 font-mono text-[9px] leading-normal text-gray-500 whitespace-pre">
{`CS21B001, Rehman Dakait, CSE, CSE-B
CS21B002, Aditi Rao, CSE, CSE-B`}
              </div>
              <p className="mt-1.5 leading-normal">Or structured blocks:</p>
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 font-mono text-[9px] leading-normal text-gray-500 whitespace-pre">
{`Roll Number: CS21B001
Name: Rehman Dakait
Section: CSE-B`}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 flex gap-2">
              <ShieldCheck size={16} className="flex-shrink-0 text-amber-700" />
              <p className="leading-normal">Uploaded accounts use the default password <code className="font-mono bg-white px-1 rounded border border-amber-300">student123</code>. Individual student accounts can be given a password by the supervisor.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Upload Summary Roster */}
      {uploadSummary && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900">Import Job Results</h3>
            <button 
              onClick={() => setUploadSummary(null)} 
              className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 p-1"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Rows</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{uploadSummary.total}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
              <p className="text-xs text-green-700 font-semibold uppercase">Created</p>
              <p className="text-xl font-bold text-green-800 mt-1">{uploadSummary.created}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-700 font-semibold uppercase">Updated</p>
              <p className="text-xl font-bold text-blue-800 mt-1">{uploadSummary.updated}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-700 font-semibold uppercase">Skipped</p>
              <p className="text-xl font-bold text-amber-800 mt-1">{uploadSummary.skipped}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
              <p className="text-xs text-red-700 font-semibold uppercase">Errors</p>
              <p className="text-xl font-bold text-red-800 mt-1">{uploadSummary.errors}</p>
            </div>
          </div>

          {/* Details toggle list */}
          {uploadSummary.details && uploadSummary.details.errors && uploadSummary.details.errors.length > 0 && (
            <div className="border border-red-100 rounded-xl overflow-hidden bg-red-50/20">
              <div className="bg-red-50/50 px-4 py-2 border-b border-red-100 flex items-center justify-between text-xs font-bold text-red-800">
                <span>Failed Import Records ({uploadSummary.details.errors.length})</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-red-50 px-4">
                {uploadSummary.details.errors.map((err: any, idx: number) => (
                  <div key={idx} className="py-2 flex items-start justify-between text-xs gap-3">
                    <div>
                      <span className="font-semibold text-gray-800">{err.id || 'NO ROLL'}</span>
                      <span className="text-gray-500 ml-2">{err.name || 'NO NAME'}</span>
                    </div>
                    <span className="text-red-700 font-medium">{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Students Directory List Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Table Header / Filters */}
        <div className="p-5 border-b border-gray-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="font-bold text-gray-900 text-base">Students Directory</h3>
            
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full md:w-80">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, roll, dept..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none text-sm text-gray-900 focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-500 font-medium">Filters:</span>
            
            {/* Department Filter */}
            <div className="relative">
              <select
                value={filterDepartment}
                onChange={(e) => { setFilterDepartment(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-1.5 pr-8 font-semibold text-xs text-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Departments</option>
                <option value="Computer Science and Engineering (CSE)">Computer Science and Engineering (CSE)</option>
                  <option value="Information Science and Engineering (ISE)">Information Science and Engineering (ISE)</option>
                  <option value="Electronics and Communication Engineering (ECE)">Electronics and Communication Engineering (ECE)</option>
                  <option value="Artificial Intelligence and Data Science (AI&DS)">Artificial Intelligence and Data Science (AI&DS)</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            
            {/* Semester Filter */}
            <div className="relative">
              <select
                value={filterSemester}
                onChange={(e) => { setFilterSemester(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-1.5 pr-8 font-semibold text-xs text-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Semesters</option>
                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            {/* Section/ClassGroup Filter */}
            <div className="relative">
              <select
                value={filterSection}
                onChange={(e) => { setFilterSection(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-1.5 pr-8 font-semibold text-xs text-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Sections</option>
                {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            
            <span className="ml-auto text-xs text-gray-400 font-medium">{filteredStudents.length} Students found</span>
          </div>
        </div>

        {/* Mobile directory cards */}
        <div className="grid gap-3 p-4 md:hidden">
          {paginatedStudents.length > 0 ? paginatedStudents.map((stud) => (
            <div key={stud.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {stud.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 break-words">{stud.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-500">{stud.id}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                  <p className="text-gray-400">Department</p>
                  <p className="mt-0.5 font-medium text-gray-700 break-words">{stud.department}</p>
                </div>
                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                  <p className="text-gray-400">Semester / Class</p>
                  <p className="mt-0.5 font-medium text-gray-700 break-words">{stud.semester?.name || 'No Semester'} · {stud.classGroup || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setEditingStudent(stud);
                    setNewStudent(null);
                    setShowFormModal(true);
                  }}
                  className="min-h-10 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                >
                  <Edit2 size={13} className="mr-1 inline" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteStudent(stud.id)}
                  className="min-h-10 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                >
                  <Trash2 size={13} className="mr-1 inline" /> Delete
                </button>
              </div>
            </div>
          )) : (
            <p className="py-8 text-center text-sm text-gray-400">No students matching active query or filters found.</p>
          )}
        </div>

        {/* Desktop directory table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 shadow-[0_1px_0_0_#e5e7eb]">
              <tr className="bg-gray-55/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                <th className="py-3 px-5">Student Details</th>
                <th className="py-3 px-5">Roll Number</th>
                <th className="py-3 px-5">Department</th>
                <th className="py-3 px-5">Semester / Section</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((stud) => (
                  <tr key={stud.id} className="hover:bg-gray-50/50">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {stud.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{stud.name}</p>
                          <p className="text-xs text-gray-400 uppercase">Student</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs font-semibold text-gray-700">{stud.id}</td>
                    <td className="py-4 px-5 text-gray-600 max-w-[200px] truncate">{stud.department}</td>
                    <td className="py-4 px-5">
                      <div className="space-y-0.5">
                        <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-0.5 text-[10px] font-bold">
                          {stud.semester?.name || 'No Semester'}
                        </span>
                        <p className="text-xs text-gray-500 font-medium">Class: <span className="font-bold text-gray-700">{stud.classGroup || 'N/A'}</span></p>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingStudent(stud);
                            setNewStudent(null);
                            setShowFormModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Student details"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(stud.id)}
                          className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 font-medium bg-gray-50/20">
                    No students matching active query or filters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-gray-500 font-medium">
              Showing {(currentPage-1)*itemsPerPage+1} - {Math.min(currentPage*itemsPerPage, filteredStudents.length)} of {filteredStudents.length} Students
            </span>
            <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-1 sm:justify-end">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                    currentPage === p
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit / Add Dialog Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">
                {editingStudent ? 'Edit Student Profile' : 'Enroll Single Student'}
              </h3>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  setEditingStudent(null);
                  setNewStudent(null);
                  setStudentPassword('');
                }}
                className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Roll Number / Student ID</label>
                <input
                  type="text"
                  required
                  disabled={!!editingStudent} // Roll number is the DB primary key, cannot be changed
                  value={editingStudent ? editingStudent.id : (newStudent?.id || '')}
                  onChange={(e) => {
                    if (newStudent) {
                      setNewStudent({ ...newStudent, id: e.target.value.trim().toUpperCase() });
                    }
                  }}
                  placeholder="e.g. 1HC24CS001"
                  pattern="1HC[0-9]{2}[A-Za-z]{2}[0-9]{3}"
                  title="Use the USN format 1HC24CS001"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent ? editingStudent.name : (newStudent?.name || '')}
                  onChange={(e) => {
                    if (editingStudent) {
                      setEditingStudent({ ...editingStudent, name: e.target.value });
                    } else if (newStudent) {
                      setNewStudent({ ...newStudent, name: e.target.value });
                    }
                  }}
                  placeholder="e.g. Rehman Dakait"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Department</label>
                <select
                  required
                  value={editingStudent ? editingStudent.department : (newStudent?.department || '')}
                  onChange={(e) => {
                    if (editingStudent) {
                      setEditingStudent({ ...editingStudent, department: e.target.value });
                    } else if (newStudent) {
                      setNewStudent({ ...newStudent, department: e.target.value });
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>Select Department</option>
                  <option value="Computer Science and Engineering (CSE)">Computer Science and Engineering (CSE)</option>
                  <option value="Information Science and Engineering (ISE)">Information Science and Engineering (ISE)</option>
                  <option value="Electronics and Communication Engineering (ECE)">Electronics and Communication Engineering (ECE)</option>
                  <option value="Artificial Intelligence and Data Science (AI&DS)">Artificial Intelligence and Data Science (AI&DS)</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                  {editingStudent ? 'New Password (Optional)' : 'Initial Password'}
                </label>
                <input
                  type="password"
                  required={!editingStudent}
                  minLength={6}
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder={editingStudent ? 'Leave blank to keep current' : 'Minimum 6 characters'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Section</label>
                  <input
                    type="text"
                    required
                    value={editingStudent ? (editingStudent.classGroup || '') : (newStudent?.classGroup || '')}
                    onChange={(e) => {
                      if (editingStudent) {
                        setEditingStudent({ ...editingStudent, classGroup: e.target.value });
                      } else if (newStudent) {
                        setNewStudent({ ...newStudent, classGroup: e.target.value });
                      }
                    }}
                    placeholder="e.g. CSE-B"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Semester</label>
                  <div className="relative">
                    <select
                      value={editingStudent ? (editingStudent.semesterId || '') : (newStudent?.semesterId || '')}
                      onChange={(e) => {
                        if (editingStudent) {
                          setEditingStudent({ ...editingStudent, semesterId: e.target.value });
                        } else if (newStudent) {
                          setNewStudent({ ...newStudent, semesterId: e.target.value });
                        }
                      }}
                      className="w-full appearance-none px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 pr-8"
                    >
                      <option value="">No Semester</option>
                      {semesters.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {!editingStudent && newStudent && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Number of Backlogs</label>
                    <input
                      type="number"
                      min="0"
                      value={newStudent.numberOfBacklogs || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setNewStudent({ ...newStudent, numberOfBacklogs: val, backlogSubjects: val === 0 ? '' : newStudent.backlogSubjects });
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {newStudent.numberOfBacklogs && newStudent.numberOfBacklogs > 0 ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Backlog Subject Codes</label>
                      <input
                        type="text"
                        required={newStudent.numberOfBacklogs > 0}
                        value={newStudent.backlogSubjects || ''}
                        onChange={(e) => setNewStudent({ ...newStudent, backlogSubjects: e.target.value })}
                        placeholder="e.g. 24CS101, 24MA101"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ) : <div />}
                </div>
              )}

              {!editingStudent && (
                <div className="bg-blue-50 text-blue-900 text-xs rounded-xl p-3 border border-blue-150 leading-relaxed">
                  <strong>Initial Credentials:</strong> The student will log in using their USN and the password entered above.
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingStudent(null);
                    setNewStudent(null);
                    setStudentPassword('');
                  }}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-2xl border border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-60"
                >
                  {actionLoading && <Loader2 className="animate-spin" size={14} />}
                  {editingStudent ? 'Save Changes' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
