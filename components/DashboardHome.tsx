
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Clock, MapPin, User, BookOpen, Coffee, Activity, GraduationCap, Users, School, Calendar, ArrowRight, Timer } from 'lucide-react';
import { DayOfWeek, TimetableEntry } from '../types';

interface DashboardHomeProps {
  onSessionClick: (entityId: string, day: string, period: number, entry: TimetableEntry) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onSessionClick }) => {
  const { entities, timeSlots, students } = useData();
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
    <div className="flex flex-col space-y-10">
      
      {/* STATUS HEADER - COMPLETELY LOOSE / NO STICKY */}
      <div className="space-y-6">
        <div className="bg-slate-900 px-8 py-10 sm:px-12 sm:py-14 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12">
            <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.25em] text-blue-300 mb-6 border border-white/5 backdrop-blur-md">
                <Calendar className="w-4.5 h-4.5" />
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <h2 className="text-6xl sm:text-8xl font-black tracking-tighter tabular-nums leading-none">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </h2>
            </div>

            <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-6">
              <div className={`flex-1 min-w-[240px] p-8 rounded-[2.5rem] border transition-all duration-500 ${currentPeriod ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/10' : 'bg-white/5 border-white/10'}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Currently Active</span>
                  {currentPeriod && <span className="text-[10px] font-black bg-emerald-500 text-white px-3 py-1 rounded-full animate-pulse shadow-lg shadow-emerald-500/20">LIVE</span>}
                </div>
                <div className="text-3xl font-black truncate">{currentPeriod ? `Period ${currentPeriod.period}` : 'Break Time'}</div>
                <div className="text-[12px] font-bold text-slate-400 mt-3 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  {currentPeriod ? currentPeriod.timeRange : 'Out of session'}
                </div>
              </div>

              {nextPeriod && isSchoolDay && (
                <div className="flex-1 min-w-[240px] p-8 rounded-[2.5rem] border bg-white/5 border-white/10 transition-all">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-3">Up Next</span>
                  <div className="text-3xl font-black truncate text-slate-300">Period {nextPeriod.period}</div>
                  <div className="text-[12px] font-bold text-slate-500 mt-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Starts at {nextPeriod.timeRange.split('-')[0]}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard icon={<Users className="w-6 h-6" />} label="Students" value={students.length} color="blue" />
          <StatCard icon={<School className="w-6 h-6" />} label="Classes" value={classesCount} color="purple" />
          <StatCard icon={<GraduationCap className="w-6 h-6" />} label="Teachers" value={teachersCount} color="indigo" />
          <StatCard icon={<Activity className="w-6 h-6" />} label="Status" value={currentPeriod ? 'Active' : 'Break'} color="emerald" />
        </div>
      </div>

      {/* LIVE SESSIONS SECTION */}
      <div className="pt-6">
        <div className="flex flex-col gap-2 mb-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-100 text-indigo-600 rounded-[1.5rem] shadow-sm border border-indigo-200">
                  <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight leading-none">Attendance Registers</h3>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-20">Click on a class to record student attendance</p>
        </div>

        {currentPeriod && isSchoolDay ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {entities.filter(e => e.type === 'CLASS').map(cls => {
                    const daySchedule = cls.schedule[currentDayName as DayOfWeek];
                    const entry = daySchedule ? daySchedule[currentPeriod.period] : null;

                    if (!entry) return null;

                    return (
                        <div 
                          key={cls.id} 
                          onClick={() => onSessionClick(cls.id, currentDayName, currentPeriod.period, entry)}
                          className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm p-10 hover:shadow-[0_40px_80px_-15px_rgba(15,23,42,0.15)] hover:border-blue-500 hover:translate-y-[-10px] transition-all group cursor-pointer active:scale-95 flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-center text-lg font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all shadow-inner">
                                        {cls.shortCode || cls.name.substring(0,2)}
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{cls.name}</h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <MapPin className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{entry.room || 'No Venue'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-3xl group-hover:bg-blue-600 group-hover:text-white transition-all text-slate-300">
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </div>
                            
                            <div className="space-y-6 flex-1">
                                <div className="flex items-center gap-6 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                                    <div className="p-4 bg-white rounded-2xl text-blue-600 shadow-sm border border-blue-100">
                                        <BookOpen className="w-7 h-7" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2.5">Subject</span>
                                        <span className="text-xl font-black text-slate-700">{entry.subject}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 transition-colors">
                                    <div className="p-4 bg-white rounded-2xl text-slate-600 shadow-sm border border-slate-100">
                                        <User className="w-7 h-7" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2.5">Instructor</span>
                                        <span className="text-xl font-black text-slate-700 truncate">
                                            {getTeacherName(entry.teacherOrClass)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full mt-12 py-6 bg-slate-900 text-white rounded-[2.5rem] text-[13px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 group-hover:bg-blue-600 group-hover:scale-[1.03] transition-all flex items-center justify-center gap-4">
                                <Activity className="w-5 h-5" />
                                Record Attendance
                            </button>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="bg-white rounded-[5rem] border-2 border-slate-100 p-32 sm:p-40 text-center relative overflow-hidden group shadow-sm border-dashed">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e2e8f0_2px,transparent_2px)] [background-size:50px_50px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative z-10">
                    <div className="w-36 h-36 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-14 shadow-inner border border-slate-100 ring-8 ring-slate-50/50">
                        <Coffee className="w-20 h-20 text-slate-200 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500" />
                    </div>
                    <h3 className="text-6xl font-black text-slate-800 tracking-tighter mb-8">Break Time</h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto font-black uppercase tracking-[0.25em] leading-loose">
                        Active registers will appear automatically when school resumes.
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
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    };

    return (
        <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6 transition-all hover:border-slate-300 hover:shadow-md cursor-default">
            <div className={`w-16 h-16 rounded-[1.75rem] flex items-center justify-center shrink-0 border-2 ${colorClasses[color]}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-4xl font-black text-slate-800 leading-none truncate">{value}</div>
                <div className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mt-3 truncate">{label}</div>
            </div>
        </div>
    );
};
