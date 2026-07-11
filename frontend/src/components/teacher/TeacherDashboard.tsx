import React, { useState } from 'react';
import {
  LayoutDashboard, CalendarCheck, BarChart2, Bell, BookOpen, Menu, X
} from 'lucide-react';
import type { User } from '../../types';
import { Sidebar } from '../Sidebar';
import { TeacherHome } from './TeacherHome';
import { TeacherAttendance } from './TeacherAttendance';
import { TeacherMarks } from './TeacherMarks';
import { TeacherAnnouncements } from './TeacherAnnouncements';
import { TeacherNotes } from './TeacherNotes';

const NAV_ITEMS = [
  { id: 'home', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'attendance', label: 'Mark Attendance', icon: <CalendarCheck size={16} /> },
  { id: 'marks', label: 'Update Marks', icon: <BarChart2 size={16} /> },
  { id: 'announcements', label: 'Announcements', icon: <Bell size={16} /> },
  { id: 'notes', label: 'Notes', icon: <BookOpen size={16} /> },
];

interface Props {
  user: User;
  onLogout: () => void;
}

export const TeacherDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [active, setActive] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (active) {
      case 'home': return <TeacherHome user={user} />;
      case 'attendance': return <TeacherAttendance />;
      case 'marks': return <TeacherMarks />;
      case 'announcements': return <TeacherAnnouncements />;
      case 'notes': return <TeacherNotes user={user} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4f8' }}>
      <Sidebar
        user={user}
        items={NAV_ITEMS}
        active={active}
        onNavigate={(id) => { setActive(id); setMobileMenuOpen(false) }}
        onLogout={onLogout}
      />

      {/* Mobile nav */}
      <div className={`fixed inset-0 z-50 md:hidden flex transition-all duration-300 ${
        mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className={`w-64 transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar
            user={user}
            items={NAV_ITEMS}
            active={active}
            onNavigate={(id) => { setActive(id); setMobileMenuOpen(false) }}
            onLogout={onLogout}
            className="flex flex-col w-64 min-h-screen"
          />
        </div>
        <div className="flex-1 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
              <BookOpen size={15} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900">EduPortal</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="text-gray-600 active:scale-90 transition-transform duration-150 p-2 rounded-xl hover:bg-gray-50 active:bg-gray-100"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div key={active} className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto animate-slide-up" style={{ scrollbarGutter: 'stable' }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};
