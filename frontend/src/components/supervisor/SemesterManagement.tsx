import React, { useState, useEffect } from 'react';
import { Plus, Copy, Calendar, ShieldAlert, Edit2 } from 'lucide-react';
import API from '../../services/api';

export const SemesterManagement: React.FC = () => {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [newSemester, setNewSemester] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE'
  });

  const [copySemesterData, setCopySemesterData] = useState({
    sourceSemesterId: '',
    name: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE'
  });

  const [editingSemester, setEditingSemester] = useState({
    id: '',
    name: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchSemesters();
  }, []);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const response = await API.get('/semesters');
      setSemesters(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch semesters:', err);
      setError('Failed to load semesters');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSemester = async () => {
    try {
      setLoading(true);
      await API.post('/semesters', newSemester);
      setSuccess('Semester created successfully!');
      setShowCreateModal(false);
      await fetchSemesters();
      setNewSemester({
        name: '', startDate: '', endDate: '', status: 'ACTIVE'
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to create semester:', err);
      setError('Failed to create semester');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySemester = async () => {
    try {
      setLoading(true);
      await API.post(`/semesters/${copySemesterData.sourceSemesterId}/copy`, {
        name: copySemesterData.name,
        startDate: copySemesterData.startDate,
        endDate: copySemesterData.endDate,
        status: copySemesterData.status
      });
      setSuccess('Semester structure copied successfully!');
      setShowCopyModal(false);
      await fetchSemesters();
      setCopySemesterData({
        sourceSemesterId: '', name: '', startDate: '', endDate: '', status: 'ACTIVE'
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to copy semester:', err);
      setError('Failed to copy semester');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSemester = async () => {
    try {
      setLoading(true);
      await API.patch(`/semesters/${editingSemester.id}`, {
        name: editingSemester.name,
        startDate: editingSemester.startDate,
        endDate: editingSemester.endDate,
        status: editingSemester.status
      });
      setSuccess('Semester updated successfully!');
      setShowEditModal(false);
      await fetchSemesters();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to update semester:', err);
      setError('Failed to update semester');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (sem: any) => {
    setEditingSemester({
      id: sem.id,
      name: sem.name,
      startDate: sem.startDate || '',
      endDate: sem.endDate || '',
      status: sem.status
    });
    setShowEditModal(true);
  };

  if (loading && semesters.length === 0) {
    return <div className="text-center py-12 text-gray-500 font-medium animate-pulse">Loading semesters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Semester Management</h1>
          <p className="text-gray-500 text-sm mt-1">Configure academic semesters, start/end dates, and statuses.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-colors"
          >
            <Plus size={18} />
            <span>New Semester</span>
          </button>
          <button
            onClick={() => setShowCopyModal(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-colors"
          >
            <Copy size={16} />
            <span>Copy Semester</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-700 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-500" />
          {error}
        </div>
      )}

      {/* Create Semester Modal */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity ${showCreateModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-2xl w-[420px] max-w-[95%] p-6 shadow-xl transition-transform ${showCreateModal ? 'scale-100' : 'scale-95'}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Create New Semester</h2>
          <p className="text-sm text-gray-500 mb-6">Initialize a fresh academic term.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleCreateSemester(); }}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Semester Name</label>
                <input
                  type="text"
                  value={newSemester.name}
                  onChange={(e) => setNewSemester({...newSemester, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  placeholder="e.g., Fall 2024"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Start Date</label>
                <input
                  type="date"
                  value={newSemester.startDate}
                  onChange={(e) => setNewSemester({...newSemester, startDate: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">End Date</label>
                <input
                  type="date"
                  value={newSemester.endDate}
                  onChange={(e) => setNewSemester({...newSemester, endDate: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Status</label>
                <select
                  value={newSemester.status}
                  onChange={(e) => setNewSemester({...newSemester, status: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Copy Semester Modal */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity ${showCopyModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-2xl w-[420px] max-w-[95%] p-6 shadow-xl transition-transform ${showCopyModal ? 'scale-100' : 'scale-95'}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Copy Semester Structure</h2>
          <p className="text-sm text-gray-500 mb-6">Create a new semester replicating structural details and courses.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleCopySemester(); }}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Source Semester</label>
                <select
                  value={copySemesterData.sourceSemesterId}
                  onChange={(e) => setCopySemesterData({...copySemesterData, sourceSemesterId: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                >
                  <option value="">Select source semester...</option>
                  {semesters.map((sem: any) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name} ({sem.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">New Semester Name</label>
                <input
                  type="text"
                  value={copySemesterData.name}
                  onChange={(e) => setCopySemesterData({...copySemesterData, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  placeholder="e.g., Spring 2025"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Start Date</label>
                <input
                  type="date"
                  value={copySemesterData.startDate}
                  onChange={(e) => setCopySemesterData({...copySemesterData, startDate: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">End Date</label>
                <input
                  type="date"
                  value={copySemesterData.endDate}
                  onChange={(e) => setCopySemesterData({...copySemesterData, endDate: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Status</label>
                <select
                  value={copySemesterData.status}
                  onChange={(e) => setCopySemesterData({...copySemesterData, status: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Copy
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit Semester Modal */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity ${showEditModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-2xl w-[420px] max-w-[95%] p-6 shadow-xl transition-transform ${showEditModal ? 'scale-100' : 'scale-95'}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Edit Semester</h2>
          <p className="text-sm text-gray-500 mb-6">Modify term configuration details.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleEditSemester(); }}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Semester Name</label>
                <input
                  type="text"
                  value={editingSemester.name}
                  onChange={(e) => setEditingSemester({...editingSemester, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Start Date</label>
                <input
                  type="date"
                  value={editingSemester.startDate}
                  onChange={(e) => setEditingSemester({...editingSemester, startDate: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">End Date</label>
                <input
                  type="date"
                  value={editingSemester.endDate}
                  onChange={(e) => setEditingSemester({...editingSemester, endDate: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Status</label>
                <select
                  value={editingSemester.status}
                  onChange={(e) => setEditingSemester({...editingSemester, status: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Semesters list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Current Semesters</h2>
        </div>
        {semesters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Semester Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {semesters.map((sem: any) => (
                  <tr key={sem.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sem.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                        ${sem.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-100' :
                          sem.status === 'UPCOMING' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-gray-50 text-gray-700 border border-gray-200'}`}
                      >
                        {sem.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sem.startDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sem.endDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(sem)}
                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <Edit2 size={12} />
                        <span>Configure</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium">No semesters found</p>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              Add a new semester or copy from an existing one to initialize structural timetables.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
