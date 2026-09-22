import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Save, User, Tag, Layers, ClipboardList } from 'lucide-react';
import API from '../../services/api';

export const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error' | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    facultyId: '',
    classGroup: '',
    type: 'STANDALONE'
  });

  useEffect(() => {
    fetchSubjects();
    fetchFaculty();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await API.get('/subjects');
      setSubjects(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const res = await API.get('/auth/users?role=teacher');
      setFaculty(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch faculty:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    setSaveMessageType(null);
    try {
      await API.post('/subjects', form);
      setSaveMessage('Subject created successfully.');
      setSaveMessageType('success');
      fetchSubjects();
      setForm({
        code: '',
        name: '',
        facultyId: '',
        classGroup: '',
        type: 'STANDALONE'
      });
      setTimeout(() => {
        setSaveMessage(null);
        setSaveMessageType(null);
      }, 4000);
    } catch (err: any) {
      setSaveMessage(err.response?.data?.error || 'Unable to save subject details.');
      setSaveMessageType('error');
    }
  };

  if (loading && subjects.length === 0) {
    return <div className="text-center py-12 text-gray-500 font-medium animate-pulse">Loading subjects...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
        <p className="text-gray-500 text-sm mt-1">Configure subjects, allocate faculty members, and classify curriculum tracks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Allocation Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Plus size={18} className="text-blue-600" />
            Add New Subject
          </h2>
          <p className="text-xs text-gray-500 mb-6">Create a subject and define its evaluation schema (Standalone vs Integrated).</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Subject Code</label>
              <input
                type="text"
                required
                placeholder="e.g., CS2301"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Subject Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Data Structures & Algorithms"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Class Group</label>
              <input
                type="text"
                required
                placeholder="e.g., CSE-B"
                value={form.classGroup}
                onChange={(e) => setForm({ ...form, classGroup: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Subject Type (Evaluation Schema)</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
              >
                <option value="STANDALONE">Standalone (CIE: Best 2 of 3 scaled to 25 + 25 Assignment)</option>
                <option value="INTEGRATED">Integrated (CIE: Best 2 of 3 scaled to 15 + 10 Assignment + 25 Lab)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Faculty Member</label>
              <select
                required
                value={form.facultyId}
                onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
              >
                <option value="">Select Faculty...</option>
                {faculty.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.id})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 border border-blue-200 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2.5 px-4 rounded-2xl transition-colors mt-6"
            >
              <Save size={16} />
              <span>Create Subject</span>
            </button>

            {saveMessage && (
              <div className={`p-3 text-xs font-semibold rounded-xl text-center mt-3 border ${
                saveMessageType === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
              }`}>
                {saveMessage}
              </div>
            )}
          </form>
        </div>

        {/* Schedule Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList size={18} className="text-gray-400" />
              Subjects Inventory
            </h2>
          </div>

          {subjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Group</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Faculty</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {subjects.map((sub: any, index: number) => (
                    <tr key={sub.code || index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700 font-mono">
                        {sub.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-gray-400" />
                          {sub.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                        {sub.classGroup}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          sub.type === 'INTEGRATED' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {sub.type === 'INTEGRATED' ? 'Integrated' : 'Standalone'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-gray-400" />
                          {sub.faculty?.name || 'Unassigned'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium">No subjects found</p>
              <p className="mt-1 text-sm text-gray-500 max-w-xs mx-auto">
                Create a subject to begin configuring the academic course tracks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
