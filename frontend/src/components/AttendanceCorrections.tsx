import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import API from '../services/api';

interface AttendanceRecord {
  id: string;
  studentId: string;
  status: 'present' | 'absent';
  student: { id: string; name: string };
}

interface AttendanceSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  classGroup: string;
  subject: { code: string; name: string };
  records: AttendanceRecord[];
}

export const AttendanceCorrections: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const fetchSessions = async () => {
    setLoading(true);
    setMessage('');
    try {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      const response = await API.get(`/attendance/correction-sessions${query}`);
      setSessions(response.data || []);
      setSelectedId((current) => response.data.some((session: AttendanceSession) => session.id === current)
        ? current
        : response.data[0]?.id || '');
    } catch (error) {
      console.error('Failed to load attendance sessions:', error);
      setMessage('Unable to load attendance sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, [date]);

  const selected = sessions.find((session) => session.id === selectedId);
  const updateStatus = async (record: AttendanceRecord) => {
    const status = record.status === 'present' ? 'absent' : 'present';
    setSaving(record.id);
    try {
      await API.patch(`/attendance/records/${record.id}`, { status });
      setSessions((current) => current.map((session) => session.id === selectedId
        ? { ...session, records: session.records.map((item) => item.id === record.id ? { ...item, status } : item) }
        : session));
      setMessage(`Attendance corrected for ${record.student.name}.`);
    } catch (error) {
      console.error('Failed to correct attendance:', error);
      setMessage('Unable to correct attendance.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Corrections</h1>
        <p className="text-gray-500 text-sm mt-1">Correct a previous attendance entry when a student was marked incorrectly.</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by date</label>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
          </div>
          <button type="button" onClick={fetchSessions} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
        {loading ? <p className="text-sm text-gray-500 py-4">Loading sessions...</p> : sessions.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No saved attendance sessions found.</p>
        ) : (
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm">
            {sessions.map((session) => <option key={session.id} value={session.id}>{session.date} · {session.subject.code} — {session.subject.name} · {session.classGroup} · {session.startTime}-{session.endTime}</option>)}
          </select>
        )}
      </div>
      {message && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div><h2 className="font-semibold text-gray-900">{selected.subject.code} · {selected.subject.name}</h2><p className="text-xs text-gray-500 mt-1">{selected.date} · {selected.classGroup}</p></div>
            <span className="text-xs font-semibold text-gray-500">{selected.records.length} students</span>
          </div>
          <div className="divide-y divide-gray-100">
            {selected.records.map((record) => (
              <div key={record.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div><p className="text-sm font-semibold text-gray-900">{record.student.name}</p><p className="text-xs text-gray-500">{record.student.id}</p></div>
                <button type="button" onClick={() => updateStatus(record)} disabled={saving === record.id} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${record.status === 'present' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'} disabled:opacity-50`}>
                  <CheckCircle2 size={14} /> {saving === record.id ? 'Saving...' : record.status === 'present' ? 'Present · Change to absent' : 'Absent · Change to present'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
