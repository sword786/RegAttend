
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Clock, MapPin, User, BookOpen, Coffee, Activity, GraduationCap, Users, School, Calendar, ArrowRight, Timer, ChevronRight, X, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { DayOfWeek, TimetableEntry, EntityProfile } from '../types';

interface DashboardHomeProps {
  onSessionClick: (entityId: string, day: string, period: number, entry: TimetableEntry) => void;
}

interface QuickSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: string;
  period: number;
  entities: EntityProfile[];
  onSelect: (entityId: string, entry: TimetableEntry) => void;
  todayDate: string;
  getAttendance: (date: string, id: string, p: number) => any[];
}

const QuickSelectorModal: React.FC<QuickSelectorModalProps> = ({ 
    isOpen, onClose, day, period, entities, onSelect, todayDate, getAttendance 
}) => {
  const [step, setStep] = useState<'type' | 'list'>('type');
  const [selectedType, setSelectedType] = useState<'CLASS' | 'TEACHER' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const activeSessions = useMemo(() => {
    if (!selectedType) return [];
    return entities
      .filter(e => e.type === selectedType)
      .map(entity => {
        const schedule = entity.schedule?.[day as DayOfWeek];
        const entry = schedule ? schedule[period] : null;
        return entry ? { entity, entry } : null;
      })
      .filter((item): item is { entity: EntityProfile; entry: TimetableEntry } => 
        item !== null && item.entity.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [entities, selectedType, day, period, searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      setStep('type');
      setSelectedType(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  const resolveIdentifierName = (id: string | undefined) => {
    if (!id) return 'Unassigned';
    const found = entities.find(e => e.shortCode === id || e.name === id);
    return found ? found.name : id;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Quick Registry</div>
              <div className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Period {period} • {day}</div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
              {step === 'type' ? 'Access Protocol' : `Identify ${selectedType === 'CLASS' ? 'Class' : 'Teacher'}`}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              {step === 'type' ? 'Choose how you want to find your session' : 'Selecting a session opens the register'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto scrollbar-hide">
          {step === 'type' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button 
                onClick={() => { setSelectedType('CLASS'); setStep('list'); }}
                className="group p-8 rounded-[2rem] border-2 border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-500 hover:shadow-xl transition-all text-left flex flex-col items-center sm:items-start text-center sm:text-left"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">By Class</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Search through active Grade session registers</p>
              </button>

              <button 
                onClick={() => { setSelectedType('TEACHER'); setStep('list'); }}
                className="group p-8 rounded-[2rem] border-2 border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-500 hover:shadow-xl transition-all text-left flex flex-col items-center sm:items-start text-center sm:text-left"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">By Teacher</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Search via faculty member session logs</p>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder={`Find ${selectedType === 'CLASS' ? 'Class' : 'Teacher'}...`} 
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base outline-none font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all focus:bg-white"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {activeSessions.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {activeSessions.map(({ entity, entry }) => {
                    const oppositeName = resolveIdentifierName(entry.teacherOrClass);
                    const hasAttendance = getAttendance(todayDate, entity.id, period).length > 0;

                    return (
                      <button 
                        key={entity.id} 
                        onClick={() => onSelect(entity.id, entry)}
                        className={`p-6 bg-white border rounded-[1.75rem] text-left hover:shadow-lg transition-all group active:scale-[0.98] flex items-center justify-between ${hasAttendance ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 hover:border-blue-300'}`}
                      >
                        <div className="flex items-center gap-5 min-w-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${hasAttendance ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500'}`}>
                             {hasAttendance ? <CheckCircle2 className="w-6 h-6" /> : (entity.shortCode || entity.name.substring(0,2))}
                          </div>
                          <div className="min-w-0">
                            <div className="text-lg font-black text-slate-800 truncate leading-none mb-1.5">{entity.name}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">{entry.subject}</span>
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  {selectedType === 'CLASS' ? 'with ' : 'assigned to '} 
                                  <span className="text-slate-900 font-black">{oppositeName}</span>
                               </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 transition-all ${hasAttendance ? 'text-emerald-500' : 'text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1'}`} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-dashed border-slate-200">
                    <X className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No active sessions matched</p>
                </div>
              )}

              <button onClick={() => setStep('type')} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors flex items-center gap-2 mt-4">
                <ArrowRight className="w-3 h-3 rotate-180" /> Back to Selection Type
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onSessionClick }) => {
  const { entities, timeSlots, students, primaryColor, getAttendanceForPeriod } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayDateString = useMemo(() => getLocalDateString(currentTime), [currentTime]);

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

  const hours12 = currentTime.getHours() % 12 || 12;
  const ampm = currentTime.getHours() >= 12 ? 'PM' : 'AM';
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');

  return (
    <div className="flex flex-col space-y-6 sm:space-y-10 pb-10">
      
      <QuickSelectorModal 
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        day={currentDayName}
        period={currentPeriod?.period || 0}
        entities={entities}
        todayDate={todayDateString}
        getAttendance={getAttendanceForPeriod}
        onSelect={(entityId, entry) => {
          onSessionClick(entityId, currentDayName, currentPeriod?.period || 0, entry);
          setIsSelectorOpen(false);
        }}
      />

      {/* STATUS HEADER */}
      <div className="space-y-6 sm:space-y-8">
        <div className="bg-slate-900 px-6 py-10 sm:px-12 sm:py-16 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl text-white relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-10 xl:gap-16">
            <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-white/10 rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-blue-300 mb-6 sm:mb-10 border border-white/5 backdrop-blur-md shrink-0">
                <Calendar className="w-4 h-4" />
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              
              <div className="flex items-baseline gap-2 sm:gap-4">
                <h2 className="text-5xl sm:text-7xl lg:text-9xl font-black tracking-tighter tabular-nums leading-none">
                  {hours12}<span className="animate-pulse text-blue-500">:</span>{minutes}<span className="text-slate-700 mx-1">:</span>{seconds}
                </h2>
                <div className="flex flex-col items-start">
                    <span className="text-xl sm:text-3xl lg:text-5xl font-black text-blue-400 uppercase tracking-tighter leading-none mb-1 sm:mb-2">
                        {ampm}
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-50">Local Protocol</span>
                </div>
              </div>
            </div>

            <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-5 sm:gap-8">
              <button 
                onClick={() => currentPeriod && isSchoolDay && setIsSelectorOpen(true)}
                disabled={!currentPeriod || !isSchoolDay}
                className={`group flex-1 min-w-0 sm:min-w-[280px] p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border transition-all duration-700 text-left relative overflow-hidden active:scale-95 ${currentPeriod && isSchoolDay ? 'bg-emerald-500/10 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 cursor-pointer hover:bg-emerald-500/20' : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
                  <span className="text-[10px] sm:text-[12px] font-black text-slate-500 uppercase tracking-widest">Currently Active</span>
                  {currentPeriod && isSchoolDay ? (
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black bg-emerald-500 text-white px-3 py-1 rounded-full animate-pulse shadow-xl shadow-emerald-500/30 uppercase tracking-tighter">LIVE</span>
                    </div>
                  ) : null}
                </div>
                <div className="text-3xl sm:text-5xl font-black truncate leading-tight relative z-10 group-hover:text-emerald-400 transition-colors">{currentPeriod && isSchoolDay ? `Period ${currentPeriod.period}` : 'Break Time'}</div>
                <div className="text-[11px] sm:text-[14px] font-bold text-slate-400 mt-3 sm:mt-5 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <Timer className="w-4 h-4 sm:w-5 h-5 text-blue-400" />
                    {currentPeriod && isSchoolDay ? currentPeriod.timeRange : 'Out of session'}
                  </div>
                  {currentPeriod && isSchoolDay && <div className="text-[10px] font-black uppercase text-blue-400 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all flex items-center gap-2">Registry <ChevronRight className="w-4 h-4" /></div>}
                </div>
              </button>

              {nextPeriod && isSchoolDay && (
                <div className="flex-1 min-w-0 sm:min-w-[280px] p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border bg-white/5 border-white/10 transition-all">
                  <span className="text-[10px] sm:text-[12px] font-black text-slate-500 uppercase tracking-widest block mb-3 sm:mb-4 opacity-60">Up Next</span>
                  <div className="text-3xl sm:text-5xl font-black truncate text-slate-300 leading-tight">Period {nextPeriod.period}</div>
                  <div className="text-[11px] sm:text-[14px] font-bold text-slate-500 mt-3 sm:mt-5 flex items-center gap-3">
                    <Clock className="w-4 h-4 sm:w-5 h-5" />
                    Starts at {nextPeriod.timeRange.split('-')[0]}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard icon={<Users className="w-5 h-5 sm:w-7 h-7" />} label="Students" value={students.length} color="blue" />
          <StatCard icon={<School className="w-5 h-5 sm:w-7 h-7" />} label="Classes" value={classesCount} color="purple" />
          <StatCard icon={<GraduationCap className="w-5 h-5 sm:w-7 h-7" />} label="Teachers" value={teachersCount} color="indigo" />
          <StatCard icon={<Activity className="w-5 h-5 sm:w-7 h-7" />} label="Status" value={currentPeriod && isSchoolDay ? 'Active' : 'Break'} color="emerald" />
        </div>
      </div>

      {/* LIVE SESSIONS SECTION */}
      <div className="pt-4 sm:pt-8">
        <div className="flex flex-col gap-2 mb-8 sm:mb-14 px-1">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="p-3 sm:p-5 bg-indigo-100 text-indigo-600 rounded-[1.25rem] sm:rounded-[2rem] shadow-sm border border-indigo-200 shrink-0">
                  <Activity className="w-6 h-6 sm:w-9 h-9" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-4xl font-black text-slate-800 uppercase tracking-tight leading-none">Registers</h3>
                <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-[0.25em] mt-2 sm:mt-3">Record session attendance</p>
              </div>
            </div>
        </div>

        {currentPeriod && isSchoolDay ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                {entities.filter(e => e.type === 'CLASS').map(cls => {
                    const daySchedule = cls.schedule ? cls.schedule[currentDayName as DayOfWeek] : null;
                    const entry = daySchedule ? daySchedule[currentPeriod.period] : null;

                    if (!entry) return null;

                    const hasAttendance = getAttendanceForPeriod(todayDateString, cls.id, currentPeriod.period).length > 0;

                    return (
                        <div 
                          key={cls.id} 
                          onClick={() => onSessionClick(cls.id, currentDayName, currentPeriod.period, entry)}
                          className={`bg-white rounded-[3rem] sm:rounded-[4rem] border shadow-sm p-7 sm:p-12 hover:shadow-[0_50px_100px_-20px_rgba(15,23,42,0.12)] hover:border-blue-500 hover:translate-y-[-10px] transition-all group cursor-pointer active:scale-[0.97] flex flex-col h-full border-b-8 ${hasAttendance ? 'border-emerald-500/20' : 'border-slate-200'}`}
                          style={{ borderBottomColor: hasAttendance ? '#10b981' : primaryColor }}
                        >
                            <div className="flex justify-between items-start mb-8 sm:mb-14">
                                <div className="flex items-center gap-5 sm:gap-8">
                                    <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-[1.75rem] sm:rounded-[2.5rem] flex items-center justify-center text-base sm:text-2xl font-black transition-all shadow-inner shrink-0 ${hasAttendance ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-50 border border-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500'}`}>
                                        {hasAttendance ? <CheckCircle2 className="w-8 h-8 sm:w-12 h-12" /> : (cls.shortCode || cls.name.substring(0,2))}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className={`text-xl sm:text-3xl font-black leading-tight transition-colors truncate ${hasAttendance ? 'text-emerald-700' : 'text-slate-800 group-hover:text-blue-600'}`}>{cls.name}</h4>
                                        <div className="flex items-center gap-2 mt-1 sm:mt-3">
                                            <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                            <span className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest truncate">{entry.room || 'Standard Room'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-4 sm:p-5 rounded-[1.5rem] transition-all shrink-0 ${hasAttendance ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-300'}`}>
                                    {hasAttendance ? <CheckCircle2 className="w-6 h-6 sm:w-8 h-8" /> : <ArrowRight className="w-6 h-6 sm:w-8 h-8" />}
                                </div>
                            </div>
                            
                            <div className="space-y-5 sm:space-y-8 flex-1">
                                <div className={`flex items-center gap-5 sm:gap-8 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border transition-colors ${hasAttendance ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-100 group-hover:bg-blue-50/50 group-hover:border-blue-100'}`}>
                                    <div className={`p-3.5 sm:p-5 rounded-2xl shadow-sm border shrink-0 ${hasAttendance ? 'bg-white text-emerald-600 border-emerald-50' : 'bg-white text-blue-600 border-blue-50'}`}>
                                        <BookOpen className="w-6 h-6 sm:w-8 h-8" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-[10px] sm:text-[12px] font-black uppercase tracking-widest leading-none mb-2 sm:mb-4 ${hasAttendance ? 'text-emerald-400' : 'text-slate-400'}`}>Current Subject</span>
                                        <span className="text-lg sm:text-2xl font-black text-slate-700 truncate tracking-tight">{entry.subject}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 sm:gap-8 p-5 sm:p-10 bg-slate-50/50 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 transition-colors">
                                    <div className="p-3.5 sm:p-5 bg-white rounded-2xl text-slate-600 shadow-sm border border-slate-100 shrink-0">
                                        <User className="w-6 h-6 sm:w-8 h-8" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] sm:text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2 sm:mb-4">Session Faculty</span>
                                        <span className="text-lg sm:text-2xl font-black text-slate-700 truncate tracking-tight">
                                            {getTeacherName(entry.teacherOrClass)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button className={`w-full mt-10 sm:mt-16 py-5 sm:py-7 rounded-[2rem] sm:rounded-[3rem] text-xs sm:text-sm font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 ${hasAttendance ? 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700' : 'bg-slate-900 text-white shadow-slate-200 group-hover:bg-blue-600 group-hover:scale-[1.03]'}`}>
                                {hasAttendance ? <CheckCircle2 className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                                {hasAttendance ? 'Attendance Recorded' : 'Mark Attendance'}
                            </button>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="bg-white rounded-[3.5rem] sm:rounded-[6rem] border-4 border-slate-100 p-16 sm:p-48 text-center relative overflow-hidden group shadow-inner border-dashed">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#cbd5e1_2px,transparent_2px)] [background-size:40px_40px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative z-10">
                    <div className="w-28 h-28 sm:w-48 sm:h-48 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-10 sm:mb-20 shadow-inner border border-slate-100 ring-[1rem] sm:ring-[2rem] ring-slate-50/50">
                        <Coffee className="w-14 h-14 sm:w-24 sm:h-24 text-slate-200 group-hover:rotate-12 group-hover:scale-110 transition-all duration-700" />
                    </div>
                    <h3 className="text-4xl sm:text-7xl font-black text-slate-800 tracking-tighter mb-5 sm:mb-10 uppercase">Recess Period</h3>
                    <p className="text-[11px] sm:text-base text-slate-400 max-w-sm sm:max-w-md mx-auto font-black uppercase tracking-[0.25em] leading-relaxed sm:leading-loose opacity-70">
                        Live attendance registers will appear automatically when the next session starts.
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
        <div className="bg-white p-4 sm:p-8 rounded-[1.75rem] sm:rounded-[3rem] border border-slate-200 shadow-sm flex items-center gap-4 sm:gap-8 transition-all hover:border-slate-300 hover:shadow-xl hover:translate-y-[-4px] cursor-default min-w-0">
            <div className={`w-11 h-11 sm:w-20 sm:h-20 rounded-[1.25rem] sm:rounded-[2rem] flex items-center justify-center shrink-0 border-2 sm:border-[3px] shadow-sm ${colorClasses[color]}`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
                <div className="text-2xl sm:text-5xl font-black text-slate-800 leading-none truncate tracking-tight">{value}</div>
                <div className="text-[9px] sm:text-[12px] text-slate-400 font-black uppercase tracking-widest sm:tracking-[0.25em] mt-2 sm:mt-4 truncate opacity-80">{label}</div>
            </div>
        </div>
    );
};
