import React, { useState } from 'react';
import type { SignInRole, User } from '../types';
import { BookOpen, GraduationCap, Users, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

interface LoginPageProps {
  onLogin: (user: User) => void;
  defaultRole: SignInRole;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, defaultRole }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState<SignInRole>(defaultRole);
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
      name: 'Aakash Nair',
      department: 'Computer Science & Engineering',
    },
    teacher: {
      id: 'faculty@hnnce.in',
      password: 'teacher123',
      name: 'Dr. Priya Sharma',
      department: 'Computer Science & Engineering',
    },
    supervisor: {
      id: 'deanCSE@hnnce.in',
      password: 'dean123',
      name: 'Dr. Dean Administrator',
      department: 'Administration',
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await API.post('/auth/login', {
        id: userId,
        password,
        role,
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
      setError(err.response?.data?.error || 'Invalid credentials. Try the demo account below.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    const demo = DEMO_ACCOUNTS[role];
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
          <p className="text-white/30 text-xs mt-1.5">
            Developed by{' '}
            <a
              href="https://prajwalnavada.is-a.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline transition-colors"
            >
              Prajwal
            </a>
            {' '}and{' '}
            <a
              href="https://github.com/sudhanva1608"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline transition-colors"
            >
              Sudhanva
            </a>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-3 sm:py-5 lg:p-8">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="login-card rounded-2xl bg-white p-4 shadow-xl sm:rounded-[1.5rem] sm:p-8 sm:shadow-2xl lg:rounded-3xl lg:p-10">
            <div className="mb-5 sm:mb-8">
              <div className="mb-7 flex items-center gap-3 lg:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700">
                  <BookOpen size={15} className="text-white" />
                </div>
                <div>
                  <span className="block text-lg font-semibold text-navy">EduPortal</span>
                  <span className="block text-xs text-gray-400">Academic access portal</span>
                </div>
              </div>
              <h2 className="mb-1 text-xl font-bold text-gray-900 sm:text-2xl">Sign in</h2>
              <p className="text-gray-500 text-sm">Choose your role and enter your credentials</p>
            </div>

            {/* Role toggle */}
            <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-xl bg-gray-100 p-1 sm:mb-8 sm:flex sm:gap-3 sm:bg-transparent sm:p-0">
              {[
                { role: 'student' as SignInRole, icon: <GraduationCap size={14} />, label: 'Student' },
                { role: 'teacher' as SignInRole, icon: <Users size={14} />, label: 'Faculty' },
                { role: 'supervisor' as SignInRole, icon: <ShieldCheck size={14} />, label: 'Supervisor Faculty' },
              ].map((r) => (
                <button
                  key={r.role}
                  onClick={() => { setRole(r.role); setError('') }}
                  className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-semibold leading-tight transition-colors sm:min-h-0 sm:flex-1 sm:flex-row sm:gap-2 sm:rounded-xl sm:border-2 sm:px-4 sm:py-3 sm:text-sm ${
                    role === r.role
                      ? 'bg-white text-blue-700 shadow-sm sm:border-blue-700 sm:bg-blue-700 sm:text-white'
                      : 'text-gray-500 hover:bg-white sm:border-gray-200 sm:bg-gray-50 sm:text-gray-600 sm:hover:border-blue-300 sm:hover:bg-blue-50'
                  }`}
                >
                  <span className="shrink-0">{r.icon}</span>
                  <span className="truncate">{r.role === 'supervisor' ? 'Supervisor' : r.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {role === 'student' ? 'Roll Number' : 'Faculty / Staff ID'}
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={role === 'student' ? 'e.g. 1HC24CS001' : role === 'teacher' ? 'e.g. faculty@hnnce.in' : 'e.g. deanCSE@hnnce.in'}
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-gray-600 sm:text-amber-800">Demo credentials</p>
                <button type="button" onClick={fillDemo} className="text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900">Fill automatically</button>
              </div>
              <p className="mt-1 break-all font-mono text-[11px] text-gray-500 sm:text-xs sm:text-amber-700">
                {DEMO_ACCOUNTS[role].id} · {DEMO_ACCOUNTS[role].password}
              </p>
              {role === 'supervisor' && <p className="mt-1 text-xs text-gray-500 sm:text-amber-700">For approved supervisory faculty.</p>}
            </div>
          </div>
          {/* Mobile Footer */}
          <div className="mt-4 text-center text-[10px] leading-relaxed text-white/60 lg:hidden">
            <p>© 2026 EduPortal · Dr. HN National College of Engineering</p>
            <p className="mt-0.5 text-white/45">
              Developed by{' '}
              <a
                href="https://prajwalnavada.is-a.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white transition-colors"
              >
                Prajwal
              </a>
              {' '}and{' '}
              <a
                href="https://github.com/sudhanva1608"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white transition-colors"
              >
                Sudhanva
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudentLoginPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  return <LoginPage onLogin={onLogin} defaultRole="student" />;
};

export const FacultyLoginPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  return <LoginPage onLogin={onLogin} defaultRole="teacher" />;
};

export const SupervisorLoginPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  return <LoginPage onLogin={onLogin} defaultRole="supervisor" />;
};
