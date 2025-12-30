import React, { useState } from 'react';
import { X, Trash2, Save, AlertCircle } from 'lucide-react';
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
        teacherOrClass: relatedCode || undefined
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <div>
              <h3 className="font-bold text-gray-900">Edit Schedule</h3>
              <p className="text-xs text-gray-500">{day} • Period {period} • {entityName}</p>
           </div>
           <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
        </div>

        <div className="p-6 space-y-4">
            {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 text-rose-600 text-xs font-bold animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}
            
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject Code</label>
                <input 
                    autoFocus
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setError(null); }}
                    placeholder="e.g. MATH, ENG"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-accent outline-none font-bold"
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Select {entityType === 'CLASS' ? 'Teacher' : 'Class'}
                    </label>
                    <select
                        value={relatedCode}
                        onChange={e => setRelatedCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-accent outline-none font-bold text-sm"
                    >
                        <option value="">-- No Selection --</option>
                        {targetEntities.map(e => (
                            <option key={e.id} value={e.shortCode || e.name}>
                                {e.name} ({e.shortCode || 'No Code'})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Room (Optional)</label>
                    <input 
                        value={room}
                        onChange={e => setRoom(e.target.value)}
                        placeholder="e.g. 101"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-accent outline-none font-bold"
                    />
                </div>
            </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <button 
                onClick={handleDelete}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${
                    isConfirmingDelete 
                    ? 'bg-rose-600 text-white shadow-lg animate-pulse' 
                    : 'text-rose-600 hover:bg-rose-50'
                }`}
            >
                <Trash2 className="w-4 h-4 mr-2" /> 
                {isConfirmingDelete ? 'Confirm Clear?' : 'Clear Slot'}
            </button>
            <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
                <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-primary text-white hover:bg-slate-800 rounded-lg text-sm font-bold flex items-center shadow-md active:scale-95 transition-all"
                >
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};