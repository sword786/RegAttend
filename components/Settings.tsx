
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Trash2, Plus, FileText, Sparkles, Loader2, FileUp, Check, X, Upload, 
  AlertCircle, ArrowRight, Pencil, Clock, Key, ExternalLink, Save, 
  Download, RotateCcw, UserPlus, Layers, Users, GraduationCap, 
  FileCheck, ShieldAlert, ArrowLeft, Settings as SettingsIcon, ChevronRight,
  Cloud, CloudOff, RefreshCw, Smartphone, Copy, Monitor, ShieldCheck, UserMinus, Zap
} from 'lucide-react';
import { EntityProfile, TimeSlot, PairedDevice } from '../types';

type SettingsTab = 'menu' | 'general' | 'timetable' | 'teachers' | 'classes' | 'students' | 'import' | 'sync';

export const Settings: React.FC = () => {
  const { 
    schoolName, updateSchoolName, 
    academicYear, updateAcademicYear,
    entities, addEntity, deleteEntity, updateEntity,
    students, addStudent, deleteStudent,
    timeSlots, updateTimeSlots,
    resetData,
    aiImportStatus, aiImportResult, aiImportErrorMessage, startAiImport, cancelAiImport, finalizeAiImport,
    syncInfo, pairedDevices, generatePairCode, joinSchool, disconnectSync, removeDevice
  } = useData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('menu');
  const [hasCustomKey, setHasCustomKey] = useState(false);
  
  // Pairing Logic States
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showPairCode, setShowPairCode] = useState(false);

  // Staging Files
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [classFile, setClassFile] = useState<File | null>(null);

  const teacherFileInputRef = useRef<HTMLInputElement>(null);
  const classFileInputRef = useRef<HTMLInputElement>(null);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Yes, Delete") => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText
    });
  };

  // Student Management State
  const [bulkStudentInput, setBulkStudentInput] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Entity Management State
  const [isAddingEntity, setIsAddingEntity] = useState<'TEACHER' | 'CLASS' | null>(null);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityCode, setNewEntityCode] = useState('');
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  
  const classes = useMemo(() => entities.filter(e => e.type === 'CLASS'), [entities]);

  useEffect(() => {
    const checkKey = async () => {
        // @ts-ignore
        const exists = await window.aistudio.hasSelectedApiKey();
        setHasCustomKey(exists);
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (activeTab === 'students' && !targetClassId && classes.length > 0) {
        setTargetClassId(classes[0].id);
    }
  }, [activeTab, classes, targetClassId]);

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasCustomKey(true);
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const handleJoinSchool = async () => {
    if (!pairingCodeInput.trim() || pairingCodeInput.length !== 6) {
        setJoinError("Please enter a valid 6-digit code.");
        return;
    }
    setIsJoining(true);
    setJoinError(null);
    const success = await joinSchool(pairingCodeInput);
    setIsJoining(false);
    if (success) {
        setPairingCodeInput('');
        triggerConfirm("Successfully Joined!", "You are now live-synced with the master school timetable.", () => {}, "Got it");
    } else {
        setJoinError("Pair code not found or invalid.");
    }
  };

  const handleGenerateCode = () => {
    const code = generatePairCode();
    setShowPairCode(true);
  };

  const handleStartProcessing = () => {
      const files: { file: File, label: 'TEACHER' | 'CLASS' }[] = [];
      if (teacherFile) files.push({ file: teacherFile, label: 'TEACHER' });
      if (classFile) files.push({ file: classFile, label: 'CLASS' });
      
      if (files.length < 2) {
          alert("Please upload BOTH Teacher and Class timetables for accurate extraction.");
          return;
      }
      startAiImport(files);
  };

  const handleAddEntity = (type: 'TEACHER' | 'CLASS') => {
    if (!newEntityName.trim()) return;
    let finalCode = newEntityCode.trim().toUpperCase() || newEntityName.trim().substring(0, 3).toUpperCase();
    addEntity({
      id: `${type.toLowerCase()}-${Date.now()}`,
      name: newEntityName.trim(),
      shortCode: finalCode,
      type,
      schedule: {} as any
    });
    setNewEntityName('');
    setNewEntityCode('');
    setIsAddingEntity(null);
  };

  const startEditing = (entity: EntityProfile) => {
    setEditingId(entity.id);
    setEditName(entity.name);
    setEditCode(entity.shortCode || '');
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) {
        updateEntity(editingId, { 
            name: editName.trim(), 
            shortCode: editCode.trim().toUpperCase() 
        });
        setEditingId(null);
    }
  };

  const handleBulkImportStudents = () => {
    if (!targetClassId || !bulkStudentInput.trim()) return;
    const lines = bulkStudentInput.split('\n');
    let count = 0;
    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(',');
      const name = parts[0].trim();
      const roll = parts.length > 1 ? parts[1].trim() : `R-${Math.floor(Math.random() * 10000)}`;
      if (name) {
        addStudent({
          id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name,
          rollNumber: roll,
          classId: targetClassId
        });
        count++;
      }
    });
    setBulkStudentInput('');
    setImportStatus(`Successfully imported ${count} students.`);
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleAddSingleStudent = () => {
      if (!targetClassId || !newStudentName.trim()) return;
      addStudent({
          id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: newStudentName.trim(),
          rollNumber: newStudentRoll.trim() || `R-${Math.floor(Math.random() * 10000)}`,
          classId: targetClassId
      });
      setNewStudentName('');
      setNewStudentRoll('');
  };

  const handleExportData = () => {
      const data = { schoolName, academicYear, entities, students, timeSlots };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mupini_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const renderEntityList = (type: 'TEACHER' | 'CLASS') => {
    const items = entities.filter(e => e.type === type);
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b bg-slate-50 flex flex-col sm:flex-row gap-6 justify-between sm:items-center">
          <div>
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">{type === 'CLASS' ? 'Class Registry' : 'Teacher Registry'}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage active {type.toLowerCase()} profiles</p>
          </div>
          <button 
            onClick={() => setIsAddingEntity(type)} 
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-4 h-4 mr-2" /> Add {type === 'CLASS' ? 'Class' : 'Teacher'}
          </button>
        </div>
        {isAddingEntity === type && (
            <div className="p-8 bg-blue-50/50 border-b border-blue-100 flex flex-col sm:flex-row gap-4 items-end sm:items-center animate-in slide-in-from-top-4 duration-300">
                <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Full Name</label>
                    <input autoFocus value={newEntityName} onChange={e => setNewEntityName(e.target.value)} placeholder={`e.g. ${type === 'CLASS' ? 'Grade 10A' : 'Mr. Smith'}`} className="w-full p-3 border border-blue-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all" />
                </div>
                <div className="w-full sm:w-40 space-y-2">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Shorthand Code</label>
                    <input value={newEntityCode} onChange={e => setNewEntityCode(e.target.value)} placeholder="e.g. 10A" className="w-full p-3 border border-blue-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsAddingEntity(null)} className="px-5 py-3 bg-white text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
                    <button onClick={() => handleAddEntity(type)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Save</button>
                </div>
            </div>
        )}
        <div className="divide-y divide-slate-100">
          {items.map(item => (
            <div key={item.id} className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/50 transition-colors gap-6">
               {editingId === item.id ? (
                   <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full animate-in fade-in duration-200">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 p-3 border border-blue-300 rounded-xl text-sm font-bold outline-none bg-white shadow-inner focus:ring-4 focus:ring-blue-100" />
                        <input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-full sm:w-32 p-3 border border-blue-300 rounded-xl text-sm font-bold outline-none bg-white shadow-inner focus:ring-4 focus:ring-blue-100" />
                        <div className="flex gap-2">
                             <button onClick={saveEditing} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200"><Check className="w-5 h-5" /></button>
                             <button onClick={() => setEditingId(null)} className="p-3 bg-slate-100 text-slate-500 rounded-xl"><X className="w-5 h-5" /></button>
                        </div>
                   </div>
               ) : (
                   <>
                    <div className="flex items-center gap-6 flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm shrink-0 border border-slate-200 shadow-inner">{item.shortCode || '?'}</div>
                        <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-base">{item.name}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{item.shortCode} Profile</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => startEditing(item)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-5 h-5" /></button>
                        <button onClick={() => triggerConfirm("Delete Registry Entry?", `Are you sure you want to delete ${item.name}?`, () => deleteEntity(item.id))} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                   </>
               )}
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-20 text-center">
              <Users className="w-16 h-16 text-slate-100 mx-auto mb-6" />
              <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No profiles found in this category</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderImportReview = () => {
      if (!aiImportResult) return null;
      return (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
              <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200">
                  <div className="bg-slate-900 p-10 text-white relative">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                      <h2 className="text-2xl font-black uppercase tracking-widest flex items-center relative z-10">
                          <Sparkles className="w-6 h-6 mr-4 text-blue-400" /> Extraction Complete
                      </h2>
                      <p className="text-slate-400 text-xs mt-3 font-bold uppercase tracking-widest relative z-10">
                          AI has processed and cross-referenced your documents. Review before final import.
                      </p>
                  </div>
                  <div className="p-10 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 text-center">
                              <div className="text-4xl font-black text-blue-700 leading-none">{aiImportResult.profiles.filter(p => p.type === 'TEACHER').length}</div>
                              <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mt-3">Teachers Found</div>
                          </div>
                          <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 text-center">
                              <div className="text-4xl font-black text-indigo-700 leading-none">{aiImportResult.profiles.filter(p => p.type === 'CLASS').length}</div>
                              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-3">Classes Found</div>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                          <h4 className="font-black text-slate-700 text-xs uppercase tracking-[0.2em] mb-6">Profiles to be Created</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-3 scrollbar-hide">
                              {aiImportResult.profiles.map((p, i) => (
                                  <div key={i} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-200">
                                      <div className="flex items-center gap-4">
                                          <div className={`p-3 rounded-xl ${p.type === 'TEACHER' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                              {p.type === 'TEACHER' ? <Users className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                                          </div>
                                          <span className="text-sm font-black text-slate-800">{p.name}</span>
                                      </div>
                                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{p.shortCode}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
                          <button onClick={cancelAiImport} className="px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all">Discard Data</button>
                          <button onClick={finalizeAiImport} className="px-10 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.05] transition-all">Merge with System</button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const SettingsMenu = () => (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="flex items-center gap-6">
          <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl shadow-slate-200">
              <SettingsIcon className="w-8 h-8" />
          </div>
          <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">System Settings</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-2">Global configuration & master registries</p>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <MenuCard 
          icon={<RotateCcw className="w-7 h-7" />} 
          title="General Config" 
          description="School name, year, API keys, and data backups"
          onClick={() => setActiveTab('general')}
          color="blue"
        />
        <MenuCard 
          icon={<Cloud className="w-7 h-7" />} 
          title="Sync Center" 
          description="Real-time school pairing and live data sharing"
          onClick={() => setActiveTab('sync')}
          color="indigo"
          highlight={!syncInfo.isPaired}
        />
        <MenuCard 
          icon={<Users className="w-7 h-7" />} 
          title="Teacher Registry" 
          description="Manage faculty staff names and identifier codes"
          onClick={() => setActiveTab('teachers')}
          color="purple"
        />
        <MenuCard 
          icon={<GraduationCap className="w-7 h-7" />} 
          title="Class Registry" 
          description="Setup grade levels, class groups, and sections"
          onClick={() => setActiveTab('classes')}
          color="emerald"
        />
        <MenuCard 
          icon={<UserPlus className="w-7 h-7" />} 
          title="Student Enrollment" 
          description="Import student lists and assign class rosters"
          onClick={() => setActiveTab('students')}
          color="rose"
        />
        <MenuCard 
          icon={<Sparkles className="w-7 h-7" />} 
          title="AI Intelligent Import" 
          description="Auto-digitize PDF and image timetables via Gemini"
          onClick={() => setActiveTab('import')}
          color="amber"
        />
      </div>
    </div>
  );

  const SectionHeader = ({ title, description }: { title: string, description: string }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-100">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setActiveTab('menu')}
          className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm group active:scale-90"
        >
          <ArrowLeft className="w-6 h-6 group-hover:translate-x-[-2px] transition-transform" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">{title}</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">{description}</p>
        </div>
      </div>
    </div>
  );

  if (aiImportStatus === 'REVIEW') return renderImportReview();

  return (
    <div className="max-w-7xl mx-auto min-h-full">
      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-600">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2 leading-none">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed font-bold">{confirmModal.message}</p>
                <div className="flex gap-4">
                    <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                    <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">{confirmModal.confirmText}</button>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'menu' ? (
        <SettingsMenu />
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
          {activeTab === 'general' && (
            <>
              <SectionHeader title="General Config" description="Core system information and data safety" />
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Environment Settings</h3>
                    <div className="flex gap-3">
                        <button onClick={handleExportData} className="px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center transition-all shadow-sm"><Download className="w-4 h-4 mr-2" /> Backup JSON</button>
                        <button onClick={handleSelectKey} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 flex items-center transition-all shadow-xl shadow-slate-200"><Key className="w-4 h-4 mr-2" /> {hasCustomKey ? 'Personal Key Active' : 'Configure API Key'}</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional School Name</label>
                    <input type="text" value={schoolName} onChange={e => updateSchoolName(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl text-base font-black text-slate-700 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Academic Year</label>
                    <input type="text" value={academicYear} onChange={e => updateAcademicYear(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl text-base font-black text-slate-700 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all" />
                  </div>
                </div>
                <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="max-w-md">
                      <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-1">Danger Zone</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Performing a reset will permanently erase all schedules, students, and attendance logs. This action cannot be undone.</p>
                    </div>
                    <button onClick={() => triggerConfirm("Factory Reset System?", "Are you sure? This deletes ALL data including schedules and attendance.", () => resetData())} className="px-8 py-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-rose-100 transition-all active:scale-95"><RotateCcw className="w-4 h-4 mr-2" /> Factory Reset</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'sync' && (
            <>
              <SectionHeader title="Mupini Cloud Sync" description="School-wide data pairing and sharing" />
              <div className="space-y-8">
                  {/* Status Card */}
                  <div className={`p-10 rounded-[3rem] border-2 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 transition-all ${syncInfo.isPaired ? 'bg-indigo-900 border-indigo-500 text-white shadow-2xl shadow-indigo-200' : 'bg-white border-slate-100'}`}>
                      {syncInfo.isPaired && <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>}
                      
                      <div className="flex items-center gap-8 relative z-10 text-center md:text-left flex-col md:flex-row">
                          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all ${syncInfo.isPaired ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {syncInfo.isPaired ? <Zap className="w-10 h-10 fill-white animate-pulse" /> : <CloudOff className="w-10 h-10" />}
                          </div>
                          <div>
                              <h3 className={`text-2xl font-black uppercase tracking-tighter leading-none mb-3 ${syncInfo.isPaired ? 'text-white' : 'text-slate-800'}`}>
                                  {syncInfo.isPaired ? `Live Syncing: ${schoolName}` : 'No Active Pairing'}
                              </h3>
                              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${syncInfo.isPaired ? 'text-indigo-300' : 'text-slate-400'}`}>
                                  {syncInfo.isPaired 
                                    ? `Role: ${syncInfo.role} • Active: Always ON • ID: ${syncInfo.pairCode}` 
                                    : 'Your data is currently local-only and not shared.'}
                              </p>
                          </div>
                      </div>

                      <div className="flex gap-4 relative z-10 w-full md:w-auto">
                          {syncInfo.isPaired ? (
                              <div className="flex items-center gap-4 bg-white/10 px-6 py-4 rounded-[2rem] border border-white/10">
                                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></div>
                                  <span className="text-[11px] font-black uppercase tracking-widest text-white">Streaming Live</span>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100">
                                  <ShieldAlert className="w-4 h-4" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Safe & Private</span>
                              </div>
                          )}
                      </div>
                  </div>

                  {syncInfo.isPaired && (
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Monitor className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Paired Devices Roster</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Active devices connected to this school</p>
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                {pairedDevices.length} Active Devices
                            </div>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {pairedDevices.map((device) => (
                                <div key={device.deviceId} className="py-5 flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${device.role === 'ADMIN' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                            {device.role === 'ADMIN' ? <ShieldCheck className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                {device.deviceName}
                                                {device.deviceId === syncInfo.deviceId && (
                                                    <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-widest">Current Device</span>
                                                )}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {device.role === 'ADMIN' ? 'Full Authority' : 'Restricted Access'} • Heartbeat: {new Date(device.lastActive).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                    {syncInfo.role === 'ADMIN' && device.role !== 'ADMIN' && (
                                        <button 
                                            onClick={() => triggerConfirm("Revoke Device Access?", `Remove ${device.deviceName} from this school? Access will be cut instantly.`, () => removeDevice(device.deviceId))}
                                            className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"
                                        >
                                            <UserMinus className="w-4 h-4" /> Revoke
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {syncInfo.role === 'ADMIN' && (
                            <div className="pt-8 border-t border-slate-50 flex justify-end">
                                <button onClick={() => triggerConfirm("End School Sync?", "This will disconnect EVERYONE. Standalone data will be preserved on all devices.", disconnectSync)} className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-200 transition-all flex items-center gap-2">
                                    <CloudOff className="w-4 h-4" /> Disable All Pairing
                                </button>
                            </div>
                        )}
                    </div>
                  )}

                  {!syncInfo.isPaired && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        {/* Admin Path */}
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 text-blue-600 group-hover:scale-110 transition-transform shadow-inner">
                                <Smartphone className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Master School Admin</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose mb-10 flex-1">
                                Generate a school code to broadcast your master timetable. Every change you make will sync instantly to paired staff.
                            </p>
                            <button onClick={handleGenerateCode} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600 shadow-xl shadow-slate-200 transition-all">
                                Generate School Code
                            </button>
                        </div>

                        {/* Teacher Path */}
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 text-indigo-600 group-hover:scale-110 transition-transform shadow-inner">
                                <Users className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Pair as Staff Member</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose mb-6">
                                Join your school's live network. Once joined, your timetable stays in-sync with administrative updates in real-time.
                            </p>
                            <div className="space-y-4">
                                <input 
                                    maxLength={6}
                                    value={pairingCodeInput}
                                    onChange={(e) => {
                                        setPairingCodeInput(e.target.value.replace(/\D/g, ''));
                                        setJoinError(null);
                                    }}
                                    placeholder="Enter 6-Digit Code"
                                    className={`w-full p-5 bg-slate-50 border rounded-2xl text-center text-2xl font-black tracking-[0.5em] focus:ring-4 focus:ring-blue-100 outline-none transition-all ${joinError ? 'border-rose-400 text-rose-600' : 'border-slate-200 text-slate-700'}`}
                                />
                                {joinError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">{joinError}</p>}
                                <button 
                                    disabled={isJoining}
                                    onClick={handleJoinSchool} 
                                    className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-30"
                                >
                                    {isJoining ? 'Verifying Code...' : 'Join School Live'}
                                </button>
                            </div>
                        </div>
                    </div>
                  )}

                  {showPairCode && syncInfo.role === 'ADMIN' && (
                    <div className="bg-emerald-600 p-12 rounded-[4rem] text-white text-center shadow-2xl shadow-emerald-200 animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                            <Key className="w-10 h-10 text-white" />
                        </div>
                        <h4 className="text-4xl font-black tracking-tighter uppercase mb-2">School Code Active</h4>
                        <p className="text-emerald-100 text-xs font-black uppercase tracking-[0.2em] mb-10">Give this code to all teachers at your school</p>
                        
                        <div className="bg-white/10 p-10 rounded-[2.5rem] border border-white/20 relative group overflow-hidden">
                            <span className="text-7xl font-black tracking-[0.5em] text-white tabular-nums drop-shadow-xl pl-[0.5em]">
                                {syncInfo.pairCode}
                            </span>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(syncInfo.pairCode || '');
                                    alert("Code copied to clipboard!");
                                }}
                                className="absolute top-4 right-4 p-3 bg-white text-emerald-600 rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-all"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mt-10 flex flex-col items-center gap-4">
                            <p className="text-[10px] text-emerald-200 font-black uppercase tracking-[0.3em] max-w-sm">
                                Staff members using this code will receive live timetable updates automatically.
                            </p>
                            <button onClick={() => setShowPairCode(false)} className="px-8 py-3 bg-white text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">Done</button>
                        </div>
                    </div>
                  )}

                  <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-200 flex items-start gap-6">
                      <div className="p-3 bg-white rounded-xl text-amber-600 shadow-sm border border-amber-100 shrink-0">
                          <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-2">
                          <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Always-On Live Synchronization</h5>
                          <p className="text-xs font-bold text-amber-600/80 leading-relaxed">
                              Sync is fully automated. Teachers cannot manually disconnect to ensure schedule integrity. Only the <strong>School Admin</strong> can manage the device list or revoke access. If access is revoked or pairing is disabled, the local app will automatically revert to standalone mode.
                          </p>
                      </div>
                  </div>
              </div>
            </>
          )}

          {activeTab === 'timetable' && (
            <>
              <SectionHeader title="Period Structure" description="Time-mapping for daily academic sessions" />
              <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {timeSlots.map(s => (
                          <div key={s.period} className="p-6 bg-slate-50/50 border border-slate-100 rounded-[2rem] flex flex-col gap-4 hover:shadow-lg transition-all hover:bg-white group cursor-default">
                              <div className="flex justify-between items-center">
                                <span className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-800 text-lg shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all">{s.period}</span>
                                <Clock className="w-5 h-5 text-slate-300 group-hover:text-blue-200 transition-colors" />
                              </div>
                              <div>
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Period {s.period}</h4>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight mt-1 inline-block">{s.timeRange}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            </>
          )}

          {activeTab === 'teachers' && (
            <>
              <SectionHeader title="Teacher Registry" description="Centralized database of teaching staff" />
              {renderEntityList('TEACHER')}
            </>
          )}

          {activeTab === 'classes' && (
            <>
              <SectionHeader title="Class Registry" description="Grade level and section management" />
              {renderEntityList('CLASS')}
            </>
          )}
          
          {activeTab === 'students' && (
            <>
              <SectionHeader title="Student Enrollment" description="Assigning learners to specific rosters" />
              <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Bulk Roster Entry (CSV)</label>
                          </div>
                          <textarea 
                            value={bulkStudentInput} 
                            onChange={e => setBulkStudentInput(e.target.value)} 
                            placeholder={`John Doe, R-001\nJane Smith, R-002`} 
                            className="w-full h-64 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder-slate-300" 
                          />
                          <button onClick={handleBulkImportStudents} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-blue-600 hover:scale-[1.02] transition-all">Execute Bulk Import</button>
                      </div>

                      <div className="space-y-8">
                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6 shadow-inner">
                              <div className="space-y-2">
                                <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">Target Class Roster</h4>
                                <div className="relative">
                                  <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-blue-100">
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                  <ChevronRight className="absolute right-4 top-4 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                                </div>
                              </div>
                              <button onClick={handleAddSingleStudent} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">Enroll Student</button>
                          </div>
                      </div>
                  </div>
              </div>
            </>
          )}

          {activeTab === 'import' && (
            <>
              <SectionHeader title="Intelligent Import" description="Automated document processing via AI" />
              <div className="bg-white p-12 lg:p-20 rounded-[4rem] border border-slate-200 shadow-sm relative overflow-hidden text-center">
                {aiImportStatus === 'PROCESSING' && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <Loader2 className="w-20 h-20 text-blue-600 animate-spin mb-8" />
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-[0.2em]">Analyzing Documents...</h3>
                    </div>
                )}
                
                <div className="flex flex-col items-center mb-16">
                    <div className="p-6 bg-blue-100 rounded-[2.5rem] text-blue-600 mb-8 shadow-2xl shadow-blue-50 scale-110">
                        <Sparkles className="w-12 h-12" />
                    </div>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter uppercase mb-4">Master AI Digitizer</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className={`border-4 border-dashed rounded-[3.5rem] p-12 transition-all cursor-pointer group flex flex-col items-center ${teacherFile ? 'bg-emerald-50 border-emerald-200 shadow-2xl shadow-emerald-50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-blue-400'}`} onClick={() => teacherFileInputRef.current?.click()}>
                        {teacherFile ? <FileCheck className="w-10 h-10 text-emerald-500 mb-6" /> : <Users className="w-10 h-10 text-indigo-400 mb-6" />}
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-base mb-2">Teacher Timetable</h4>
                        <input type="file" ref={teacherFileInputRef} onChange={e => setTeacherFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,image/*" />
                    </div>

                    <div className={`border-4 border-dashed rounded-[3.5rem] p-12 transition-all cursor-pointer group flex flex-col items-center ${classFile ? 'bg-emerald-50 border-emerald-200 shadow-2xl shadow-emerald-50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-blue-400'}`} onClick={() => classFileInputRef.current?.click()}>
                        {classFile ? <FileCheck className="w-10 h-10 text-emerald-500 mb-6" /> : <GraduationCap className="w-10 h-10 text-blue-400 mb-6" />}
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-base mb-2">Class Master</h4>
                        <input type="file" ref={classFileInputRef} onChange={e => setClassFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,image/*" />
                    </div>
                </div>

                <div className="mt-20">
                    <button disabled={!teacherFile || !classFile} onClick={handleStartProcessing} className="w-full max-w-md py-6 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] shadow-2xl disabled:opacity-30 transition-all">
                        Begin AI Extractions
                    </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface MenuCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
  highlight?: boolean;
}

const MenuCard: React.FC<MenuCardProps> = ({ icon, title, description, onClick, color, highlight }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
  };

  const bgBorder: Record<string, string> = {
    blue: 'hover:border-blue-300',
    indigo: 'hover:border-indigo-300',
    purple: 'hover:border-purple-300',
    emerald: 'hover:border-emerald-300',
    rose: 'hover:border-rose-300',
    amber: 'hover:border-amber-300'
  };

  return (
    <button 
      onClick={onClick}
      className={`group bg-white p-8 rounded-[2.5rem] border border-slate-200 text-left transition-all hover:shadow-[0_30px_60px_-15px_rgba(15,23,42,0.12)] hover:translate-y-[-8px] active:scale-[0.97] flex flex-col h-full ${bgBorder[color]} ${highlight ? 'ring-2 ring-blue-400 ring-offset-4 ring-offset-slate-50' : ''}`}
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 shadow-sm ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center group-hover:text-blue-600 transition-colors">
          {title}
          <ChevronRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
        </h3>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
          {description}
        </p>
      </div>
    </button>
  );
};
