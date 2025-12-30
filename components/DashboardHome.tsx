
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Clock, MapPin, User, BookOpen, Coffee, ArrowRight, Activity, Sparkles, GraduationCap, Users, School } from 'lucide-react';
import { DayOfWeek } from '../types';

export const DashboardHome: React.FC = () => {
  const { entities, timeSlots, students } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
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
    const [h, m] = timeStr.trim().split(':').map(Number);
    return h * 60 + m;
  };

  const currentPeriod = useMemo(() => {
    return timeSlots.find(slot => {
      const [start, end] = slot.timeRange.split('-').map(t => parseTime(t));
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

  const classes = useMemo(() => entities.filter(e => e.type === 'CLASS'), [entities]);
  const teachers = useMemo(() => entities.filter(e => e.type === 'TEACHER'), [entities]);

  const getTeacherName = (code: string | undefined) => {
    if (!code) return 'Unassigned';
    const teacher = entities.find(e => e.type === 'TEACHER' && (e.shortCode === code || e.name === code));
    return teacher ? teacher.name : code;
  };

  const isSchoolDay = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(currentDayName);

  return (
    <div className="flex flex-col h-full space-y-6 overflow-y-auto pb-10 scrollbar-hide">
      
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
            </div>
            <div>
                <div className="text-2xl font-black text-slate-800">{students.length}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Students</div>
            </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <School className="w-6 h-6" />
            </div>
            <div>
                <div className="text-2xl font-black text-slate-800">{classes.length}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Classes</div>
            </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
            </div>
            <div>
                <div className="text-2xl font-black text-slate-800">{teachers.length}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Teachers</div>
            </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="w-6 h-6" />
            </div>
            <div>
                <div className="text-2xl font-black text-slate-800">{currentPeriod ? 'Active' : 'Break'}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Status</div>
            </div>
        </div>
      </div>

      {/* Live Status Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-bold uppercase tracking-widest text-blue-200 mb-4">
                <Clock className="w-3.5 h-3.5" />
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-2">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h1>
            <p className="text-slate-400 font-medium text-lg">Mupini Combined School</p>
        </div>

        <div className="relative z-10 flex gap-4 w-full md:w-auto">
            {/* Current Period Card */}
            <div className={`flex-1 md:w-48 p-5 rounded-2xl backdrop-blur-md border border-white/10 transition-all ${
                currentPeriod ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-white/5'
            }`}>
                 <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${currentPeriod ? 'text-emerald-300' : 'text-slate-400'}`}>
                        Now
                    </span>
                    {currentPeriod && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>}
                 </div>
                 {currentPeriod ? (
                    <>
                        <div className="text-2xl font-bold text-white mb-1">Period {currentPeriod.period}</div>
                        <div className="text-xs font-bold text-emerald-200">{currentPeriod.timeRange}</div>
                    </>
                 ) : (
                    <div className="text-xl font-bold text-slate-300">
                        {isSchoolDay ? 'Break Time' : 'Weekend'}
                    </div>
                 )}
            </div>

             {/* Next Period Card */}
             {nextPeriod && isSchoolDay && (
                <div className="flex-1 md:w-48 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                     <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Up Next</span>
                        <ArrowRight className="w-4 h-4 text-blue-300/50" />
                     </div>
                     <div className="text-2xl font-bold text-white mb-1">Period {nextPeriod.period}</div>
                     <div className="text-xs font-bold text-blue-200 opacity-70">{nextPeriod.timeRange}</div>
                </div>
             )}
        </div>
      </div>

      {/* Live Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                    Live Sessions
                </h3>
            </div>
            {currentPeriod && (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {classes.length} Classes Registered
                </span>
            )}
        </div>

        {currentPeriod && isSchoolDay ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {classes.map(cls => {
                    const daySchedule = cls.schedule[currentDayName as DayOfWeek];
                    const entry = daySchedule ? daySchedule[currentPeriod.period] : null;

                    if (!entry) return null; // Only show active classes to reduce clutter

                    return (
                        <div key={cls.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="text-lg font-black text-slate-800">{cls.name}</h4>
                                    {entry.room && (
                                        <span className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full flex items-center border border-slate-100">
                                            <MapPin className="w-3 h-3 mr-1" /> {entry.room}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shrink-0">
                                            {entry.subject.slice(0, 3)}
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Subject</div>
                                            <div className="font-bold text-slate-800 leading-tight text-sm truncate w-32" title={entry.subject}>{entry.subject}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Teacher</div>
                                            <div className="font-bold text-slate-700 text-sm truncate w-32" title={getTeacherName(entry.teacherOrClass)}>
                                                {getTeacherName(entry.teacherOrClass)}
                                            </div>
                                            </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {/* Fallback if no classes have a session this specific period despite it being a school period */}
                {classes.every(c => !c.schedule[currentDayName as DayOfWeek]?.[currentPeriod.period]) && (
                     <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                        <Coffee className="w-12 h-12 mb-4 opacity-50" />
                        <p className="font-bold text-sm">No classes scheduled for this period.</p>
                     </div>
                )}
            </div>
        ) : (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <BookOpen className="w-10 h-10 text-slate-300" />
                </div>
                <h4 className="text-2xl font-bold text-slate-800 mb-2">No Active Classes</h4>
                <p className="text-slate-500 text-base max-w-md">
                    School is currently out of session or in between periods. View the full schedule in the <b>Classes</b> tab.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};
