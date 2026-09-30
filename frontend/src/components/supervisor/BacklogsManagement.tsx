import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { Upload, Trash2, CheckCircle, Loader, Settings, Calendar, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

interface BacklogStudent {
  id: string;
  name: string;
  usn: string;
  department: string;
  semester: string;
  backlogCount: number;
  backlogSubjects: string[];
}

interface GradecardData {
  studentId: string;
  studentName: string;
  usn: string;
  semester: string;
  subjects: Array<{
    subjectCode: string;
    subjectName: string;
    grade: string;
    credits: number;
  }>;
}

interface Props {
  user: any;
}

export const BacklogsManagement: React.FC<Props> = ({ user }) => {
  const [semesters, setSemesters] = useState<Array<{id: string; name: string; code: string; status: string}>>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [gradecardData, setGradecardData] = useState<GradecardData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processedStudents, setProcessedStudents] = useState<BacklogStudent[]>([]);
  const [allStudents, setAllStudents] = useState<BacklogStudent[]>([]);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const res = await API.get('/semester');
        setSemesters(res.data || []);
        if (res.data.length > 0) {
          // Set default to active semester
          const activeSemester = res.data.find((s: any) => s.status === 'ACTIVE');
          if (activeSemester) {
            setSelectedSemester(activeSemester.id);
          } else {
            setSelectedSemester(res.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch semesters:', err);
      }
    };

    fetchSemesters();
  }, []);

  useEffect(() => {
    const fetchAllStudents = async () => {
      if (!selectedSemester) return;
      try {
        const res = await API.get(`/backlog/students?semesterId=${selectedSemester}`);
        setAllStudents(res.data || []);
      } catch (err) {
        console.error('Failed to fetch students:', err);
      }
    };

    fetchAllStudents();
  }, [selectedSemester]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PDF, Excel, or Word documents only.');
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);
    setGradecardData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('semesterId', selectedSemester);

      const res = await API.post('/backlog/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setGradecardData(res.data);
      setSuccess('File uploaded and processed successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process file. Please try again.');
      console.error('File upload error:', err);
    } finally {
      setProcessing(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleProcessBacklogs = async () => {
    if (!gradecardData) return;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await API.post('/backlog/process', {
        semesterId: selectedSemester,
        gradecardData,
      });

      setProcessedStudents(res.data.processedStudents || []);
      setSuccess(`Backlogs updated successfully! ${res.data.updatedCount} students affected.`);

      // Refresh student list
      const freshRes = await API.get(`/backlog/students?semesterId=${selectedSemester}`);
      setAllStudents(freshRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process backlogs. Please try again.');
      console.error('Backlog processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const toggleShowAllStudents = () => {
    setShowAllStudents(!showAllStudents);
  };

  if (!selectedSemester) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No semesters available. Please create a semester first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={20} className="text-indigo-600" />
          Backlog Management System
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Semester
            </label>
            <Select
              value={selectedSemester}
              onValueChange={setSelectedSemester}
              options={semesters.map(sem => ({
                value: sem.id,
                label: `${sem.name} (${sem.code})`
              }))}
              placeholder="Select semester"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Gradecard Document
            </label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept=".pdf,.xls,.xlsx,.doc,.docx"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {processing && (
                <Button variant="outline" size="sm" onClick={() => {}} disabled>
                  <Loader size={16} className="mr-2" /> Processing...
                </Button>
              )}
              {!processing && gradecardData === null && (
                <Button variant="outline" size="sm" onClick={() => {}}>

                  Upload Document
                </Button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actions
            </label>
            <div className="space-y-2">
              {!processing && gradecardData && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleProcessBacklogs}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader size={16} className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="mr-2" />
                      Process Backlogs
                    </>
                  )}
                </Button>
              )}
              {(!processing && gradecardData === null) || processing ? (
                <Button variant="outline" size="sm" onClick={() => {}} disabled>
                  Process Backlogs
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Gradecard Preview */}
      {gradecardData && !processing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Gradecard Preview
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Student Name:</p>
                <p className="font-medium text-gray-900">{gradecardData.studentName}</p>
              </div>
              <div>
                <p className="text-gray-500">USN:</p>
                <p className="font-medium text-gray-900">{gradecardData.usn}</p>
              </div>
              <div>
                <p className="text-gray-500">Semester:</p>
                <p className="font-medium text-gray-900">{gradecardData.semester}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Subjects:</p>
                <p className="font-medium text-gray-900">{gradecardData.subjects.length}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Subject Code</th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Subject Name</th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Credits</th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gradecardData.subjects.map((subject, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-gray-700">{subject.subjectCode}</td>
                      <td className="p-2 text-gray-700">{subject.subjectName}</td>
                      <td className={`p-2 text-gray-700 font-medium ${subject.grade === 'F' ? 'text-red-600' : subject.grade >= 'D' ? 'text-green-600' : 'text-orange-600'}`}>
                        {subject.grade}
                      </td>
                      <td className="p-2 text-gray-700">{subject.credits}</td>
                      <td className="p-2">
                        {subject.grade === 'F' ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">Backlog</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">Pass</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Processing Results */}
      {processedStudents.length > 0 && !processing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            Processing Results
          </h3>

          <p className="text-gray-700 mb-4">
            Found {processedStudents.length} student(s) with F grades that require backlog updates.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Student Name</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">USN</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Backlog Count</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Backlog Subjects</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {processedStudents.map((student, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-gray-700">{student.name}</td>
                    <td className="p-2 text-gray-700">{student.usn}</td>
                    <td className="p-2 text-gray-700">{student.department}</td>
                    <td className="p-2 text-gray-700 font-medium">{student.backlogCount}</td>
                    <td className="p-2 text-gray-600">
                      {student.backlogSubjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {student.backlogSubjects.map((subj, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-800">
                              {subj}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic">None</span>
                      )}
                    </td>
                    <td className="p-2">
                      <Button variant="outline" size="xs" onClick={() => {}}>
                        Update
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Students */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            Student Backlog Records
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleShowAllStudents}
            >
              {showAllStudents ? (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Show F Grades Only
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="mr-2" />
                  Show All Students
                </>
              )}
            </Button>
          </div>
        </div>

        {allStudents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No student records found for this semester.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Student Name</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">USN</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Semester</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Backlog Count</th>
                  <th className="text-left p-2 text-xs font-medium text-gray-500 uppercase">Backlog Subjects</th>
                </tr>
              </thead>
              <tbody>
                {(showAllStudents ? allStudents : allStudents.filter(s => s.backlogCount > 0)).map((student, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-gray-700">{student.name}</td>
                    <td className="p-2 text-gray-700">{student.usn}</td>
                    <td className="p-2 text-gray-700">{student.department}</td>
                    <td className="p-2 text-gray-700">{student.semester}</td>
                    <td className="p-2 text-gray-700 font-medium">{student.backlogCount}</td>
                    <td className="p-2 text-gray-600">
                      {student.backlogSubjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {student.backlogSubjects.map((subj, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-800">
                              {subj}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <Trash2 size={16} className="mr-2 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <CheckCircle size={16} className="mr-2 text-green-600" />
          <span className="text-green-700">{success}</span>
        </div>
      )}
    </div>
  );
};