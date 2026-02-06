import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Trash2, Plus, FileText, Sparkles, Loader2, FileUp, Check, X, Upload, 
  AlertCircle, ArrowRight, Pencil, Clock, Key, ExternalLink, Save, 
  Download, RotateCcw, UserPlus, Layers, Users, GraduationCap, 
  FileCheck, ShieldAlert, ArrowLeft, Settings as SettingsIcon, ChevronRight,
  Cloud, CloudOff, RefreshCw, Smartphone, Copy, Monitor, ShieldCheck, UserMinus, Zap, BookOpen, Share2, ClipboardList,
  ChevronDown, Wifi, WifiOff, Database, Server, Info, Terminal, Flame, Palette, Hash, Fingerprint, TableProperties, CheckCircle2,
  Eye, EyeOff
} from 'lucide-react';
import { EntityProfile, TimeSlot, createEmptySchedule, Student } from '../types';

type SettingsTab = 'menu' | 'general' | 'timetable' | 'teachers' | 'classes' | 'students' | 'import' | 'sync';

interface MenuCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

const MenuCard: React.FC<MenuCardProps> = ({ icon, title, description, onClick, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
    slate: 'bg-slate-50 text-slate-600 group-hover:bg-slate-600 group-hover:text-white'
  };
  return (
    <button onClick={onClick} className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 text-left transition-all hover:shadow-2xl hover:translate-y-[-4px] active:scale-[0.98] flex flex-col h-full">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 shadow-sm shrink-0 ${colorClasses[color] || colorClasses.blue}`}>{icon}</div>
        <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center group-hover:text-blue-600 transition-colors truncate">{title} <ChevronRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" /></h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-loose line-clamp-2">{description}</p>
        </div>
    </button>
  );
};

export const Settings: React.FC = () => {
  const { 
    schoolName, updateSchoolName, academicYear, updateAcademicYear, primaryColor, updatePrimaryColor,
    entities, addEntity, deleteEntity, updateEntity, students, addStudents, deleteStudent, updateStudent,
    timeSlots, updateTimeSlots, deleteTimeSlot, resetData, aiImportStatus, aiImportResult, startAiImport, cancelAiImport, finalizeAiImport,
    studentAiImportStatus, studentAiImportResult, startStudentAiImport, cancelStudentAiImport, finalizeStudentAiImport,
    syncInfo, disconnectSync, userRole, firebaseConfig, setFirebaseConfig, getPairingToken
  } = useData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('menu');
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityCode, setNewEntityCode] = useState('');
  const [newPeriodNum, setNewPeriodNum] = useState('');
  const [newPeriodTime, setNewPeriodTime] = useState('');
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null);
  const [bulkStudentInput, setBulkStudentInput] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [editingEntity, setEditingEntity] = useState<EntityProfile | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [classFile, setClassFile] = useState<File | null>(null);
  const [configInput, setConfigInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isAiRosterModalOpen, setIsAiRosterModalOpen] = useState(false);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const classes = useMemo(() => entities.filter(e => e.type === 'CLASS'), [entities]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmText?: string; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Yes, Delete") => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, confirmText });
  };

  useEffect(() => {
    if (activeTab === 'students' && !targetClassId && classes.length > 0) setTargetClassId(classes[0].id);
  }, [activeTab, classes, targetClassId]);

  const handleAddEntity = (type: 'TEACHER' | 'CLASS') => {
    if (!newEntityName.trim()) return;
    addEntity({ id: `${type.toLowerCase()}-${Date.now()}`, name: newEntityName.trim(), shortCode: newEntityCode.trim().toUpperCase() || newEntityName.trim().substring(0, 3).toUpperCase(), type, schedule: createEmptySchedule() });
    setNewEntityName(''); setNewEntityCode('');
  };

  const handleUpdateEntity = () => {
    if (!editingEntity) return;
    updateEntity(editingEntity.id, editingEntity);
    setEditingEntity(null);
  };

  const handleUpdateStudent = () => {
    if (!editingStudent) return;
    updateStudent(editingStudent.id, editingStudent);
    setEditingStudent(null);
  };

  const handleAddOrEditPeriod = () => {
    const pNum = parseInt(newPeriodNum);
    if (isNaN(pNum) || !newPeriodTime.trim()) return;
    let next: TimeSlot[];
    if (editingPeriod !== null) next = timeSlots.map(s => s.period === editingPeriod ? { period: pNum, timeRange: newPeriodTime.trim() } : s);
    else next = [...timeSlots, { period: pNum, timeRange: newPeriodTime.trim() }];
    updateTimeSlots(next.sort((a,b) => a.period - b.period));
    setNewPeriodNum(''); setNewPeriodTime(''); setEditingPeriod(null);
  };

  const handleBulkEnroll = () => {
    if (!bulkStudentInput.trim() || !targetClassId) return;
    const lines = bulkStudentInput.split('\n').filter(l => l.trim());
    const newStuds = lines.map((line, idx) => {
      const parts = line.split(/\s*[,;\t]\s*/).map(p => p.trim());
      const name = parts[0];
      const admNo = parts[1] || undefined;
      const clsNo = parts[2] || undefined;
      return { id: `student-${Date.now()}-${idx}`, name, rollNumber: clsNo || '', classId: targetClassId, admissionNumber: admNo, classNumber: clsNo };
    });
    addStudents(newStuds); 
    setBulkStudentInput('');
    triggerConfirm("Enrolled", `Successfully added ${newStuds.length} students to the class roster.`, () => {}, "Got it");
  };

  const handleAiProcess = () => {
    const uploads: { file: File, label: 'TEACHER' | 'CLASS' }[] = [];
    if (teacherFile) uploads.push({ file: teacherFile, label: 'TEACHER' });
    if (classFile) uploads.push({ file: classFile, label: 'CLASS' });
    if (uploads.length === 0) return;
    startAiImport(uploads);
  };

  const handleStudentAiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) startStudentAiImport(Array.from(files));
  };

  const checkClassMatch = (extractedClassName: string | undefined) => {
    if (!extractedClassName) return null;
    return classes.find(c => c.name.toLowerCase().includes(extractedClassName.toLowerCase()) || (c.shortCode && extractedClassName.toLowerCase().includes(c.shortCode.toLowerCase())));
  };

  const handleConnectFirebase = async () => {
      if (!configInput.trim()) { alert("Please paste your Firebase configuration object."); return; }
      setIsConnecting(true);
      try {
          let cleaned = configInput.trim();
          cleaned = cleaned.replace(/^(const|var|let)\s+\w+\s*=\s*/, '').replace(/;$/, '').replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":').replace(/:\s*'([^']*)'/g, ': "$1"').replace(/,(\s*[}\]])/g, '$1');
          let cfg;
          try { cfg = JSON.parse(cleaned); } catch (e) { cfg = JSON.parse(configInput); }
          if (!cfg.apiKey || !cfg.projectId) { alert("Invalid config."); setIsConnecting(false); return; }
          const success = await setFirebaseConfig(cfg);
          if (!success) alert("Link failed.");
      } catch (e) { alert("Parse error."); } finally { setIsConnecting(false); }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(getPairingToken());
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const SectionHeader = ({ title, description }: { title: string, description: string }) => (
    <div className="flex items-center gap-6 mb-10 pb-8 border-b border-slate-100">
      <button onClick={() => setActiveTab('menu')} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-2xl transition-all shadow-sm shrink-0"><ArrowLeft className="w-6 h-6" /></button>
      <div className="min-w-0">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase leading-none truncate">{title}</h2>
        <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 truncate">{description}</p>
      </div>
    </div>
  );

  const renderEntityList = (type: 'TEACHER' | 'CLASS') => {
    const list = entities.filter(e => e.type === type);
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <SectionHeader title={type === 'TEACHER' ? 'Teachers' : 'Classes'} description={`Manage ${type === 'TEACHER' ? 'Faculty' : 'Grade'} Profiles & Registry Codes`} />
        <div className="space-y-8">
            <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Display Name</label>
                    <input placeholder={type === 'TEACHER' ? "e.g. John Doe" : "e.g. Grade 10A"} value={newEntityName} onChange={e => setNewEntityName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div className="w-full sm:w-40 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Registry Code</label>
                    <input placeholder="Code" value={newEntityCode} onChange={e => setNewEntityCode(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <button onClick={() => handleAddEntity(type)} className="w-full sm:w-auto h-14 px-8 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-colors">Add Node</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map(item => (
                <div key={item.id} className="p-6 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-[10px] uppercase shrink-0 border border-slate-100">{item.shortCode}</div>
                        <div className="min-w-0"><div className="font-black text-slate-800 text-sm truncate">{item.name}</div><div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{type} Record</div></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingEntity(item)} className="p-2 text-slate-200 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => triggerConfirm("Delete?", `Remove ${item.name}?`, () => deleteEntity(item.id))} className="p-2 text-slate-200 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            ))}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 sm:px-0">
      
      {/* EDIT ENTITY MODAL */}
      {editingEntity && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 space-y-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Edit {editingEntity.type === 'CLASS' ? 'Class' : 'Teacher'}</h3>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                        <input value={editingEntity.name} onChange={e => setEditingEntity({...editingEntity, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Code</label>
                        <input value={editingEntity.shortCode} onChange={e => setEditingEntity({...editingEntity, shortCode: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setEditingEntity(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase">Cancel</button>
                    <button onClick={handleUpdateEntity} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase">Update</button>
                </div>
            </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 space-y-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Edit Student</h3>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                        <input value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admission Number</label>
                        <input value={editingStudent.admissionNumber || ''} onChange={e => setEditingStudent({...editingStudent, admissionNumber: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class Number</label>
                        <input value={editingStudent.classNumber || ''} onChange={e => setEditingStudent({...editingStudent, classNumber: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class Register</label>
                        <select value={editingStudent.classId} onChange={e => setEditingStudent({...editingStudent, classId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none">
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setEditingStudent(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase">Cancel</button>
                    <button onClick={handleUpdateStudent} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase">Update</button>
                </div>
            </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 space-y-6 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-2 shadow-sm border border-rose-100">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{confirmModal.title}</h3>
                    <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-wide px-4">{confirmModal.message}</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                        className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }} 
                        className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-rose-700 transition-colors"
                    >
                        {confirmModal.confirmText || "Confirm"}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* AI ROSTER MODAL */}
      {isAiRosterModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Gemini Extraction</div>
                            <div className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Excel • PDF • Image</div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">AI Spreadsheet Hub</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Auto-map student data to your registry from any format</p>
                    </div>
                    <button onClick={() => setIsAiRosterModalOpen(false)} className="p-2 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                        <X className="w-6 h-6 text-slate-400"/>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                    {studentAiImportStatus === 'IDLE' && (
                        <div onClick={() => aiFileInputRef.current?.click()} className="group border-4 border-dashed border-slate-100 bg-slate-50 rounded-[2.5rem] p-16 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                            <input type="file" ref={aiFileInputRef} hidden multiple onChange={handleStudentAiUpload} accept="image/*,.pdf,.xlsx,.xls" />
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                                <Upload className="w-10 h-10 text-indigo-500" />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Drop Excel, Image or PDF rosters</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] mt-3">Advanced institutional document parsing</p>
                        </div>
                    )}
                    {studentAiImportStatus === 'PROCESSING' && (
                        <div className="py-24 text-center space-y-8">
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                                <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-10 h-10 text-indigo-500 animate-pulse" /></div>
                            </div>
                            <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">AI Matrix Analysis...</h4>
                        </div>
                    )}
                    {studentAiImportStatus === 'REVIEW' && studentAiImportResult && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-inner">
                                <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <TableProperties className="w-4 h-4 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extracted Protocol Log ({studentAiImportResult.students.length})</span>
                                    </div>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="p-4">Name</th>
                                                <th className="p-4">Roll</th>
                                                <th className="p-4">ADM</th>
                                                <th className="p-4">AI Class</th>
                                                <th className="p-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {studentAiImportResult.students.map((s, idx) => {
                                                const match = checkClassMatch(s.className);
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 text-xs font-black text-slate-700">{s.name}</td>
                                                        <td className="p-4 text-xs font-bold text-slate-400">{s.rollNumber || '-'}</td>
                                                        <td className="p-4 text-xs font-bold text-slate-400">{s.admissionNumber || '-'}</td>
                                                        <td className="p-4">
                                                            {s.className ? (
                                                                <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${match ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                    {s.className} {match ? '✓' : '?'}
                                                                </span>
                                                            ) : <span className="text-slate-200">-</span>}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4">
                                <button onClick={cancelStudentAiImport} className="px-6 py-4 rounded-xl text-slate-400 font-black text-[10px] uppercase hover:text-slate-600">Discard</button>
                                <button onClick={() => finalizeStudentAiImport(targetClassId)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-700">Import All</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MenuCard icon={<SettingsIcon className="w-8 h-8" />} title="General" description="School name, year & core config" onClick={() => setActiveTab('general')} color="slate" />
            <MenuCard icon={<Clock className="w-8 h-8" />} title="Timetable" description="Manage periods & timing slots" onClick={() => setActiveTab('timetable')} color="blue" />
            <MenuCard icon={<Users className="w-8 h-8" />} title="Teachers" description="Manage faculty profiles" onClick={() => setActiveTab('teachers')} color="indigo" />
            <MenuCard icon={<GraduationCap className="w-8 h-8" />} title="Classes" description="Manage grade levels & sections" onClick={() => setActiveTab('classes')} color="purple" />
            <MenuCard icon={<BookOpen className="w-8 h-8" />} title="Students" description="Bulk enroll & student registry" onClick={() => setActiveTab('students')} color="emerald" />
            <MenuCard icon={<FileUp className="w-8 h-8" />} title="Timetable Import" description="Upload full schedules via AI" onClick={() => setActiveTab('import')} color="rose" />
            <MenuCard icon={<Cloud className="w-8 h-8" />} title="Sync Cloud" description="Firebase & multi-device pairing" onClick={() => setActiveTab('sync')} color="amber" />
        </div>
      )}

      {activeTab === 'general' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="General Configuration" description="Core Institutional Settings" />
            <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Institution Name</label>
                            <input value={schoolName} onChange={e => updateSchoolName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Academic Year</label>
                            <input value={academicYear} onChange={e => updateAcademicYear(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">System Accent Color</label>
                            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                                <input type="color" value={primaryColor} onChange={e => updatePrimaryColor(e.target.value)} className="w-12 h-12 rounded-xl border-none cursor-pointer" />
                                <span className="text-xs font-mono font-bold text-slate-500">{primaryColor}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-rose-500">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-rose-900 uppercase tracking-tight">Danger Zone</h3>
                            <p className="text-xs font-bold text-rose-400/80 mt-1">Irreversible actions for system administrators</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => triggerConfirm("Factory Reset", "This will wipe all data including students, schedules, and attendance logs. This cannot be undone. Are you sure?", () => { resetData(); setActiveTab('menu'); })}
                        className="w-full py-4 bg-white border border-rose-200 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow-xl"
                    >
                        Factory Reset System
                    </button>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'timetable' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Timetable Slots" description="Define Daily Period Structure" />
            <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-32 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Period #</label>
                        <input type="number" placeholder="1" value={newPeriodNum} onChange={e => setNewPeriodNum(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Time Range</label>
                        <input placeholder="e.g. 8:00 - 9:00" value={newPeriodTime} onChange={e => setNewPeriodTime(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
                    </div>
                    <button onClick={handleAddOrEditPeriod} className="w-full md:w-auto h-14 px-8 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-colors">
                        {editingPeriod !== null ? 'Update' : 'Add Slot'}
                    </button>
                </div>

                <div className="space-y-3">
                    {timeSlots.map(slot => (
                        <div key={slot.period} className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-[2rem] hover:shadow-md transition-all group">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm">{slot.period}</div>
                                <div className="text-lg font-black text-slate-700">{slot.timeRange}</div>
                            </div>
                            <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingPeriod(slot.period); setNewPeriodNum(slot.period.toString()); setNewPeriodTime(slot.timeRange); }} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => triggerConfirm("Delete Slot?", "This will remove the period from all schedules.", () => deleteTimeSlot(slot.period))} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {activeTab === 'teachers' && renderEntityList('TEACHER')}
      {activeTab === 'classes' && renderEntityList('CLASS')}

      {activeTab === 'students' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Student Registry" description="Enrollment & Class Rosters" />
            <div className="space-y-8">
                 <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight">AI Roster Import</h3>
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-2">Upload class lists from Excel, PDF or Images</p>
                        </div>
                        <button onClick={() => setIsAiRosterModalOpen(true)} className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Open AI Tool
                        </button>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Bulk Quick-Add</div>
                        <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none">
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <textarea 
                        value={bulkStudentInput}
                        onChange={e => setBulkStudentInput(e.target.value)}
                        placeholder={`Paste student list here...\nFormat: Name, Admission No, Class No\n\nExample:\nJohn Doe, A101, 1\nJane Smith, A102, 2`}
                        className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-xs font-mono leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/10 resize-none"
                    />
                    <div className="flex justify-end">
                        <button onClick={handleBulkEnroll} disabled={!targetClassId} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-colors disabled:opacity-50">
                            Enroll Students
                        </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                     {students.filter(s => s.classId === targetClassId).map(s => (
                         <div key={s.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-slate-300 transition-colors">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xs font-black text-slate-500">{s.classNumber || '#'}</div>
                                 <div>
                                     <div className="font-bold text-slate-800 text-sm">{s.name}</div>
                                     <div className="text-[9px] font-black text-slate-300 uppercase">ADM: {s.admissionNumber || 'N/A'}</div>
                                 </div>
                             </div>
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => setEditingStudent(s)} className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                 <button onClick={() => triggerConfirm("Expel?", `Remove ${s.name}?`, () => deleteStudent(s.id))} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                             </div>
                         </div>
                     ))}
                     {students.filter(s => s.classId === targetClassId).length === 0 && (
                         <div className="text-center py-10 text-slate-300 text-xs font-bold uppercase tracking-widest">No students in selected class</div>
                     )}
                 </div>
            </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <SectionHeader title="Timetable Import" description="Digitize Schedules from Images" />
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm text-center space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                         <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Teacher Timetables</div>
                         <label className="block p-8 border-2 border-dashed border-slate-200 rounded-3xl hover:bg-slate-50 cursor-pointer transition-colors">
                             <input type="file" hidden onChange={e => setTeacherFile(e.target.files?.[0] || null)} accept="image/*" />
                             <Upload className="w-8 h-8 text-slate-300 mx-auto mb-4" />
                             <span className="text-xs font-bold text-slate-600">{teacherFile ? teacherFile.name : "Choose File"}</span>
                         </label>
                     </div>
                     <div className="space-y-4">
                         <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Class Timetables</div>
                         <label className="block p-8 border-2 border-dashed border-slate-200 rounded-3xl hover:bg-slate-50 cursor-pointer transition-colors">
                             <input type="file" hidden onChange={e => setClassFile(e.target.files?.[0] || null)} accept="image/*" />
                             <Upload className="w-8 h-8 text-slate-300 mx-auto mb-4" />
                             <span className="text-xs font-bold text-slate-600">{classFile ? classFile.name : "Choose File"}</span>
                         </label>
                     </div>
                 </div>
                 
                 {aiImportStatus === 'IDLE' && (
                    <button onClick={handleAiProcess} disabled={!teacherFile && !classFile} className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:shadow-none">
                        Start Analysis
                    </button>
                 )}
                 {aiImportStatus === 'PROCESSING' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Analyzing Documents...</span>
                    </div>
                 )}
                 {aiImportStatus === 'REVIEW' && aiImportResult && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center gap-3 text-emerald-700 font-bold text-xs uppercase tracking-wide">
                            <Check className="w-5 h-5" /> Successfully extracted {aiImportResult.profiles.length} profiles
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button onClick={cancelAiImport} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">Discard</button>
                            <button onClick={finalizeAiImport} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600">Import Data</button>
                        </div>
                    </div>
                 )}
                 {aiImportStatus === 'ERROR' && (
                    <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold">
                        Analysis Failed. Please try clearer images.
                    </div>
                 )}
             </div>
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Cloud Synchronization" description="Multi-device Pairing & Database" />
            <div className="space-y-8">
                {/* Pairing Card */}
                {syncInfo.schoolId && (
                    <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Staff Pairing Token</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Share this code with teachers to link their devices</p>
                            
                            <div className="p-6 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md flex items-center gap-4 group cursor-pointer hover:bg-white/20 transition-all" onClick={handleCopyToken}>
                                <div className="p-3 bg-black/30 rounded-xl">
                                    <Key className="w-6 h-6 text-blue-400" />
                                </div>
                                <code className="flex-1 font-mono text-xs sm:text-sm break-all text-blue-200">
                                    {getPairingToken().substring(0, 40)}...
                                </code>
                                {copiedToken ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-slate-400 group-hover:text-white" />}
                            </div>
                        </div>
                    </div>
                )}

                {/* Firebase Config */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Database Connection</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`w-2 h-2 rounded-full ${syncInfo.isPaired ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{syncInfo.isPaired ? 'Connected to Hive' : 'Running Locally'}</span>
                            </div>
                        </div>
                        {syncInfo.isPaired && (
                            <button onClick={disconnectSync} className="px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">
                                Disconnect
                            </button>
                        )}
                    </div>

                    {!syncInfo.isPaired && (
                        <div className="space-y-4">
                            <textarea 
                                value={configInput}
                                onChange={e => setConfigInput(e.target.value)}
                                placeholder="Paste Firebase Config JSON here..."
                                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono outline-none focus:ring-4 focus:ring-blue-500/10"
                            />
                            <button 
                                onClick={handleConnectFirebase} 
                                disabled={isConnecting}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {isConnecting ? 'Linking...' : 'Initialize Link'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};