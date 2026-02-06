import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TimetableGrid } from './components/TimetableGrid';
import { AttendanceModal } from './components/AttendanceModal';
import { ScheduleEditorModal } from './components/ScheduleEditorModal';
import { Assistant } from './components/Assistant';
import { Settings } from './components/Settings';
import { AttendanceReport } from './components/AttendanceReport';
import { DashboardHome } from './components/DashboardHome';
import { Menu, Search, Pencil, Eye, LayoutGrid, ChevronDown, GraduationCap, Users, ShieldCheck, Sparkles, LogOut, ChevronRight, Palette, Wifi, AlertCircle, Monitor } from 'lucide-react';
import { TimetableEntry, UserRole } from './types';
import { DataProvider, useData } from './contexts/DataContext';

const RoleSelector: React.FC = () => {
  const { setUserRole, importSyncToken, primaryColor } = useData();
  const [pairingToken, setPairingToken] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  const handleJoinStaff = async () => {
    if (!pairingToken.trim()) {
        setError("Please enter the pairing code from your administrator.");
        return;
    }
    if (!teacherName.trim()) {
        setError("Please enter your name to identify this device.");
        return;
    }
    setIsSyncing(true);
    setError('');
    const success = await importSyncToken(pairingToken, teacherName.trim());
    if (success) {
        setUserRole('TEACHER');
    } else {
        setError("Invalid code. Check with your Admin.");
        setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-y-auto scrollbar-hide">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -right-[20%] w-[100%] h-[100%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse"></div>
            <div className="absolute -bottom-[20%] -left-[20%] w-[80%] h-[80%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 relative z-10 py-12 items-center">
            {/* Left Column */}
            <div className="flex flex-col justify-center space-y-8 lg:space-y-12 text-center lg:text-left">
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    <div className="w-20 h-20 lg:w-32 lg:h-32 rounded-[2rem] lg:rounded-[3rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 shrink-0" style={{ backgroundColor: primaryColor }}>
                        <span className="text-white font-black text-4xl lg:text-6xl">M</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tighter uppercase leading-none">Mupini Connect</h1>
                        <p className="text-blue-400 font-black uppercase tracking-[0.4em] text-[10px] lg:text-sm mt-3 lg:mt-5 opacity-80">Unified Core OS • v2.5</p>
                    </div>
                </div>
                
                <div className="space-y-6">
                    <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-100 leading-tight tracking-tight">Your digital school workspace is ready.</h2>
                    <p className="text-slate-400 text-base sm:text-lg lg:text-2xl leading-relaxed max-w-lg mx-auto lg:mx-0 font-medium opacity-80">
                        Centralize attendance, streamline timetables, and empower staff with real-time school synchronization.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest"><Sparkles className="w-3 h-3 text-blue-500" /> AI Powered</div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest"><Wifi className="w-3 h-3 text-emerald-500" /> Real-time Sync</div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest"><ShieldCheck className="w-3 h-3 text-orange-500" /> Encrypted</div>
                </div>
            </div>

            {/* Right Column: Role Selection */}
            <div className="space-y-8">
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 sm:p-12 rounded-[3.5rem] lg:rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em] mb-10 flex items-center gap-4 justify-center lg:justify-start opacity-50">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Access Protocol Selection
                    </h3>
                    
                    <div className="space-y-6">
                        <button 
                            onClick={() => setUserRole('ADMIN')}
                            className="group w-full flex items-center gap-6 p-6 sm:p-8 bg-white hover:bg-slate-50 rounded-[2.5rem] transition-all duration-500 text-left shadow-2xl hover:translate-y-[-6px] active:scale-[0.98]"
                        >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 text-white rounded-[1.75rem] flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-lg">
                                <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xl sm:text-3xl font-black text-slate-900 leading-none">School Host</div>
                                <div className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 flex items-center">Administrative Authority <ChevronRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-all" /></div>
                            </div>
                        </button>

                        <div className="p-8 sm:p-10 bg-slate-800/40 rounded-[3rem] border border-white/10 space-y-8 shadow-inner">
                            <div className="flex items-center gap-6 text-left">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.75rem] flex items-center justify-center text-white shrink-0 shadow-2xl" style={{ backgroundColor: primaryColor }}>
                                    <Users className="w-8 h-8 sm:w-10 sm:h-10" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xl sm:text-3xl font-black text-white leading-none">Join Staff</div>
                                    <div className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mt-3">Pair with institution cloud</div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    placeholder="Your Name (e.g. Mr. Smith)" 
                                    value={teacherName}
                                    onChange={e => setTeacherName(e.target.value)}
                                    className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 text-white text-xs font-bold outline-none focus:ring-4 transition-all placeholder:text-slate-600 focus:bg-slate-900"
                                    style={{ '--tw-ring-color': primaryColor + '40' } as React.CSSProperties}
                                />
                                <div className="relative">
                                    <input 
                                        type="password" 
                                        placeholder="Enter Staff Token..." 
                                        value={pairingToken}
                                        onChange={e => setPairingToken(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 text-white text-xs font-mono outline-none focus:ring-4 transition-all placeholder:text-slate-600 focus:bg-slate-900"
                                        style={{ '--tw-ring-color': primaryColor + '40' } as React.CSSProperties}
                                    />
                                    {error && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-3 px-1 flex items-center gap-2"><AlertCircle className="w-3 h-3" /> {error}</p>}
                                </div>
                                <button 
                                    onClick={handleJoinStaff}
                                    disabled={isSyncing}
                                    className="w-full py-5 sm:py-6 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl disabled:opacity-30 flex items-center justify-center gap-4 hover:brightness-110 transition-all active:scale-[0.98]"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {isSyncing ? (
                                        <><Sparkles className="w-5 h-5 animate-spin" /> Authenticating...</>
                                    ) : (
                                        'Initialise Link'
                                    )}
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={() => setUserRole('STANDALONE')}
                            className="group w-full flex items-center gap-6 p-6 sm:p-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[2.5rem] transition-all text-left hover:translate-y-[-4px] active:scale-[0.98]"
                        >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 text-white rounded-[1.75rem] flex items-center justify-center group-hover:bg-slate-700 shrink-0">
                                <Monitor className="w-8 h-8 sm:w-10 sm:h-10" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xl sm:text-3xl font-black text-white leading-none">Isolated Hub</div>
                                <div className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mt-3">Local environment storage</div>
                            </div>
                        </button>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] opacity-40">Secure School Core • Mupini Combined</p>
                </div>
            </div>
        </div>
    </div>
  );
};

const DashboardContent: React.FC = () => {
  const { entities, updateSchedule, schoolName, userRole, primaryColor, logout } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  const isAdmin = userRole === 'ADMIN' || userRole === 'STANDALONE';

  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean; day: string; period: number; entry: TimetableEntry | null; entityId: string;
  }>({ isOpen: false, day: '', period: 0, entry: null, entityId: '' });

  const [editorModal, setEditorModal] = useState<{
    isOpen: boolean; day: string; period: number; entry: TimetableEntry | null;
  }>({ isOpen: false, day: '', period: 0, entry: null });

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

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSelectedEntityId('');
    setIsMobileOpen(false);
  };

  const handleSlotClick = (day: string, period: number, entry: TimetableEntry | null) => {
    if (isEditMode && isAdmin) {
      setEditorModal({ isOpen: true, day, period, entry });
    } else if (entry && selectedEntityId) {
      setAttendanceModal({ isOpen: true, day, period, entry, entityId: selectedEntityId });
    }
  };

  const handleDashboardSessionClick = (entityId: string, day: string, period: number, entry: TimetableEntry) => {
    setAttendanceModal({ isOpen: true, day, period, entry, entityId });
  };

  const handleScheduleSave = (entry: TimetableEntry | null) => {
    if (selectedEntityId && isAdmin) {
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
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-4 border-slate-100 border-dashed animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-10"><LayoutGrid className="w-12 h-12 text-slate-200" /></div>
                <h3 className="text-3xl font-black text-slate-800 uppercase tracking-widest text-center">Timetable Infrastructure Missing</h3>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Generate your first roster in the settings panel</p>
                {isAdmin && <button onClick={() => setActiveTab('settings')} className="mt-14 px-12 py-5 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:scale-105 transition-all" style={{ backgroundColor: primaryColor }}>Initialise Registry</button>}
            </div>
          );
        }

        const type = activeTab === 'classes' ? 'CLASS' : 'TEACHER';
        const filteredEntities = entities.filter(e => e.type === type && e.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex-1 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder={`Search ${activeTab}...`} 
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base outline-none font-black text-slate-800 focus:ring-4 transition-all focus:bg-white"
                        style={{ '--tw-ring-color': primaryColor + '10' } as React.CSSProperties}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="md:hidden relative">
                    <select 
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none appearance-none"
                    >
                        {filteredEntities.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.shortCode})</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>

                {isAdmin && (
                    <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0">
                        <button onClick={() => setIsEditMode(false)} className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest ${!isEditMode ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Eye className="w-4 h-4" /> Inspect
                        </button>
                        <button onClick={() => setIsEditMode(true)} className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest ${isEditMode ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Pencil className="w-4 h-4" /> Edit
                        </button>
                    </div>
                )}
             </div>

             <div className="flex gap-8 items-start">
                <div className="w-80 bg-white border border-slate-100 rounded-[3rem] shadow-sm hidden md:flex flex-col shrink-0 self-stretch overflow-hidden">
                    <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{activeTab} Registry</span>
                    </div>
                    <div className="max-h-[700px] overflow-y-auto scrollbar-hide p-2 space-y-1">
                      {filteredEntities.map(e => (
                          <button 
                            key={e.id} 
                            onClick={() => setSelectedEntityId(e.id)} 
                            className={`w-full text-left p-6 rounded-[1.75rem] transition-all group relative overflow-hidden ${selectedEntityId === e.id ? 'bg-slate-900 shadow-xl' : 'hover:bg-slate-50'}`}
                          >
                              <div className={`text-base font-black transition-colors ${selectedEntityId === e.id ? 'text-white' : 'text-slate-700'}`}>{e.name}</div>
                              <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 transition-colors ${selectedEntityId === e.id ? 'text-blue-300' : 'text-slate-400'}`}>Node Code: {e.shortCode || '??'}</div>
                          </button>
                      ))}
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden p-1">
                    {selectedEntity ? (
                        <TimetableGrid data={selectedEntity} onSlotClick={handleSlotClick} isEditing={isEditMode} />
                    ) : (
                        <div className="py-48 flex flex-col items-center justify-center text-center px-12">
                             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-8"><LayoutGrid className="w-10 h-10 text-slate-100" /></div>
                             <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.4em]">Initialize profile selection</p>
                        </div>
                    )}
                </div>
             </div>
          </div>
        );
      case 'attendance':
        return <AttendanceReport />;
      case 'assistant':
        return isAdmin ? <Assistant /> : null;
      case 'settings':
        return isAdmin ? <Settings /> : null;
      default:
        return <div>Tab Not Found</div>;
    }
  };

  if (!userRole) return <RoleSelector />;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-gray-900 font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white lg:rounded-tl-[4rem] border-t lg:border-l border-slate-100 overflow-hidden relative shadow-[0_0_100px_-20px_rgba(15,23,42,0.1)]">
        <header className="h-20 sm:h-24 shrink-0 flex items-center justify-between px-6 sm:px-12 border-b border-slate-50 bg-white/90 backdrop-blur-xl sticky top-0 z-40">
           <div className="flex items-center gap-6 min-w-0">
              <button onClick={() => setIsMobileOpen(true)} className="p-3 lg:hidden hover:bg-slate-50 rounded-2xl transition-all shrink-0">
                 <Menu className="w-6 h-6 text-slate-600" />
              </button>
              <div className="flex flex-col min-w-0 overflow-hidden">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2 truncate">
                  {activeTab === 'dashboard' ? 'Live Overview' : activeTab.replace('-', ' ')}
                </h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: userRole === 'ADMIN' ? '#ef4444' : primaryColor }}></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] truncate">
                    {schoolName} • Node Protocol {userRole}
                  </p>
                </div>
              </div>
           </div>
           
           <div className="flex items-center gap-4 shrink-0">
              <button 
                type="button"
                onClick={logout}
                className="flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all border border-slate-100 shadow-sm active:scale-95 group"
              >
                <LogOut className="w-4 h-4 group-hover:text-rose-500 transition-colors" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 sm:p-12 bg-slate-50/30 relative">
           <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none"></div>
           <div className="max-w-7xl mx-auto relative z-10">
              {renderActiveTab()}
           </div>
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

        {editorModal.isOpen && isAdmin && (
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