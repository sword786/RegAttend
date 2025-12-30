
import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Clock, CalendarDays, Users, AlertCircle, FileSpreadsheet, Layers, ChevronDown } from 'lucide-react';
import { AttendanceStatus, TimetableEntry, AttendanceRecord, EntityProfile } from '../types';
import { useData } from '../contexts/DataContext';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: string;
  period: number;
  entry: TimetableEntry;
  entityId: string;
  classNameOrTeacherName: string;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({ 
  isOpen, onClose, day, period, entry, entityId, classNameOrTeacherName 
}) => {
  const { students, getAttendanceForPeriod, markAttendance, entities } = useData();
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Determine available rosters for this session
  const rosterOptions = useMemo(() => {
    const rootEntity = entities.find(e => e.id === entityId);
    
    // Combined (AH) Session: Multiple target classes share one teacher period
    if (entry.type === 'combined' && entry.targetClasses && entry.targetClasses.length > 0) {
        return entities.filter(e => 
            e.type === 'CLASS' && (entry.targetClasses?.includes(e.shortCode || '') || entry.targetClasses?.includes(e.name))
        );
    }

    // Class View: Direct register for that class
    if (rootEntity?.type === 'CLASS') {
        return [rootEntity];
    } 
    
    // Teacher View: The mapped class ID for this slot
    if (rootEntity?.type === 'TEACHER' && entry.teacherOrClass) {
        const foundClass = entities.find(e => 
            e.type === 'CLASS' && (e.shortCode === entry.teacherOrClass || e.name === entry.teacherOrClass)
        );
        if (foundClass) return [foundClass];
    }

    return [];
  }, [entityId, entities, entry]);

  // Set default active class roster
  useEffect(() => {
    if (isOpen && rosterOptions.length > 0 && !activeClassId) {
        setActiveClassId(rosterOptions[0].id);
    }
  }, [isOpen, rosterOptions, activeClassId]);

  const activeClass = useMemo(() => entities.find(e => e.id === activeClassId), [entities, activeClassId]);
  
  const targetStudents = useMemo(() => {
      if (!activeClassId) return [];
      return students.filter(s => s.classId === activeClassId);
  }, [students, activeClassId]);

  useEffect(() => {
    if (isOpen && activeClassId) {
      const records = getAttendanceForPeriod(selectedDate, activeClassId, period);
      const initial: Record<string, AttendanceStatus> = {};
      
      targetStudents.forEach(s => {
        const record = records.find(r => r.studentId === s.id);
        initial[s.id] = record ? record.status : 'PRESENT';
      });
      
      setAttendance(initial);
      setIsSaved(false);
    }
  }, [isOpen, selectedDate, activeClassId, period, targetStudents, getAttendanceForPeriod]);

  const toggleStatus = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId] || 'PRESENT';
      let next: AttendanceStatus = 'PRESENT';
      if (current === 'PRESENT') next = 'ABSENT';
      else if (current === 'ABSENT') next = 'LATE';
      else if (current === 'LATE') next = 'EXCUSED';
      else if (current === 'EXCUSED') next = 'PRESENT';
      return { ...prev, [studentId]: next };
    });
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT': return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100';
      case 'ABSENT': return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-100';
      case 'LATE': return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100';
      case 'EXCUSED': return 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-100';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  const handleSave = () => {
    if (!activeClassId) return;

    const records: AttendanceRecord[] = targetStudents.map(student => ({
      date: selectedDate,
      period,
      entityId: activeClassId,
      studentId: student.id,
      status: attendance[student.id] || 'PRESENT'
    }));

    markAttendance(records);
    setIsSaved(true);
    setTimeout(() => {
        // If it's the only class, close the modal. If combined, stay to allow switching to other rosters.
        if (rosterOptions.length === 1) onClose();
        else setIsSaved(false);
    }, 800);
  }

  const handleExportSingleCSV = () => {
    if (!activeClass) return;

    const header = ["Student Name", "Roll Number", "Status", "Date", "Period", "Subject", "Venue"];
    let csvContent = "data:text/csv;charset=utf-8," + header.join(",") + "\n";

    targetStudents.forEach(student => {
        const row = [
            `"${student.name}"`,
            student.rollNumber,
            attendance[student.id] || 'PRESENT',
            selectedDate,
            `Period ${period}`,
            `"${entry.subject}"`,
            `"${entry.room || entry.venue || ''}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeClass.name}_P${period}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-slate-900/5">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-white space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{entry.subject} Registry</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="flex items-center font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-slate-600">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400"/> P{period} • {day}
                </span>
                {entry.type === 'combined' && (
                    <span className="font-black text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg uppercase tracking-widest flex items-center border border-indigo-100">
                        <Layers className="w-3 h-3 mr-1" /> Combined Session
                    </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors">
              <X className="w-7 h-7" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-2">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                 {/* Class Selector for Combined Sessions */}
                 {rosterOptions.length > 1 && (
                     <div className="relative">
                        <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-black text-blue-500 uppercase tracking-widest z-10">Select Class Register</label>
                        <select 
                            value={activeClassId || ''} 
                            onChange={(e) => setActiveClassId(e.target.value)}
                            className="w-full sm:w-56 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100"
                        >
                            {rosterOptions.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-blue-400 pointer-events-none" />
                     </div>
                 )}
                 
                 <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-4 rounded-xl border border-slate-200 w-full sm:w-auto">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500">
                        <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Date</span>
                        <input 
                          type="date" 
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="border-none bg-transparent text-sm font-black text-slate-800 focus:ring-0 cursor-pointer outline-none p-0"
                        />
                    </div>
                  </div>
              </div>

              <button 
                 onClick={handleExportSingleCSV}
                 className="flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-green-700 hover:border-green-200 hover:bg-green-50 rounded-xl text-xs font-bold transition-all w-full sm:w-auto"
              >
                 <FileSpreadsheet className="w-4 h-4 mr-2" />
                 Export CSV
              </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white relative">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>

          {activeClassId ? (
              targetStudents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  {targetStudents.map((student) => (
                    <div 
                      key={student.id}
                      onClick={() => toggleStatus(student.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md group active:scale-[0.98] ${
                          getStatusColor(attendance[student.id] || 'PRESENT').replace('bg-', 'hover:bg-opacity-80 ')
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400 shadow-sm">
                            {student.rollNumber.slice(-3)}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-800 text-sm truncate">{student.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide opacity-70">Roll: {student.rollNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wide border bg-white/50 backdrop-blur-sm`}>
                            {attendance[student.id] || 'PRESENT'}
                          </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 relative z-10">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-slate-300" />
                   </div>
                   <p className="text-slate-600 font-bold text-lg">No students found</p>
                   <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                        No students found for <span className="text-slate-800 font-bold">{activeClass?.name}</span> roster.
                   </p>
                </div>
              )
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-center p-10 relative z-10">
                <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-slate-500 font-medium">Could not identify Roster.</p>
                <p className="text-xs text-slate-400 mt-1">Please ensure this session is mapped to valid classes/teachers.</p>
             </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center z-20">
            <div className="text-xs font-bold text-slate-400 pl-2">
                {targetStudents.length} Students in {activeClass?.name}
            </div>
            <button 
                onClick={handleSave}
                disabled={!activeClassId || targetStudents.length === 0}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center"
            >
                {isSaved ? <Check className="w-4 h-4 mr-2" /> : null}
                {isSaved ? 'Attendance Saved' : 'Save Registry'}
            </button>
        </div>
      </div>
    </div>
  );
};
