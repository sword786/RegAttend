
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

const DashboardLayout: React.FC = () => {
  const { entities, updateSchedule, academicYear } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  // Auto-select first item when tab changes
  useEffect(() => {
    if ((activeTab === 'classes' || activeTab === 'teachers') && entities.length > 0) {
        const type = activeTab === 'classes' ? 'CLASS' : 'TEACHER';
        const filtered = entities.filter(e => e.type === type);
        
        // If current selection is invalid for new tab, select first available
        const currentSelectionValid = filtered.find(e => e.id === selectedEntityId);
        if (!currentSelectionValid && filtered.length > 0) {
            setSelectedEntityId(filtered[0].id);
        } else if (filtered.length === 0) {
            setSelectedEntityId('');
        }
    }
  }, [activeTab, entities, selectedEntityId]);

  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean; day: string; period: number; entry: TimetableEntry | null;
  }>({ isOpen: false, day: '', period: 0, entry: null });

  const [editorModal, setEditorModal] = useState<{
    isOpen: boolean; day: string; period: number; entry: TimetableEntry | null;
  }>({ isOpen: false, day: '', period: 0, entry: null });

  const handleSlotClick = (day: string, period: number, entry: TimetableEntry | null) => {
    if (isEditMode) {
        setEditorModal({ isOpen: true, day, period, entry });
    } else if (entry) {
        setAttendanceModal({ isOpen: true, day, period, entry });
    }
  };

  const handleScheduleSave = (entry: TimetableEntry | null) => {
    if (selectedEntityId) {
        updateSchedule(selectedEntityId, editorModal.day, editorModal.period, entry);
    }
  };

  const selectedEntity = entities.find(d => d.id === selectedEntityId);
  const listData = entities.filter(d => 
    (activeTab === 'classes' ? d.type === 'CLASS' : d.type === 'TEACHER') &&
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPageTitle = () => {
      switch (activeTab) {
          case 'dashboard': return 'Live Overview';
          case 'assistant': return 'AI Assistant';
          case 'settings': return 'System Settings';
          case 'attendance': return 'Attendance Reports';
          default: return activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      }
  };

  const getPlaceholderIcon = () => {
      if (activeTab === 'teachers') return <Users className="w-8 h-8 text-slate-300 mb-3" />;
      return <BookUser className="w-8 h-8 text-slate-300 mb-3" />;
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-gray-900 font-sans">
      <PasswordModal 
        isOpen={isPasswordOpen} 
        onClose={() => setIsPasswordOpen(false)} 
        onSuccess={() => setIsEditMode(true)}
        title="Admin Mode"
      />

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Responsive Navbar */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-40 shrink-0 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 -ml-1 text-slate-600 rounded-lg lg:hidden hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="flex flex-col">
                <h1 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wider">
                  {getPageTitle()}
                </h1>
                {selectedEntity && (activeTab === 'classes' || activeTab === 'teachers') && (
                    <span className="text-[10px] font-bold text-blue-600 sm:hidden truncate max-w-[150px]">
                        {selectedEntity.name}
                    </span>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="hidden sm:flex items-center text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-widest border border-slate-200">
                AY {academicYear}
             </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-hidden p-3 sm:p-4 lg:p-6 flex flex-col">
          {activeTab === 'dashboard' ? (
              <DashboardHome />
          ) : activeTab === 'assistant' ? (
            <Assistant />
          ) : activeTab === 'settings' ? (
            <div className="h-full overflow-y-auto scrollbar-hide">
                <Settings />
            </div>
          ) : activeTab === 'attendance' ? (
             <AttendanceReport />
          ) : (
            <div className="flex flex-col h-full gap-4 sm:gap-6 min-w-0">
              
              {/* Adaptive Controls Bar */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                {/* Search */}
                <div className="flex-1 relative max-w-md">
                    <Search className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        className="block w-full pl-9 pr-3 py-2.5 border-none rounded-xl text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium"
                        placeholder={`Search ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                {/* Dropdown Selector */}
                <div className="relative min-w-[200px] md:w-64">
                    <div className="absolute inset-y-0 right-3 my-auto h-4 w-4 pointer-events-none flex items-center justify-center">
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
                        className="block w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-100 outline-none appearance-none cursor-pointer hover:border-blue-200 transition-colors shadow-sm"
                        disabled={listData.length === 0}
                    >
                        {listData.length > 0 ? (
                            listData.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} {item.shortCode ? `(${item.shortCode})` : ''}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>No {activeTab} found</option>
                        )}
                    </select>
                </div>
              </div>

              {/* Responsive Timetable Area */}
              {selectedEntity ? (
                  <div className="flex-1 flex flex-col rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden min-h-0">
                      <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest hidden sm:inline">{selectedEntity.name} Schedule</span>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest sm:hidden">Timetable</span>
                        </div>
                        <button 
                            onClick={() => isEditMode ? setIsEditMode(false) : setIsPasswordOpen(true)}
                            className={`flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                isEditMode 
                                ? 'bg-orange-500 text-white shadow-sm' 
                                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {isEditMode ? <><Pencil className="w-3 h-3 mr-2" /> Editing</> : <><Eye className="w-3 h-3 mr-2" /> View Only</>}
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
                        <TimetableGrid 
                            data={selectedEntity} 
                            onSlotClick={handleSlotClick} 
                            isEditing={isEditMode}
                        />
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center mx-4 mb-4">
                      <div className="bg-slate-50 p-4 rounded-full mb-4">
                          {getPlaceholderIcon()}
                      </div>
                      <h3 className="text-slate-700 font-bold text-lg mb-1">No Selection</h3>
                      <p className="text-slate-400 text-sm max-w-xs mx-auto">
                          Select a {activeTab === 'classes' ? 'Class' : 'Teacher'} from the dropdown above to view their timetable.
                      </p>
                  </div>
              )}
            </div>
          )}
        </main>
      </div>

      {attendanceModal.isOpen && attendanceModal.entry && selectedEntity && (
        <AttendanceModal
          isOpen={attendanceModal.isOpen}
          onClose={() => setAttendanceModal({ ...attendanceModal, isOpen: false })}
          day={attendanceModal.day}
          period={attendanceModal.period}
          entry={attendanceModal.entry}
          entityId={selectedEntity.id}
          classNameOrTeacherName={selectedEntity.name}
        />
      )}

      {editorModal.isOpen && selectedEntity && (
        <ScheduleEditorModal
          isOpen={editorModal.isOpen}
          onClose={() => setEditorModal({ ...editorModal, isOpen: false })}
          onSave={handleScheduleSave}
          day={editorModal.day}
          period={editorModal.period}
          currentEntry={editorModal.entry}
          entityName={selectedEntity.name}
          entityType={selectedEntity.type}
        />
      )}
    </div>
  );
};

const App: React.FC = () => <DataProvider><DashboardLayout /></DataProvider>;
export default App;
