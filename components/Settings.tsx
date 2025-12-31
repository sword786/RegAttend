
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Trash2, Plus, FileText, Sparkles, Loader2, FileUp, Check, X, Upload, 
  AlertCircle, ArrowRight, Pencil, Clock, Key, ExternalLink, Save, 
  Download, RotateCcw, UserPlus, Layers, Users, GraduationCap, 
  FileCheck, ShieldAlert, ArrowLeft, Settings as SettingsIcon, ChevronRight,
  Cloud, CloudOff, RefreshCw, Smartphone, Copy, Monitor, ShieldCheck, UserMinus, Zap, BookOpen, Share2
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
    syncInfo, generateSyncToken, importSyncToken, disconnectSync
  } = useData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('menu');
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // Portable Sync States
  const [syncTokenInput, setSyncTokenInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Staging Files
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [classFile, setClassFile] = useState<File | null>(null);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);
  const classFileInputRef = useRef<HTMLInputElement>(null);

  // Management State
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

  // --- PORTABLE SYNC ACTIONS ---

  const handleGenerateToken = () => {
      const token = generateSyncToken();
      setGeneratedToken(token);
  };

  const handleImportToken = async () => {
    if (!syncTokenInput.trim()) {
        setJoinError("Token cannot be empty.");
        return;
    }
    setIsJoining(true);
    const success = await importSyncToken(syncTokenInput);
    setIsJoining(false);
    if (success) {
        setSyncTokenInput('');
        triggerConfirm("System Paired!", "The master timetable and rosters have been loaded onto this device.", () => {}, "Got it");
    } else {
        setJoinError("Invalid Sync Token. Please ensure you copied the full text.");
    }
  };

  const handleShareToken = async () => {
    if (!generatedToken) return;
    try {
        await navigator.share({
            title: `Mupini Sync Token: ${schoolName}`,
            text: generatedToken
        });
    } catch (e) {
        // Fallback to clipboard
        navigator.clipboard.writeText(generatedToken);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
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
                      <div className="flex gap-2">
                           <button onClick={saveEditing} className="p-2 bg-emerald-500 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                           <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-500 rounded-lg"><X className="w-4 h-4" /></button>
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
              <div><h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Settings Center</h2><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-2">Manage Master Records & APK Sync</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <MenuCard icon={<RotateCcw className="w-7 h-7" />} title="General" description="School name, year & local API keys" onClick={() => setActiveTab('general')} color="blue" />
            <MenuCard icon={<Smartphone className="w-7 h-7" />} title="Portable Sync" description="Pair with other phones via Tokens" onClick={() => setActiveTab('sync')} color="indigo" highlight={!syncInfo.isPaired} />
            <MenuCard icon={<Users className="w-7 h-7" />} title="Teachers" description="Faculty registry & identifiers" onClick={() => setActiveTab('teachers')} color="purple" />
            <MenuCard icon={<GraduationCap className="w-7 h-7" />} title="Classes" description="Grade levels, groups & sections" onClick={() => setActiveTab('classes')} color="emerald" />
            <MenuCard icon={<UserPlus className="w-7 h-7" />} title="Students" description="Enrollment rosters & CSV imports" onClick={() => setActiveTab('students')} color="rose" />
            <MenuCard icon={<Sparkles className="w-7 h-7" />} title="AI Import" description="Automated timetable extraction" onClick={() => setActiveTab('import')} color="amber" />
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
                    <button onClick={handleSelectKey} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 flex items-center transition-all shadow-xl shadow-slate-200"><Key className="w-4 h-4 mr-2" /> {hasCustomKey ? 'Key Active' : 'Set API Key'}</button>
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
              <SectionHeader title="Portable Sync Center" description="Pair phones by sharing tokens" />
              <div className="space-y-8">
                  <div className={`p-10 rounded-[3rem] border-2 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 transition-all ${syncInfo.isPaired ? 'bg-indigo-900 border-indigo-500 text-white shadow-2xl shadow-indigo-200' : 'bg-white border-slate-100'}`}>
                      {syncInfo.isPaired && <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>}
                      <div className="flex items-center gap-8 relative z-10 text-center md:text-left flex-col md:flex-row">
                          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all ${syncInfo.isPaired ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {syncInfo.isPaired ? <Zap className="w-10 h-10 fill-white animate-pulse" /> : <CloudOff className="w-10 h-10" />}
                          </div>
                          <div><h3 className={`text-2xl font-black uppercase tracking-tighter leading-none mb-3 ${syncInfo.isPaired ? 'text-white' : 'text-slate-800'}`}>{syncInfo.isPaired ? `Sync System Active` : 'Standalone Mode'}</h3><p className={`text-[10px] font-black uppercase tracking-[0.2em] ${syncInfo.isPaired ? 'text-indigo-300' : 'text-slate-400'}`}>{syncInfo.isPaired ? `Role: ${syncInfo.role} • Cloud ID: ${syncInfo.pairCode}` : 'Export your master data or pair with another device.'}</p></div>
                      </div>
                  </div>

                  {!syncInfo.isPaired ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 text-blue-600 group-hover:scale-110 transition-transform shadow-inner"><Share2 className="w-8 h-8" /></div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Export as Master</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose mb-10 flex-1">This creates a sync package of your entire school setup. Share this with other faculty phones so they can see the same timetable.</p>
                            <button onClick={handleGenerateToken} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600 shadow-xl transition-all">Generate Master Token</button>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 text-indigo-600 group-hover:scale-110 transition-transform shadow-inner"><Smartphone className="w-8 h-8" /></div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Pair as Faculty</h4>
                            <div className="space-y-4">
                                <textarea value={syncTokenInput} onChange={(e) => { setSyncTokenInput(e.target.value); setJoinError(null); }} placeholder="Paste Sync Token here..." className={`w-full h-32 p-4 bg-slate-50 border rounded-2xl text-[10px] font-mono break-all focus:ring-4 focus:ring-blue-100 outline-none transition-all ${joinError ? 'border-rose-400' : 'border-slate-200'}`} />
                                {joinError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">{joinError}</p>}
                                <button disabled={isJoining} onClick={handleImportToken} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl transition-all disabled:opacity-30">Import Master Data</button>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 text-center">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="w-10 h-10" /></div>
                        <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">System Fully Synchronized</h4>
                        {syncInfo.role === 'ADMIN' ? (
                            <div className="space-y-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-sm mx-auto leading-loose">This device is the Master Source. Share the token again if you make major changes to the timetable.</p>
                                <button onClick={handleGenerateToken} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-xl">Update Sync Token</button>
                            </div>
                        ) : (
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-sm mx-auto leading-loose">You are following the Master Timetable. To update, ask the Admin for a new token.</p>
                        )}
                        <div className="pt-10 border-t border-slate-50"><button onClick={() => triggerConfirm("Disconnect Sync?", "Switch back to Standalone mode?", disconnectSync)} className="text-rose-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2 mx-auto"><CloudOff className="w-4 h-4" /> Disconnect Sync</button></div>
                    </div>
                  )}

                  {generatedToken && (
                    <div className="bg-emerald-600 p-12 rounded-[4rem] text-white text-center shadow-2xl shadow-emerald-200 animate-in zoom-in duration-500 relative">
                        <div className="absolute top-4 right-4"><div className={`px-4 py-2 bg-white text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center transition-all ${copyFeedback ? 'opacity-100' : 'opacity-0'}`}><Check className="w-3.5 h-3.5 mr-2" /> Copied!</div></div>
                        <h4 className="text-3xl font-black tracking-tighter uppercase mb-6">Sync Token Ready</h4>
                        <div className="bg-white/10 p-6 rounded-[2.5rem] border border-white/20 mb-8 max-h-48 overflow-y-auto scrollbar-hide">
                            <code className="text-[9px] font-mono break-all text-white/80">{generatedToken}</code>
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button onClick={handleShareToken} className="px-10 py-5 bg-white text-emerald-600 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-50 transition-all flex items-center gap-3"><Share2 className="w-4 h-4" /> Share with Staff</button>
                            <button onClick={() => setGeneratedToken(null)} className="px-8 py-5 bg-black/20 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-black/30 transition-all">Close</button>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-8 text-white/50">Send this token via WhatsApp or Email to other APK users.</p>
                    </div>
                  )}

                  <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex items-start gap-6">
                      <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm shrink-0"><AlertCircle className="w-6 h-6" /></div>
                      <div className="space-y-2">
                          <h5 className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Cross-APK Handshake Protocol</h5>
                          <p className="text-xs font-bold text-blue-600/80 leading-relaxed">Since different APK installations cannot share memory, this 'Sync Token' acts as a portable package of your school data. Once imported, the teacher's phone will have the exact same timetable as yours.</p>
                      </div>
                  </div>
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

          {activeTab === 'teachers' && renderEntityList('TEACHER')}
          {activeTab === 'classes' && renderEntityList('CLASS')}
          {activeTab === 'students' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200">
               <SectionHeader title="Students" description="Enrollment & Roster" />
               <p className="text-sm text-slate-400">Student enrollment features are active in the Roster tab.</p>
            </div>
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
