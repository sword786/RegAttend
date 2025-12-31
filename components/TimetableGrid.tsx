
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
        {DAYS.map((day) => (
          <div key={day} className="grid grid-cols-[100px_repeat(9,1fr)] border-b border-slate-100 last:border-b-0">
            {/* Day Column */}
            <div className="p-6 border-r border-slate-200 bg-white flex items-center justify-center">
              <span className="text-xl font-black text-slate-400 uppercase tracking-tighter">{day.toUpperCase()}</span>
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
                  className={`border-r border-slate-100 last:border-r-0 relative min-h-[110px] flex flex-col transition-all group ${
                    isClickable ? 'cursor-pointer hover:bg-blue-50/40' : ''
                  } ${isEditing ? 'hover:ring-4 ring-inset ring-blue-100 bg-blue-50/5' : ''}`}
                >
                  {entry ? (
                    <div className="flex-1 w-full h-full p-3.5 flex flex-col relative z-10">
                        {isTeacher ? (
                          <>
                            <div className="flex justify-between items-start">
                              <span className="text-[11px] font-black text-slate-400 uppercase">{entry.subject}</span>
                              {entry.room && <span className="text-[9px] font-black text-slate-300"><MapPin className="w-3 h-3 inline mr-1" />{entry.room}</span>}
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                              <span className="text-xl font-black text-slate-700 group-hover:text-blue-600 transition-colors">{displayTargetCode}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-end items-start h-[15px]">
                                {entry.room && <span className="text-[9px] font-black text-slate-300"><MapPin className="w-3 h-3 inline mr-1" />{entry.room}</span>}
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                              <span className="text-xl font-black text-slate-700 group-hover:text-blue-600 transition-colors">{entry.subject}</span>
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
        ))}
      </div>
    </div>
  );
};
