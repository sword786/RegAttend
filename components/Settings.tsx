
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
  return (
    <button onClick={onClick} className={`group bg-white p-8 rounded-[2.5rem] border border-slate-200 text-left transition-all hover:shadow-2xl hover:translate-y-[-4px] active:scale-[0.98] flex flex-col h-full ${highlight ? 'ring-8 ring-blue-500/10 border-blue-200' : ''}`}>
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
    schoolName, updateSchoolName, 
    academicYear, updateAcademicYear,
    primaryColor, updatePrimaryColor,
    entities, addEntity, deleteEntity, updateEntity,
    students, addStudents, deleteStudent, updateStudent,
    timeSlots, updateTimeSlots, deleteTimeSlot,
    resetData,
    aiImportStatus, aiImportResult, startAiImport, cancelAiImport, finalizeAiImport,
    studentAiImportStatus, studentAiImportResult, startStudentAiImport, cancelStudentAiImport, finalizeStudentAiImport,
    syncInfo, generateSyncToken, disconnectSync,
    firebaseConfig, setFirebaseConfig
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
    addEntity({
      id: `${type.toLowerCase()}-${Date.now()}`,
      name: newEntityName.trim(),
      shortCode: newEntityCode.trim().toUpperCase() || newEntityName.trim().substring(0, 3).toUpperCase(),
      type,
      schedule: createEmptySchedule()
    });
    setNewEntityName('');
    setNewEntityCode('');
  };

  const handleBulkEnroll = () => {
    if (!bulkStudentInput.trim() || !targetClassId) return;
    const newStuds = bulkStudentInput.split('\n').filter(l => l.trim()).map((line, idx) => {
      const parts = line.split(/\s*[,;\t]\s*/).map(p => p.trim());
      return { id: `student-${Date.now()}-${idx}`, name: parts[0], rollNumber: parts[2] || '', classId: targetClassId, admissionNumber: parts[1], classNumber: parts[2] };
    });
    addStudents(newStuds); 
    setBulkStudentInput('');
  };

  const handleStudentAiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) startStudentAiImport(Array.from(files));
  };

  const checkClassMatch = (extractedClassName: string | undefined) => {
    if (!extractedClassName) return null;
    return classes.find(c => c.name.toLowerCase().includes(extractedClassName.toLowerCase()) || (c.shortCode && extractedClassName.toLowerCase().includes(c.shortCode.toLowerCase())));
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

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 sm:px-0">
      {/* MODALS */}
      {isAiRosterModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Excel • Image • PDF</div>
                            <div className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Auto-Apply Sync</div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">AI Roster Extraction</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Class, Roll No, ADM No and Name processed automatically</p>
                    </div>
                    <button onClick={() => setIsAiRosterModalOpen(false)} className="p-2 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                        <X className="w-6 h-6 text-slate-400"/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                    {studentAiImportStatus === 'IDLE' && (
                        <div onClick={() => aiFileInputRef.current?.click()} className="group border-4 border-dashed border-slate-100 bg-slate-50 rounded-[2.5rem] p-16 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                            <input type="file" ref={aiFileInputRef} hidden multiple onChange={handleStudentAiUpload} accept=".xlsx,.xls,.csv,image/*,.pdf" />
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                                <Upload className="w-10 h-10 text-indigo-500" />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Drop Excel, Image or PDF rosters</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] mt-3">Multimodal AI Engine Enabled</p>
                        </div>
                    )}

                    {studentAiImportStatus === 'PROCESSING' && (
                        <div className="py-24 text-center space-y-8">
                            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto" />
                            <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">AI Verifying Matrix Data...</h4>
                        </div>
                    )}

                    {studentAiImportStatus === 'REVIEW' && studentAiImportResult && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-inner">
                                <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <TableProperties className="w-4 h-4 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extracted Log ({studentAiImportResult.students.length})</span>
                                    </div>
                                    <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Class Mapping Engaged</div>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="p-4">Name</th>
                                                <th className="p-4">Roll</th>
                                                <th className="p-4">AI Detected Class</th>
                                                <th className="p-4">Match Result</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {studentAiImportResult.students.map((s, idx) => {
                                                const match = checkClassMatch(s.className);
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors text-xs">
                                                        <td className="p-4 font-black text-slate-700">{s.name}</td>
                                                        <td className="p-4 font-bold text-slate-400">{s.rollNumber || '-'}</td>
                                                        <td className="p-4 font-black text-slate-600 uppercase">{s.className || 'Unknown'}</td>
                                                        <td className="p-4">
                                                            {match ? (
                                                                <div className="flex items-center gap-2 text-emerald-500 text-[9px] font-black uppercase tracking-tighter">
                                                                    <CheckCircle2 className="w-3 h-3" /> Auto-Mapped to {match.name}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-amber-500 text-[9px] font-black uppercase tracking-tighter">
                                                                    <AlertCircle className="w-3 h-3" /> Manual Required
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
                                    <h4 className="text-indigo-700 font-black uppercase tracking-widest text-xs mb-1">Global Fallback</h4>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Used if AI cannot match a row's class</p>
                                </div>
                                <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="min-w-[240px] px-5 py-3 bg-white border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-widest outline-none">
                                    <option value="">-- No Fallback --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {studentAiImportStatus === 'COMPLETED' && (
                        <div className="py-20 text-center space-y-6">
                            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100"><Check className="w-12 h-12" /></div>
                            <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Roster Applied</h4>
                            <button onClick={() => setIsAiRosterModalOpen(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Dismiss Hub</button>
                        </div>
                    )}
                </div>

                {studentAiImportStatus === 'REVIEW' && (
                     <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <button onClick={cancelStudentAiImport} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600">Cancel & Reset</button>
                        <button onClick={() => { finalizeStudentAiImport(targetClassId || undefined); setIsAiRosterModalOpen(false); }} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4" /> Finalize Enrollment
                        </button>
                     </div>
                )}
            </div>
        </div>
      )}

      {/* TABS */}
      {activeTab === 'menu' ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="flex items-center gap-6">
              <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl"><SettingsIcon className="w-8 h-8" /></div>
              <div><h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Settings</h2><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-2">Unified Control Panel</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <MenuCard icon={<RotateCcw className="w-7 h-7" />} title="General" description="Branding & basic info" onClick={() => setActiveTab('general')} color="blue" />
            <MenuCard icon={<Database className="w-7 h-7" />} title="Sync" description="Cloud pairing & setup" onClick={() => setActiveTab('sync')} color="indigo" />
            <MenuCard icon={<Users className="w-7 h-7" />} title="Teachers" description="Manage faculty members" onClick={() => setActiveTab('teachers')} color="purple" />
            <MenuCard icon={<GraduationCap className="w-7 h-7" />} title="Classes" description="Configure grade sessions" onClick={() => setActiveTab('classes')} color="emerald" />
            <MenuCard icon={<UserPlus className="w-7 h-7" />} title="Students" description="Enrolment & rosters" onClick={() => setActiveTab('students')} color="rose" />
            <MenuCard icon={<Clock className="w-7 h-7" />} title="Periods" description="Adjust session timings" onClick={() => setActiveTab('timetable')} color="blue" />
            <MenuCard icon={<Sparkles className="w-7 h-7" />} title="AI Import" description="Auto-fill with document AI" onClick={() => setActiveTab('import')} color="amber" highlight={aiImportStatus === 'REVIEW'} />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          {activeTab === 'general' && (
            <>
              <SectionHeader title="General" description="System Core Configuration" />
              <div className="bg-white p-6 sm:p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">School Identity</label><input value={schoolName} onChange={e => updateSchoolName(e.target.value)} className="w-full p-5 border border-slate-200 rounded-2xl font-black text-slate-800 bg-slate-50 outline-none transition-all focus:bg-white" /></div>
                  <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Academic Session</label><input value={academicYear} onChange={e => updateAcademicYear(e.target.value)} className="w-full p-5 border border-slate-200 rounded-2xl font-black text-slate-800 bg-slate-50 outline-none transition-all focus:bg-white" /></div>
                </div>
                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Primary Branding Color</label>
                    <div className="flex flex-wrap gap-4">
                        {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#0f172a'].map(c => (
                            <button key={c} onClick={() => updatePrimaryColor(c)} className={`w-14 h-14 rounded-2xl shadow-sm border-4 transition-all ${primaryColor === c ? 'border-white ring-4 ring-slate-200 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'students' && (
            <>
              <SectionHeader title="Students" description="Enrollment Center" />
              <div className="space-y-10 animate-in fade-in duration-300">
                <div className="bg-white p-6 sm:p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-4">
                        <div className="space-y-1">
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Enrollment Portal</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manual or AI Spreadsheet Protocol</p>
                        </div>
                        <button 
                            onClick={() => setIsAiRosterModalOpen(true)}
                            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            <Sparkles className="w-5 h-5" /> AI Spreadsheet Extractor
                        </button>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Register</label>
                        <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none">
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Manual Entry (Format: Name, AdmNo, ClassNo)</label>
                        <textarea value={bulkStudentInput} onChange={e => setBulkStudentInput(e.target.value)} placeholder="John Doe, 2024/001, 1" className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-slate-700 outline-none resize-none shadow-inner" />
                    </div>
                    <button onClick={handleBulkEnroll} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all"><UserPlus className="w-5 h-5 inline mr-2" /> Bulk Enroll</button>
                </div>
                
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center"><h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Enrolled ({students.length})</h3></div>
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                                <tr><th className="p-6">Full Name</th><th className="p-6">Roll No</th><th className="p-6">Class</th><th className="p-6 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {students.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 group">
                                        <td className="p-6 font-black text-slate-800 text-sm">{s.name}</td>
                                        <td className="p-6 font-mono text-[10px] text-slate-400">{s.rollNumber || '--'}</td>
                                        <td className="p-6"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{entities.find(e => e.id === s.classId)?.name || 'Unassigned'}</span></td>
                                        <td className="p-6 text-right">
                                            <button onClick={() => deleteStudent(s.id)} className="p-3 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 className="w-4 h-4" /></button>
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

          {activeTab === 'teachers' && (
             <>
               <SectionHeader title="Teachers" description="Faculty Management" />
               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex gap-4 items-end mb-10">
                     <div className="flex-1"><input value={newEntityName} onChange={e => setNewEntityName(e.target.value)} placeholder="Teacher Name" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" /></div>
                     <button onClick={() => handleAddEntity('TEACHER')} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Add</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {entities.filter(e => e.type === 'TEACHER').map(e => (
                        <div key={e.id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center group">
                           <span className="font-black text-slate-700">{e.name}</span>
                           <button onClick={() => deleteEntity(e.id)} className="p-2 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     ))}
                  </div>
               </div>
             </>
          )}

          {activeTab === 'classes' && (
             <>
               <SectionHeader title="Classes" description="Grade Management" />
               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex gap-4 items-end mb-10">
                     <div className="flex-1"><input value={newEntityName} onChange={e => setNewEntityName(e.target.value)} placeholder="Class Name (e.g. 10A)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" /></div>
                     <button onClick={() => handleAddEntity('CLASS')} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Add</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {entities.filter(e => e.type === 'CLASS').map(e => (
                        <div key={e.id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center group">
                           <span className="font-black text-slate-700">{e.name}</span>
                           <button onClick={() => deleteEntity(e.id)} className="p-2 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     ))}
                  </div>
               </div>
             </>
          )}

          {activeTab === 'sync' && (
            <>
              <SectionHeader title="Live Sync" description="Cloud Pair Configuration" />
              <div className="space-y-10">
                  <div className={`p-10 rounded-[4rem] border-2 flex flex-col lg:flex-row items-center justify-between gap-10 transition-all ${syncInfo.isPaired ? 'bg-slate-900 text-white border-blue-500 shadow-2xl' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-8">
                          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center ${syncInfo.isPaired ? 'bg-blue-600' : 'bg-slate-50'}`}>
                              {syncInfo.connectionState === 'CONNECTED' ? <Wifi className="w-10 h-10 animate-pulse text-white" /> : <WifiOff className="w-10 h-10 text-slate-300" />}
                          </div>
                          <div>
                              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">{syncInfo.isPaired ? 'Synchronized' : 'Offline'}</h3>
                              <p className={`text-xs font-bold uppercase tracking-widest opacity-60 ${syncInfo.isPaired ? 'text-blue-300' : 'text-slate-400'}`}>Institutional Node Link Status</p>
                          </div>
                      </div>
                      <button onClick={syncInfo.isPaired ? disconnectSync : generateSyncToken} className="px-10 py-5 bg-blue-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-xl">
                        {syncInfo.isPaired ? 'Disconnect Hub' : 'Initialize Hub'}
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
