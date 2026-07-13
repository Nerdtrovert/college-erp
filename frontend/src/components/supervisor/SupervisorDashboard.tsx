import React, { useState } from 'react';
import {
  LayoutDashboard, CalendarRange, Users, ClipboardList, Menu, X, Shield
} from 'lucide-react';
import type { User } from '../../types';
import { Sidebar } from '../Sidebar';
import { SupervisorHome } from './SupervisorHome';
import { SemesterManagement } from './SemesterManagement';
import { FacultyManagement } from './FacultyManagement';
import { TimetableManagement } from './TimetableManagement';

const NAV_ITEMS = [
  { id: 'home', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'semesters', label: 'Semesters', icon: <CalendarRange size={16} /> },
  { id: 'faculty', label: 'Faculty & Access', icon: <Users size={16} /> },
  { id: 'timetable', label: 'Timetables', icon: <ClipboardList size={16} /> },
];

interface Props {
  user: User;
  onLogout: () => void;
}

export const SupervisorDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [active, setActive] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (active) {
      case 'home': return <SupervisorHome user={user} onNavigate={setActive} />;
      case 'semesters': return <SemesterManagement />;
      case 'faculty': return <FacultyManagement />;
      case 'timetable': return <TimetableManagement />;
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

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
              <Shield size={15} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900">EduPortal Supervisor</span>
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
