import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Building, Briefcase, GraduationCap, Shield, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import API from '../../services/api';

export const FacultyManagement: React.FC = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newFaculty, setNewFaculty] = useState({
    id: '',
    name: '',
    password: '',
    role: 'teacher' as 'teacher' | 'dean' | 'principal',
    department: ''
  });

  const [editingFaculty, setEditingFaculty] = useState({
    id: '',
    name: '',
    password: '',
    role: 'teacher' as 'teacher' | 'dean' | 'principal',
    department: ''
  });

  const [deletingFaculty, setDeletingFaculty] = useState<any>(null);

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/auth/users?role=teacher,dean,principal`);
      setFaculty(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch faculty:', err);
      setFaculty([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFaculty = async () => {
    try {
      setLoading(true);
      await API.post('/auth/register', newFaculty);
      setSuccess('Faculty member added successfully!');
      setShowAddModal(false);
      await fetchFaculty();
      setNewFaculty({
        id: '', name: '', password: '', role: 'teacher', department: ''
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to add faculty:', err);
      setError(err.response?.data?.error || 'Failed to add faculty');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFaculty = async () => {
    try {
      setLoading(true);
      const payload: any = {
        name: editingFaculty.name,
        role: editingFaculty.role,
        department: editingFaculty.department
      };
      if (editingFaculty.password) {
        payload.password = editingFaculty.password;
      }
      await API.patch(`/auth/users/${editingFaculty.id}`, payload);
      setSuccess('Faculty member updated successfully!');
      setShowEditModal(false);
      await fetchFaculty();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to update faculty:', err);
      setError(err.response?.data?.error || 'Failed to update faculty');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaculty = async () => {
    if (!deletingFaculty) return;
    try {
      setLoading(true);
      await API.delete(`/auth/users/${deletingFaculty.id}`);
      setSuccess('Faculty member deleted successfully!');
      setShowDeleteModal(false);
      await fetchFaculty();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete faculty:', err);
      setError(err.response?.data?.error || 'Failed to delete faculty');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (fac: any) => {
    setEditingFaculty({
      id: fac.id,
      name: fac.name,
      password: '',
      role: fac.role,
      department: fac.department
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (fac: any) => {
    setDeletingFaculty(fac);
    setShowDeleteModal(true);
  };

  const filteredFaculty = faculty.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && faculty.length === 0) {
    return <div className="text-center py-12 text-gray-500 font-medium animate-pulse">Loading faculty directory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Faculty Management</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage instructors, deans, and access roles.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 border border-blue-200 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2.5 px-4 rounded-2xl transition-colors active:scale-95 text-sm"
        >
          <UserPlus size={18} />
          <span>Add Faculty</span>
        </button>
      </div>

      {success && (
        <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl text-xs sm:text-sm font-medium text-green-700 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm font-medium text-red-700 flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Faculty Modal */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity ${showAddModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl transition-transform ${showAddModal ? 'scale-100' : 'scale-95'}`}>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Add New Faculty</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-5">Create a new academic or supervisory account.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAddFaculty(); }}>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Faculty ID</label>
                <input
                  type="text"
                  value={newFaculty.id}
                  onChange={(e) => setNewFaculty({...newFaculty, id: e.target.value})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  placeholder="e.g., FAC2023"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={newFaculty.name}
                  onChange={(e) => setNewFaculty({...newFaculty, name: e.target.value})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  placeholder="e.g., Dr. Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Password</label>
                <input
                  type="password"
                  value={newFaculty.password}
                  onChange={(e) => setNewFaculty({...newFaculty, password: e.target.value})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Access Level</label>
                <select
                  value={newFaculty.role}
                  onChange={(e) => setNewFaculty({...newFaculty, role: e.target.value as any})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="teacher">Faculty (Instructor)</option>
                  <option value="dean">Supervisor — Dean</option>
                  <option value="principal">Supervisor — Principal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Department</label>
                <input
                  type="text"
                  value={newFaculty.department}
                  onChange={(e) => setNewFaculty({...newFaculty, department: e.target.value})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-blue-800 bg-blue-100 border border-blue-200 hover:bg-blue-200 rounded-2xl transition-colors disabled:opacity-50"
              >
                Add Faculty
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit Faculty Modal */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity ${showEditModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl transition-transform ${showEditModal ? 'scale-100' : 'scale-95'}`}>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Edit Faculty Member</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-5">Modify account privileges and details.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleEditFaculty(); }}>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Faculty ID (Read-only)</label>
                <input
                  type="text"
                  value={editingFaculty.id}
                  disabled
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editingFaculty.name}
                  onChange={(e) => setEditingFaculty({...editingFaculty, name: e.target.value})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">New Password (Optional)</label>
                <input
                  type="password"
                  value={editingFaculty.password}
                  onChange={(e) => setEditingFaculty({...editingFaculty, password: e.target.value})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  placeholder="Leave blank to keep current"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Access Level</label>
                <select
                  value={editingFaculty.role}
                  onChange={(e) => setEditingFaculty({...editingFaculty, role: e.target.value as any})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="teacher">Faculty (Instructor)</option>
                  <option value="dean">Supervisor — Dean</option>
                  <option value="principal">Supervisor — Principal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Department</label>
                <input
                  type="text"
                  value={editingFaculty.department}
                  onChange={(e) => setEditingFaculty({...editingFaculty, department: e.target.value})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Faculty Modal */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity ${showDeleteModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl transition-transform ${showDeleteModal ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center gap-3 text-red-600 mb-3">
            <ShieldAlert size={24} className="shrink-0" />
            <h2 className="text-lg font-bold">Remove Faculty Account</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mb-6">
            Are you sure you want to remove <strong className="text-gray-800">{deletingFaculty?.name}</strong> ({deletingFaculty?.id})? This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteFaculty}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900 text-base sm:text-lg">Faculty Directory</h2>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full"
            />
          </div>
        </div>

        {filteredFaculty.length > 0 ? (
          <>
            {/* Mobile Card View (< md) */}
            <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
              {filteredFaculty.map((fac: any) => (
                <div key={fac.id} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-3 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                        {fac.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{fac.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{fac.id}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0
                      ${fac.role === 'dean' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                        fac.role === 'principal' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}
                    >
                      {fac.role === 'dean' || fac.role === 'principal' ? <Shield size={12} /> : <GraduationCap size={12} />}
                      <span className="capitalize">{fac.role}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-100">
                    <Building size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{fac.department}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => openEditModal(fac)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit2 size={13} />
                      <span>Edit Account</span>
                    </button>
                    <button
                      onClick={() => openDeleteModal(fac)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Faculty Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Access Role</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredFaculty.map((fac: any) => (
                    <tr key={fac.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                            {fac.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{fac.name}</div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{fac.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building size={14} className="text-gray-400" />
                          {fac.department}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                          ${fac.role === 'dean' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            fac.role === 'principal' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}
                        >
                          {fac.role === 'dean' || fac.role === 'principal' ? <Shield size={12} /> : <GraduationCap size={12} />}
                          <span className="capitalize">{fac.role}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(fac)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Account"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(fac)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Faculty"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium">No faculty members found</p>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding a new faculty member to the system.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
