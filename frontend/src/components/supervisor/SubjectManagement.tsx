import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Save, ClipboardList, Search,
  ChevronLeft, ChevronRight, Edit2, X, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import API from '../../services/api';
import { DropdownSelect } from '../ui/DropdownSelect';

interface SubjectItem {
  id: string;
  code: string;
  name: string;
  type: 'STANDALONE' | 'INTEGRATED';
  courseType?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error' | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'STANDALONE'
  });

  // Edit Subject Modal state
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    type: 'STANDALONE'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showSchemaConfirmModal, setShowSchemaConfirmModal] = useState(false);

  const pageSize = 8;
  const filteredSubjects = subjects.filter((sub) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [sub.code, sub.name]
      .some((value) => String(value ?? '').toLowerCase().includes(query));
    return matchesSearch && (typeFilter === 'ALL' || sub.type === typeFilter);
  });
  const pageCount = Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  const visibleSubjects = filteredSubjects.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    fetchSubjects();
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

  const showNotification = (message: string, type: 'success' | 'error') => {
    setSaveMessage(message);
    setSaveMessageType(type);
    setTimeout(() => {
      setSaveMessage(null);
      setSaveMessageType(null);
    }, 4500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = form.code.trim().toUpperCase();
    const trimmedName = form.name.trim();

    if (!trimmedCode || !trimmedName) {
      showNotification('Subject code and name are required.', 'error');
      return;
    }

    try {
      await API.post('/subjects', {
        code: trimmedCode,
        name: trimmedName,
        type: form.type
      });
      showNotification('Subject created successfully.', 'success');
      setForm({
        code: '',
        name: '',
        type: 'STANDALONE'
      });
      fetchSubjects();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Unable to save subject details.';
      showNotification(errMsg, 'error');
    }
  };

  const handleStartEdit = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setEditForm({
      code: sub.code,
      name: sub.name,
      type: sub.type || 'STANDALONE'
    });
    setEditError(null);
    setShowSchemaConfirmModal(false);
  };

  const performSave = async () => {
    if (!editingSubject) return;

    const trimmedCode = editForm.code.trim().toUpperCase();
    const trimmedName = editForm.name.trim();

    setEditLoading(true);
    setEditError(null);

    try {
      await API.put(`/subjects/${encodeURIComponent(editingSubject.code)}`, {
        code: trimmedCode,
        name: trimmedName,
        type: editForm.type
      });
      showNotification('Subject updated successfully.', 'success');
      setEditingSubject(null);
      setShowSchemaConfirmModal(false);
      fetchSubjects();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Unable to update subject.';
      setEditError(errMsg);
      setShowSchemaConfirmModal(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    const trimmedCode = editForm.code.trim().toUpperCase();
    const trimmedName = editForm.name.trim();

    if (!trimmedCode || !trimmedName) {
      setEditError('Subject code and name are required.');
      return;
    }

    // Check duplicate code locally before sending
    if (trimmedCode !== editingSubject.code) {
      const isDuplicate = subjects.some(s => s.code.toUpperCase() === trimmedCode && s.id !== editingSubject.id);
      if (isDuplicate) {
        setEditError(`A subject with code "${trimmedCode}" already exists.`);
        return;
      }
    }

    // If evaluation schema is changing, show explicit confirmation prompt
    if (editForm.type !== editingSubject.type) {
      setShowSchemaConfirmModal(true);
      return;
    }

    await performSave();
  };

  if (loading && subjects.length === 0) {
    return <div className="text-center py-12 text-gray-500 font-medium animate-pulse">Loading subjects...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all duration-300 animate-slide-in ${
          saveMessageType === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {saveMessageType === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{saveMessage}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
        <p className="text-gray-500 text-sm mt-1">Configure global subjects, define curriculum codes, and manage evaluation schemas.</p>
      </div>

      <div className="space-y-5">
        {/* Create Subject Section */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Plus size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Add New Subject</h2>
              <p className="mt-0.5 text-xs text-gray-500">Create a subject and choose its evaluation schema.</p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_2fr_2fr_auto] xl:items-end">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 21CS51"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Management & Entrepreneurship"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Evaluation Schema</label>
                <DropdownSelect
                  value={form.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="STANDALONE">Standalone</option>
                  <option value="INTEGRATED">Integrated</option>
                </DropdownSelect>
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 xl:w-auto"
              >
                <Save size={16} />
                Create Subject
              </button>
            </div>
          </form>
        </section>

        {/* Subjects Inventory Section */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                <ClipboardList size={18} className="text-gray-400" />
                Subjects Inventory
              </h2>
              <p className="mt-1 text-xs text-gray-500">{filteredSubjects.length} subjects configured</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block w-full sm:w-64">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search code or subject name..."
                  aria-label="Search subjects"
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
              <DropdownSelect
                value={typeFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setTypeFilter(e.target.value); setPage(1); }}
                aria-label="Filter by subject type"
                className="!h-10 !min-h-10 !py-0 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none sm:w-36"
              >
                <option value="ALL">All schemas</option>
                <option value="STANDALONE">Standalone</option>
                <option value="INTEGRATED">Integrated</option>
              </DropdownSelect>
            </div>
          </div>

          {subjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] divide-y divide-gray-100">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Subject Details</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Subject Code</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Evaluation Schema</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {visibleSubjects.map((sub) => (
                    <tr key={sub.id || sub.code} className="transition-colors hover:bg-gray-50/70">
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <BookOpen size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{sub.name}</p>
                            {sub.description && (
                              <p className="truncate text-xs text-gray-400">{sub.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gray-700">
                        {sub.code}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-block ${
                          sub.type === 'INTEGRATED'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                            : 'bg-amber-50 text-amber-700 border border-amber-150'
                        }`}>
                          {sub.type === 'INTEGRATED' ? 'Integrated' : 'Standalone'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(sub)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                          title={`Edit ${sub.code}`}
                        >
                          <Edit2 size={13} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSubjects.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">
                        No subjects match your search or filter.
                      </td>
                    </tr>
                  )}
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
          {filteredSubjects.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 sm:px-5">
              <p className="text-xs text-gray-500">
                Showing {Math.min((page - 1) * pageSize + 1, filteredSubjects.length)}–{Math.min(page * pageSize, filteredSubjects.length)} of {filteredSubjects.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-16 text-center text-xs font-medium text-gray-600">Page {page} of {pageCount}</span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={page >= pageCount}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Edit Subject</h3>
                  <p className="text-xs text-gray-500 font-mono">{editingSubject.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Subject Code
                </label>
                <input
                  type="text"
                  required
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., 21CS51"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g., Management & Entrepreneurship"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Evaluation Schema
                </label>
                <DropdownSelect
                  value={editForm.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="STANDALONE">Standalone</option>
                  <option value="INTEGRATED">Integrated</option>
                </DropdownSelect>
                <p className="mt-1 text-[11px] text-gray-400">
                  Standalone subjects use standard IA theory evaluations; Integrated subjects track both theory and lab evaluations.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shadow-sm transition-colors"
                >
                  {editLoading && <Loader2 className="animate-spin" size={14} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Evaluation Schema Confirmation Modal */}
      {showSchemaConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6 animate-scale-in space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Change Evaluation Schema?</h3>
                <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
                  Changing this subject’s evaluation schema may affect how existing marks, internal totals, and academic risk are calculated. Existing marks will be preserved.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowSchemaConfirmModal(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editLoading}
                onClick={performSave}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 shadow-sm transition-colors"
              >
                {editLoading && <Loader2 className="animate-spin" size={14} />}
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
