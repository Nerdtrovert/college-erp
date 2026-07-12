import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import type { User } from './types';
import { FacultyLoginPage, StudentLoginPage, SupervisorLoginPage } from './components/LoginPages';
import { StudentDashboard } from './components/student/StudentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentAttendance } from './components/student/StudentAttendance';
import { TeacherAttendance } from './components/teacher/TeacherAttendance';
import { StudentMarks } from './components/student/StudentMarks';
import { TeacherMarks } from './components/teacher/TeacherMarks';
import { StudentSchedule } from './components/student/StudentSchedule';
import { TeacherTimetable } from './components/teacher/TeacherTimetable';
import { TeacherAnnouncements } from './components/teacher/TeacherAnnouncements';
import { StudentAnnouncements } from './components/student/StudentAnnouncements';
import { SupervisorDashboard } from './components/supervisor/SupervisorDashboard';
import { SemesterManagement } from './components/supervisor/SemesterManagement';
import { FacultyManagement } from './components/supervisor/FacultyManagement';
import { TimetableManagement } from './components/supervisor/TimetableManagement';


// Auth context
const AuthContext = React.createContext<{
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}>({
  user: null,
  login: () => {},
  logout: () => {}
});

export const useAuth = () => React.useContext(AuthContext);

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        localStorage.removeItem('user');
        return null;
      }
    }
    return null;
  });

  const login = (userData: User) => {
    setUser(userData);
    // In a real app, you would save token to localStorage or cookies
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const StudentOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user || user.role !== 'student') {
      return <Navigate to="/login/student" replace />;
    }
    return children;
  };

  const TeacherOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user || user.role !== 'teacher') {
      return <Navigate to="/login/faculty" replace />;
    }
    return children;
  };

  const SupervisorOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user || !(user.role === 'dean' || user.role === 'principal')) {
      return <Navigate to="/login/supervisor" replace />;
    }
    return children;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login/student" element={<StudentLoginPage onLogin={login} />} />
          <Route path="/login/faculty" element={<FacultyLoginPage onLogin={login} />} />
          <Route path="/login/supervisor" element={<SupervisorLoginPage onLogin={login} />} />
          <Route path="/login/teacher" element={<Navigate to="/login/faculty" replace />} />
          <Route path="/login/dean" element={<Navigate to="/login/supervisor" replace />} />
          <Route path="/login/principal" element={<Navigate to="/login/supervisor" replace />} />

          {/* Redirect root to student login */}
          <Route path="/" element={<Navigate to="/login/student" replace />} />

          {/* Student protected routes */}
          <Route element={<StudentOnlyRoute><Outlet /></StudentOnlyRoute>}>
            <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/student/dashboard" element={<StudentDashboard user={user!} onLogout={logout} />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/marks" element={<StudentMarks />} />
            <Route path="/student/schedule" element={<StudentSchedule />} />
            <Route path="/student/announcements" element={<StudentAnnouncements />} />
          </Route>

          {/* Teacher protected routes */}
          <Route element={<TeacherOnlyRoute><Outlet /></TeacherOnlyRoute>}>
            <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/teacher/dashboard" element={<TeacherDashboard user={user!} onLogout={logout} />} />
            <Route path="/teacher/attendance" element={<TeacherAttendance />} />
            <Route path="/teacher/marks" element={<TeacherMarks />} />
            <Route path="/teacher/announcements" element={<TeacherAnnouncements />} />
            <Route path="/teacher/timetable" element={<TeacherTimetable />} />
          </Route>

          {/* Supervisor protected routes (Dean, Principal) */}
          <Route element={<SupervisorOnlyRoute><Outlet /></SupervisorOnlyRoute>}>
            <Route path="/supervisor" element={<Navigate to="/supervisor/dashboard" replace />} />
            <Route path="/supervisor/dashboard" element={<SupervisorDashboard user={user!} onLogout={logout} />} />
            <Route path="/supervisor/semesters" element={<SemesterManagement />} />
            <Route path="/supervisor/faculty" element={<FacultyManagement />} />
            <Route path="/supervisor/timetable" element={<TimetableManagement />} />
          </Route>

          {/* Catch-all redirect to login */}
          <Route path="*" element={<Navigate to="/login/student" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

export default App;
