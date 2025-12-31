
import React, { useState } from 'react';
import { X, Trash2, Save, AlertCircle, Layers, Users, GraduationCap, MapPin } from 'lucide-react';
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter valid options (if editing Class, show Teachers, etc.)
  const targetEntities = entities.filter(e => e.type !== entityType);

  const handleSave = () => {
    if (!subject.trim()) {
        setError('Subject code is required');
        return;
    }
    onSave({
        subject: subject.toUpperCase(),
        room: room || undefined,
        teacherOrClass: relatedCode || undefined,
        type: sessionType
    });
    onClose();
  };

  const handleDelete = () => {
    if (isConfirmingDelete) {
        onSave(null);
        onClose();
    } else {
        setIsConfirmingDelete(true);
        setTimeout(() => setIsConfirmingDelete(false), 3000); // Reset after 3s
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/20">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
           <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3">
                 <Pencil className="w-3 h-3" /> Schedule Management
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{entityName}</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                 {day} • Period {period}
              </p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white rounded-2xl shadow-sm border border-transparent hover:border-slate-200 transition-all">
              <X className="w-6 h-6 text-slate-400"/>
           </button>
        </div>

        <div className="p-8 space-y-6">
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}
            
            {/* Session Type Select */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Session Format</label>
                <div className="grid grid-cols-3 gap-3">
                    {(['normal', 'split', 'combined'] as const).map(type => (
                        <button 
                            key={type}
                            onClick={() => setSessionType(type)}
                            className={`p-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-2 ${
                                sessionType === type 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                                : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            {type === 'normal' && <Users className="w-4 h-4" />}
                            {type === 'split' && <Layers className="w-4 h-4" />}
                            {type === 'combined' && <GraduationCap className="w-4 h-4" />}
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Subject Code</label>
                    <div className="relative">
                        <BookOpen className="absolute left-4 top-3.5 w-4 h-4 text-slate-300" />
                        <input 
                            autoFocus
                            value={subject}
                            onChange={e => { setSubject(e.target.value); setError(null); }}
                            placeholder="e.g. MATH, ENG"
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-black outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Venue / Room</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-slate-300" />
                        <input 
                            value={room}
                            onChange={e => setRoom(e.target.value)}
                            placeholder="e.g. Lab 1"
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-black outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 transition-all"
                        />
                    </div>
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                    Assigned {entityType === 'CLASS' ? 'Teacher' : 'Class'}
                </label>
                <div className="relative">
                    {entityType === 'CLASS' ? <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-300" /> : <GraduationCap className="absolute left-4 top-3.5 w-4 h-4 text-slate-300" />}
                    <select
                        value={relatedCode}
                        onChange={e => setRelatedCode(e.target.value)}
                        className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-black outline-none appearance-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 transition-all cursor-pointer"
                    >
                        <option value="">-- No Selection --</option>
                        {targetEntities.map(e => (
                            <option key={e.id} value={e.shortCode || e.name}>
                                {e.name} ({e.shortCode || '??'})
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-4 text-slate-300 pointer-events-none">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center">
            <button 
                onClick={handleDelete}
                className={`w-full sm:w-auto px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center transition-all ${
                    isConfirmingDelete 
                    ? 'bg-rose-600 text-white shadow-xl shadow-rose-200' 
                    : 'text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100'
                }`}
            >
                <Trash2 className="w-4 h-4 mr-2" /> 
                {isConfirmingDelete ? 'Are you sure?' : 'Clear Slot'}
            </button>
            
            <div className="flex gap-3 w-full sm:flex-1 sm:justify-end">
                <button onClick={onClose} className="flex-1 sm:flex-none px-8 py-4 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white rounded-2xl transition-all">Cancel</button>
                <button 
                    onClick={handleSave}
                    className="flex-1 sm:flex-none px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center shadow-2xl shadow-slate-200 hover:bg-blue-600 hover:scale-[1.05] active:scale-95 transition-all"
                >
                    <Save className="w-4 h-4 mr-2" /> Save Slot
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

import { Pencil, User, ChevronDown, BookOpen } from 'lucide-react';
