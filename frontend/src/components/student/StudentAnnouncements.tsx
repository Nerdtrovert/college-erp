import { Bell, CalendarDays, User } from 'lucide-react';

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Mid-semester exams begin Nov 18',
    body: 'All students are notified that mid-semester examinations will commence from November 18, 2024. The exam schedule has been posted on the notice board and college website.',
    category: 'exam',
    date: 'Nov 10, 2024',
    author: 'Exam Cell',
    pinned: true
  },
  {
    id: 2,
    title: 'Lab record submission deadline extended to Nov 15',
    body: 'Due to technical issues in some labs, the deadline for submission of laboratory records has been extended to November 15, 2024. Please ensure your records are complete and signed by the respective lab instructors.',
    category: 'info',
    date: 'Nov 8, 2024',
    author: 'Academic Office',
    pinned: false
  },
  {
    id: 3,
    title: 'Guest lecture on AI/ML — Nov 14, 2 PM, Seminar Hall',
    body: 'The Computer Science Department is organizing a guest lecture on Artificial Intelligence and Machine Learning by Dr. Rajesh Kumar from IIT Delhi. All interested students are invited to attend the session on November 14, 2024 at 2:00 PM in the Seminar Hall.',
    category: 'event',
    date: 'Nov 7, 2024',
    author: 'CSE Department',
    pinned: false
  },
  {
    id: 4,
    title: 'Sports meet registration opens',
    body: 'Registration for the annual inter-departmental sports meet is now open. Students can register for various events including cricket, football, badminton, table tennis, and athletics. Last date for registration is November 20, 2024.',
    category: 'event',
    date: 'Nov 5, 2024',
    author: 'Sports Committee',
    pinned: false
  },
  {
    id: 5,
    title: 'Library hours extended during exams',
    body: 'To facilitate better preparation for upcoming examinations, the central library will remain open until 10:00 PM from November 15 to December 1, 2024. All students are advised to make use of this facility.',
    category: 'info',
    date: 'Nov 3, 2024',
    author: 'Library Committee',
    pinned: false
  }
];

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
          {ANNOUNCEMENTS.map((announcement) => (
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
                    <span>
                      <CalendarDays size={14} className="mr-1" /> {announcement.date}
                    </span>
                    <span>
                      <User size={14} className="mr-1" /> {announcement.author}
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
