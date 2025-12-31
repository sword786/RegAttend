
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TimetableGrid } from './components/TimetableGrid';
import { AttendanceModal } from './components/AttendanceModal';
import { ScheduleEditorModal } from './components/ScheduleEditorModal';
import { Assistant } from './components/Assistant';
import { Settings } from './components/Settings';
import { AttendanceReport } from './components/AttendanceReport';
import { DashboardHome } from './components/DashboardHome';
import { PasswordModal } from './components/PasswordModal';
import { Menu, Search, Filter, Pencil, Eye, LayoutGrid, ChevronDown, BookUser, Users } from 'lucide-react';
import { TimetableEntry } from './types';
import { DataProvider, useData } from './contexts/DataContext';

const DashboardContent: React.FC = () => {
  const { entities, updateSchedule } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean; day: string; period: number; entry: TimetableEntry | null; entityId: string;
  }>({ isOpen: false, day: '', period: 0, entry: null, entityId: '' });

  const [editorModal, setEditorModal] = useState<{
    isOpen: boolean; day: string; period: number; entry: TimetableEntry | null;
  }>({ isOpen: false, day: '', period: 0, entry: null });

  // Handle default selection when tabs change
  useEffect(() => {
    if ((activeTab === 'classes' || activeTab === 'teachers') && entities.length > 0) {
      const type = activeTab === 'classes' ? 'CLASS' : 'TEACHER';
      const filtered = entities.filter(e => e.type === type);
      const currentSelectionValid = filtered.find(e => e.id === selectedEntityId);
      
      if (!currentSelectionValid && filtered.length > 0) {
        setSelectedEntityId(filtered[0].id);
      } else if (filtered.length === 0) {
        setSelectedEntityId('');
      }
    }
  }, [activeTab, entities, selectedEntityId]);

  const handleSlotClick = (day: string, period: number, entry: TimetableEntry | null) => {
    if (isEditMode) {
      setEditorModal({ isOpen: true, day, period, entry });
    } else if (entry && selectedEntityId) {
      setAttendanceModal({ isOpen: true, day, period, entry, entityId: selectedEntityId });
    }
  };

  const handleDashboardSessionClick = (entityId: string, day: string, period: number, entry: TimetableEntry) => {
    setAttendanceModal({ isOpen: true, day, period, entry, entityId });
  };

  const handleScheduleSave = (entry: TimetableEntry | null) => {
    if (selectedEntityId) {
      updateSchedule(selectedEntityId, editorModal.day, editorModal.period, entry);
    }
  };

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome onSessionClick={handleDashboardSessionClick} />;
      case 'classes':
      case 'teachers':
        if (entities.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-center p-10 bg-white rounded-3xl border border-slate-100 border-dashed">
                <LayoutGrid className="w-16 h-16 text-slate-200 mb-6" />
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest">No Timetables Found</h3>
                <p className="text-slate-400 text-xs mt-3 font-bold uppercase tracking-widest max-w-xs mx-auto">Upload or create a schedule in the settings tab to begin recording attendance</p>
                <button 
                  onClick={() => setActiveTab('settings')} 
                  className="mt-10 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.05] transition-all"
                >
                  Configure System
                </button>
            </div>
          );
        }

        const type = activeTab === 'classes' ? 'CLASS' : 'TEACHER';
        const filteredEntities = entities.filter(e => e.type === type && e.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return (
          <div className="flex flex-col h-full gap-5">
             <div className="flex items-center gap-4 bg-white p-2.5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={`Find ${activeTab}...`} 
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold focus:ring-2 focus:ring-blue-100 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                   <button 
                    onClick={() => setIsEditMode(false)} 
                    title="View Mode"
                    className={`p-2.5 rounded-lg transition-all ${!isEditMode ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     <Eye className="w-4.5 h-4.5" />
                   </button>
                   <button 
                    onClick={() => isEditMode ? setIsEditMode(false) : setIsPasswordOpen(true)} 
                    title="Edit Mode"
                    className={`p-2.5 rounded-lg transition-all ${isEditMode ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     <Pencil className="w-4.5 h-4.5" />
                   </button>
                </div>
             </div>

             <div className="flex flex-1 gap-5 overflow-hidden">
                <div className="w-72 bg-white border border-slate-100 rounded-[2rem] overflow-y-auto scrollbar-hide shadow-sm hidden md:flex flex-col">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab} Registry</span>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                      {filteredEntities.map(e => (
                          <button 
                            key={e.id} 
                            onClick={() => setSelectedEntityId(e.id)} 
                            className={`w-full text-left p-5 border-b border-slate-50 transition-all group ${selectedEntityId === e.id ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50'}`}
                          >
                              <div className={`text-sm font-black transition-colors ${selectedEntityId === e.id ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-600'}`}>{e.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{e.shortCode || '??'}</div>
                          </button>
                      ))}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden bg-white rounded-[2rem] border border-slate-100 shadow-sm relative">
                    {selectedEntity ? (
                        <TimetableGrid data={selectedEntity} onSlotClick={handleSlotClick} isEditing={isEditMode} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10">
                             <LayoutGrid className="w-16 h-16 text-slate-100 mb-4" />
                             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Select an entity to view schedule</p>
                        </div>
                    )}
                </div>
             </div>
          </div>
        );
      case 'attendance':
        return <AttendanceReport />;
      case 'assistant':
        return <Assistant />;
      case 'settings':
        return <Settings />;
      default:
        return <div>Tab Not Found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-gray-900 font-sans">
      <PasswordModal 
        isOpen={isPasswordOpen} 
        onClose={() => setIsPasswordOpen(false)} 
        onSuccess={() => setIsEditMode(true)}
        title="Admin Authentication"
      />

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white lg:rounded-tl-[3.5rem] border-t lg:border-l border-slate-100 overflow-hidden relative shadow-2xl shadow-slate-200">
        <header className="h-20 shrink-0 flex items-center justify-between px-8 border-b border-slate-50 bg-white/80 backdrop-blur-md sticky top-0 z-40">
           <div className="flex items-center gap-6">
              <button onClick={() => setIsMobileOpen(true)} className="p-2.5 lg:hidden hover:bg-slate-50 rounded-2xl transition-colors">
                 <Menu className="w-6 h-6 text-slate-600" />
              </button>
              <div className="flex flex-col">
                <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                  {activeTab === 'dashboard' ? 'Live Overview' : activeTab.replace('-', ' ')}
                </h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mupini Connect • 2025 Academic System</p>
                </div>
              </div>
           </div>
        </header>

        {/* This container is now the primary scroll area for all tabs */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 sm:p-8 lg:p-10 bg-slate-50/30">
           {renderActiveTab()}
        </div>

        {attendanceModal.isOpen && attendanceModal.entry && (
          <AttendanceModal 
            isOpen={attendanceModal.isOpen}
            onClose={() => setAttendanceModal({ ...attendanceModal, isOpen: false })}
            day={attendanceModal.day}
            period={attendanceModal.period}
            entry={attendanceModal.entry}
            entityId={attendanceModal.entityId}
            classNameOrTeacherName=""
          />
        )}

        {editorModal.isOpen && (
          <ScheduleEditorModal 
            isOpen={editorModal.isOpen}
            onClose={() => setEditorModal({ ...editorModal, isOpen: false })}
            onSave={handleScheduleSave}
            day={editorModal.day}
            period={editorModal.period}
            currentEntry={editorModal.entry}
            entityName={selectedEntity?.name || ''}
            entityType={selectedEntity?.type || 'CLASS'}
          />
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <DashboardContent />
    </DataProvider>
  );
};

export default App;
