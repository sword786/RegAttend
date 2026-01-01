
import React from 'react';
import { LayoutDashboard, Users, GraduationCap, Calendar, MessageSquare, Settings, Cloud, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen }) => {
  const { schoolName, syncInfo, forceSync } = useData();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'classes', label: 'Classes', icon: GraduationCap },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'attendance', label: 'Attendance Log', icon: Calendar },
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-[50] bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`fixed lg:static inset-y-0 left-0 z-[60] w-64 bg-white border-r border-slate-100 shadow-xl lg:shadow-none transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) lg:transform-none ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
            <div className="flex items-center h-20 px-6 border-b border-slate-50 shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-200">
                    <span className="text-white font-black text-lg leading-none">M</span>
                </div>
                <span className="text-lg font-black text-slate-800 truncate tracking-tight">{schoolName.split(' ')[0]} Connect</span>
            </div>
            
            <nav className="p-4 space-y-2 mt-4 flex-1 overflow-y-auto scrollbar-hide">
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

            {/* REAL-TIME SYNC FOOTER */}
            {syncInfo.isPaired && (
                <div className="p-4 border-t border-slate-50 bg-slate-50/50">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                    syncInfo.connectionState === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' :
                                    syncInfo.connectionState === 'SYNCING' ? 'bg-blue-500 animate-spin' :
                                    syncInfo.connectionState === 'ERROR' ? 'bg-rose-500' : 'bg-slate-300'
                                }`}></div>
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                    {syncInfo.connectionState === 'SYNCING' ? 'Updating...' : 'Real-time Cloud'}
                                </span>
                            </div>
                            <button 
                                onClick={() => forceSync()}
                                className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                                title="Force Refresh"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncInfo.connectionState === 'SYNCING' ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                            <div className="flex items-center gap-1.5 truncate">
                                <Cloud className="w-3 h-3 shrink-0" />
                                <span className="truncate">ID: {syncInfo.schoolId?.slice(-6) || 'N/A'}</span>
                            </div>
                            {syncInfo.connectionState === 'ERROR' && <AlertCircle className="w-3 h-3 text-rose-500" />}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </>
  );
};
