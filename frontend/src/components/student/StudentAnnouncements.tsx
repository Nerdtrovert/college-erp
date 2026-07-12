import { useEffect, useState } from 'react';
import { Bell, CalendarDays, User } from 'lucide-react';
import API from '../../services/api';

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'exam': return <Exam />;
    case 'info': return <Info />;
    case 'event': return <Calendar />;
    default: return <MessageCircle />;
  }
};

const Exam = () => <span className="text-red-600">📝</span>;
const Info = () => <span className="text-blue-600">ℹ️</span>;
const Calendar = () => <span className="text-green-600">📅</span>;
const MessageCircle = () => <span className="text-gray-600">💬</span>;

export const StudentAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await API.get('/announcements');
        setAnnouncements(res.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch announcements.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-medium">Loading announcements...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500 font-medium">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-gray-500 text-sm mt-1">Important notices and updates</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 px-4 sm:px-6 py-4">All Announcements</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="px-4 sm:px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getCategoryIcon(announcement.category)}
                </div>
                <div className="flex-1 min-w-0">
                  {announcement.pinned && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full mr-2">Pinned</span>
                  )}
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">{announcement.title}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed mb-2">{announcement.body}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={13} /> {announcement.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User size={13} /> {announcement.author}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center gap-3">
          <Bell size={18} className="text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
            <p className="text-sm text-gray-600">Get instant alerts for important announcements</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            Email notifications
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            SMS alerts
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            In-app notifications
          </label>
        </div>
      </div>
    </div>
  );
};
