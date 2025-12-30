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

  const resolveNameFromCode = (code: string | undefined): string | undefined => {
      if (!code) return undefined;
      const matched = entities.find(e => e.shortCode === code || e.name === code);
      return matched ? matched.name : code;
  };

  return (
    <div className="overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm select-none h-full">
      <div className="min-w-[800px] lg:min-w-full relative">
        {/* Header Row - Sticky Top */}
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
          <div key={day} className="grid grid-cols-[80px_repeat(9,1fr)] border-b border-slate-100 last:border-b-0 hover:bg-slate-50/30 transition-colors">
            {/* Day Column - Sticky Left */}
            <div className="p-4 border-r border-slate-200 sticky left-0 z-20 bg-white flex items-center justify-center">
              <span className="text-lg font-black text-slate-400 uppercase tracking-tight">{day.slice(0,3)}</span>
            </div>

            {/* Period Columns */}
            {timeSlots.map((slot) => {
              const entry = data.schedule && data.schedule[day] ? data.schedule[day][slot.period] : null;
              const isClickable = isEditing || entry;

              const mainText = isTeacher ? entry?.teacherOrClass : entry?.subject;
              const subText = isTeacher ? entry?.subject : entry?.teacherOrClass;
              const room = entry?.room;
              
              const tooltipName = resolveNameFromCode(entry?.teacherOrClass);
              const tooltipTitle = entry ? `${tooltipName || ''} - ${entry.subject}` : '';

              return (
                <div 
                  key={`${day}-${slot.period}`}
                  title={tooltipTitle}
                  className={`border-r border-slate-100 last:border-r-0 relative min-h-[90px] sm:min-h-[110px] flex flex-col transition-all group ${
                    isClickable ? 'cursor-pointer hover:bg-blue-50/40' : ''
                  } ${isEditing ? 'hover:ring-2 ring-inset ring-blue-200 bg-blue-50/5' : ''}`}
                  onClick={() => isClickable && onSlotClick(day, slot.period, entry || null)}
                >
                  {entry ? (
                    <div className="flex-1 w-full h-full p-2 sm:p-3 flex flex-col relative z-10">
                        {/* Labels (Top Row) */}
                        <div className="flex justify-between items-start mb-auto">
                           <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase truncate max-w-[70%]">
                             {subText || '-'}
                           </span>
                           {room && (
                                <div className="flex items-center text-[8px] sm:text-[9px] text-slate-300 font-bold uppercase">
                                   <MapPin className="w-2 sm:w-2.5 h-2 sm:h-2.5 mr-0.5 shrink-0" />
                                   {room}
                                </div>
                           )}
                        </div>

                        {/* Center Content */}
                        <div className="my-auto flex items-center justify-center text-center">
                             <span className={`font-black text-slate-700 leading-tight transition-transform group-hover:scale-105 ${
                                 (mainText?.length || 0) > 6 ? 'text-xs sm:text-sm' : 'text-lg sm:text-xl'
                             }`}>
                                 {mainText}
                             </span>
                        </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isEditing && (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center group-hover:border-blue-300 group-hover:bg-blue-50 transition-all">
                              <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300 group-hover:text-blue-400" />
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