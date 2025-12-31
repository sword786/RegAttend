
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Trash2, Plus, FileText, Sparkles, Loader2, FileUp, Check, X, Upload, 
  AlertCircle, ArrowRight, Pencil, Clock, Key, ExternalLink, Save, 
  Download, RotateCcw, UserPlus, Layers, Users, GraduationCap, 
  FileCheck, ShieldAlert, ArrowLeft, Settings as SettingsIcon, ChevronRight,
  Cloud, CloudOff, RefreshCw, Smartphone, Copy, Monitor, ShieldCheck, UserMinus, Zap, BookOpen
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
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // Pairing Logic States
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showPairCode, setShowPairCode] = useState(false);

  // Staging Files for AI Import
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [classFile, setClassFile] = useState<File | null>(null);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);
  const classFileInputRef = useRef<HTMLInputElement>(null);

  // Entity Management State
  const [isAddingEntity, setIsAddingEntity] = useState<'TEACHER' | 'CLASS' | null>(null);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityCode, setNewEntityCode] = useState('');
  
  // Editing State for existing items
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  // Confirmation Modal State
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
    setConfirmModal({ isOpen: true, title, message, onConfirm, confirmText });
  };

  // Student Enrollment State
  const [bulkStudentInput, setBulkStudentInput] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  
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
    } catch (e) { console.error("Key selection failed", e); }
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
        triggerConfirm("Successfully Joined!", "Your device is now synchronized with the school's live master timetable.", () => {}, "Got it");
    } else {
        setJoinError("Pair code not found or invalid.");
    }
  };

  const handleGenerateCode = () => {
    generatePairCode();
    setShowPairCode(true);
  };

  const handleCopyCode = () => {
    if (syncInfo.pairCode) {
        navigator.clipboard.writeText(syncInfo.pairCode);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    }
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
    alert(`Successfully imported ${count} students.`);
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

  const renderEntityList = (type: 'TEACHER' | 'CLASS') => {
    const list = entities.filter(e => e.type === type);
    return (
      <div className="space-y-8">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Display Name</label>
              <input 
                placeholder={type === 'TEACHER' ? "Full Name (e.g. John Doe)" : "Class Name (e.g. Grade 10A)"}
                value={newEntityName}
                onChange={e => setNewEntityName(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Short Code</label>
              <input 
                placeholder="Code"
                value={newEntityCode}
                onChange={e => setNewEntityCode(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>
            <button 
                onClick={() => handleAddEntity(type)}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 h-[58px]"
              >
                <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map(item => (
              <div key={item.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                {editingId === item.id ? (
                    <div className="flex flex-col gap-2 flex-1 pr-4">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 text-xs font-bold border rounded-lg" />
                        <div className="flex gap-2">
                             <button onClick={saveEditing} className="p-2 bg-emerald-500 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                             <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-500 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-sm uppercase">{item.shortCode || '?'}</div>
                            <div>
                                <div className="font-black text-slate-800 text-sm">{item.name}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{item.type} Registry</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditing(item)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => triggerConfirm("Delete Profile?", `Permanently remove ${item.name}?`, () => deleteEntity(item.id))} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </>
                )}
              </div>
            ))}
            {list.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-300 font-black text-[11px] uppercase tracking-widest">No entries found in this registry</p>
              </div>
            )}
          </div>
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
                      <h2 className="text-2xl font-black uppercase tracking-widest flex items-center relative z-10"><Sparkles className="w-6 h-6 mr-4 text-blue-400" /> Extraction Complete</h2>
                      <p className="text-slate-400 text-xs mt-3 font-bold uppercase tracking-widest relative z-10">AI has cross-referenced your documents. Review before final import.</p>
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
                      <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
                          <button onClick={cancelAiImport} className="px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all">Discard</button>
                          <button onClick={finalizeAiImport} className="px-10 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">Merge System</button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  if (aiImportStatus === 'REVIEW') return renderImportReview();

  return (
    <div className="max-w-7xl mx-auto min-h-full">
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-600">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2 leading-none">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed font-bold">{confirmModal.message}</p>
                <div className="flex gap-4">
                    <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                    <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200">{confirmModal.confirmText}</button>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'menu' ? (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="flex items-center gap-6">
              <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl shadow-slate-200"><SettingsIcon className="w-8 h-8" /></div>
              <div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">System Settings</h2>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-2">Configuration & Master Registries</p>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <MenuCard icon={<RotateCcw className="w-7 h-7" />} title="General Config" description="School info, Academic Year & API Keys" onClick={() => setActiveTab('general')} color="blue" />
            <MenuCard icon={<Cloud className="w-7 h-7" />} title="Sync Center" description="Always-on Live Pairing & Staff Sync" onClick={() => setActiveTab('sync')} color="indigo" highlight={!syncInfo.isPaired} />
            <MenuCard icon={<Users className="w-7 h-7" />} title="Teachers" description="Manage faculty names & identifier codes" onClick={() => setActiveTab('teachers')} color="purple" />
            <MenuCard icon={<GraduationCap className="w-7 h-7" />} title="Classes" description="Grade levels, groups, and sections" onClick={() => setActiveTab('classes')} color="emerald" />
            <MenuCard icon={<UserPlus className="w-7 h-7" />} title="Students" description="Enrollment rosters and bulk CSV imports" onClick={() => setActiveTab('students')} color="rose" />
            <MenuCard icon={<Sparkles className="w-7 h-7" />} title="AI Import" description="Auto-digitize PDF/Image timetables via Gemini" onClick={() => setActiveTab('import')} color="amber" />
            <MenuCard icon={<Clock className="w-7 h-7" />} title="Timetable" description="Manage period mapping and session times" onClick={() => setActiveTab('timetable')} color="blue" />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
          {activeTab === 'general' && (
            <>
              <SectionHeader title="General Config" description="Core system configuration" />
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Environment</h3>
                    <div className="flex gap-4">
                        <button onClick={handleExportData} className="px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center transition-all"><Download className="w-4 h-4 mr-2" /> Backup</button>
                        <button onClick={handleSelectKey} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 flex items-center transition-all shadow-xl shadow-slate-200"><Key className="w-4 h-4 mr-2" /> {hasCustomKey ? 'Key Active' : 'Select API Key'}</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Name</label>
                    <input value={schoolName} onChange={e => updateSchoolName(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl text-base font-black text-slate-700 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Academic Year</label>
                    <input value={academicYear} onChange={e => updateAcademicYear(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl text-base font-black text-slate-700 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                  </div>
                </div>
                <div className="pt-10 border-t border-slate-100">
                    <button onClick={() => triggerConfirm("Factory Reset System?", "Are you sure? This deletes ALL data permanently.", () => resetData())} className="px-8 py-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"><RotateCcw className="w-4 h-4 mr-2" /> Reset System</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'sync' && (
            <>
              <SectionHeader title="School Live Sync" description="Real-time multi-device synchronization" />
              <div className="space-y-8">
                  <div className={`p-10 rounded-[3rem] border-2 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 transition-all ${syncInfo.isPaired ? 'bg-indigo-900 border-indigo-500 text-white shadow-2xl shadow-indigo-200' : 'bg-white border-slate-100'}`}>
                      {syncInfo.isPaired && <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>}
                      <div className="flex items-center gap-8 relative z-10 text-center md:text-left flex-col md:flex-row">
                          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all ${syncInfo.isPaired ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {syncInfo.isPaired ? <Zap className="w-10 h-10 fill-white animate-pulse" /> : <CloudOff className="w-10 h-10" />}
                          </div>
                          <div>
                              <h3 className={`text-2xl font-black uppercase tracking-tighter leading-none mb-3 ${syncInfo.isPaired ? 'text-white' : 'text-slate-800'}`}>{syncInfo.isPaired ? `Live Master Streaming` : 'Sync Offline'}</h3>
                              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${syncInfo.isPaired ? 'text-indigo-300' : 'text-slate-400'}`}>{syncInfo.isPaired ? `Role: ${syncInfo.role} • Always Streaming • ID: ${syncInfo.pairCode}` : 'Pair with school cloud to sync with staff.'}</p>
                          </div>
                      </div>
                      {syncInfo.isPaired && (
                          <div className="flex items-center gap-4 bg-white/10 px-6 py-4 rounded-[2rem] border border-white/10 relative z-10">
                              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></div>
                              <span className="text-[11px] font-black uppercase tracking-widest text-white">Streaming Live</span>
                          </div>
                      )}
                  </div>

                  {!syncInfo.isPaired ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 text-blue-600 group-hover:scale-110 transition-transform shadow-inner"><Smartphone className="w-8 h-8" /></div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Host Master Cloud</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose mb-10 flex-1">Generate a school code to broadcast your master timetable to all paired staff devices.</p>
                            <button onClick={handleGenerateCode} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600 shadow-xl shadow-slate-200 transition-all">Enable School Cloud</button>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 text-indigo-600 group-hover:scale-110 transition-transform shadow-inner"><Users className="w-8 h-8" /></div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Pair as Faculty</h4>
                            <div className="space-y-4">
                                <input maxLength={6} value={pairingCodeInput} onChange={(e) => { setPairingCodeInput(e.target.value.replace(/\D/g, '')); setJoinError(null); }} placeholder="6-Digit Code" className={`w-full p-5 bg-slate-50 border rounded-2xl text-center text-2xl font-black tracking-[0.5em] focus:ring-4 focus:ring-blue-100 outline-none transition-all ${joinError ? 'border-rose-400 text-rose-600' : 'border-slate-200 text-slate-700'}`} />
                                {joinError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">{joinError}</p>}
                                <button disabled={isJoining} onClick={handleJoinSchool} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-30">Connect School Live</button>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Monitor className="w-5 h-5" /></div>
                                <div><h4 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Paired Roster</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Streaming live updates to faculty</p></div>
                            </div>
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{pairedDevices.length} Online</div>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {pairedDevices.map((device) => (
                                <div key={device.deviceId} className="py-5 flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${device.role === 'ADMIN' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                            {device.role === 'ADMIN' ? <ShieldCheck className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <span className="text-sm font-black text-slate-800 flex items-center gap-2">{device.deviceName} {device.deviceId === syncInfo.deviceId && <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-widest">Master</span>}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Heartbeat: {new Date(device.lastActive).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                    {syncInfo.role === 'ADMIN' && device.role !== 'ADMIN' && (
                                        <button onClick={() => triggerConfirm("Revoke Access?", `Remove ${device.deviceName}?`, () => removeDevice(device.deviceId))} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"><UserMinus className="w-4 h-4" /> Revoke</button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {syncInfo.role === 'ADMIN' && (
                            <div className="pt-8 border-t border-slate-50 flex justify-end">
                                <button onClick={() => triggerConfirm("Disable Live Sync?", "Disconnect all paired devices?", disconnectSync)} className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-200 transition-all flex items-center gap-2"><CloudOff className="w-4 h-4" /> Shutdown Sync</button>
                            </div>
                        )}
                    </div>
                  )}

                  {showPairCode && syncInfo.role === 'ADMIN' && (
                    <div className="bg-emerald-600 p-12 rounded-[4rem] text-white text-center shadow-2xl shadow-emerald-200 animate-in zoom-in duration-500 relative">
                        <div className="absolute top-4 right-4 animate-bounce">
                           <div className={`px-4 py-2 bg-white text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center transition-all duration-300 ${copyFeedback ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}><Check className="w-3.5 h-3.5 mr-2" /> Copied!</div>
                        </div>
                        <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8"><Key className="w-10 h-10 text-white" /></div>
                        <h4 className="text-4xl font-black tracking-tighter uppercase mb-2">School Code Active</h4>
                        <div onClick={handleCopyCode} className="bg-white/10 p-10 rounded-[2.5rem] border border-white/20 relative group overflow-hidden cursor-pointer hover:bg-white/20 hover:scale-[1.02] active:scale-95 transition-all shadow-inner">
                            <span className="text-7xl font-black tracking-[0.5em] text-white tabular-nums drop-shadow-2xl pl-[0.5em] relative z-10">{syncInfo.pairCode}</span>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center"><Copy className="w-12 h-12 text-white/40 mb-2" /><span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Click to Copy</span></div>
                        </div>
                        <div className="mt-10"><button onClick={() => setShowPairCode(false)} className="px-8 py-3 bg-white text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">Done</button></div>
                    </div>
                  )}
              </div>
            </>
          )}

          {activeTab === 'timetable' && (
            <>
              <SectionHeader title="Period Structure" description="Academic session mapping" />
              <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {timeSlots.map(s => (
                          <div key={s.period} className="p-6 bg-slate-50/50 border border-slate-100 rounded-[2rem] flex flex-col gap-4 hover:shadow-lg transition-all hover:bg-white group">
                              <div className="flex justify-between items-center"><span className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-800 text-lg shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all">{s.period}</span><Clock className="w-5 h-5 text-slate-300" /></div>
                              <div><h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Period {s.period}</h4><span className="text-xs font-bold text-slate-400 uppercase tracking-tight mt-1">{s.timeRange}</span></div>
                          </div>
                      ))}
                  </div>
              </div>
            </>
          )}

          {activeTab === 'teachers' && (
             <>
               <SectionHeader title="Teachers" description="Faculty registry management" />
               {renderEntityList('TEACHER')}
             </>
          )}

          {activeTab === 'classes' && (
             <>
               <SectionHeader title="Classes" description="Grade and group management" />
               {renderEntityList('CLASS')}
             </>
          )}
          
          {activeTab === 'students' && (
            <>
              <SectionHeader title="Students" description="Enrollment rosters and rosters" />
              <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] block">Bulk CSV Roster</label>
                          <textarea value={bulkStudentInput} onChange={e => setBulkStudentInput(e.target.value)} placeholder={`John Doe, R-001\nJane Smith, R-002`} className="w-full h-64 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-300" />
                          <button onClick={handleBulkImportStudents} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-xl hover:bg-blue-600 transition-all">Import CSV Data</button>
                      </div>
                      <div className="space-y-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner flex flex-col">
                          <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">Individual Enrollment</h4>
                          <div className="space-y-4 mt-4 flex-1">
                              <div className="relative"><select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none appearance-none"><option value="">-- Select Target Class --</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronRight className="absolute right-4 top-4 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" /></div>
                              <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Student Name" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm" />
                              <input value={newStudentRoll} onChange={e => setNewStudentRoll(e.target.value)} placeholder="Roll/ID Number" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm" />
                          </div>
                          <button onClick={handleAddSingleStudent} className="w-full mt-6 py-5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">Enroll Learner</button>
                      </div>
                  </div>
              </div>
            </>
          )}

          {activeTab === 'import' && (
            <>
              <SectionHeader title="Intelligent Digitizer" description="Automated timetable extraction" />
              <div className="bg-white p-12 lg:p-20 rounded-[4rem] border border-slate-200 shadow-sm relative overflow-hidden text-center">
                {aiImportStatus === 'PROCESSING' && (<div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center animate-in fade-in duration-500"><Loader2 className="w-20 h-20 text-blue-600 animate-spin mb-8" /><h3 className="text-2xl font-black text-slate-800 uppercase tracking-[0.2em]">Digitizing Files...</h3></div>)}
                <div className="flex flex-col items-center mb-16"><div className="p-6 bg-blue-100 rounded-[2.5rem] text-blue-600 mb-8 shadow-2xl scale-110"><Sparkles className="w-12 h-12" /></div><h3 className="text-4xl font-black text-slate-800 tracking-tighter uppercase mb-4">Gemini Master AI</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className={`border-4 border-dashed rounded-[3.5rem] p-12 transition-all cursor-pointer flex flex-col items-center ${teacherFile ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`} onClick={() => teacherFileInputRef.current?.click()}>
                        {teacherFile ? <FileCheck className="w-10 h-10 text-emerald-500 mb-6" /> : <Users className="w-10 h-10 text-indigo-400 mb-6" />}
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-base mb-2">Teachers Master</h4>
                        <input type="file" ref={teacherFileInputRef} onChange={e => setTeacherFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,image/*" />
                    </div>
                    <div className={`border-4 border-dashed rounded-[3.5rem] p-12 transition-all cursor-pointer flex flex-col items-center ${classFile ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`} onClick={() => classFileInputRef.current?.click()}>
                        {classFile ? <FileCheck className="w-10 h-10 text-emerald-500 mb-6" /> : <GraduationCap className="w-10 h-10 text-blue-400 mb-6" />}
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-base mb-2">Class Master</h4>
                        <input type="file" ref={classFileInputRef} onChange={e => setClassFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,image/*" />
                    </div>
                </div>
                <div className="mt-20"><button disabled={!teacherFile || !classFile} onClick={handleStartProcessing} className="w-full max-w-md py-6 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] shadow-2xl disabled:opacity-30">Analyze Documents</button></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface MenuCardProps { icon: React.ReactNode; title: string; description: string; onClick: () => void; color: string; highlight?: boolean; }
const MenuCard: React.FC<MenuCardProps> = ({ icon, title, description, onClick, color, highlight }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
  };
  return (
    <button onClick={onClick} className={`group bg-white p-8 rounded-[2.5rem] border border-slate-200 text-left transition-all hover:shadow-2xl hover:translate-y-[-8px] active:scale-[0.97] flex flex-col h-full ${highlight ? 'ring-2 ring-blue-400 ring-offset-4' : ''}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 shadow-sm ${colorClasses[color]}`}>{icon}</div>
      <div className="flex-1">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center group-hover:text-blue-600 transition-colors">
          {title} <ChevronRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
        </h3>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-loose">{description}</p>
      </div>
    </button>
  );
};
