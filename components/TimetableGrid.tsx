import React from 'react';
import { DAYS } from '../constants';
import { useData } from '../contexts/DataContext';
import { EntityProfile, TimetableEntry } from '../types';
import { MapPin, Plus } from 'lucide-react';

interface TimetableGridProps {
  data: EntityProfile;
  onSlotClick: (day: string, period: number, entry: TimetableEntry | null) => void;
  isEditing?: boolean;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({ data, onSlotClick, isEditing = false }) => {
  const { timeSlots, entities } = useData();
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

  return (
    <div className="overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm select-none h-full">
      <div className="min-w-[800px] lg:min-w-full relative">
        {/* Header Row */}
        <div className="grid grid-cols-[80px_repeat(9,1fr)] sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
          <div className="p-4 flex items-center justify-center border-r border-slate-200 sticky left-0 z-40 bg-slate-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day</span>
          </div>
          {timeSlots.map((slot) => (
            <div key={slot.period} className="p-3 border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center text-center group">
              <span className="text-xl font-black text-slate-600 leading-none group-hover:text-blue-600 transition-colors">P{slot.period}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">{slot.timeRange}</span>
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {DAYS.map((day) => (
          <div key={day} className="grid grid-cols-[80px_repeat(9,1fr)] border-b border-slate-100 last:border-b-0">
            {/* Day Column */}
            <div className="p-4 border-r border-slate-200 sticky left-0 z-20 bg-white flex items-center justify-center">
              <span className="text-lg font-black text-slate-400 uppercase tracking-tight">{day.slice(0,3)}</span>
            </div>

            {/* Period Columns */}
            {timeSlots.map((slot) => {
              const entry = data.schedule && data.schedule[day] ? data.schedule[day][slot.period] : null;
              const isClickable = isEditing || entry;
              const displayTargetCode = resolveCodeFromIdentifier(entry?.teacherOrClass);
              const tooltipTitle = entry ? `${resolveNameFromIdentifier(entry.teacherOrClass)} • ${entry.subject}` : '';

              return (
                <div 
                  key={`${day}-${slot.period}`}
                  title={tooltipTitle}
                  onClick={() => isClickable && onSlotClick(day, slot.period, entry || null)}
                  className={`border-r border-slate-100 last:border-r-0 relative min-h-[95px] flex flex-col transition-all group ${
                    isClickable ? 'cursor-pointer hover:bg-blue-50/40' : ''
                  } ${isEditing ? 'hover:ring-2 ring-inset ring-blue-100 bg-blue-50/5' : ''}`}
                >
                  {entry ? (
                    <div className="flex-1 w-full h-full p-2.5 flex flex-col relative z-10">
                        {/* TEACHER VIEW: Subcode TL, Class Code Center Bold */}
                        {isTeacher && (
                          <>
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{entry.subject}</span>
                              {entry.room && <span className="text-[8px] font-bold text-slate-300"><MapPin className="w-2 h-2 inline mr-0.5" />{entry.room}</span>}
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                              <span className="text-lg font-black text-slate-700">{displayTargetCode}</span>
                            </div>
                            <div className="h-[10px]"></div>
                          </>
                        )}

                        {/* CLASS VIEW: Subcode Center Bold, Teacher Code BR */}
                        {!isTeacher && (
                          <>
                            <div className="flex justify-end items-start h-[12px]">
                                {entry.room && <span className="text-[8px] font-bold text-slate-300"><MapPin className="w-2 h-2 inline mr-0.5" />{entry.room}</span>}
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                              <span className="text-lg font-black text-slate-700">{entry.subject}</span>
                            </div>
                            <div className="flex justify-end">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{displayTargetCode}</span>
                            </div>
                          </>
                        )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isEditing && (
                        <div className="w-8 h-8 rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-200 transition-all">
                          <Plus className="w-4 h-4 text-slate-200" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
