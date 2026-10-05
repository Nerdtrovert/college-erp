import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Download, LogOut, Upload, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { StudentManagement } from './supervisor/StudentManagement';
import { FacultyManagement } from './supervisor/FacultyManagement';
import { BacklogsManagement } from './supervisor/BacklogsManagement';

type AdminSection = 'uploads' | 'logs' | 'backlogs';

export const AdminLoginPage: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await API.post('/admin/login', { username, password });
      sessionStorage.setItem('token', response.data.token);
      onLogin(response.data.user);
      navigate('/admin/uploads', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-blue-700 p-3 text-white"><Activity size={22} /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">Admin Portal</p>
            <p className="text-sm text-gray-500">HNNCE system administration</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <label className="block text-sm font-medium text-gray-700">
            Username
            <input value={username} onChange={e => setUsername(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" required />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" required />
          </label>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="h-12 w-full rounded-xl bg-blue-700 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign in to admin portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminLogs: React.FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await API.get('/admin/logs');
      setLines(response.data.lines || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const hasErrors = lines.some(line => line.includes('[ERROR]'));
  const hasWarnings = lines.some(line => line.includes('[WARN]'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System logs</h1>
          <p className="mt-1 text-sm text-gray-500">The latest 100 application log lines.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadLogs} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Refresh</button>
          <button onClick={async () => {
            const response = await API.get('/admin/logs/download', { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'application.log';
            link.click();
            URL.revokeObjectURL(url);
          }} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"><Download size={16} /> Download</button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-2xl border p-5 ${hasErrors ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          {hasErrors ? <AlertTriangle className="text-red-600" /> : <CheckCircle2 className="text-green-600" />}
          <p className="mt-3 text-sm font-semibold text-gray-700">Errors</p>
          <p className="text-2xl font-bold">{hasErrors ? 'Found' : 'None'}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${hasWarnings ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
          {hasWarnings ? <AlertTriangle className="text-amber-600" /> : <CheckCircle2 className="text-green-600" />}
          <p className="mt-3 text-sm font-semibold text-gray-700">Warnings</p>
          <p className="text-2xl font-bold">{hasWarnings ? 'Found' : 'None'}</p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <CheckCircle2 className="text-green-600" />
          <p className="mt-3 text-sm font-semibold text-gray-700">Log service</p>
          <p className="text-2xl font-bold text-green-700">Working</p>
        </div>
      </div>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <pre className="max-h-[32rem] overflow-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-200 shadow-inner">{loading ? 'Loading logs...' : lines.length ? lines.join('\n') : 'No log entries yet.'}</pre>
    </div>
  );
};

export const AdminPortal: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const section: AdminSection = window.location.pathname.includes('/logs') ? 'logs' :
                               window.location.pathname.includes('/backlogs') ? 'backlogs' : 'uploads';
  const [uploadType, setUploadType] = useState<'students' | 'faculty'>('students');

  const logout = () => {
    onLogout();
    navigate('/adminLogin', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-gray-50/50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><Activity className="text-blue-700" /><span className="font-bold text-gray-900">HNNCE Admin</span></div>
          <button onClick={logout} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-red-600"><LogOut size={16} /> Sign out</button>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="w-48 shrink-0">
          <nav className="space-y-2">
            <button onClick={() => navigate('/admin/uploads')} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ${section === 'uploads' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-white'}`}><Upload size={17} /> Uploads</button>
            <button onClick={() => navigate('/admin/backlogs')} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ${section === 'backlogs' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-white'}`}><FileText size={17} /> Backlogs</button>
            <button onClick={() => navigate('/admin/logs')} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ${section === 'logs' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-white'}`}><FileText size={17} /> Logs</button>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          {section === 'logs' ? <AdminLogs /> : (
            section === 'backlogs' ? <BacklogsManagement /> : (
              <div className="space-y-5">
                <div><h1 className="text-2xl font-bold text-gray-900">Uploads</h1><p className="mt-1 text-sm text-gray-500">Import records using the existing supervisor management workflows.</p></div>
                <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-2">
                  <button onClick={() => setUploadType('students')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${uploadType === 'students' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}>Students</button>
                  <button onClick={() => setUploadType('faculty')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${uploadType === 'faculty' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}>Faculty</button>
                </div>
                {uploadType === 'students' ? <StudentManagement /> : <FacultyManagement />}
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
};
