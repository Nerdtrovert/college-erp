import * as React from 'react';
import { Save, Calendar, Info, MessageCircle, User, FileText } from 'lucide-react';

const INITIAL_ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Mid-semester exams begin Nov 18',
    body: 'All students are notified that mid-semester examinations will commence from November 18, 2024. The exam schedule has been posted on the notice board and college website.',
    category: 'exam',
    date: 'Nov 10, 2024',
    author: 'Dr. Priya Sharma',
    target: 'All Students'
  },
  {
    id: 2,
    title: 'Lab schedule change for CS2301L',
    body: 'Due to maintenance work in Lab 1, the lab schedule for CS2301L (Data Structures Lab) has been changed. Please note the new timings effective from November 12, 2024.',
    category: 'info',
    date: 'Nov 8, 2024',
    author: 'Lab Incharge',
    target: 'CSE-B Students'
  }
];

const CLASSES = [
  { id: 'cs2301-b', label: 'CS2301 — Data Structures (CSE-B)' },
  { id: 'cs3401-a', label: 'CS3401 — Design & Analysis of Algorithms (CSE-A)' },
  { id: 'cs2301l-b', label: 'CS2301L — DS Lab (CSE-B)' },
  { id: 'cs3401l-a', label: 'CS3401L — DAA Lab (CSE-A)' },
];

interface Announcement {
  id: number;
  title: string;
  body: string;
  category: string;
  date: string;
  author: string;
  target: string;
}

export const TeacherAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = React.useState<Array<Announcement>>(INITIAL_ANNOUNCEMENTS);
  const [newAnnouncement, setNewAnnouncement] = React.useState<Omit<Announcement, 'id' | 'date' | 'author'>>({
    title: '',
    body: '',
    category: 'info',
    target: CLASSES[0].id
  });
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.body.trim()) return;

    setSaving(true);
    const newAnn = {
      ...newAnnouncement,
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: 'Dr. Priya Sharma'
    };

    setTimeout(() => {
      setAnnouncements(prev => [newAnn, ...prev]);
      setNewAnnouncement({
        title: '',
        body: '',
        category: 'info',
        target: CLASSES[0].id
      });
      setSaving(false);
    }, 800);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'exam': return <FileText />;
      case 'info': return <Info />;
      case 'event': return <Calendar />;
      default: return <MessageCircle />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-gray-500 text-sm mt-1">Create and manage announcements for your classes</p>
      </div>

      {/* Create announcement */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
          <h2 className="font-bold text-gray-800 text-base">Create New Announcement</h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter announcement title"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-gray-50/50 hover:bg-gray-50"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { id: 'info', label: 'Information', icon: <Info size={16} />, activeBg: 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-500/10', inactiveBg: 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100' },
                    { id: 'exam', label: 'Exam Related', icon: <FileText size={16} />, activeBg: 'bg-red-50 border-red-300 text-red-700 ring-2 ring-red-500/10', inactiveBg: 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100' },
                    { id: 'event', label: 'Event/Activity', icon: <Calendar size={16} />, activeBg: 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/10', inactiveBg: 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100' },
                  ].map((cat) => {
                    const isActive = newAnnouncement.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewAnnouncement(prev => ({ ...prev, category: cat.id }))}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          isActive ? cat.activeBg : cat.inactiveBg
                        }`}
                      >
                        {cat.icon}
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Audience</label>
                <select
                  value={newAnnouncement.target}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, target: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-gray-50/50 hover:bg-gray-50 cursor-pointer"
                >
                  {CLASSES.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.label}</option>
                  ))}
                  <option value="all">All Students</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                value={newAnnouncement.body}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Enter detailed announcement..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-gray-50/50 hover:bg-gray-50 h-32 resize-y"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm shadow-sm transition-all duration-200 ${
                  saving 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60 active:scale-[0.98]'
                }`}
              >
                <Save size={16} />
                {saving ? 'Publishing...' : 'Post Announcement'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Existing announcements */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 px-4 sm:px-6 py-4">Announcements</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="px-4 sm:px-6 py-4 flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 mt-1">
                {getCategoryIcon(announcement.category)}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-start gap-2 sm:gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    announcement.category === 'exam' ? 'bg-red-100 text-red-700' :
                    announcement.category === 'info' ? 'bg-blue-100 text-blue-700' :
                    announcement.category === 'event' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}
                  >
                    {announcement.category.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{announcement.target}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{announcement.body}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                  <span>
                    <Calendar size={14} className="mr-1" /> {announcement.date}
                  </span>
                  <span>
                    <User size={14} className="mr-1" /> {announcement.author}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
