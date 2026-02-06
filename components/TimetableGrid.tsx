import React, { useMemo } from 'react';
import { DAYS } from '../constants';
import { useData } from '../contexts/DataContext';
import { EntityProfile, TimetableEntry } from '../types';
import { MapPin, Plus, CheckCircle2 } from 'lucide-react';

interface TimetableGridProps {
  data: EntityProfile;
  onSlotClick: (day: string, period: number, entry: TimetableEntry | null) => void;
  isEditing?: boolean;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({ data, onSlotClick, isEditing = false }) => {
  const { timeSlots, entities, getAttendanceForPeriod } = useData();
  const isTeacher = data.type === 'TEACHER';

  const resolveCodeFromIdentifier = (id: string | undefined): string => {
      if (!id) return '';
      const matched = entities.find(e => e.shortCode === id || e.name === id);
      return matched ? (matched.shortCode || matched.name) : id;
  };

  const resolveNameFromIdentifier = (id: string | undefined): string => {
      if (!id) return '';
      const matched = entities.find(e => e.shortCode === id || e.name === id);
      return matched ? matched.name : id;
  };

  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayDateString = useMemo(() => getLocalDateString(new Date()), []);

  const getWeekDate = (dayName: string) => {
    const dayMap: {[key: string]: number} = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const targetDay = dayMap[dayName];
    const today = new Date();
    const currentDay = today.getDay();
    const distToSat = (currentDay + 1) % 7; 
    const saturday = new Date(today);
    saturday.setDate(today.getDate() - distToSat); 
    const offsetMap: {[key: number]: number} = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
    const targetOffset = offsetMap[targetDay];
    const targetDate = new Date(saturday);
    targetDate.setDate(saturday.getDate() + targetOffset);
    return getLocalDateString(targetDate);
  };

  return (
    <div className="overflow-x-auto bg-white rounded-[2rem] select-none scrollbar-hide w-full">
      <div className="min-w-full lg:min-w-[900px] relative">
        {/* Header Row */}
        <div className="grid grid-cols-[80px_repeat(9,1fr)] sm:grid-cols-[100px_repeat(9,1fr)] bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="p-4 sm:p-6 flex items-center justify-center border-r border-slate-200 bg-slate-50 sticky left-0 z-30">
            <span className="text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">Day</span>
          </div>
          {timeSlots.map((slot) => (
            <div key={slot.period} className="p-2 sm:p-4 border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center text-center group min-w-[70px]">
              <span className="text-lg sm:text-2xl font-black text-slate-600 leading-none group-hover:text-blue-600 transition-colors">P{slot.period}</span>
              <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{slot.timeRange.split('-')[0]}</span>
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {DAYS.map((day) => {
          const colDate = getWeekDate(day);
          const isToday = todayDateString === colDate;
          
          return (
            <div key={day} className="grid grid-cols-[80px_repeat(9,1fr)] sm:grid-cols-[100px_repeat(9,1fr)] border-b border-slate-100 last:border-b-0">
              {/* Day Column */}
              <div className={`p-4 sm:p-6 border-r border-slate-200 flex items-center justify-center transition-colors sticky left-0 z-10 ${isToday ? 'bg-blue-50/95 backdrop-blur-sm' : 'bg-white'}`}>
                <span className={`text-base sm:text-xl font-black uppercase tracking-tighter ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{day.toUpperCase().substring(0,3)}</span>
              </div>

              {/* Period Columns */}
              {timeSlots.map((slot) => {
                const entry = data.schedule && data.schedule[day] ? data.schedule[day][slot.period] : null;
                const isClickable = isEditing || entry;
                const displayTargetCode = resolveCodeFromIdentifier(entry?.teacherOrClass);
                const tooltipTitle = entry ? `${resolveNameFromIdentifier(entry.teacherOrClass)} • ${entry.subject}` : '';

                // Attendance Checkmark Logic
                let isAttendanceMarked = false;
                if (entry && !isEditing) {
                    let targetIds: string[] = [];
                    if (isTeacher) {
                        if (entry.teacherOrClass) {
                            const c = entities.find(e => e.type === 'CLASS' && (e.shortCode === entry.teacherOrClass || e.name === entry.teacherOrClass));
                            if (c) targetIds.push(c.id);
                        }
                        if (entry.targetClasses) {
                            entry.targetClasses.forEach(clsName => {
                                const c = entities.find(e => e.type === 'CLASS' && (e.shortCode === clsName || e.name === clsName));
                                if (c) targetIds.push(c.id);
                            });
                        }
                    } else {
                        targetIds.push(data.id);
                    }
                    isAttendanceMarked = targetIds.some(tid => {
                        const recsWeek = getAttendanceForPeriod(colDate, tid, slot.period);
                        const recsToday = getAttendanceForPeriod(todayDateString, tid, slot.period);
                        return recsWeek.length > 0 || recsToday.length > 0;
                    });
                }

                return (
                  <div 
                    key={`${day}-${slot.period}`}
                    title={tooltipTitle}
                    onClick={() => isClickable && onSlotClick(day, slot.period, entry || null)}
                    className={`border-r border-slate-100 last:border-r-0 relative min-h-[90px] sm:min-h-[110px] flex flex-col transition-all group min-w-[70px] ${
                      isClickable ? 'cursor-pointer hover:bg-blue-50/40' : ''
                    } ${isEditing ? 'hover:ring-4 ring-inset ring-blue-100 bg-blue-50/5' : ''}`}
                  >
                    {entry ? (
                      <div className="flex-1 w-full h-full p-2 sm:p-3.5 flex flex-col relative z-0">
                          {isAttendanceMarked && (
                              <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 animate-in fade-in zoom-in duration-300">
                                  <div className="bg-emerald-500 rounded-full p-1 sm:p-1.5 shadow-lg shadow-emerald-500/30 ring-2 ring-white">
                                    <CheckCircle2 className="w-3 h-3 sm:w-4 h-4 text-white" />
                                  </div>
                              </div>
                          )}
                          
                          {isTeacher ? (
                            <>
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] sm:text-[11px] font-black text-slate-400 uppercase truncate max-w-[40px]">{entry.subject}</span>
                              </div>
                              <div className="flex-1 flex items-center justify-center text-center">
                                <span className="text-sm sm:text-xl font-black text-slate-700 group-hover:text-blue-600 transition-colors leading-tight truncate px-1">{displayTargetCode}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 flex items-center justify-center text-center pt-2">
                                <span className="text-sm sm:text-xl font-black text-slate-700 group-hover:text-blue-600 transition-colors leading-tight truncate px-1">{entry.subject}</span>
                              </div>
                              <div className="flex justify-end mt-auto">
                                <span className="text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[40px]">{displayTargetCode}</span>
                              </div>
                            </>
                          )}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {isEditing && (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-400 group-hover:rotate-90 transition-all duration-300">
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200 group-hover:text-blue-500" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};