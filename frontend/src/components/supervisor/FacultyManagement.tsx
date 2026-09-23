import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, BookOpen, Plus, Search, Building, Briefcase, GraduationCap, Shield, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import API from '../../services/api';

interface ModalLayerProps {
  open: boolean;
  children: React.ReactNode;
}

const ModalLayer: React.FC<ModalLayerProps> = ({ open, children }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {children}
    </div>,
    document.body
  );
};

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
  const [roleFilter, setRoleFilter] = useState('all');

  // Form states
  const [newFaculty, setNewFaculty] = useState({
    id: '',
    name: '',
    password: '',
    role: 'teacher' as 'teacher' | 'dean' | 'principal' | 'hod',
    department: ''
  });

  const [editingFaculty, setEditingFaculty] = useState({
    id: '',
    name: '',
    password: '',
    role: 'teacher' as 'teacher' | 'dean' | 'principal' | 'hod',
    department: ''
  });

  const [deletingFaculty, setDeletingFaculty] = useState<any>(null);

  // Subject Management Modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedFacultyForSubjects, setSelectedFacultyForSubjects] = useState<any>(null);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState({ code: '', name: '', classGroup: '', type: 'STANDALONE' });


  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleOpenSubjectModal = async (faculty: any) => {
    setSelectedFacultyForSubjects(faculty);
    setShowSubjectModal(true);
    try {
      const res = await API.get('/subjects');
      setAllSubjects(res.data || []);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyForSubjects) return;
    setLoading(true);
    try {
      await API.post('/subjects', { ...newSubject, facultyId: selectedFacultyForSubjects.id });
      setSuccess('Class assigned successfully!');
      setNewSubject({ code: '', name: '', classGroup: '', type: 'STANDALONE' });
      const res = await API.get('/subjects');
      setAllSubjects(res.data || []);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign class');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubject = async (code: string) => {
    if (!window.confirm('Are you sure you want to remove this class from this faculty?')) return;
    setLoading(true);
    try {
      await API.delete(`/subjects/${code}`);
      setSuccess('Class removed successfully!');
      const res = await API.get('/subjects');
      setAllSubjects(res.data || []);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove class');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };


  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/auth/users?role=teacher,dean,principal,hod`);
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

  const filteredFaculty = useMemo(() => {
    return faculty.filter(f => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = f.name.toLowerCase().includes(query) ||
        f.id.toLowerCase().includes(query) || f.department.toLowerCase().includes(query);
      return matchesSearch && (roleFilter === 'all' || f.role === roleFilter);
    });
  }, [faculty, searchQuery, roleFilter]);

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
      <ModalLayer open={showAddModal}>
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
                  <option value="hod">Supervisor — HOD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Department</label>
                <select
                  value={newFaculty.department}
                  onChange={(e) => setNewFaculty({...newFaculty, department: e.target.value})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                >
                                    <option value="" disabled>Select Department</option>
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Information Science">Information Science</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Academics">Academics (Dean)</option>
                  <option value="Student Affairs">Student Affairs (Dean)</option>
                  <option value="Administration">Administration (Principal)</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Academics">Academics</option>
                  <option value="Student Affairs">Student Affairs</option>
                  <option value="Administration">Administration</option>
                </select>
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
      </ModalLayer>

      {/* Edit Faculty Modal */}
      <ModalLayer open={showEditModal}>
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
                  <option value="hod">Supervisor — HOD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Department</label>
                <select
                  value={editingFaculty.department}
                  onChange={(e) => setEditingFaculty({...editingFaculty, department: e.target.value})}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                  required
                >
                                    <option value="" disabled>Select Department</option>
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Information Science">Information Science</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Academics">Academics (Dean)</option>
                  <option value="Student Affairs">Student Affairs (Dean)</option>
                  <option value="Administration">Administration (Principal)</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Academics">Academics</option>
                  <option value="Student Affairs">Student Affairs</option>
                  <option value="Administration">Administration</option>
                </select>
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
      </ModalLayer>

      {/* Delete Faculty Modal */}
      <ModalLayer open={showDeleteModal}>
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
      </ModalLayer>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900 text-base sm:text-lg">Faculty Directory</h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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
          <select
            aria-label="Filter faculty by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All roles</option>
            <option value="teacher">Faculty</option>
            <option value="hod">HOD</option>
            <option value="dean">Dean</option>
            <option value="principal">Principal</option>
          </select>
          </div>
        </div>

        <div className="px-4 pt-3 text-xs font-medium text-gray-500 sm:px-5">{filteredFaculty.length} faculty member{filteredFaculty.length === 1 ? '' : 's'} shown</div>

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

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenSubjectModal(fac)}
                      className="flex min-h-10 min-w-0 items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <BookOpen size={13} />
                      <span className="truncate">Classes</span>
                    </button>
                    <button
                      onClick={() => openEditModal(fac)}
                      className="flex min-h-10 min-w-0 items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit2 size={13} />
                      <span className="truncate">Edit</span>
                    </button>
                    <button
                      onClick={() => openDeleteModal(fac)}
                      className="flex min-h-10 min-w-0 items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                      <span className="truncate">Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="sticky top-0 z-10 bg-gray-50/95 shadow-[0_1px_0_0_#e5e7eb] backdrop-blur">
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
                            onClick={() => handleOpenSubjectModal(fac)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Manage Classes"
                          >
                            <BookOpen size={16} />
                          </button>
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

      {/* Subject Assignment Modal */}
      <ModalLayer open={showSubjectModal}>
        <div className={`bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl transition-transform ${showSubjectModal ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Manage Classes</h2>
              <p className="text-xs sm:text-sm text-gray-500">Assign or remove classes for {selectedFacultyForSubjects?.name}</p>
            </div>
            <button onClick={() => setShowSubjectModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
                <BookOpen size={16} className="text-blue-600" />
                Currently Assigned
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {allSubjects.filter(s => s.facultyId === selectedFacultyForSubjects?.id).length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">No classes assigned yet.</p>
                ) : (
                  allSubjects.filter(s => s.facultyId === selectedFacultyForSubjects?.id).map(subject => (
                    <div key={subject.code} className="bg-white border border-gray-200 rounded-xl p-3 flex justify-between items-center shadow-sm">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{subject.name}</div>
                        <div className="text-xs text-gray-500">{subject.code} • {subject.classGroup}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveSubject(subject.code)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="Remove Class"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-2">
                <Plus size={16} className="text-green-600" />
                Assign New Class
              </h3>
              <form onSubmit={handleAssignSubject} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Subject Code</label>
                  <input type="text" required placeholder="e.g. CS2301" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Subject Name</label>
                  <input type="text" required placeholder="e.g. Data Structures" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Class / Section</label>
                  <input type="text" required placeholder="e.g. CSE-B" value={newSubject.classGroup} onChange={e => setNewSubject({...newSubject, classGroup: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Subject Type</label>
                  <select value={newSubject.type} onChange={e => setNewSubject({...newSubject, type: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option value="STANDALONE">Theory Only (50 Marks)</option>
                    <option value="INTEGRATED">Theory + Lab (Integrated)</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors mt-2">
                  Assign Class
                </button>
              </form>
            </div>
          </div>
        </div>
      </ModalLayer>
    </div>

  );
};
