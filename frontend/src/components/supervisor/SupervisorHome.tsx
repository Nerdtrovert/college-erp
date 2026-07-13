import React from 'react';
import { CalendarRange, Users, ClipboardList, Shield, GraduationCap, LayoutDashboard } from 'lucide-react';

interface Props {
  user: any;
  onNavigate: (id: string) => void;
}

export const SupervisorHome: React.FC<Props> = ({ user, onNavigate }) => {
  const actions = [
    { id: 'semesters', title: 'Semester Management', description: 'Create, copy, and manage academic semesters across the institution.', icon: <CalendarRange size={20} />, color: 'text-blue-600 bg-blue-50' },
    { id: 'faculty', title: 'Faculty Management', description: 'Add new faculty members and assign supervisory access roles.', icon: <Users size={20} />, color: 'text-purple-600 bg-purple-50' },
    { id: 'timetable', title: 'Timetable Management', description: 'Review and manage class schedules and faculty timetables.', icon: <ClipboardList size={20} />, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{user.role === 'dean' ? 'Dean Portal' : 'Principal Portal'} &middot; {user.department}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Active Semesters', value: '1', icon: <CalendarRange size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Faculty', value: '6', icon: <Users size={18} />, color: 'text-green-600 bg-green-50' },
          { label: 'Platform Status', value: 'Healthy', icon: <Shield size={18} />, color: 'text-purple-600 bg-purple-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LayoutDashboard size={18} className="text-gray-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className="flex flex-col text-left p-5 rounded-xl border border-gray-100 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${action.color} group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <h3 className="font-semibold text-gray-900">{action.title}</h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{action.description}</p>
              <span className="mt-auto pt-4 inline-block text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                Manage {action.title.split(' ')[0].toLowerCase()} &rarr;
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-start sm:items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <GraduationCap size={24} className="text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-blue-900 text-sm">Welcome to the enhanced Supervisor Portal</p>
            <p className="text-xs text-blue-700 mt-0.5">Use the sidebar to navigate seamlessly between management sections.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
