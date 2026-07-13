import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Search, MoreVertical, Building, Briefcase, GraduationCap, Shield, Edit2, Trash2, ShieldAlert } from 'lucide-react';
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

  // Dropdown state
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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
    
    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    setActiveDropdownId(null);
  };

  const openDeleteModal = (fac: any) => {
    setDeletingFaculty(fac);
    setShowDeleteModal(true);
    setActiveDropdownId(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Faculty Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage instructors, deans, and access roles.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-colors"
        >
          <UserPlus size={18} />
          <span>Add Faculty</span>
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-700 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {error}
        </div>
      )}

      {/* Add Faculty Modal */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity ${showAddModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-2xl w-[450px] max-w-[95%] p-6 shadow-xl transition-transform ${showAddModal ? 'scale-100' : 'scale-95'}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Add New Faculty</h2>
          <p className="text-sm text-gray-500 mb-6">Create a new academic or supervisory account.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAddFaculty(); }}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Faculty ID</label>
                <input
                  type="text"
                  value={newFaculty.id}
                  onChange={(e) => setNewFaculty({...newFaculty, id: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  placeholder="e.g., FAC2023"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Full Name</label>
                <input
                  type="text"
                  value={newFaculty.name}
                  onChange={(e) => setNewFaculty({...newFaculty, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  placeholder="e.g., Dr. Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Password</label>
                <input
                  type="password"
                  value={newFaculty.password}
                  onChange={(e) => setNewFaculty({...newFaculty, password: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Access Level</label>
                <select
                  value={newFaculty.role}
                  onChange={(e) => setNewFaculty({...newFaculty, role: e.target.value as any})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="teacher">Faculty (Instructor)</option>
                  <option value="dean">Supervisor — Dean</option>
                  <option value="principal">Supervisor — Principal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Department</label>
                <input
                  type="text"
                  value={newFaculty.department}
                  onChange={(e) => setNewFaculty({...newFaculty, department: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Add Faculty
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit Faculty Modal */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity ${showEditModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-2xl w-[450px] max-w-[95%] p-6 shadow-xl transition-transform ${showEditModal ? 'scale-100' : 'scale-95'}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Edit Faculty Member</h2>
          <p className="text-sm text-gray-500 mb-6">Modify account privileges and details.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleEditFaculty(); }}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Faculty ID (Read-only)</label>
                <input
                  type="text"
                  value={editingFaculty.id}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Full Name</label>
                <input
                  type="text"
                  value={editingFaculty.name}
                  onChange={(e) => setEditingFaculty({...editingFaculty, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={editingFaculty.password}
                  onChange={(e) => setEditingFaculty({...editingFaculty, password: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Access Level</label>
                <select
                  value={editingFaculty.role}
                  onChange={(e) => setEditingFaculty({...editingFaculty, role: e.target.value as any})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="teacher">Faculty (Instructor)</option>
                  <option value="dean">Supervisor — Dean</option>
                  <option value="principal">Supervisor — Principal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Department</label>
                <input
                  type="text"
                  value={editingFaculty.department}
                  onChange={(e) => setEditingFaculty({...editingFaculty, department: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                />
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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Faculty Modal */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity ${showDeleteModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-2xl w-[400px] max-w-[95%] p-6 shadow-xl transition-transform ${showDeleteModal ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center gap-3 text-red-600 mb-3">
            <ShieldAlert size={24} />
            <h2 className="text-lg font-bold">Remove Faculty Account</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to remove <strong>{deletingFaculty?.name}</strong> ({deletingFaculty?.id})? This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteFaculty}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-900">Faculty Directory</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64"
            />
          </div>
        </div>

        {filteredFaculty.length > 0 ? (
          <div className="overflow-x-auto">
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
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm">
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
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => setActiveDropdownId(activeDropdownId === fac.id ? null : fac.id)}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeDropdownId === fac.id && (
                        <div 
                          ref={dropdownRef}
                          className="absolute right-6 top-12 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 z-10 text-left animate-slide-up"
                        >
                          <button
                            onClick={() => openEditModal(fac)}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Edit2 size={14} className="text-gray-400" />
                            <span>Edit Account</span>
                          </button>
                          <button
                            onClick={() => openDeleteModal(fac)}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} className="text-red-400" />
                            <span>Remove Faculty</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
