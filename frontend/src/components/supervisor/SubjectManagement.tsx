import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Save, User, ClipboardList, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../../services/api';
import { DropdownSelect } from '../ui/DropdownSelect';

export const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
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
  const pageSize = 8;
  const filteredSubjects = subjects.filter((sub: any) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [sub.code, sub.name, sub.classGroup, sub.faculty?.name]
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

      <div className="space-y-5">
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

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_2fr_2fr_auto] xl:items-end">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., SUBJECT101"
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
                  placeholder="e.g., Current subject name"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-100 px-5 py-2.5 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-200 xl:w-auto"
              >
                <Save size={16} />
                Create Subject
              </button>
            </div>
            {saveMessage && (
              <div role="status" className={`mt-3 rounded-xl border p-3 text-center text-xs font-semibold ${
                saveMessageType === 'success' ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'
              }`}>
                {saveMessage}
              </div>
            )}
          </form>
        </section>

        <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                <ClipboardList size={18} className="text-gray-400" />
                Subjects Inventory
              </h2>
              <p className="mt-1 text-xs text-gray-500">{filteredSubjects.length} subjects</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block w-full sm:w-64">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search code, name, section..."
                  aria-label="Search subjects"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
              <DropdownSelect
                value={typeFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setTypeFilter(e.target.value); setPage(1); }}
                aria-label="Filter by subject type"
                className="!h-12 !min-h-12 !py-0 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none sm:w-36"
              >
                <option value="ALL">All types</option>
                <option value="STANDALONE">Standalone</option>
                <option value="INTEGRATED">Integrated</option>
              </DropdownSelect>
            </div>
          </div>

          {subjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] divide-y divide-gray-100">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Subject</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Section</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Assigned Faculty</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {visibleSubjects.map((sub: any, index: number) => (
                    <tr key={`${sub.code}-${sub.classGroup ?? index}`} className="transition-colors hover:bg-gray-50/70">
                      <td className="px-5 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <BookOpen size={14} className="shrink-0 text-gray-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{sub.name}</p>
                            <p className="mt-0.5 text-xs font-mono text-gray-500">{sub.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-600">
                        {sub.classGroup || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          sub.type === 'INTEGRATED' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {sub.type === 'INTEGRATED' ? 'Integrated' : 'Standalone'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-600">
                        <div className="flex items-center gap-2">
                          <User size={13} className="shrink-0 text-gray-400" />
                          <span className="truncate">{sub.faculty?.name || 'Unassigned'}</span>
                        </div>
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-16 text-center text-xs font-medium text-gray-600">Page {page} of {pageCount}</span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={page >= pageCount}
                  aria-label="Next page"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
