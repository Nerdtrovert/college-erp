import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Edit2, Trash2, CheckCircle2, AlertCircle,
  Loader2, X, Plus, Download
} from 'lucide-react';
import API from '../../services/api';
import { PROGRAM_LABELS, STUDENT_PROGRAMS, type StudentProgram } from '../../constants/program';
import { DropdownSelect } from '../ui/DropdownSelect';

interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface StudentUser {
  id: string; // Database UUID
  email?: string | null; // Student USN
  name: string;
  role: string;
  program: StudentProgram;
  classGroup: string;
  semesterId?: string;
  isActive?: boolean;
  batchStartYear?: number | null;
  batchEndYear?: number | null;
  numberOfBacklogs?: number;
  backlogSubjects?: string[];
  semester?: {
    id: string;
    name: string;
  };
  semesterNumber?: number;
  enrollments?: Array<{
    id: string;
    semesterId: string;
    semesterNumber: number;
    program: StudentProgram;
    classGroup: string;
    semester?: { id: string; name: string };
  }>;
}

export const StudentManagement: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  
  // App UI states
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterSemesterNumber, setFilterSemesterNumber] = useState('all');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Edit / Add state
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);
  const [editBacklogs, setEditBacklogs] = useState<number>(0);
  const [editBacklogSubjects, setEditBacklogSubjects] = useState<string>('');
  const [newStudent, setNewStudent] = useState<{
    id: string; // USN
    name: string;
    program: StudentProgram;
    classGroup: string;
    semesterId: string;
    numberOfBacklogs?: number;
    backlogSubjects?: string;
  } | null>(null);
  const [studentPassword, setStudentPassword] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Active semester derived from database/API semester configuration
  const activeSemester = useMemo(() => {
    return semesters.find(s => s.status === 'ACTIVE');
  }, [semesters]);

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
            semesterNumber: filterSemesterNumber !== 'all' ? filterSemesterNumber : undefined,
            program: filterProgram !== 'all' ? filterProgram : undefined,
            classGroup: filterSection !== 'all' ? filterSection : undefined,
            format: exportFormat
          },
          responseType: exportFormat === 'csv' || exportFormat === 'json' ? 'text' : 'blob'
        });

        let blob: Blob;
        let filename: string;

        if (exportFormat === 'csv') {
          blob = new Blob([response.data], { type: 'text/csv' });
          filename = `students-report${filterProgram !== 'all' ? `-${filterProgram}` : ''}${filterSemesterNumber !== 'all' ? `-sem${filterSemesterNumber}` : ''}${filterSemester !== 'all' ? `-${filterSemester}` : ''}${filterSection !== 'all' ? `-${filterSection}` : ''}${searchQuery ? `-search` : ''}.csv`;
        } else if (exportFormat === 'json') {
          blob = new Blob([response.data], { type: 'application/json' });
          filename = `students-report${filterProgram !== 'all' ? `-${filterProgram}` : ''}${filterSemesterNumber !== 'all' ? `-sem${filterSemesterNumber}` : ''}${filterSemester !== 'all' ? `-${filterSemester}` : ''}${filterSection !== 'all' ? `-${filterSection}` : ''}${searchQuery ? `-search` : ''}.json`;
        } else if (exportFormat === 'excel') {
          blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          filename = `students-report${filterProgram !== 'all' ? `-${filterProgram}` : ''}${filterSemesterNumber !== 'all' ? `-sem${filterSemesterNumber}` : ''}${filterSemester !== 'all' ? `-${filterSemester}` : ''}${filterSection !== 'all' ? `-${filterSection}` : ''}${searchQuery ? `-search` : ''}.xlsx`;
        } else if (exportFormat === 'pdf') {
          blob = new Blob([response.data], { type: 'application/pdf' });
          filename = `students-report${filterProgram !== 'all' ? `-${filterProgram}` : ''}${filterSemesterNumber !== 'all' ? `-sem${filterSemesterNumber}` : ''}${filterSemester !== 'all' ? `-${filterSemester}` : ''}${filterSection !== 'all' ? `-${filterSection}` : ''}${searchQuery ? `-search` : ''}.pdf`;
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
        const response = await API.get('/vip/faculty-marks-report', {
          params: { format: exportFormat },
          responseType: exportFormat === 'csv' || exportFormat === 'json' ? 'text' : 'blob'
        });

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
        const backlogList = editBacklogSubjects
          ? editBacklogSubjects.split(',').map(s => s.trim()).filter(Boolean)
          : [];
        const res = await API.patch(`/auth/users/${editingStudent.id}`, {
          name: editingStudent.name.trim(),
          program: editingStudent.program,
          classGroup: editingStudent.classGroup.trim(),
          semesterId: editingStudent.semesterId || null,
          numberOfBacklogs: editBacklogs,
          backlogSubjects: backlogList,
          ...(studentPassword ? { password: studentPassword } : {})
        });
        showToast(res.data.message || 'Student updated successfully', 'success');
      } else if (newStudent) {
        // Add single student manual register
        const usn = newStudent.id.trim().toUpperCase();
        if (!usn) {
          showToast('Roll Number / USN is required', 'error');
          setActionLoading(false);
          return;
        }
        const backlogList = newStudent.backlogSubjects
          ? newStudent.backlogSubjects.split(',').map(s => s.trim()).filter(Boolean)
          : [];
        const res = await API.post('/auth/register', {
          email: usn,
          name: newStudent.name.trim(),
          password: studentPassword,
          role: 'student',
          program: newStudent.program,
          classGroup: newStudent.classGroup.trim(),
          semesterId: newStudent.semesterId || undefined,
          numberOfBacklogs: newStudent.numberOfBacklogs ?? 0,
          backlogSubjects: backlogList,
        });

        showToast(res.data.message || 'Student registered successfully', 'success');
      }
      setShowFormModal(false);
      setEditingStudent(null);
      setNewStudent(null);
      setStudentPassword('');
      setEditBacklogs(0);
      setEditBacklogSubjects('');
      
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
    if (!window.confirm('Are you sure you want to delete this student? All linked records will be permanently removed.')) {
      return;
    }
    try {
      const res = await API.delete(`/auth/users/${studentId}`);
      showToast(res.data.message || 'Student deleted successfully', 'success');
      setStudents(prev => prev.filter(s => s.id !== studentId && s.email?.toLowerCase() !== studentId.toLowerCase()));
    } catch (err: any) {
      console.error('Error deleting student:', err);
      const errMsg = err.response?.data?.error || 'Failed to delete student.';
      showToast(errMsg, 'error');
    }
  };

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    const directoryStudents = students.flatMap((student) => {
      const enrollments = student.enrollments?.length ? student.enrollments : [{
        id: `${student.id}-${student.semesterId || 'current'}`,
        semesterId: student.semesterId || '',
        program: student.program,
        classGroup: student.classGroup,
        semester: student.semester,
        semesterNumber: student.semesterNumber ?? 0,
      }];
      return enrollments.map((enrollment) => ({
        ...student,
        program: enrollment.program,
        classGroup: enrollment.classGroup,
        semesterId: enrollment.semesterId,
        semesterNumber: enrollment.semesterNumber,
        semester: enrollment.semester,
      }));
    });

    return directoryStudents.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.program.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProgram =
        filterProgram === 'all' || s.program === filterProgram;
      const matchesSemester =
        filterSemester === 'all' ||
        s.semesterId === filterSemester;
      const matchesSemesterNumber =
        filterSemesterNumber === 'all' ||
        String(s.semesterNumber) === filterSemesterNumber;

      const matchesSection =
        filterSection === 'all' ||
        (s.classGroup && s.classGroup.toLowerCase() === filterSection.toLowerCase());

      return matchesSearch && matchesProgram && matchesSemester && matchesSemesterNumber && matchesSection;
    });
  }, [students, searchQuery, filterProgram, filterSemester, filterSemesterNumber, filterSection]);

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
          <p className="text-gray-500 text-sm mt-1">Manage individual student accounts, academic enrollments, and profiles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setNewStudent({
                id: '',
                name: '',
                program: 'CSE',
                classGroup: '',
                semesterId: activeSemester ? activeSemester.id : '',
                numberOfBacklogs: 0,
                backlogSubjects: '',
              });
              setEditingStudent(null);
              setStudentPassword('');
              setEditBacklogs(0);
              setEditBacklogSubjects('');
              setShowFormModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 h-[42px] rounded-xl shadow-sm transition-colors duration-150 whitespace-nowrap"
          >
            <Plus size={16} />
            Add Student
          </button>
          <div className="flex items-center gap-2">
            <DropdownSelect
              value={reportType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReportType(e.target.value as "students" | "faculty-marks")}
              className="px-3 h-[42px] rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="students">Student List</option>
              <option value="faculty-marks">Faculty-wise Marks</option>
            </DropdownSelect>
          </div>
          <div className="flex items-center gap-2">
            <DropdownSelect
              value={exportFormat}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExportFormat(e.target.value as "json" | "csv" | "excel" | "pdf")}
              className="px-3 h-[42px] rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
            </DropdownSelect>
          </div>
          <button
            onClick={handleDownloadReport}
            disabled={loading}
            className="glossy-action flex items-center justify-center gap-2 border border-emerald-300 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold text-sm px-4 h-[42px] rounded-2xl transition-colors duration-150 whitespace-nowrap"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

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
                placeholder="Search by name, roll, program..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none text-sm text-gray-900 focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-500 font-medium">Filters:</span>
            
            {/* Program Filter */}
            <div className="relative">
              <DropdownSelect
                value={filterProgram}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setFilterProgram(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-1.5 pr-8 font-semibold text-xs text-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Programs</option>
                {STUDENT_PROGRAMS.map(program => <option key={program} value={program}>{PROGRAM_LABELS[program]}</option>)}
              </DropdownSelect>
            </div>
            
            {/* Semester Filter */}
            <div className="relative">
              <DropdownSelect
                value={filterSemester}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setFilterSemester(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-1.5 pr-8 font-semibold text-xs text-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Semesters</option>
                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </DropdownSelect>
            </div>

            {/* Semester Number Filter */}
            <div className="relative">
              <DropdownSelect
                value={filterSemesterNumber}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setFilterSemesterNumber(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-1.5 pr-8 font-semibold text-xs text-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Semester Numbers</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(number => (
                  <option key={number} value={number}>{number}{number === 1 ? 'st' : number === 2 ? 'nd' : number === 3 ? 'rd' : 'th'} Semester</option>
                ))}
              </DropdownSelect>
            </div>

            {/* Section/ClassGroup Filter */}
            <div className="relative">
              <DropdownSelect
                value={filterSection}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setFilterSection(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-1.5 pr-8 font-semibold text-xs text-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Sections</option>
                {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
              </DropdownSelect>
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
                  <p className="mt-0.5 font-mono text-xs text-gray-500">{stud.email ? stud.email.toUpperCase() : '—'}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                  <p className="text-gray-400">Program</p>
                  <p className="mt-0.5 font-medium text-gray-700 break-words">{PROGRAM_LABELS[stud.program]}</p>
                </div>
                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                  <p className="text-gray-400">Semester / Class</p>
                  <p className="mt-0.5 font-medium text-gray-700 break-words">{stud.semester?.name || 'No Semester'} · Sem {stud.semesterNumber || 'N/A'} · {stud.classGroup || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setEditingStudent(stud);
                    setNewStudent(null);
                    setStudentPassword('');
                    setEditBacklogs(stud.numberOfBacklogs ?? 0);
                    setEditBacklogSubjects(Array.isArray(stud.backlogSubjects) ? stud.backlogSubjects.join(', ') : '');
                    setShowFormModal(true);
                  }}
                  className="min-h-10 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Edit2 size={13} className="mr-1 inline" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteStudent(stud.id)}
                  className="min-h-10 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
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
                <th className="py-3 px-5">Roll Number (USN)</th>
                <th className="py-3 px-5">Program</th>
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
                    <td className="py-4 px-5 font-mono text-xs font-semibold text-gray-700">{stud.email ? stud.email.toUpperCase() : '—'}</td>
                    <td className="py-4 px-5 text-gray-600 max-w-[200px] truncate">{PROGRAM_LABELS[stud.program]}</td>
                    <td className="py-4 px-5">
                      <div className="space-y-0.5">
                        <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-0.5 text-[10px] font-bold">
                          {stud.semester?.name || 'No Semester'} · Sem {stud.semesterNumber || 'N/A'}
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
                            setStudentPassword('');
                            setEditBacklogs(stud.numberOfBacklogs ?? 0);
                            setEditBacklogSubjects(Array.isArray(stud.backlogSubjects) ? stud.backlogSubjects.join(', ') : '');
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
                {editingStudent ? 'Edit Student Profile' : 'Add Single Student'}
              </h3>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  setEditingStudent(null);
                  setNewStudent(null);
                  setStudentPassword('');
                  setEditBacklogs(0);
                  setEditBacklogSubjects('');
                }}
                className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Roll Number / Student ID (USN)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingStudent} // Primary student identifier
                  value={editingStudent ? (editingStudent.email ? editingStudent.email.toUpperCase() : editingStudent.id) : (newStudent?.id || '')}
                  onChange={(e) => {
                    if (newStudent) {
                      setNewStudent({ ...newStudent, id: e.target.value.trim().toUpperCase() });
                    }
                  }}
                  placeholder="e.g. 1HC24CS001"
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
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Program</label>
                <DropdownSelect
                  required
                  value={editingStudent ? editingStudent.program : (newStudent?.program || '')}
                  onChange={(value: string) => {
                    if (editingStudent) {
                      const program = value as StudentProgram;
                      setEditingStudent({ ...editingStudent, program });
                    } else if (newStudent) {
                      const program = value as StudentProgram;
                      setNewStudent({ ...newStudent, program });
                    }
                  }}
                  placeholder="Select Program"
                  ariaLabel="Select program"
                  options={STUDENT_PROGRAMS.map((program) => ({ value: program, label: PROGRAM_LABELS[program] }))}
                />
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Section / Class Group</label>
                  <input
                    type="text"
                    required
                    value={editingStudent ? (editingStudent.classGroup || '') : (newStudent?.classGroup || '')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Current Semester</label>
                  <div className="relative">
                    <DropdownSelect
                      value={editingStudent ? (editingStudent.semesterId || '') : (newStudent?.semesterId || '')}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        if (editingStudent) {
                          setEditingStudent({ ...editingStudent, semesterId: e.target.value });
                        } else if (newStudent) {
                          setNewStudent({ ...newStudent, semesterId: e.target.value });
                        }
                      }}
                      className="w-full appearance-none px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 pr-8"
                    >
                      <option value="">
                        {activeSemester ? 'No Semester' : 'Select Semester (No Active Semester)'}
                      </option>
                      {semesters.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.status === 'ACTIVE' ? '(Active)' : ''}
                        </option>
                      ))}
                    </DropdownSelect>
                  </div>
                  {!activeSemester && !editingStudent && (
                    <p className="mt-1 text-xs text-amber-600">
                      No active semester configured in the database. Please select a semester manually.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Number of Backlogs</label>
                  <input
                    type="number"
                    min="0"
                    value={editingStudent ? editBacklogs : (newStudent?.numberOfBacklogs || 0)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (editingStudent) {
                        setEditBacklogs(val);
                        if (val === 0) setEditBacklogSubjects('');
                      } else if (newStudent) {
                        setNewStudent({ ...newStudent, numberOfBacklogs: val, backlogSubjects: val === 0 ? '' : newStudent.backlogSubjects });
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
                  />
                </div>
                {(editingStudent ? editBacklogs > 0 : (newStudent?.numberOfBacklogs || 0) > 0) ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Backlog Subject Codes</label>
                    <input
                      type="text"
                      value={editingStudent ? editBacklogSubjects : (newStudent?.backlogSubjects || '')}
                      onChange={(e) => {
                        if (editingStudent) {
                          setEditBacklogSubjects(e.target.value);
                        } else if (newStudent) {
                          setNewStudent({ ...newStudent, backlogSubjects: e.target.value });
                        }
                      }}
                      placeholder="e.g. 24CS101, 24MA101"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : <div />}
              </div>

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
                    setEditBacklogs(0);
                    setEditBacklogSubjects('');
                  }}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shadow-sm"
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
