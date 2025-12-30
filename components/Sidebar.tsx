
import React, { useState } from 'react';
import { LayoutDashboard, Users, GraduationCap, Calendar, MessageSquare, Settings } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { PasswordModal } from './PasswordModal';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen }) => {
  const { schoolName } = useData();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'classes', label: 'Classes', icon: GraduationCap },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'attendance', label: 'Attendance Log', icon: Calendar },
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'settings') {
      setIsMobileOpen(false);
      setIsPasswordOpen(true);
    } else {
      setActiveTab(id);
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      <PasswordModal 
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        onSuccess={() => setActiveTab('settings')}
        title="Admin Settings"
      />

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-[50] bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`fixed lg:static inset-y-0 left-0 z-[60] w-64 bg-white border-r border-slate-100 shadow-xl lg:shadow-none transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) lg:transform-none ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center h-20 px-6 border-b border-slate-50">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-200">
             <span className="text-white font-black text-lg leading-none">M</span>
          </div>
          <span className="text-lg font-black text-slate-800 truncate tracking-tight">{schoolName.split(' ')[0]} Connect</span>
        </div>
        
        <nav className="p-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center w-full px-4 py-3.5 text-sm font-bold rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
