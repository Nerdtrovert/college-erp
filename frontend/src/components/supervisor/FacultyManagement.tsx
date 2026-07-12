import React, { useState, useEffect } from 'react';
import API from '../../services/api';

export const FacultyManagement: React.FC = () => {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newFaculty, setNewFaculty] = useState({
    id: '',
    name: '',
    password: '',
    role: 'teacher' as 'teacher' | 'dean' | 'principal',
    department: ''
  });

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      // Get all users with role teacher, dean, or principal
      const response = await API.get(`/auth/users?role=teacher,dean,principal`);
      setFaculty(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch faculty:', err);
      // If the endpoint doesn't exist yet, we'll show an empty array
      setFaculty([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFaculty = async () => {
    try {
      await API.post('/auth/register', newFaculty);
      setSuccess('Faculty member added successfully!');
      setShowAddModal(false);
      await fetchFaculty();
      // Reset form
      setNewFaculty({
        id: '',
        name: '',
        password: '',
        role: 'teacher',
        department: ''
      });
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to add faculty:', err);
      setError(err.response?.data?.error || 'Failed to add faculty');
    }
  };

  if (loading && faculty.length === 0) {
    return <div className="text-center py-12">Loading faculty data...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Faculty Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
        >
          Add Faculty Member
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Add Faculty Modal */}
      <div className={showAddModal ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50' : 'hidden'}>
        <div className="bg-white rounded-lg w-96 max-w-full p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add Faculty Member</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddFaculty();
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Faculty ID</label>
              <input
                type="text"
                value={newFaculty.id}
                onChange={(e) => setNewFaculty({...newFaculty, id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="e.g., FAC2023 or DEAN123 or PRINCIPAL456"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={newFaculty.name}
                onChange={(e) => setNewFaculty({...newFaculty, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={newFaculty.password}
                onChange={(e) => setNewFaculty({...newFaculty, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Access level</label>
              <select
                value={newFaculty.role}
                onChange={(e) => setNewFaculty({...newFaculty, role: e.target.value as 'teacher' | 'dean' | 'principal'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="teacher">Faculty</option>
                <option value="dean">Supervisor Faculty — Dean</option>
                <option value="principal">Supervisor Faculty — Principal</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                value={newFaculty.department}
                onChange={(e) => setNewFaculty({...newFaculty, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
              >
                {loading ? 'Adding...' : 'Add Faculty'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Faculty List or Message */}
      <div className="mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Faculty Directory</h2>
        {faculty.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {faculty.map((fac: any) => (
                  <tr key={fac.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fac.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{fac.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{fac.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`${fac.role === 'dean' ? 'bg-blue-100 text-blue-800' :
                                     fac.role === 'principal' ? 'bg-purple-100 text-purple-800' :
                                     fac.role === 'teacher' ? 'bg-green-100 text-green-800' :
                                     'bg-gray-100 text-gray-800'} px-2 inline-flex text-xs leading-5 font-semibold rounded-full`}
                        >
                        {fac.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No faculty members found.</p>
            <p className="mt-2 text-sm text-gray-400">
              Use the "Add Faculty Member" button above to add new faculty, deans, or principals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
