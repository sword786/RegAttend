
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Trash2, Plus, FileText, Sparkles, Loader2, FileUp, Check, X, Upload, 
  AlertCircle, ArrowRight, Pencil, Clock, Key, ExternalLink, Save, 
  Download, RotateCcw, UserPlus, Layers, Users, GraduationCap, 
  FileCheck, ShieldAlert, ArrowLeft, Settings as SettingsIcon, ChevronRight,
  Cloud, CloudOff, RefreshCw, Smartphone, Copy, Monitor, ShieldCheck, UserMinus, Zap, BookOpen, Share2, ClipboardList,
  ChevronDown, Wifi, WifiOff, Database, Server, Info, Terminal, Flame, Palette, Hash, Fingerprint, TableProperties, CheckCircle2
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
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
  };
  return (
    <button onClick={onClick} className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 text-left transition-all hover:shadow-2xl hover:translate-y-[-4px] active:scale-[0.98] flex flex-col h-full">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 shadow-sm shrink-0 ${colorClasses[color]}`}>{icon}</div>
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
                                                        <td className="p-4 text-xs font-black text-slate-600 uppercase">{s.className || 'Unknown'}</td>
                                                        <td className="p-4">
                                                            {match ? (
                                                                <div className="flex items-center gap-2 text-emerald-500 text-[9px] font-black uppercase tracking-tighter">
                                                                    <CheckCircle2 className="w-3 h-3" /> Auto-Mapped
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-amber-500 text-[9px] font-black uppercase tracking-tighter">
                                                                    <AlertCircle className="w-3 h-3" /> Manual Check
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-between gap-6">
                                <div className="flex-1">
                                    <h4 className="text-indigo-700 font-black uppercase tracking-widest text-xs mb-1">Global Fallback Register</h4>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Assigned if AI cannot match a row's identifier</p>
                                </div>
                                <div className="relative min-w-[240px]">
                                    <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="w-full pl-5 pr-10 py-3 bg-white border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-widest outline-none appearance-none">
                                        <option value="">-- No Fallback --</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-indigo-400" />
                                </div>
                            </div>
                        </div>
                    )}
                    {studentAiImportStatus === 'COMPLETED' && (
                        <div className="py-20 text-center space-y-6">
                            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100"><Check className="w-12 h-12" /></div>
                            <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Roster Applied Successfully</h4>
                            <button onClick={() => setIsAiRosterModalOpen(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Close Hub</button>
                        </div>
                    )}
                </div>
                {studentAiImportStatus === 'REVIEW' && (
                     <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <button onClick={cancelStudentAiImport} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600">Re-Upload</button>
                        <button onClick={() => { finalizeStudentAiImport(targetClassId || undefined); setIsAiRosterModalOpen(false); }} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4" /> Finalise Enrollment
                        </button>
                     </div>
                )}
            </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-600"><ShieldAlert className="w-8 h-8" /></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed font-bold">{confirmModal.message}</p>
                <div className="flex gap-4">
                    <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                    <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">{confirmModal.confirmText || "Delete"}</button>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'menu' ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="flex items-center gap-6">
              <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl"><SettingsIcon className="w-8 h-8" /></div>
              <div><h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Institutional Node Hub</h2><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-2">Core System Architecture</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <MenuCard icon={<RotateCcw className="w-7 h-7" />} title="General" description="Branding & school identity" onClick={() => setActiveTab('general')} color="blue" />
            {userRole === 'ADMIN' && <MenuCard icon={<Database className="w-7 h-7" />} title="Database Sync" description="Go live with real-time cloud pairing" onClick={() => setActiveTab('sync')} color="indigo" />}
            <MenuCard icon={<Users className="w-7 h-7" />} title="Teachers" description="Manage faculty & registry codes" onClick={() => setActiveTab('teachers')} color="purple" />
            <MenuCard icon={<GraduationCap className="w-7 h-7" />} title="Classes" description="Configure grade sessions & codes" onClick={() => setActiveTab('classes')} color="emerald" />
            <MenuCard icon={<UserPlus className="w-7 h-7" />} title="Students" description="Enrolment & AI Spreadsheet Hub" onClick={() => setActiveTab('students')} color="rose" />
            <MenuCard icon={<Clock className="w-7 h-7" />} title="Periods" description="Adjust session timings" onClick={() => setActiveTab('timetable')} color="blue" />
            <MenuCard icon={<Sparkles className="w-7 h-7" />} title="AI Digitizer" description="Document to timetable grid" onClick={() => setActiveTab('import')} color="amber" />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          {activeTab === 'general' && (
            <>
              <SectionHeader title="General" description="Node Branding & Session" />
              <div className="bg-white p-6 sm:p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">School Identity</label><input value={schoolName} onChange={e => updateSchoolName(e.target.value)} className="w-full p-5 border border-slate-200 rounded-2xl font-black text-slate-800 bg-slate-50 outline-none transition-all" /></div>
                  <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Academic Year</label><input value={academicYear} onChange={e => updateAcademicYear(e.target.value)} className="w-full p-5 border border-slate-200 rounded-2xl font-black text-slate-800 bg-slate-50 outline-none transition-all" /></div>
                </div>
                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">System Theme</label>
                    <div className="flex flex-wrap gap-4">
                        {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#0f172a'].map(c => (
                            <button key={c} onClick={() => updatePrimaryColor(c)} className={`w-14 h-14 rounded-2xl shadow-sm border-4 transition-all ${primaryColor === c ? 'border-white ring-4 ring-slate-200 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
                <div className="pt-12 border-t border-slate-100 flex justify-between items-center">
                    <button onClick={() => triggerConfirm("Irreversible Wipe?", "Clears the current branch's cache.", resetData)} className="px-10 py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">Factory Reset</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'teachers' && renderEntityList('TEACHER')}
          {activeTab === 'classes' && renderEntityList('CLASS')}

          {activeTab === 'students' && (
            <>
              <SectionHeader title="Students" description="Institutional Enrollment Protocol" />
              <div className="space-y-10 animate-in fade-in duration-300">
                <div className="bg-white p-6 sm:p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Roster Registry</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manual or AI-Hub Enrollment</p>
                        </div>
                        <button onClick={() => setIsAiRosterModalOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"><Sparkles className="w-5 h-5" /> AI Spreadsheet Extractor</button>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Register</label>
                            <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none cursor-pointer transition-all hover:bg-slate-100">
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Manual Entry (Name, ADM No, Roll No)</label>
                        <textarea value={bulkStudentInput} onChange={e => setBulkStudentInput(e.target.value)} placeholder="John Doe, 2024/001, 1" className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-slate-700 outline-none focus:bg-white transition-all resize-none shadow-inner" />
                    </div>
                    <button onClick={handleBulkEnroll} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4"><UserPlus className="w-5 h-5" /> Execute Enrollment</button>
                </div>
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center"><h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Enrolled Students ({students.length})</h3></div>
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                                <tr><th className="p-6">Full Name</th><th className="p-6">Registry IDs</th><th className="p-6">Current Roster</th><th className="p-6 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {students.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6 font-black text-slate-800 text-sm">{s.name}</td>
                                        <td className="p-6 font-mono text-[10px] text-slate-400">{s.admissionNumber ? <span className="mr-2">ADM: {s.admissionNumber}</span> : null}{s.classNumber ? <span># {s.classNumber}</span> : null}</td>
                                        <td className="p-6"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">{entities.find(e => e.id === s.classId)?.name || 'Unassigned'}</span></td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingStudent(s)} className="p-3 text-slate-200 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => triggerConfirm("Remove?", `Sure?`, () => deleteStudent(s.id))} className="p-3 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'timetable' && (
             <>
              <SectionHeader title="Periods" description="Institutional Timing Architect" />
              <div className="bg-white p-6 sm:p-12 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                  <div className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <div className="space-y-2 flex-1 w-full"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Period Number</label><input type="number" value={newPeriodNum} onChange={e => setNewPeriodNum(e.target.value)} placeholder="e.g. 1" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/10" /></div>
                      <div className="space-y-2 flex-[2] w-full"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Clock Range</label><input value={newPeriodTime} onChange={e => setNewPeriodTime(e.target.value)} placeholder="e.g. 08:00 - 09:00" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/10" /></div>
                      <button onClick={handleAddOrEditPeriod} className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">{editingPeriod !== null ? 'Update Slot' : 'Add Slot'}</button>
                  </div>
                  <div className="space-y-3">{timeSlots.map(slot => (<div key={slot.period} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all group"><div className="flex items-center gap-6"><div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100">P{slot.period}</div><div className="font-black text-slate-700">{slot.timeRange}</div></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setNewPeriodNum(slot.period.toString()); setNewPeriodTime(slot.timeRange); setEditingPeriod(slot.period); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><Pencil className="w-4 h-4" /></button><button onClick={() => deleteTimeSlot(slot.period)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button></div></div>))}</div>
              </div>
             </>
          )}

          {activeTab === 'import' && (
             <>
                <SectionHeader title="AI Timetable" description="Document to Roster Digitization" />
                <div className="bg-white p-8 sm:p-12 rounded-[3.5rem] border border-slate-200 shadow-sm">
                    {aiImportStatus === 'IDLE' || aiImportStatus === 'ERROR' ? (
                        <div className="space-y-8">
                            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 text-amber-800 text-xs font-bold flex items-start gap-4"><Sparkles className="w-6 h-6 shrink-0" /><div><p className="mb-2 uppercase tracking-widest font-black">Institutional Protocol</p>Upload physical timetable grids for AI profile generation.</div></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Faculty Schedule</label><label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-all group overflow-hidden"><input type="file" onChange={e => setTeacherFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,image/*" />{teacherFile ? <div className="p-4 text-center text-blue-600 font-bold">{teacherFile.name}</div> : <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-500" />}</label></div>
                                <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Grade Schedule</label><label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-all group overflow-hidden"><input type="file" onChange={e => setClassFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,image/*" />{classFile ? <div className="p-4 text-center text-blue-600 font-bold">{classFile.name}</div> : <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-500" />}</label></div>
                            </div>
                            <button onClick={handleAiProcess} disabled={!teacherFile && !classFile} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-600 disabled:opacity-50 transition-all">Start Analysis</button>
                        </div>
                    ) : aiImportStatus === 'PROCESSING' ? (
                        <div className="py-24 text-center"><Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-8" /><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Analyzing Matrices...</h3></div>
                    ) : (
                        <div className="space-y-8">
                            <div className="max-h-96 overflow-y-auto space-y-3 p-2">{aiImportResult?.profiles.map((p, i) => (<div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-xs shadow-sm">{p.shortCode}</div><div><div className="font-black text-slate-700 text-sm">{p.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.type} Record</div></div></div></div>))}</div>
                            <div className="flex gap-4"><button onClick={cancelAiImport} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-widest">Discard</button><button onClick={finalizeAiImport} className="flex-[2] py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl">Enroll AI Profiles</button></div>
                        </div>
                    )}
                </div>
             </>
          )}

          {activeTab === 'sync' && userRole === 'ADMIN' && (
            <>
              <SectionHeader title="Database Sync" description="Cloud Infrastructure Core" />
              <div className="space-y-10">
                  <div className={`p-10 rounded-[4rem] border-2 flex flex-col lg:flex-row items-center justify-between gap-10 transition-all duration-500 ${syncInfo.isPaired ? 'bg-slate-900 text-white border-blue-500 shadow-2xl' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-8 flex-col lg:flex-row text-center lg:text-left">
                          <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-xl ${syncInfo.isPaired ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-300'}`}>{syncInfo.connectionState === 'CONNECTED' ? <Wifi className="w-10 h-10 animate-pulse" /> : <WifiOff className="w-10 h-10" />}</div>
                          <div><h3 className="text-2xl font-black uppercase tracking-tighter mb-2">{syncInfo.isPaired ? 'Hub Synchronized' : 'Standalone Protocol'}</h3><p className={`text-xs font-bold uppercase tracking-widest leading-relaxed max-w-sm ${syncInfo.isPaired ? 'text-blue-300' : 'text-slate-400'}`}>{syncInfo.isPaired ? `Live broadcast established with institutional cloud.` : 'Paste Firebase config to activate real-time synchronization.'}</p></div>
                      </div>
                      {syncInfo.isPaired && <button onClick={disconnectSync} className="w-full lg:w-auto px-10 py-5 bg-rose-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-xl">Close Connection</button>}
                  </div>

                  {!syncInfo.isPaired ? (
                      <div className="bg-orange-50/50 p-10 rounded-[3.5rem] border border-orange-100 space-y-8">
                        <div className="flex items-center gap-6"><div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center shadow-sm shrink-0"><Flame className="w-8 h-8" /></div><div><h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Backend Activation</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connect your Firebase Realtime database cluster</p></div></div>
                        <textarea value={configInput} onChange={e => setConfigInput(e.target.value)} placeholder='Paste Firebase Config Object here...' className="w-full h-48 p-7 bg-white border border-slate-200 rounded-[2rem] font-mono text-[11px] text-slate-600 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all resize-none shadow-sm" />
                        <div className="flex justify-end"><button onClick={handleConnectFirebase} disabled={isConnecting} className="px-10 py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-700 transition-all flex items-center gap-3 disabled:opacity-50">{isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {isConnecting ? 'Linking Node...' : 'Connect Node'}</button></div>
                      </div>
                  ) : (
                      <div className="p-10 bg-white rounded-[3.5rem] border border-blue-100 shadow-xl space-y-8 animate-in zoom-in-95 duration-500">
                          <div className="flex items-center gap-6"><div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center border border-blue-100"><Share2 className="w-8 h-8" /></div><div><h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Staff Pairing Key</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Share this key with teachers to link their devices</p></div></div>
                          <div className="relative group"><div className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[9px] text-slate-500 break-all h-24 overflow-y-auto scrollbar-hide pr-16">{getPairingToken()}</div><button onClick={handleCopyToken} className="absolute right-4 top-4 p-3 bg-blue-600 text-white rounded-xl shadow-lg transition-all active:scale-90">{copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div>
                          {copiedToken && <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] text-center animate-bounce">Key Copied to Clipboard</p>}
                      </div>
                  )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
