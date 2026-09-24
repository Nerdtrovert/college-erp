import React, { useState } from 'react';
import type { User } from '../types';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

interface LoginPageProps {
  onLogin: (user: User) => void;
  pageType: 'student' | 'faculty';
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, pageType }) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Demo accounts
  const DEMO_ACCOUNTS = {
    student: {
      id: '1HC24CS001',
      password: 'student123',
    },
    teacher: {
      id: 'faculty@hnnce.in',
      password: 'teacher123',
    },
    supervisor: {
      id: 'deanCSE@hnnce.in',
      password: 'dean123',
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/login', {
        id: userId,
        password,
      });
      const { token, user: loggedInUser } = response.data;
      sessionStorage.setItem('token', token);
      onLogin(loggedInUser);

      // Redirect based on role
      if (loggedInUser.role === 'dean' || loggedInUser.role === 'principal' || loggedInUser.role === 'hod') {
        navigate(`/supervisor/dashboard`, { replace: true });
      } else {
        navigate(`/${loggedInUser.role}/dashboard`, { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Invalid credentials. Try a demo account below.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoRole: 'student' | 'teacher' | 'supervisor') => {
    const demo = DEMO_ACCOUNTS[demoRole];
    setUserId(demo.id);
    setPassword(demo.password);
    setError('');
  };

  return (
    <div className="login-shell flex min-h-dvh flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-16 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">EduPortal</span>
        </div>

        <div>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest mb-4">Dr. HN National College of Engineering</p>
          <h1 className="text-5xl font-bold leading-tight mb-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Your Academic<br />Hub, Redesigned.
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-md">
            Track attendance, view marks, access schedules, and stay up to date — all in one place that actually works.
          </p>
        </div>

        <div className="text-white/40 text-sm">
          <p>© 2026 EduPortal · Dr. HN National College of Engineering</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-3 sm:py-5 lg:p-8">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="login-card rounded-2xl bg-white p-4 shadow-xl sm:rounded-[1.5rem] sm:p-8 sm:shadow-2xl lg:rounded-3xl lg:p-10">
            <div className="mb-5 sm:mb-8 flex justify-between items-start gap-2">
              <div>
                <div className="mb-7 flex items-center gap-3 lg:hidden">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700">
                    <BookOpen size={15} className="text-white" />
                  </div>
                  <div>
                    <span className="block text-lg font-semibold text-navy">EduPortal</span>
                  </div>
                </div>
                <h2 className="mb-1 text-xl font-bold text-gray-900 sm:text-2xl">Sign in</h2>
                <div className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 mt-1 mb-2 border border-blue-100">
                  For {pageType === 'student' ? 'Students' : 'Faculty'}
                </div>
                <p className="text-gray-500 text-sm">Enter your credentials</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(pageType === 'student' ? '/facultylogin' : '/login')}
                className="shrink-0 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 shadow-sm"
              >
                {pageType === 'student' ? 'Faculty Login →' : 'Student Login →'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {pageType === 'student' ? 'Roll Number (USN)' : 'Faculty Email'}
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={pageType === 'student' ? "e.g. 1HC24CS001" : "e.g. faculty@hnnce.in"}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-12 text-sm text-gray-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-blue-700 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3.5 sm:mt-6 sm:border-amber-200 sm:bg-amber-50 sm:p-4">
              <p className="text-xs font-medium text-gray-600 sm:text-amber-800 mb-2">Demo credentials</p>
              <div className="flex flex-wrap gap-2">
                {pageType === 'student' ? (
                  <button type="button" onClick={() => fillDemo('student')} className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50">Student</button>
                ) : (
                  <>
                    <button type="button" onClick={() => fillDemo('teacher')} className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50">Faculty</button>
                    <button type="button" onClick={() => fillDemo('supervisor')} className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50">HOD/Dean</button>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Mobile Footer */}
          <div className="mt-4 text-center text-[10px] leading-relaxed text-white/60 lg:hidden">
            <p>© 2026 EduPortal · Dr. HN National College of Engineering</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudentLoginPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  return <LoginPage onLogin={onLogin} pageType="student" />;
};

export const FacultyLoginPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  return <LoginPage onLogin={onLogin} pageType="faculty" />;
};
