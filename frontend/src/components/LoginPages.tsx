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
      id: 'CS21B042',
      password: 'student123',
      name: 'Rehman Dakait',
      department: 'Computer Science & Engineering',
    },
    teacher: {
      id: 'FAC2018',
      password: 'teacher123',
      name: 'Dr. Priya Sharma',
      department: 'Computer Science & Engineering',
    },
    supervisor: {
      id: 'DEAN123',
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
      localStorage.setItem('token', token);
      onLogin(loggedInUser);

      // Redirect based on role
      if (loggedInUser.role === 'dean' || loggedInUser.role === 'principal') {
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
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'linear-gradient(135deg, #0f1e3c 0%, #1d4ed8 60%, #0ea5e9 100%)' }}>
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
              href="https://github.com/Nerdtrovert"
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
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-8 lg:hidden">
                <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center">
                  <BookOpen size={18} className="text-white" />
                </div>
                <span className="text-lg font-semibold text-navy">EduPortal</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
              <p className="text-gray-500 text-sm">Choose your role and enter your credentials</p>
            </div>

            {/* Role toggle */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              {[
                { role: 'student' as SignInRole, icon: <GraduationCap size={16} />, label: 'Student' },
                { role: 'teacher' as SignInRole, icon: <Users size={16} />, label: 'Faculty' },
                { role: 'supervisor' as SignInRole, icon: <ShieldCheck size={16} />, label: 'Supervisor Faculty' },
              ].map((r) => (
                <button
                  key={r.role}
                  onClick={() => { setRole(r.role); setError('') }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border-2 ${
                    role === r.role
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {r.icon}
                  {r.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {role === 'student' ? 'Roll Number' : 'Faculty / Staff ID'}
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={role === 'student' ? 'e.g. CS21B042' : role === 'teacher' ? 'e.g. FAC2018' : 'e.g. DEAN123 or PRINCIPAL456'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                className="w-full py-3 rounded-xl bg-blue-700 text-white font-semibold text-sm hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-800 font-medium mb-1">Demo credentials</p>
              <p className="text-xs text-amber-700 font-mono">
                ID: {DEMO_ACCOUNTS[role].id} &nbsp;|&nbsp; Password: {DEMO_ACCOUNTS[role].password}
              </p>
              {role === 'supervisor' && <p className="mt-1 text-xs text-amber-700">Deans, principals, and other approved supervisory faculty use this option.</p>}
              <button
                onClick={fillDemo}
                className="mt-2 text-xs text-amber-800 underline underline-offset-2 hover:text-amber-900"
              >
                Fill automatically
              </button>
            </div>
          </div>
          {/* Mobile Footer */}
          <div className="mt-6 text-center text-white/50 text-xs lg:hidden">
            <p>© 2026 EduPortal · Dr. HN National College of Engineering</p>
            <p className="mt-1.5 text-white/40">
              Developed by{' '}
              <a
                href="https://github.com/Nerdtrovert"
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
