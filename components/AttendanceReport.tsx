import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { CalendarDays, Filter, BarChart3, Clock, ArrowDown, ArrowUp, Download } from 'lucide-react';
import { AttendanceStatus, DayOfWeek } from '../types';

export const AttendanceReport: React.FC = () => {
  const { entities, students, timeSlots, attendanceRecords } = useData();
  const classes = entities.filter(e => e.type === 'CLASS');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'daily' | 'subject'>('daily');
  const selectedClass = entities.find(e => e.id === selectedClassId);
  const classStudents = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);

  const subjectsList = useMemo(() => {
     if (!selectedClass || !selectedClass.schedule) return [];
     const set = new Set<string>();
     Object.values(selectedClass.schedule).forEach(day => {
        if (!day) return;
        Object.values(day).forEach(slot => { if (slot?.subject) set.add(slot.subject.toUpperCase()); });
     });
     return Array.from(set).sort();
  }, [selectedClass]);

  const studentStats = useMemo(() => {
    if (!selectedClass) return [];
    return classStudents.map(student => {
        const stats: Record<string, { present: number; total: number }> = {};
        subjectsList.forEach(sub => stats[sub] = { present: 0, total: 0 });
        const studentRecords = attendanceRecords.filter(r => r.entityId === selectedClassId && r.studentId === student.id);
        studentRecords.forEach(rec => {
            const dateObj = new Date(rec.date);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = days[dateObj.getUTCDay()];
            const scheduleObj = selectedClass.schedule as Record<string, any>;
            const entry = scheduleObj?.[dayName]?.[rec.period];
            if (entry?.subject) {
                const subjectKey = entry.subject.toUpperCase();
                if (stats[subjectKey]) {
                    stats[subjectKey].total++;
                    if (['PRESENT', 'LATE', 'EXCUSED'].includes(rec.status)) stats[subjectKey].present++;
                }
            }
        });
        const statsArray = subjectsList.map(sub => ({ subject: sub, ...stats[sub] }));
        const overallTotal = statsArray.reduce((acc, curr) => acc + curr.total, 0);
        const overallPresent = statsArray.reduce((acc, curr) => acc + curr.present, 0);
        return { student, stats: statsArray, overall: { present: overallPresent, total: overallTotal } };
    });
  }, [selectedClass, attendanceRecords, classStudents, selectedClassId, subjectsList]);

  return (
    <div className="flex flex-col h-full space-y-4 text-slate-900 overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
              <button onClick={() => setViewMode('daily')} className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'daily' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                  <Clock className="w-3 h-3 mr-2" /> Daily Matrix
              </button>
              <button onClick={() => setViewMode('subject')} className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'subject' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                  <BarChart3 className="w-3 h-3 mr-2" /> Analytics
              </button>
          </div>
          <div className="flex gap-2">
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm">
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {viewMode === 'daily' && (
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none bg-white shadow-sm" />
            )}
          </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1 scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                      <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-4 bg-slate-50 sticky left-0 z-30">Student Registry</th>
                          {viewMode === 'daily' ? (
                              timeSlots.map(s => <th key={s.period} className="p-4 text-center">P{s.period}</th>)
                          ) : (
                              <>
                                {subjectsList.map(sub => <th key={sub} className="p-4 text-center">{sub}</th>)}
                                <th className="p-4 text-right bg-slate-100/50">Total %</th>
                              </>
                          )}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {viewMode === 'daily' ? (
                          classStudents.map(student => (
                              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-50">
                                      <div className="text-xs">{student.name}</div>
                                      <div className="text-[9px] text-slate-400 font-black uppercase">{student.rollNumber}</div>
                                  </td>
                                  {timeSlots.map(slot => {
                                      const rec = attendanceRecords.find(r => r.date === selectedDate && r.entityId === selectedClassId && r.studentId === student.id && r.period === slot.period);
                                      return (
                                          <td key={slot.period} className="p-2 text-center">
                                              <span className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-[9px] font-black border transition-all ${
                                                  rec?.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                  rec?.status === 'ABSENT' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                                  rec?.status ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-200 border-transparent'
                                              }`}>
                                                  {rec?.status ? rec.status[0] : '-'}
                                              </span>
                                          </td>
                                      );
                                  })}
                              </tr>
                          ))
                      ) : (
                          studentStats.map(({ student, stats, overall }) => (
                              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-50">
                                      <div className="text-xs">{student.name}</div>
                                      <div className="text-[9px] text-slate-400 font-black uppercase">{student.rollNumber}</div>
                                  </td>
                                  {stats.map(stat => {
                                      const pct = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : null;
                                      return (
                                          <td key={stat.subject} className="p-4 text-center">
                                              {pct !== null ? (
                                                  <div className="flex flex-col">
                                                      <span className={`text-xs font-black ${pct < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>{pct}%</span>
                                                      <span className="text-[8px] text-slate-300 font-bold">{stat.present}/{stat.total}</span>
                                                  </div>
                                              ) : <span className="text-slate-200">-</span>}
                                          </td>
                                      );
                                  })}
                                  <td className="p-4 text-right bg-slate-50/30">
                                      <span className={`text-sm font-black ${overall.total > 0 && (overall.present/overall.total)*100 < 75 ? 'text-rose-600' : 'text-slate-800'}`}>
                                          {overall.total > 0 ? Math.round((overall.present / overall.total) * 100) + '%' : '-'}
                                      </span>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};