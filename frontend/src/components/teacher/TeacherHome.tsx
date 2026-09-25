import React, { useEffect, useState } from 'react';
import { Users, BarChart2, CalendarCheck, AlertTriangle } from 'lucide-react';
import API from '../../services/api';
import { getTimeBasedGreeting } from '../../utils/greeting';

interface SubjectItem {
  code: string;
  name: string;
  classGroup: string;
}

interface LowAttendanceItem {
  studentId: string;
  studentName: string;
  subjectCode: string;
  percentage: number;
}

interface TodayClass {
  id: string;
  subjectCode: string;
  subjectName: string;
  classGroup: string;
}

export const TeacherHome: React.FC<{ user: any }> = ({ user }) => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [lowAttendance, setLowAttendance] = useState<LowAttendanceItem[]>([]);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [subjectsResponse, attendanceResponse, classesResponse] = await Promise.all([
          API.get('/timetable/teacher-subjects'),
          API.get('/reports/attendance-assignments?type=low_attendance&threshold=75'),
          API.get(`/attendance/teacher-classes?date=${new Date().toISOString().slice(0, 10)}`),
        ]);
        setSubjects(subjectsResponse.data || []);
        setLowAttendance(attendanceResponse.data || []);
        setTodayClasses(classesResponse.data || []);
      } catch (error) {
        console.error('Failed to load faculty dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const averageAttendance = lowAttendance.length
    ? Math.round(lowAttendance.reduce((sum, item) => sum + item.percentage, 0) / lowAttendance.length)
    : null;

  const avgColor = (averageAttendance ?? 0) >= 85
    ? 'text-green-600 bg-green-50'
    : (averageAttendance ?? 0) >= 75
    ? 'text-amber-600 bg-amber-50'
    : 'text-red-600 bg-red-50';

  return (
    <div className="space-y-5 sm:space-y-7">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{getTimeBasedGreeting()}, {user.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{user.department} Department</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'My Classes', value: loading ? '…' : subjects.length, icon: <Users size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Students Below 75%', value: loading ? '…' : lowAttendance.length, icon: <AlertTriangle size={18} />, color: 'text-red-600 bg-red-50' },
          { label: 'Classes Today', value: loading ? '…' : todayClasses.length, icon: <CalendarCheck size={18} />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Low-Attendance Average', value: averageAttendance === null ? '—' : `${averageAttendance}%`, icon: <BarChart2 size={18} />, color: avgColor },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-gray-100">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center mb-2.5 sm:mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-[11px] sm:text-xs leading-tight text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Class cards */}
        <div className="md:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            My Classes
          </h2>
          <div className="space-y-4">
            {subjects.length === 0 && !loading && <p className="text-gray-500 py-4">No assigned classes found.</p>}
            {subjects.map((subject) => (
              <div key={subject.code} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{subject.code} — {subject.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{subject.classGroup}</p>
                  </div>
                </div>
                <div className="h-0.5 bg-gray-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Low attendance students */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Low Attendance Students
          </h2>
          {lowAttendance.length > 0 ? (
            <div className="space-y-3">
              {lowAttendance.slice(0, 5).map((student) => (
                <div key={`${student.studentId}-${student.subjectCode}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-semibold">{student.studentName.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{student.studentName}</p>
                    <p className="text-sm text-gray-500">{student.studentId} · {student.subjectCode}</p>
                    <span className="mt-1 px-2 py-0.5 rounded-full text-xs text-red-800 bg-red-50">
                      {student.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No students with low attendance</p>
          )}
        </div>
      </div>

    </div>
  );
};
