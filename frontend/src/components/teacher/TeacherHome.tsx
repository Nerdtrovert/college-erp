import React from 'react';
import { Users, BarChart2, CalendarCheck, MessageSquare, CheckCircle } from 'lucide-react';

const MY_CLASSES = [
  { id: 'cs2301-b', label: 'CS2301 — Data Structures (CSE-B)', students: 32, attendance: 87 },
  { id: 'cs3401-a', label: 'CS3401 — Design & Analysis of Algorithms (CSE-A)', students: 28, attendance: 92 },
  { id: 'cs2301l-b', label: 'CS2301L — DS Lab (CSE-B)', students: 32, attendance: 78 },
];

const LOW_ATTENDANCE = [
  { roll: 'CS21B005', name: 'Ananya Krishnan', percentage: 62 },
  { roll: 'CS21B010', name: 'Ganesh Reddy', percentage: 68 },
  { roll: 'CS21B015', name: 'Kiran Menon', percentage: 71 },
  { roll: 'CS21B020', name: 'Neha Sharma', percentage: 73 },
];

export const TeacherHome: React.FC<{ user: any }> = ({ user }) => {
  const totalStudents = MY_CLASSES.reduce((sum, cls) => sum + cls.students, 0);
  const avgAttendance = Math.round(MY_CLASSES.reduce((sum, cls) => sum + cls.attendance, 0) / MY_CLASSES.length);

  const avgColor = avgAttendance >= 85
    ? 'text-green-600 bg-green-50'
    : avgAttendance >= 75
    ? 'text-amber-600 bg-amber-50'
    : 'text-red-600 bg-red-50';

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{user.department} Department</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Classes', value: MY_CLASSES.length, icon: <Users size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Students', value: totalStudents, icon: <Users size={18} />, color: 'text-green-600 bg-green-50' },
          { label: 'Classes Today', value: '3', icon: <CalendarCheck size={18} />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Avg Attendance', value: `${avgAttendance}%`, icon: <BarChart2 size={18} />, color: avgColor },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Class cards */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            My Classes
          </h2>
          <div className="space-y-4">
            {MY_CLASSES.map((cls) => (
              <div key={cls.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{cls.label}</h3>
                    <p className="text-xs text-gray-500 mt-1">{cls.students} students enrolled</p>
                  </div>
                  <div className="sm:text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      cls.attendance >= 85 ? 'bg-green-100 text-green-700' :
                      cls.attendance >= 75 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {cls.attendance}%
                    </span>
                  </div>
                </div>
                <div className="h-0.5 bg-gray-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Low attendance students */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Low Attendance Students
          </h2>
          {LOW_ATTENDANCE.length > 0 ? (
            <div className="space-y-3">
              {LOW_ATTENDANCE.map((student) => (
                <div key={student.roll} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-semibold">{student.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.roll}</p>
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

      {/* Recent activity */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900">Marks updated for CS2301 - Data Structures</p>
              <p className="text-sm text-gray-500">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900">Assignment submitted by CS21B006 - Rehman Dakait</p>
              <p className="text-sm text-gray-500">4 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
