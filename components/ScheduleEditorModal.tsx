
import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, AlertCircle, Layers, Users, GraduationCap, MapPin, Pencil, User, ChevronDown, BookOpen, Check } from 'lucide-react';
import { TimetableEntry } from '../types';
import { useData } from '../contexts/DataContext';

interface ScheduleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: TimetableEntry | null) => void;
  day: string;
  period: number;
  currentEntry: TimetableEntry | null;
  entityName: string;
  entityType: 'TEACHER' | 'CLASS';
}

export const ScheduleEditorModal: React.FC<ScheduleEditorModalProps> = ({ 
    isOpen, onClose, onSave, day, period, currentEntry, entityName, entityType 
}) => {
  const { entities } = useData();
  const [subject, setSubject] = useState(currentEntry?.subject || '');
  const [room, setRoom] = useState(currentEntry?.room || '');
  const [relatedCode, setRelatedCode] = useState(currentEntry?.teacherOrClass || '');
  const [sessionType, setSessionType] = useState<'normal' | 'split' | 'combined'>(currentEntry?.type || 'normal');
  
  // Combined selection
  const [selectedClasses, setSelectedClasses] = useState<string[]>(currentEntry?.targetClasses || []);
  
  // Split selection
  const [splitSubject, setSplitSubject] = useState(currentEntry?.splitSubject || '');
  const [splitTeacher, setSplitTeacher] = useState(currentEntry?.splitTeacher || '');

  const [error, setError] = useState<string | null>(null);

  const targetEntities = entities.filter(e => e.type !== entityType);
  const classesOnly = entities.filter(e => e.type === 'CLASS');
  const teachersOnly = entities.filter(e => e.type === 'TEACHER');

  const handleSave = () => {
    if (!subject.trim()) {
        setError('Subject code is required');
        return;
    }
    
    // Construct entry carefully to avoid undefined values
    const entry: TimetableEntry = {
        subject: subject.toUpperCase().trim(),
        type: sessionType
    };

    if (room.trim()) entry.room = room.trim();
    if (relatedCode.trim()) entry.teacherOrClass = relatedCode.trim();
    
    if (sessionType === 'combined' && selectedClasses.length > 0) {
        entry.targetClasses = selectedClasses;
    }

    if (sessionType === 'split') {
        if (splitSubject.trim()) entry.splitSubject = splitSubject.trim();
        if (splitTeacher.trim()) entry.splitTeacher = splitTeacher.trim();
    }
    
    onSave(entry);
    onClose();
  };

  const toggleClassSelection = (code: string) => {
    setSelectedClasses(prev => 
        prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-lg overflow-hidden ring-1 ring-white/20 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
           <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3">
                 <Pencil className="w-3 h-3" /> Slot Editor
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{entityName}</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">{day} • Period {period}</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all">
              <X className="w-6 h-6 text-slate-400"/>
           </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}
            
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Session Format</label>
                <div className="grid grid-cols-3 gap-3">
                    {(['normal', 'split', 'combined'] as const).map(type => (
                        <button key={type} onClick={() => setSessionType(type)} className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-2 ${sessionType === type ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                            {type === 'normal' && <Users className="w-4 h-4" />}
                            {type === 'split' && <Layers className="w-4 h-4" />}
                            {type === 'combined' && <GraduationCap className="w-4 h-4" />}
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Primary Subject</label>
                    <div className="relative">
                        <BookOpen className="absolute left-4 top-3.5 w-4 h-4 text-slate-300" />
                        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="MATH" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Room</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-slate-300" />
                        <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Rm 102" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                    </div>
                </div>
            </div>

            {/* Normal / Default Related Entity */}
            {sessionType === 'normal' && (
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Assigned {entityType === 'CLASS' ? 'Teacher' : 'Class'}</label>
                    <div className="relative">
                        <select value={relatedCode} onChange={e => setRelatedCode(e.target.value)} className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-black outline-none appearance-none cursor-pointer">
                            <option value="">-- No Selection --</option>
                            {targetEntities.map(e => <option key={e.id} value={e.shortCode || e.name}>{e.name} ({e.shortCode || '??'})</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-300" />
                    </div>
                </div>
            )}

            {/* Combined Class Selection */}
            {sessionType === 'combined' && (
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Join Classes to this Session</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                        {classesOnly.map(cls => (
                            <button key={cls.id} onClick={() => toggleClassSelection(cls.shortCode || cls.name)} className={`p-3 rounded-xl border flex items-center justify-between text-[11px] font-black uppercase tracking-tight transition-all ${selectedClasses.includes(cls.shortCode || cls.name) ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                <span>{cls.name}</span>
                                {selectedClasses.includes(cls.shortCode || cls.name) && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Split Class Configuration */}
            {sessionType === 'split' && (
                <div className="p-5 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-4">
                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><Layers className="w-4 h-4" /> Secondary Split Details</div>
                    <div className="grid grid-cols-2 gap-4">
                        <input value={splitSubject} onChange={e => setSplitSubject(e.target.value)} placeholder="Subject (Split)" className="p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold outline-none" />
                        <select value={splitTeacher} onChange={e => setSplitTeacher(e.target.value)} className="p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold outline-none">
                            <option value="">Teacher (Split)</option>
                            {teachersOnly.map(t => <option key={t.id} value={t.shortCode || t.name}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
            )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center">
            <button onClick={() => { onSave(null); onClose(); }} className="w-full sm:w-auto px-6 py-4 rounded-2xl text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50"><Trash2 className="w-4 h-4 mr-2" /> Clear</button>
            <div className="flex gap-3 w-full sm:flex-1 sm:justify-end">
                <button onClick={onClose} className="px-6 py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest">Cancel</button>
                <button onClick={handleSave} className="flex-1 sm:flex-none px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">Save Slot</button>
            </div>
        </div>
      </div>
    </div>
  );
};
