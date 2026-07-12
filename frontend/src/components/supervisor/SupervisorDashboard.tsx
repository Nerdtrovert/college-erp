import React from 'react';
import { useNavigate } from 'react-router-dom';

export const SupervisorDashboard: React.FC<{
  user: { name: string };
  onLogout: () => void;
}> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const actions = [
    { title: 'Semester Management', description: 'Create, copy, and manage academic semesters.', path: '/supervisor/semesters' },
    { title: 'Faculty Management', description: 'Add faculty and assign supervisory access.', path: '/supervisor/faculty' },
    { title: 'Timetable Management', description: 'Review and manage class schedules and timetables.', path: '/supervisor/timetable' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Supervisor Faculty Dashboard</h1>
      <p className="mt-1 mb-6 text-gray-600">Welcome, {user.name}. Set up faculty, semesters, and timetables from here.</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-blue-500 hover:shadow-md"
          >
            <h2 className="font-semibold text-gray-900">{action.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{action.description}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-blue-700">Open management →</span>
          </button>
        ))}
      </div>

      <button
        onClick={onLogout}
        className="mt-8 w-full rounded-md bg-red-500 px-6 py-3 font-bold text-white transition-colors hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
};
