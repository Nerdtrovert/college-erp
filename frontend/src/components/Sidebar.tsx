import React from 'react';
import { BookOpen, LogOut, ChevronRight } from 'lucide-react';
import type { User } from '../types';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  id: string;
}

interface Props {
  user: User;
  items: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  className?: string;
}

export const Sidebar: React.FC<Props> = ({ user, items, active, onNavigate, onLogout, className = "hidden md:flex flex-col w-64 h-screen sticky top-0" }) => {
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <aside
      className={className}
      style={{ background: '#0f1e3c' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} className="text-white" />
        </div>
        <div>
          <div className="text-white font-semibold text-sm leading-tight">EduPortal</div>
          <div className="text-white/40 text-xs">{user.role === 'student' ? 'Student' : 'Faculty'} Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left group ${
              active === item.id
                ? 'bg-blue-600 text-white'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className={active === item.id ? 'text-white' : 'text-white/50 group-hover:text-white'}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            <ChevronRight 
              size={14} 
              className={`transition-all duration-150 ${
                active === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              }`}
            />
          </button>
        ))}
      </nav>

      {/* User card */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">{user.name}</div>
            <div className="text-white/40 text-xs truncate">{user.id}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 text-sm"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
};