
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
    
    // Institutional start of week is Saturday
    const currentDay = today.getDay();
    // Distance from today to the previous Saturday
    const distToSat = (currentDay + 1) % 7; 
    
    const saturday = new Date(today);
    saturday.setDate(today.getDate() - distToSat); 
    
    // Offset for the target day relative to Saturday (Sat is 0, Sun is 1, etc.)
    const offsetMap: {[key: number]: number} = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
    const targetOffset = offsetMap[targetDay];
    
    const targetDate = new Date(saturday);
    targetDate.setDate(saturday.getDate() + targetOffset);
    
    return getLocalDateString(targetDate);
  };

  return (
    <div className="overflow-x-auto bg-white rounded-[2rem] select-none scrollbar-hide">
      <div className="min-w-[900px] relative">
        {/* Header Row */}
        <div className="grid grid-cols-[100px_repeat(9,1fr)] bg-slate-50 border-b border-slate-200">
          <div className="p-6 flex items-center justify-center border-r border-slate-200 bg-slate-50">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Day</span>
          </div>
          {timeSlots.map((slot) => (
            <div key={slot.period} className="p-4 border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center text-center group">
              <span className="text-2xl font-black text-slate-600 leading-none group-hover:text-blue-600 transition-colors">P{slot.period}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1.5">{slot.timeRange}</span>
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {DAYS.map((day) => {
          const colDate = getWeekDate(day);
          const isToday = todayDateString === colDate;
          
          return (
            <div key={day} className="grid grid-cols-[100px_repeat(9,1fr)] border-b border-slate-100 last:border-b-0">
              {/* Day Column */}
              <div className={`p-6 border-r border-slate-200 flex items-center justify-center transition-colors ${isToday ? 'bg-blue-50/50' : 'bg-white'}`}>
                <span className={`text-xl font-black uppercase tracking-tighter ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{day.toUpperCase()}</span>
              </div>

              {/* Period Columns */}
              {timeSlots.map((slot) => {
                const entry = data.schedule && data.schedule[day] ? data.schedule[day][slot.period] : null;
                const isClickable = isEditing || entry;
                const displayTargetCode = resolveCodeFromIdentifier(entry?.teacherOrClass);
                const tooltipTitle = entry ? `${resolveNameFromIdentifier(entry.teacherOrClass)} • ${entry.subject}` : '';

                // Attendance Checkmark Logic - Shows for any day recorded in this week view
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

                    // Check if attendance is marked for the specific week-date associated with this day
                    isAttendanceMarked = targetIds.some(tid => {
                        const recsWeek = getAttendanceForPeriod(colDate, tid, slot.period);
                        const recsToday = getAttendanceForPeriod(todayDateString, tid, slot.period);
                        // Visible if marked for either the scheduled date or today
                        return recsWeek.length > 0 || recsToday.length > 0;
                    });
                }

                return (
                  <div 
                    key={`${day}-${slot.period}`}
                    title={tooltipTitle}
                    onClick={() => isClickable && onSlotClick(day, slot.period, entry || null)}
                    className={`border-r border-slate-100 last:border-r-0 relative min-h-[110px] flex flex-col transition-all group ${
                      isClickable ? 'cursor-pointer hover:bg-blue-50/40' : ''
                    } ${isEditing ? 'hover:ring-4 ring-inset ring-blue-100 bg-blue-50/5' : ''}`}
                  >
                    {entry ? (
                      <div className="flex-1 w-full h-full p-3.5 flex flex-col relative z-10">
                          {isAttendanceMarked && (
                              <div className="absolute top-2 right-2 z-20 animate-in fade-in zoom-in duration-300">
                                  <div className="bg-emerald-500 rounded-full p-1.5 shadow-lg shadow-emerald-500/30 ring-2 ring-white">
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                  </div>
                              </div>
                          )}
                          
                          {isTeacher ? (
                            <>
                              <div className="flex justify-between items-start">
                                <span className="text-[11px] font-black text-slate-400 uppercase">{entry.subject}</span>
                                {entry.room && <span className="text-[9px] font-black text-slate-300"><MapPin className="w-3 h-3 inline mr-1" />{entry.room}</span>}
                              </div>
                              <div className="flex-1 flex items-center justify-center text-center">
                                <span className="text-xl font-black text-slate-700 group-hover:text-blue-600 transition-colors leading-tight">{displayTargetCode}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-end items-start h-[15px]">
                                  {entry.room && <span className="text-[9px] font-black text-slate-300"><MapPin className="w-3 h-3 inline mr-1" />{entry.room}</span>}
                              </div>
                              <div className="flex-1 flex items-center justify-center text-center">
                                <span className="text-xl font-black text-slate-700 group-hover:text-blue-600 transition-colors leading-tight">{entry.subject}</span>
                              </div>
                              <div className="flex justify-end">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">{displayTargetCode}</span>
                              </div>
                            </>
                          )}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {isEditing && (
                          <div className="w-10 h-10 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-400 group-hover:rotate-90 transition-all duration-300">
                            <Plus className="w-5 h-5 text-slate-200 group-hover:text-blue-500" />
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
