import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarRange, Users, ClipboardList, Menu, X, Shield, BookOpen, GraduationCap, BarChart3
} from 'lucide-react';
import type { User } from '../../types';
import { Sidebar } from '../Sidebar';
import { SupervisorHome } from './SupervisorHome';
import { SemesterManagement } from './SemesterManagement';
import { FacultyManagement } from './FacultyManagement';
import { TimetableManagement } from './TimetableManagement';
import { SubjectManagement } from './SubjectManagement';
import { StudentManagement } from './StudentManagement';
import ReportsDashboard from './ReportsDashboard';

const NAV_ITEMS = [
  { id: 'home', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'semesters', label: 'Semesters', icon: <CalendarRange size={16} /> },
  { id: 'subjects', label: 'Subjects', icon: <BookOpen size={16} /> },
  { id: 'students', label: 'Students', icon: <GraduationCap size={16} /> },
  { id: 'faculty', label: 'Faculty & Access', icon: <Users size={16} /> },
  { id: 'timetable', label: 'Timetables', icon: <ClipboardList size={16} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={16} /> },
];

interface Props {
  user: User;
  onLogout: () => void;
}

export const SupervisorDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathSection = location.pathname.split('/')[2];
  const active = pathSection === 'dashboard' || !pathSection || !NAV_ITEMS.some((item) => item.id === pathSection)
    ? 'home'
    : pathSection;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigateTo = (id: string) => {
    navigate(`/supervisor/${id === 'home' ? 'dashboard' : id}`);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setMobileMenuOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const renderContent = () => {
    switch (active) {
      case 'home': return <SupervisorHome user={user} onNavigate={navigateTo} />;
      case 'semesters': return <SemesterManagement />;
      case 'subjects': return <SubjectManagement />;
      case 'students': return <StudentManagement />;
      case 'faculty': return <FacultyManagement />;
      case 'timetable': return <TimetableManagement />;
      case 'reports': return <ReportsDashboard />;
      default: return null;
    }
  };

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden" style={{ background: '#f0f4f8' }}>
      <Sidebar
        user={user}
        items={NAV_ITEMS}
        active={active}
        onNavigate={navigateTo}
        onLogout={onLogout}
      />

      {/* Mobile nav */}
      <div className={`fixed inset-0 z-50 md:hidden flex transition-all duration-300 ${
        mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className={`w-[min(18rem,85vw)] transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar
            user={user}
            items={NAV_ITEMS}
            active={active}
            onNavigate={navigateTo}
            onLogout={onLogout}
            className="flex h-dvh max-h-dvh w-full flex-col overflow-y-auto"
          />
        </div>
        <button type="button" aria-label="Close navigation menu" className="flex-1 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex min-h-0 min-w-0 w-full flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-3 py-2.5 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
              <Shield size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <span className="block font-semibold text-gray-900">EduPortal Supervisor</span>
              <span className="block text-xs text-gray-500 truncate">{NAV_ITEMS.find((item) => item.id === active)?.label}</span>
            </div>
          </div>
          <button 
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)} 
            className="text-gray-600 active:scale-90 transition-transform duration-150 p-2 rounded-xl hover:bg-gray-50 active:bg-gray-100"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div key={active} className="dashboard-scroll flex-1 min-h-0 p-3 sm:p-6 md:p-8 animate-fade-in">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};
