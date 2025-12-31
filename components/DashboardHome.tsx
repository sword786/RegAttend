
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Clock, MapPin, User, BookOpen, Coffee, Activity, GraduationCap, Users, School, Calendar } from 'lucide-react';
import { DayOfWeek } from '../types';

export const DashboardHome: React.FC = () => {
  const { entities, timeSlots, students, schoolName } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentDayName = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[currentTime.getDay()];
  }, [currentTime]);

  const currentMinutes = useMemo(() => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [currentTime]);

  const parseTime = (timeStr: string) => {
    const parts = timeStr.trim().split(':');
    if (parts.length !== 2) return 0;
    const [h, m] = parts.map(Number);
    return h * 60 + m;
  };

  const currentPeriod = useMemo(() => {
    return timeSlots.find(slot => {
      const times = slot.timeRange.split('-');
      if (times.length !== 2) return false;
      const start = parseTime(times[0]);
      const end = parseTime(times[1]);
      return currentMinutes >= start && currentMinutes < end;
    });
  }, [currentMinutes, timeSlots]);

  const nextPeriod = useMemo(() => {
    const sortedSlots = [...timeSlots].sort((a, b) => {
        const startA = parseTime(a.timeRange.split('-')[0]);
        const startB = parseTime(b.timeRange.split('-')[0]);
        return startA - startB;
    });

    return sortedSlots.find(slot => {
        const start = parseTime(slot.timeRange.split('-')[0]);
        return start > currentMinutes;
    });
  }, [currentMinutes, timeSlots]);

  const classesCount = useMemo(() => entities.filter(e => e.type === 'CLASS').length, [entities]);
  const teachersCount = useMemo(() => entities.filter(e => e.type === 'TEACHER').length, [entities]);

  const getTeacherName = (code: string | undefined) => {
    if (!code) return 'Unassigned';
    const teacher = entities.find(e => e.type === 'TEACHER' && (e.shortCode === code || e.name === code));
    return teacher ? teacher.name : code;
  };

  const isSchoolDay = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(currentDayName);

  return (
    <div className="flex flex-col h-full space-y-4 sm:space-y-6 overflow-y-auto pb-10 scrollbar-hide">
      
      {/* Stats Cards - Optimized for 2-column mobile and 4-column desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard 
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />} 
          label="Students" 
          value={students.length} 
          color="blue" 
        />
        <StatCard 
          icon={<School className="w-4 h-4 sm:w-5 sm:h-5" />} 
          label="Classes" 
          value={classesCount} 
          color="purple" 
        />
        <StatCard 
          icon={<GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />} 
          label="Teachers" 
          value={teachersCount} 
          color="indigo" 
        />
        <StatCard 
          icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5" />} 
          label="Status" 
          value={currentPeriod ? 'Active' : 'Break'} 
          color="emerald" 
        />
      </div>

      {/* Hero Clock Section - Balanced Typography */}
      <div className="bg-slate-900 p-6 sm:p-10 rounded-[2rem] shadow-xl text-white relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        
        <div className="text-center z-10 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-blue-300 mb-4 border border-white/5">
            <Calendar className="w-3 h-3" />
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          
          <h2 className="text-[2.75rem] sm:text-7xl font-black tracking-tighter mb-1 leading-none">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </h2>
          <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] opacity-80 mb-8 sm:mb-10">{schoolName}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl mx-auto">
              <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${currentPeriod ? 'bg-emerald-500/10 border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'bg-white/5 border-white/10'}`}>
                <div className="text-left">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Current Session</span>
                  <div className="text-base sm:text-lg font-black">{currentPeriod ? `Period ${currentPeriod.period}` : 'No Active Class'}</div>
                </div>
                {currentPeriod && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20">{currentPeriod.timeRange}</span>}
              </div>
              
              {nextPeriod && isSchoolDay && (
                <div className="p-4 rounded-2xl border bg-white/5 border-white/10 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Up Next</span>
                    <div className="text-base sm:text-lg font-black">Period {nextPeriod.period}</div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg border border-blue-400/20">{nextPeriod.timeRange}</span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Live Sessions Header */}
      <div className="flex items-center gap-3 px-1 pt-2">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm">
              <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Live Sessions</h3>
      </div>

      {/* Sessions Content Grid */}
      <div className="px-1">
        {currentPeriod && isSchoolDay ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {entities.filter(e => e.type === 'CLASS').map(cls => {
                    const daySchedule = cls.schedule[currentDayName as DayOfWeek];
                    const entry = daySchedule ? daySchedule[currentPeriod.period] : null;

                    if (!entry) return null;

                    return (
                        <div key={cls.id} className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{cls.name}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cls.shortCode}</span>
                                </div>
                                {entry.room && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{entry.room}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-center gap-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                    <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm border border-blue-100">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Subject</span>
                                        <span className="text-sm font-black text-slate-700">{entry.subject}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                                    <div className="p-2 bg-white rounded-lg text-slate-600 shadow-sm border border-slate-100">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Instructor</span>
                                        <span className="text-sm font-black text-slate-700 truncate">
                                            {getTeacherName(entry.teacherOrClass)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-12 sm:p-20 text-center relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-30 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-100">
                        <Coffee className="w-10 h-10 text-slate-300 group-hover:rotate-12 transition-transform duration-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">No Active Classes</h3>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto mt-3 font-medium leading-relaxed">
                        The school is currently on break or out of session. Relax or check full schedules in the tabs.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5',
        purple: 'bg-purple-50 text-purple-600 border-purple-100 shadow-purple-500/5',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/5',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5'
    };

    return (
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 transition-all hover:translate-y-[-2px] hover:shadow-md cursor-default">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border-2 ${colorClasses[color]}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-black text-slate-800 leading-none truncate">{value}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 truncate">{label}</div>
            </div>
        </div>
    );
};
