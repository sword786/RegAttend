
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Trash2, Plus, FileText, Sparkles, Loader2, FileUp, Check, X, Upload, 
  AlertCircle, ArrowRight, Pencil, Clock, Key, ExternalLink, Save, 
  Download, RotateCcw, UserPlus, Layers, Users, GraduationCap, 
  FileCheck, ShieldAlert, ArrowLeft, Settings as SettingsIcon, ChevronRight,
  Cloud, CloudOff, RefreshCw, Smartphone, Copy, Monitor, ShieldCheck, UserMinus, Zap, BookOpen, Share2, ClipboardList,
  ChevronDown, Wifi, WifiOff, Database, Server, Info, Terminal
} from 'lucide-react';
import { EntityProfile, TimeSlot } from '../types';

type SettingsTab = 'menu' | 'general' | 'timetable' | 'teachers' | 'classes' | 'students' | 'import' | 'sync';

export const Settings: React.FC = () => {
  const { 
    schoolName, updateSchoolName, 
    academicYear, updateAcademicYear,
    entities, addEntity, deleteEntity, updateEntity,
    students, addStudent, deleteStudent, updateStudent,
    timeSlots, updateTimeSlots,
    resetData,
    aiImportStatus, aiImportResult, aiImportErrorMessage, startAiImport, cancelAiImport, finalizeAiImport,
    syncInfo, generateSyncToken, importSyncToken, disconnectSync,
    firebaseConfig, setFirebaseConfig
  } = useData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('menu');
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [syncTokenInput, setSyncTokenInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const [firebaseConfigInput, setFirebaseConfigInput] = useState(firebaseConfig ? JSON.stringify(firebaseConfig, null, 2) : '');

  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [classFile, setClassFile] = useState<File | null>(null);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);
  const classFileInputRef = useRef<HTMLInputElement>(null);

  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityCode, setNewEntityCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Yes, Delete") => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, confirmText });
  };

  const [bulkStudentInput, setBulkStudentInput] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  
  const classes = useMemo(() => entities.filter(e => e.type === 'CLASS'), [entities]);

  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const exists = await window.aistudio.hasSelectedApiKey();
          setHasCustomKey(exists);
        }
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
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        setHasCustomKey(true);
      }
    } catch (e) { console.error("Key selection failed", e); }
  };

  const handleStartImport = () => {
    const filesToProcess: { file: File, label: 'TEACHER' | 'CLASS' }[] = [];
    if (teacherFile) filesToProcess.push({ file: teacherFile, label: 'TEACHER' });
    if (classFile) filesToProcess.push({ file: classFile, label: 'CLASS' });
    
    if (filesToProcess.length === 0) return;
    startAiImport(filesToProcess);
  };

  const handleSaveFirebaseConfig = () => {
    try {
        let input = firebaseConfigInput.trim();
        if (input.startsWith('{') && input.endsWith('}')) {
            try {
                const parsed = JSON.parse(input);
                setFirebaseConfig(parsed);
                triggerConfirm("Cloud Engine Ready", "Firebase configuration saved. You can now act as a School Host.", () => {}, "Understood");
                return;
            } catch (e) {
                const fixed = input.replace(/([{,]\s*)([a-zA-Z0-9]+)\s*:/g, '$1"$2":');
                const secondParsed = JSON.parse(fixed);
                setFirebaseConfig(secondParsed);
                triggerConfirm("Cloud Engine Ready", "Firebase configuration saved (auto-corrected format). You can now act as a School Host.", () => {}, "Understood");
                return;
            }
        }
        alert("Please paste a valid Firebase config object (starts with { and ends with }).");
    } catch (e) {
        alert("Invalid format. Please check your config string.");
    }
  };

  const handleImportToken = async () => {
    if (!syncTokenInput.trim()) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      const success = await importSyncToken(syncTokenInput);
      if (success) {
        setSyncTokenInput('');
        triggerConfirm("Cloud Sync Active", "Successfully paired with the school database. Updates will now arrive in real-time.", () => {}, "Awesome");
      } else {
        setJoinError("The token is invalid or has expired.");
      }
    } catch (e) {
      setJoinError("Connection failed. Check your internet.");
    } finally {
      setIsJoining(false);
    }
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
  };

  const handleBulkEnroll = () => {
    if (!bulkStudentInput.trim() || !targetClassId) return;
    const lines = bulkStudentInput.split('\n').filter(l => l.trim());
    lines.forEach((name, idx) => {
        addStudent({
            id: `student-${Date.now()}-${idx}`,
            name: name.trim(),
            rollNumber: `${Date.now().toString().slice(-4)}${idx}`,
            classId: targetClassId
        });
    });
    setBulkStudentInput('');
    triggerConfirm("Enrollment Success", `Successfully added ${lines.length} students to the class roster.`, () => {}, "Great");
  };

  const startEditing = (entity: EntityProfile) => {
    setEditingId(entity.id);
    setEditName(entity.name);
    setEditCode(entity.shortCode || '');
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) {
        updateEntity(editingId, { name: editName.trim(), shortCode: editCode.trim().toUpperCase() });
        setEditingId(null);
    }
  };

  const SectionHeader = ({ title, description, onBack }: { title: string, description: string, onBack?: () => void }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-100">
      <div className="flex items-center gap-6">
        <button 
          onClick={onBack || (() => setActiveTab('menu'))}
          className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm group active:scale-90"
          title="Back"
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
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Display Name</label>
            <input 
              placeholder={type === 'TEACHER' ? "Full Name" : "Class Name"}
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
          <button onClick={() => handleAddEntity(type)} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 h-[58px]">
              <Plus className="w-4 h-4" /> Add Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map(item => (
            <div key={item.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-blue-200 hover:bg-white transition-all shadow-sm">
              {editingId === item.id ? (
                  <div className="flex flex-col gap-2 flex-1 pr-4">
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 text-xs font-bold border rounded-lg" />
                      <input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-full p-2 text-[10px] font-black border rounded-lg uppercase" />
                      <div className="flex gap-2 mt-2">
                           <button onClick={saveEditing} className="p-2 bg-emerald-500 text-white rounded-lg flex-1 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                           <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-500 rounded-lg flex-1 flex items-center justify-center"><X className="w-4 h-4" /></button>
                      </div>
                  </div>
              ) : (
                  <>
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-sm uppercase">{item.shortCode || '?'}</div>
                          <div><div className="font-black text-slate-800 text-sm">{item.name}</div><div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{item.type} Profile</div></div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditing(item)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => triggerConfirm("Delete Profile?", `Permanently remove ${item.name}?`, () => deleteEntity(item.id))} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                      </div>
                  </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto min-h-full">
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-600"><ShieldAlert className="w-8 h-8" /></div>
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
              <div><h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Settings Center</h2><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-2">Manage Master Records & Firebase Sync</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <MenuCard icon={<RotateCcw className="w-7 h-7" />} title="General" description="School name, year & local API keys" onClick={() => setActiveTab('general')} color="blue" />
            <MenuCard icon={<Database className="w-7 h-7" />} title="Firebase Cloud" description="Pair with Real-time Database" onClick={() => setActiveTab('sync')} color="indigo" highlight={!syncInfo.isPaired} />
            <MenuCard icon={<Users className="w-7 h-7" />} title="Teachers" description="Faculty registry & identifiers" onClick={() => setActiveTab('teachers')} color="purple" />
            <MenuCard icon={<GraduationCap className="w-7 h-7" />} title="Classes" description="Grade levels, groups & sections" onClick={() => setActiveTab('classes')} color="emerald" />
            <MenuCard icon={<UserPlus className="w-7 h-7" />} title="Students" description="Enrollment rosters & CSV imports" onClick={() => setActiveTab('students')} color="rose" />
            <MenuCard icon={<Sparkles className="w-7 h-7" />} title="AI Import" description="Automated timetable extraction" onClick={() => setActiveTab('import')} color="amber" highlight={entities.length === 0} />
            <MenuCard icon={<Clock className="w-7 h-7" />} title="Timetable" description="Manage session mapping & periods" onClick={() => setActiveTab('timetable')} color="blue" />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
          {activeTab === 'general' && (
            <>
              <SectionHeader title="General Config" description="Core system configuration" />
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Identity</h3>
                    <div className="flex flex-col items-end gap-2">
                        <button onClick={handleSelectKey} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 flex items-center transition-all shadow-xl shadow-slate-200"><Key className="w-4 h-4 mr-2" /> {hasCustomKey ? 'Key Active' : 'Set API Key'}</button>
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline font-bold flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Billing Documentation
                        </a>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">School Name</label><input value={schoolName} onChange={e => updateSchoolName(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl text-base font-black text-slate-700 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" /></div>
                  <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Academic Year</label><input value={academicYear} onChange={e => updateAcademicYear(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl text-base font-black text-slate-700 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" /></div>
                </div>
                <div className="pt-10 border-t border-slate-100 flex justify-end"><button onClick={() => triggerConfirm("Wipe System?", "Delete all data?", () => resetData())} className="px-8 py-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"><RotateCcw className="w-4 h-4 mr-2" /> Reset System</button></div>
              </div>
            </>
          )}

          {activeTab === 'sync' && (
            <>
              <SectionHeader title="Firebase Sync Center" description="Real-time Synchronization Engine" />
              <div className="space-y-8">
                  
                  {/* EXPLANATORY ALERT */}
                  {!syncInfo.isPaired && (
                    <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-blue-600"><Info className="w-7 h-7" /></div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-blue-800 uppercase tracking-tight">How to connect?</h4>
                            <p className="text-xs text-blue-600 leading-relaxed font-bold opacity-80 uppercase tracking-widest">
                                <span className="underline">Admins</span>: Paste your Firebase config below to Host.<br/>
                                <span className="underline">Teachers</span>: Use the "Connect via Token" section below with the code from your Admin.
                            </p>
                        </div>
                    </div>
                  )}

                  {/* ADMIN SETUP SECTION */}
                  {(!syncInfo.isPaired || syncInfo.role === 'ADMIN') && (
                      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                          <div className="flex items-center gap-4 mb-4">
                              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Database className="w-6 h-6" /></div>
                              <div><h4 className="text-xl font-black uppercase tracking-tight leading-none">Administrator Setup (Host)</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Host the central database for your school</p></div>
                          </div>
                          <div className="relative">
                            <textarea 
                                value={firebaseConfigInput} 
                                onChange={e => setFirebaseConfigInput(e.target.value)}
                                placeholder='{ "apiKey": "...", "projectId": "...", ... }'
                                className="w-full h-48 p-5 bg-slate-900 text-emerald-400 border border-slate-800 rounded-[2rem] font-mono text-[11px] focus:ring-4 focus:ring-blue-100 outline-none scrollbar-hide"
                            />
                            <div className="absolute top-4 right-4 p-2 bg-slate-800/50 rounded-lg text-slate-400"><Terminal className="w-4 h-4" /></div>
                          </div>
                          <div className="flex justify-between items-center">
                              <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Firebase Console</a>
                              <button onClick={handleSaveFirebaseConfig} className="px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">Apply Config</button>
                          </div>
                      </div>
                  )}

                  <div className={`p-10 rounded-[3rem] border-2 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 transition-all ${syncInfo.isPaired ? 'bg-slate-900 border-indigo-500 text-white shadow-2xl' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-8 relative z-10 text-center md:text-left flex-col md:flex-row">
                          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all ${syncInfo.isPaired ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {syncInfo.connectionState === 'CONNECTED' ? <Wifi className="w-10 h-10 animate-pulse" /> : <WifiOff className="w-10 h-10" />}
                          </div>
                          <div>
                            <h3 className={`text-2xl font-black uppercase tracking-tighter leading-none mb-3 ${syncInfo.isPaired ? 'text-white' : 'text-slate-800'}`}>
                                {syncInfo.isPaired ? `Cloud Synced: ${syncInfo.role}` : 'Offline Mode'}
                            </h3>
                            <div className="flex flex-col gap-1">
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${syncInfo.isPaired ? 'text-indigo-300' : 'text-slate-400'}`}>
                                    {syncInfo.isPaired ? `Project: ${firebaseConfig?.projectId || 'Linked'}` : 'Configure Firebase or Join via Token to sync.'}
                                </p>
                            </div>
                          </div>
                      </div>
                      {syncInfo.isPaired && (
                          <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/20 flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${syncInfo.connectionState === 'CONNECTED' ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'bg-slate-500 animate-pulse'}`}></div>
                              <span className="text-[10px] font-black uppercase tracking-widest">{syncInfo.connectionState === 'CONNECTED' ? 'Live Stream Active' : 'Connecting...'}</span>
                          </div>
                      )}
                  </div>

                  {!syncInfo.isPaired && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        {/* HOST CARD (Needs Config) */}
                        <div className={`bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group ${!firebaseConfig ? 'opacity-40 grayscale' : ''}`}>
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 text-blue-600 group-hover:scale-110 transition-transform shadow-inner"><Server className="w-8 h-8" /></div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Host School Cloud</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose mb-10 flex-1">Become the central database server. Staff will sync to your project.</p>
                            <button 
                                disabled={!firebaseConfig}
                                onClick={() => { const token = generateSyncToken(); setGeneratedToken(token); }} 
                                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600 shadow-xl transition-all disabled:cursor-not-allowed"
                            >
                                {firebaseConfig ? 'Generate Staff Token' : 'Add Config to Unlock'}
                            </button>
                        </div>
                        
                        {/* JOIN CARD (No Config needed!) */}
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 text-indigo-600 group-hover:scale-110 transition-transform shadow-inner"><Smartphone className="w-8 h-8" /></div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Connect via Token</h4>
                            <div className="space-y-4 flex-1">
                                <textarea 
                                    value={syncTokenInput} 
                                    onChange={(e) => { setSyncTokenInput(e.target.value); setJoinError(null); }} 
                                    placeholder="Paste the token shared by your Admin..." 
                                    className={`w-full h-32 p-4 bg-slate-50 border rounded-2xl text-[10px] font-mono break-all focus:ring-4 focus:ring-blue-100 outline-none transition-all ${joinError ? 'border-rose-400' : 'border-slate-200'}`} 
                                />
                                {joinError && <div className="text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {joinError}</div>}
                                <button disabled={isJoining} onClick={handleImportToken} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl transition-all disabled:opacity-30">Join Real-time Sync</button>
                            </div>
                        </div>
                    </div>
                  )}

                  {syncInfo.isPaired && (
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 text-center">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-50"><Check className="w-10 h-10" /></div>
                        <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Active Real-time Sync</h4>
                        <p className="text-xs font-bold text-slate-400 max-w-sm mx-auto uppercase tracking-widest leading-loose">Device linked to school database. Updates are automatic.</p>
                        <button onClick={() => triggerConfirm("Disconnect Cloud?", "Stop syncing and switch back to Local mode?", disconnectSync)} className="text-rose-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2 mx-auto mt-4"><WifiOff className="w-4 h-4" /> Disconnect Database</button>
                    </div>
                  )}

                  {generatedToken && (
                    <div className="bg-emerald-600 p-12 rounded-[4rem] text-white text-center shadow-2xl animate-in zoom-in duration-500">
                        <h4 className="text-3xl font-black tracking-tighter uppercase mb-6">Staff Token Ready</h4>
                        <p className="text-xs text-emerald-100 font-bold uppercase tracking-widest mb-8 opacity-80">Share this code with teachers. It includes your Firebase config so they don't have to set it up manually.</p>
                        <div className="bg-white/10 p-6 rounded-[2.5rem] border border-white/20 mb-8 max-h-48 overflow-y-auto scrollbar-hide">
                            <code className="text-[9px] font-mono break-all text-white/80">{generatedToken}</code>
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button onClick={async () => {
                                try { await navigator.share({ title: 'Mupini Staff Token', text: generatedToken }); } 
                                catch (e) { navigator.clipboard.writeText(generatedToken); setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 2000); }
                            }} className="px-10 py-5 bg-white text-emerald-600 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-3">
                                <Share2 className="w-4 h-4" /> {copyFeedback ? 'Copied' : 'Share with Teachers'}
                            </button>
                            <button onClick={() => setGeneratedToken(null)} className="px-8 py-5 bg-black/20 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em]">Close</button>
                        </div>
                    </div>
                  )}
              </div>
            </>
          )}

          {activeTab === 'import' && (
            <>
              <SectionHeader 
                title="AI Digitizer" 
                description="Automated schedule extraction" 
                onBack={aiImportStatus !== 'IDLE' ? cancelAiImport : undefined}
              />
              <div className="space-y-8 min-h-[400px]">
                  {aiImportStatus === 'IDLE' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm flex flex-col group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Users className="w-32 h-32 rotate-12" /></div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center">Teacher Timetable <div className={`ml-3 w-3 h-3 rounded-full ${teacherFile ? 'bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse' : 'bg-slate-200'}`}></div></h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose mb-10 flex-1">Upload schedules grouped by Teacher names.</p>
                            <input type="file" ref={teacherFileInputRef} className="hidden" onChange={e => setTeacherFile(e.target.files?.[0] || null)} />
                            <button onClick={() => teacherFileInputRef.current?.click()} className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all ${teacherFile ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {teacherFile ? <FileCheck className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                {teacherFile ? teacherFile.name : 'Select PDF / Image'}
                            </button>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><GraduationCap className="w-32 h-32 rotate-12" /></div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center">Class Timetable <div className={`ml-3 w-3 h-3 rounded-full ${classFile ? 'bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse' : 'bg-slate-200'}`}></div></h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose mb-10 flex-1">Upload schedules grouped by Class levels.</p>
                            <input type="file" ref={classFileInputRef} className="hidden" onChange={e => setClassFile(e.target.files?.[0] || null)} />
                            <button onClick={() => classFileInputRef.current?.click()} className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all ${classFile ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {classFile ? <FileCheck className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                {classFile ? classFile.name : 'Select PDF / Image'}
                            </button>
                        </div>
                        <div className="md:col-span-2">
                             <button 
                                disabled={!teacherFile && !classFile}
                                onClick={handleStartImport}
                                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl shadow-slate-200 hover:bg-blue-600 hover:scale-[1.02] active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all flex items-center justify-center gap-4 group"
                             >
                                <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                Start AI Digitization
                             </button>
                        </div>
                    </div>
                  )}

                  {aiImportStatus === 'PROCESSING' && (
                    <div className="bg-white p-20 rounded-[4rem] border-2 border-slate-100 shadow-sm text-center space-y-10 animate-in fade-in zoom-in duration-500">
                        <div className="relative w-40 h-40 mx-auto">
                            <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping"></div>
                            <div className="relative w-40 h-40 bg-slate-900 rounded-full flex items-center justify-center shadow-2xl">
                                <Sparkles className="w-16 h-16 text-white animate-pulse" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Extracting Schedule Data</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.25em] mt-4 max-w-sm mx-auto leading-loose">This takes 10-30 seconds.</p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Running OCR Analysis...</span>
                        </div>
                    </div>
                  )}

                  {aiImportStatus === 'REVIEW' && aiImportResult && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-500">
                        <div className="bg-emerald-600 p-10 rounded-[3rem] text-white flex items-center justify-between shadow-xl shadow-emerald-200">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"><Check className="w-8 h-8" /></div>
                               <div><h3 className="text-2xl font-black uppercase tracking-tight leading-none">Extraction Complete</h3><p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mt-2">{aiImportResult.profiles.length} Profiles Detected</p></div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={cancelAiImport} className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20">Cancel</button>
                                <button onClick={finalizeAiImport} className="px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all">Add to System</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {aiImportResult.profiles.map((p, i) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-5 shadow-sm">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs ${p.type === 'TEACHER' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {p.shortCode || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-slate-800 text-sm truncate">{p.name}</div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{p.type} Profile</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}

                  {aiImportStatus === 'COMPLETED' && (
                    <div className="bg-white p-20 rounded-[4rem] border-2 border-emerald-100 shadow-sm text-center animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-100"><Check className="w-12 h-12" /></div>
                        <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight">System Updated</h3>
                        <p className="text-sm text-slate-500 font-bold leading-relaxed mt-4">All detected profiles have been added to your local database.</p>
                        <div className="flex gap-4 justify-center mt-12">
                            <button onClick={cancelAiImport} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Back</button>
                            <button onClick={() => setActiveTab('menu')} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200">Settings Menu</button>
                        </div>
                    </div>
                  )}

                  {aiImportStatus === 'ERROR' && (
                    <div className="bg-white p-12 rounded-[3rem] border-2 border-rose-100 shadow-sm text-center">
                        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8"><AlertCircle className="w-10 h-10" /></div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Digitization Failed</h3>
                        <p className="text-sm text-slate-500 font-bold leading-relaxed mt-4 max-w-sm mx-auto">{aiImportErrorMessage || "Could not extract data."}</p>
                        <button onClick={cancelAiImport} className="mt-10 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Try Again</button>
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
              <SectionHeader title="Teacher Registry" description="Faculty registry & identifiers" />
              {renderEntityList('TEACHER')}
            </>
          )}

          {activeTab === 'classes' && (
            <>
              <SectionHeader title="Class Registry" description="Grade levels, groups & sections" />
              {renderEntityList('CLASS')}
            </>
          )}
          
          {activeTab === 'students' && (
            <>
              <SectionHeader title="Student Registry" description="Manage enrollment rosters" />
              <div className="space-y-10">
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                      <div className="flex flex-col sm:flex-row gap-8 items-start">
                          <div className="w-full sm:w-64 space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Target Class</label>
                              <div className="relative">
                                <select 
                                    value={targetClassId} 
                                    onChange={e => setTargetClassId(e.target.value)} 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10"
                                >
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    {classes.length === 0 && <option value="">No Classes Added</option>}
                                </select>
                                <ChevronDown className="absolute right-4 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                          </div>
                          <div className="flex-1 space-y-3 w-full">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Bulk Enroll (Paste Names, 1 per line)</label>
                              <textarea 
                                value={bulkStudentInput} 
                                onChange={e => setBulkStudentInput(e.target.value)}
                                placeholder="John Doe&#10;Jane Smith&#10;..."
                                className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                              />
                              <div className="flex justify-end">
                                <button onClick={handleBulkEnroll} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all flex items-center gap-3">
                                    <UserPlus className="w-4 h-4" /> Enroll Students
                                </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Enrollment Matrix</h3>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{students.length} Total Students</div>
                      </div>
                      <div className="overflow-x-auto scrollbar-hide">
                          <table className="w-full text-left">
                              <thead>
                                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                      <th className="p-6">Full Name</th>
                                      <th className="p-6">Roll Number</th>
                                      <th className="p-6">Assigned Class</th>
                                      <th className="p-6 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {students.map(s => {
                                      const studentClass = entities.find(e => e.id === s.classId);
                                      return (
                                          <tr key={s.id} className="hover:bg-slate-50/50 group">
                                              <td className="p-6 font-black text-slate-800 text-sm">{s.name}</td>
                                              <td className="p-6 font-mono text-[10px] font-black text-slate-400">{s.rollNumber}</td>
                                              <td className="p-6">
                                                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{studentClass?.name || 'Unknown'}</span>
                                              </td>
                                              <td className="p-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button onClick={() => deleteStudent(s.id)} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4.5 h-4.5" /></button>
                                              </td>
                                          </tr>
                                      );
                                  })}
                                  {students.length === 0 && (
                                      <tr>
                                          <td colSpan={4} className="p-20 text-center">
                                              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-slate-200" /></div>
                                              <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">No students enrolled yet</p>
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
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
    <button onClick={onClick} className={`group bg-white p-8 rounded-[2.5rem] border border-slate-200 text-left transition-all hover:shadow-2xl hover:translate-y-[-8px] active:scale-[0.97] flex flex-col h-full ${highlight ? 'ring-2 ring-blue-400 ring-offset-4 ring-offset-white' : ''}`}>
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
