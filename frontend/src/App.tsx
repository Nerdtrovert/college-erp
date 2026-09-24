import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import type { User } from './types';
import { FacultyLoginPage, StudentLoginPage } from './components/LoginPages';
import { StudentDashboard } from './components/student/StudentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { SupervisorDashboard } from './components/supervisor/SupervisorDashboard';


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
    const stored = sessionStorage.getItem('user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        sessionStorage.removeItem('user');
        return null;
      }
    }
    return null;
  });

  const login = (userData: User) => {
    setUser(userData);
    // In a real app, you would save token to sessionStorage or cookies
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  };

  const StudentOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user || user.role !== 'student') {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  const TeacherOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user || user.role !== 'teacher') {
      return <Navigate to="/facultylogin" replace />;
    }
    return children;
  };

  const SupervisorOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user || !(user.role === 'dean' || user.role === 'principal' || user.role === 'hod')) {
      return <Navigate to="/facultylogin" replace />;
    }
    return children;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<StudentLoginPage onLogin={login} />} />
          <Route path="/facultylogin" element={<FacultyLoginPage onLogin={login} />} />
                    <Route path="/login/teacher" element={<Navigate to="/facultylogin" replace />} />
          <Route path="/login/dean" element={<Navigate to="/facultylogin" replace />} />
          <Route path="/login/principal" element={<Navigate to="/facultylogin" replace />} />

          {/* Redirect root to student login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Student protected routes */}
          <Route element={<StudentOnlyRoute><Outlet /></StudentOnlyRoute>}>
            <Route path="/student/*" element={<StudentDashboard user={user!} onLogout={logout} />} />
          </Route>

          {/* Teacher protected routes */}
          <Route element={<TeacherOnlyRoute><Outlet /></TeacherOnlyRoute>}>
            <Route path="/teacher/*" element={<TeacherDashboard user={user!} onLogout={logout} />} />
          </Route>

          {/* Supervisor protected routes (Dean, Principal) */}
          <Route element={<SupervisorOnlyRoute><Outlet /></SupervisorOnlyRoute>}>
            <Route path="/supervisor/*" element={<SupervisorDashboard user={user!} onLogout={logout} />} />
          </Route>

          {/* Catch-all redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

export default App;
