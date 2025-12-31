import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Trash2, Plus, FileText, Sparkles, Loader2, FileUp, Check, X, Upload, AlertCircle, ArrowRight, Pencil, Clock, Key, ExternalLink, Save, Download, RotateCcw, UserPlus, Layers, Users, GraduationCap, FileCheck } from 'lucide-react';
import { EntityProfile, TimeSlot } from '../types';

type SettingsTab = 'general' | 'timetable' | 'teachers' | 'classes' | 'students' | 'import';

export const Settings: React.FC = () => {
  const { 
    schoolName, updateSchoolName, 
    academicYear, updateAcademicYear,
    entities, addEntity, deleteEntity, updateEntity,
    students, addStudent, deleteStudent,
    timeSlots, updateTimeSlots,
    resetData,
    aiImportStatus, aiImportResult, aiImportErrorMessage, startAiImport, cancelAiImport, finalizeAiImport
  } = useData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  
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
  
  // TimeSlot State
  const [localTimeSlots, setLocalTimeSlots] = useState<TimeSlot[]>([]);
  const [isEditingSlots, setIsEditingSlots] = useState(false);
  
  const classes = useMemo(() => entities.filter(e => e.type === 'CLASS'), [entities]);
  const teachers = useMemo(() => entities.filter(e => e.type === 'TEACHER'), [entities]);

  useEffect(() => {
    setLocalTimeSlots(timeSlots);
  }, [timeSlots]);

  useEffect(() => {
    if (activeTab === 'students' && !targetClassId && classes.length > 0) {
        setTargetClassId(classes[0].id);
    }
  }, [activeTab, classes, targetClassId]);

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const handleStartProcessing = () => {
      const files: { file: File, label: 'TEACHER' | 'CLASS' }[] = [];
      if (teacherFile) files.push({ file: teacherFile, label: 'TEACHER' });
      if (classFile) files.push({ file: classFile, label: 'CLASS' });
      
      // Enforce both files being present for intelligent cross-referencing
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

  const handleSaveSlots = () => {
      updateTimeSlots(localTimeSlots);
      setIsEditingSlots(false);
  };

  const handleSlotChange = (index: number, field: keyof TimeSlot, value: any) => {
      const newSlots = [...localTimeSlots];
      newSlots[index] = { ...newSlots[index], [field]: value };
      setLocalTimeSlots(newSlots);
  };

  const handleAddSlot = () => {
      const nextPeriod = localTimeSlots.length + 1;
      setLocalTimeSlots([...localTimeSlots, { period: nextPeriod, timeRange: '00:00 - 00:00' }]);
  };

  const handleRemoveSlot = (index: number) => {
      const newSlots = localTimeSlots.filter((_, i) => i !== index).map((s, i) => ({ ...s, period: i + 1 }));
      setLocalTimeSlots(newSlots);
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">{type === 'CLASS' ? 'Class Registry' : 'Teacher Registry'}</h3>
          <button 
            onClick={() => setIsAddingEntity(type)} 
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-2" /> Add {type === 'CLASS' ? 'Class' : 'Teacher'}
          </button>
        </div>
        {isAddingEntity === type && (
            <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex flex-col sm:flex-row gap-3 items-end sm:items-center animate-in fade-in">
                <div className="flex-1 w-full space-y-1">
                    <label className="text-[10px] font-bold text-blue-400 uppercase">Name</label>
                    <input autoFocus value={newEntityName} onChange={e => setNewEntityName(e.target.value)} placeholder={`e.g. ${type === 'CLASS' ? 'Grade 10A' : 'Mr. Smith'}`} className="w-full p-2 border border-blue-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div className="w-full sm:w-32 space-y-1">
                    <label className="text-[10px] font-bold text-blue-400 uppercase">Code</label>
                    <input value={newEntityCode} onChange={e => setNewEntityCode(e.target.value)} placeholder="e.g. 10A" className="w-full p-2 border border-blue-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsAddingEntity(null)} className="px-4 py-2 bg-white text-slate-500 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50">Cancel</button>
                    <button onClick={() => handleAddEntity(type)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">Save</button>
                </div>
            </div>
        )}
        <div className="divide-y divide-slate-100">
          {items.map(item => (
            <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/50 transition-colors gap-4">
               {editingId === item.id ? (
                   <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 p-2 border border-blue-300 rounded-lg text-sm font-bold outline-none bg-white" />
                        <input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-full sm:w-24 p-2 border border-blue-300 rounded-lg text-sm font-bold outline-none bg-white" />
                        <div className="flex gap-2">
                             <button onClick={saveEditing} className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Check className="w-4 h-4" /></button>
                             <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                   </div>
               ) : (
                   <>
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shrink-0">{item.shortCode || '?'}</div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.shortCode}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => startEditing(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => triggerConfirm("Delete Registry Entry?", `Are you sure you want to delete ${item.name}?`, () => deleteEntity(item.id))} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                   </>
               )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderImportReview = () => {
      if (!aiImportResult) return null;
      return (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                  <div className="bg-slate-900 p-8 text-white">
                      <h2 className="text-xl font-black uppercase tracking-widest flex items-center">
                          <Sparkles className="w-5 h-5 mr-3 text-blue-400" /> Extraction Complete
                      </h2>
                      <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">
                          AI has processed and cross-referenced your documents.
                      </p>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                              <div className="text-2xl font-black text-blue-700">{aiImportResult.profiles.filter(p => p.type === 'TEACHER').length}</div>
                              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Teachers Identified</div>
                          </div>
                          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                              <div className="text-2xl font-black text-indigo-700">{aiImportResult.profiles.filter(p => p.type === 'CLASS').length}</div>
                              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Classes Identified</div>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <h4 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Summary of Extracted Profiles</h4>
                          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                              {aiImportResult.profiles.map((p, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-lg ${p.type === 'TEACHER' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                              {p.type === 'TEACHER' ? <Users className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                                          </div>
                                          <span className="text-sm font-bold text-slate-800">{p.name}</span>
                                      </div>
                                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{p.shortCode}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                          <button onClick={cancelAiImport} className="px-6 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-xl">Discard</button>
                          <button onClick={finalizeAiImport} className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-700 transition-all">Import Everything</button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  if (aiImportStatus === 'REVIEW') return renderImportReview();

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 className="text-lg font-black text-gray-800 mb-2">{confirmModal.title}</h3>
                <p className="text-sm text-gray-500 mb-6">{confirmModal.message}</p>
                <div className="flex gap-3">
                    <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</button>
                    <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest">{confirmModal.confirmText}</button>
                </div>
            </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit mx-auto shadow-sm">
        {(['general', 'timetable', 'teachers', 'classes', 'students', 'import'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">General Config</h3>
              <div className="flex gap-2">
                  <button onClick={handleExportData} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center transition-all"><Download className="w-3.5 h-3.5 mr-2" /> Export</button>
                  <button onClick={handleSelectKey} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 flex items-center transition-all"><Key className="w-3.5 h-3.5 mr-2" /> API Key</button>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">School Name</label>
              <input type="text" value={schoolName} onChange={e => updateSchoolName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</label>
              <input type="text" value={academicYear} onChange={e => updateAcademicYear(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none" />
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100">
              <button onClick={() => triggerConfirm("Factory Reset System?", "Delete all data?", () => resetData())} className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-black uppercase tracking-widest flex items-center"><RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset Everything</button>
          </div>
        </div>
      )}

      {activeTab === 'timetable' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-6">Period Structure</h3>
              <div className="space-y-3">
                  {timeSlots.map(s => (
                      <div key={s.period} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                          <span className="font-black text-slate-700">Period {s.period}</span>
                          <span className="text-sm font-bold text-slate-500">{s.timeRange}</span>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'teachers' && renderEntityList('TEACHER')}
      {activeTab === 'classes' && renderEntityList('CLASS')}
      
      {activeTab === 'students' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Enrollment</h3>
              <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulk CSV (Name, Roll)</label>
                      <textarea value={bulkStudentInput} onChange={e => setBulkStudentInput(e.target.value)} placeholder={`John Doe, R-001`} className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                      <button onClick={handleBulkImportStudents} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">Import Bulk</button>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                      <h4 className="font-bold text-slate-700 text-sm">Target Class</h4>
                      <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none">
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Single Student Name" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none" />
                      <button onClick={handleAddSingleStudent} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest">Add Single</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'import' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden text-center">
            {aiImportStatus === 'PROCESSING' && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Cross-Referencing Timetables...</h3>
                    <p className="text-slate-400 text-xs mt-3 font-bold uppercase tracking-widest">Syncing teachers with classes automatically</p>
                </div>
            )}
            
            <div className="flex flex-col items-center mb-10">
                <div className="p-4 bg-blue-100 rounded-3xl text-blue-600 mb-6 shadow-xl shadow-blue-50">
                    <Sparkles className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest">Intelligent Import</h3>
                <p className="text-slate-400 text-xs mt-3 font-bold max-w-sm uppercase tracking-widest">Upload BOTH timetables below. AI will resolve all names and codes automatically.</p>
            </div>

            {aiImportErrorMessage && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex flex-col items-center gap-3 mb-10 text-rose-600 font-black text-[10px] uppercase tracking-widest">
                    <AlertCircle className="w-5 h-5" /> {aiImportErrorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Teacher Timetable Staging */}
                <div 
                    className={`border-2 border-dashed rounded-3xl p-10 transition-all cursor-pointer group flex flex-col items-center ${teacherFile ? 'bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-blue-300'}`}
                    onClick={() => teacherFileInputRef.current?.click()}
                >
                    {teacherFile ? (
                        <FileCheck className="w-12 h-12 text-emerald-500 mb-4 animate-bounce" />
                    ) : (
                        <Users className="w-12 h-12 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
                    )}
                    <h4 className="font-black text-slate-800 uppercase tracking-widest text-[13px] mb-2">Teacher Document</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 text-center">{teacherFile ? teacherFile.name : 'Individual schedules for all teachers'}</p>
                    <input type="file" ref={teacherFileInputRef} onChange={e => setTeacherFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,image/*" />
                    <div className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${teacherFile ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
                        {teacherFile ? 'Change File' : 'Stash PDF / Image'}
                    </div>
                </div>

                {/* Class Timetable Staging */}
                <div 
                    className={`border-2 border-dashed rounded-3xl p-10 transition-all cursor-pointer group flex flex-col items-center ${classFile ? 'bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-blue-300'}`}
                    onClick={() => classFileInputRef.current?.click()}
                >
                    {classFile ? (
                        <FileCheck className="w-12 h-12 text-emerald-500 mb-4 animate-bounce" />
                    ) : (
                        <GraduationCap className="w-12 h-12 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                    )}
                    <h4 className="font-black text-slate-800 uppercase tracking-widest text-[13px] mb-2">Class Document</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 text-center">{classFile ? classFile.name : 'Master schedule for all classes'}</p>
                    <input type="file" ref={classFileInputRef} onChange={e => setClassFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,image/*" />
                    <div className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${classFile ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
                        {classFile ? 'Change File' : 'Stash PDF / Image'}
                    </div>
                </div>
            </div>

            <div className="mt-12 space-y-4">
                <button 
                    disabled={!teacherFile || !classFile}
                    onClick={handleStartProcessing}
                    className="w-full max-w-sm py-5 bg-blue-600 text-white rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
                >
                    Start Intelligent Extraction
                </button>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Supports PDFs, PNGs, and JPEGs up to 10MB each</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
