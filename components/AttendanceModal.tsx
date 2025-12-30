import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Clock, CalendarDays, Users, AlertCircle, Edit2, Download, FileSpreadsheet } from 'lucide-react';
import { AttendanceStatus, TimetableEntry, AttendanceRecord } from '../types';
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
  const [isSaved, setIsSaved] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // Resolve the actual Class ID regardless of whether we are viewing a Teacher or Class schedule
  const effectiveClassInfo = useMemo(() => {
    const rootEntity = entities.find(e => e.id === entityId);
    
    // Case 1: We are in Class View
    if (rootEntity?.type === 'CLASS') {
        return { id: rootEntity.id, name: rootEntity.name };
    } 
    
    // Case 2: We are in Teacher View -> Find the class from the entry code
    if (rootEntity?.type === 'TEACHER' && entry.teacherOrClass) {
        const targetCode = entry.teacherOrClass;
        const foundClass = entities.find(e => 
            e.type === 'CLASS' && (e.shortCode === targetCode || e.name === targetCode)
        );
        if (foundClass) return { id: foundClass.id, name: foundClass.name };
    }

    return null;
  }, [entityId, entities, entry]);

  // Filter students by the resolved Class ID
  const targetClassStudents = useMemo(() => {
      if (!effectiveClassInfo) return [];
      return students.filter(s => s.classId === effectiveClassInfo.id);
  }, [students, effectiveClassInfo]);

  useEffect(() => {
    if (isOpen && effectiveClassInfo) {
      const existingRecords = getAttendanceForPeriod(selectedDate, effectiveClassInfo.id, period);
      const initial: Record<string, AttendanceStatus> = {};
      const hasData = existingRecords.length > 0;
      
      targetClassStudents.forEach(s => {
        const record = existingRecords.find(r => r.studentId === s.id);
        // If record exists use it, otherwise default to PRESENT
        initial[s.id] = record ? record.status : 'PRESENT';
      });
      
      setAttendance(initial);
      setIsUpdateMode(hasData);
      setIsSaved(false);
    }
  }, [isOpen, selectedDate, effectiveClassInfo, period, targetClassStudents, getAttendanceForPeriod]);

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
    if (!effectiveClassInfo) return;

    const records: AttendanceRecord[] = targetClassStudents.map(student => ({
      date: selectedDate,
      period,
      entityId: effectiveClassInfo.id, // Ensure we save against the Class ID
      studentId: student.id,
      status: attendance[student.id] || 'PRESENT'
    }));

    markAttendance(records);
    setIsSaved(true);
    setIsUpdateMode(true); // Switch to update mode visual after saving
    setTimeout(() => onClose(), 800);
  }

  const handleExportSingleCSV = () => {
    if (!effectiveClassInfo) return;

    const header = ["Student Name", "Roll Number", "Status", "Date", "Period", "Subject"];
    let csvContent = "data:text/csv;charset=utf-8," + header.join(",") + "\n";

    targetClassStudents.forEach(student => {
        const row = [
            `"${student.name}"`,
            student.rollNumber,
            attendance[student.id] || 'PRESENT',
            selectedDate,
            `Period ${period}`,
            `"${entry.subject}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${effectiveClassInfo.name}_P${period}_${selectedDate}.csv`);
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
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Attendance Register</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="flex items-center font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-slate-600">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400"/> P{period} • {day}
                </span>
                <span className="font-bold text-white px-2.5 py-1 bg-blue-500 rounded-lg shadow-sm shadow-blue-200">{entry.subject}</span>
                <span className="font-bold text-slate-700 flex items-center px-2.5 py-1 rounded-lg border border-slate-100">
                    {effectiveClassInfo ? effectiveClassInfo.name : classNameOrTeacherName}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors">
              <X className="w-7 h-7" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-2">
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors cursor-pointer group w-full sm:w-auto">
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow text-blue-500">
                    <CalendarDays className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Selected Date</span>
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="border-none bg-transparent text-sm font-black text-slate-800 focus:ring-0 cursor-pointer outline-none p-0"
                    />
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                   onClick={handleExportSingleCSV}
                   className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-green-700 hover:border-green-200 hover:bg-green-50 rounded-xl text-xs font-bold transition-all"
                >
                   <FileSpreadsheet className="w-4 h-4 mr-2" />
                   Export CSV
                </button>
                
                {isUpdateMode && !isSaved && (
                    <div className="hidden sm:flex items-center px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100">
                        <Check className="w-4 h-4 mr-2" />
                        Records Found
                    </div>
                )}
              </div>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white relative">
           {/* Decorative bg */}
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>

          {effectiveClassInfo ? (
              targetClassStudents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  {targetClassStudents.map((student) => (
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
                        There are no students registered in <span className="text-slate-800 font-bold">{effectiveClassInfo.name}</span> yet.
                   </p>
                </div>
              )
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-center p-10 relative z-10">
                <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-slate-500 font-medium">Could not identify Class.</p>
                <p className="text-xs text-slate-400 mt-1">This slot might not be linked correctly.</p>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center z-20">
            <div className="text-xs font-bold text-slate-400 pl-2">
                {targetClassStudents.length} Students Total
            </div>
            <button 
                onClick={handleSave}
                disabled={!effectiveClassInfo || targetClassStudents.length === 0}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center"
            >
                {isSaved ? <Check className="w-4 h-4 mr-2" /> : null}
                {isSaved ? 'Saved Successfully' : 'Save Attendance'}
            </button>
        </div>
      </div>
    </div>
  );
};