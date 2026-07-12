import React, { useState, useEffect } from 'react';
import API from '../../services/api';

export const SemesterManagement: React.FC = () => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

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

  useEffect(() => {
    fetchSemesters();
  }, []);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const response = await API.get('/semesters');
      setSemesters(response.data);
    } catch (err: any) {
      console.error('Failed to fetch semesters:', err);
      setError('Failed to load semesters');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSemester = async () => {
    try {
      await API.post('/semesters', newSemester);
      setShowCreateModal(false);
      await fetchSemesters();
      // Reset form
      setNewSemester({
        name: '',
        startDate: '',
        endDate: '',
        status: 'ACTIVE'
      });
    } catch (err: any) {
      console.error('Failed to create semester:', err);
      setError('Failed to create semester');
    }
  };

  const handleCopySemester = async () => {
    try {
      await API.post(`/semesters/${copySemesterData.sourceSemesterId}/copy`, {
        name: copySemesterData.name,
        startDate: copySemesterData.startDate,
        endDate: copySemesterData.endDate,
        status: copySemesterData.status
      });
      setShowCopyModal(false);
      await fetchSemesters();
      // Reset form
      setCopySemesterData({
        sourceSemesterId: '',
        name: '',
        startDate: '',
        endDate: '',
        status: 'ACTIVE'
      });
    } catch (err: any) {
      console.error('Failed to copy semester:', err);
      setError('Failed to copy semester');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading semesters...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-4">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Semester Management</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
          >
            New Semester
          </button>
          <button
            onClick={() => setShowCopyModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md"
          >
            Copy from Semester
          </button>
        </div>
      </div>

      {/* Create Semester Modal */}
      <div className={showCreateModal ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50' : 'hidden'}>
        <div className="bg-white rounded-lg w-96 max-w-full p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Semester</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreateSemester();
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Semester Name</label>
              <input
                type="text"
                value={newSemester.name}
                onChange={(e) => setNewSemester({...newSemester, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={newSemester.startDate}
                onChange={(e) => setNewSemester({...newSemester, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={newSemester.endDate}
                onChange={(e) => setNewSemester({...newSemester, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={newSemester.status}
                onChange={(e) => setNewSemester({...newSemester, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
              >
                Create Semester
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Copy Semester Modal */}
      <div className={showCopyModal ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50' : 'hidden'}>
        <div className="bg-white rounded-lg w-96 max-w-full p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Copy Semester</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleCopySemester();
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Semester</label>
              <select
                value={copySemesterData.sourceSemesterId}
                onChange={(e) => setCopySemesterData({...copySemesterData, sourceSemesterId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a semester to copy from</option>
                {semesters.map((sem: any) => (
                  <option key={sem.id} value={sem.id}>
                    {sem.name} ({sem.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">New Semester Name</label>
              <input
                type="text"
                value={copySemesterData.name}
                onChange={(e) => setCopySemesterData({...copySemesterData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={copySemesterData.startDate}
                onChange={(e) => setCopySemesterData({...copySemesterData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={copySemesterData.endDate}
                onChange={(e) => setCopySemesterData({...copySemesterData, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={copySemesterData.status}
                onChange={(e) => setCopySemesterData({...copySemesterData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
              >
                Copy Semester
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Semesters List */}
      {semesters.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Semesters</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {semesters.map((sem: any) => (
                  <tr key={sem.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sem.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`${sem.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                     sem.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                                     'bg-gray-100 text-gray-800'} px-2 inline-flex text-xs leading-5 font-semibold rounded-full`}
                        >
                        {sem.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sem.startDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sem.endDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          // TODO: Implement edit/delete functionality
                          alert(`Actions for ${sem.name} not implemented yet`);
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-900"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {semesters.length === 0 && (
            <p className="text-center py-8 text-gray-500">No semesters found.</p>
          )}
        </div>
      ) : (
        <p className="text-center py-8 text-gray-500">No semesters found.</p>
      )}
    </div>
  );
};