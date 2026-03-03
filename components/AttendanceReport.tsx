
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { CalendarDays, Filter, BarChart3, Clock, ArrowDown, ArrowUp, Download, PieChart, ShieldAlert, Calendar, ChevronDown, FileSpreadsheet, X, Check, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { AttendanceStatus, DayOfWeek, Student } from '../types';

type ReportPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'YEAR' | 'CUSTOM';

interface DetailModalProps {
    student: Student;
    subject: string;
    records: any[];
    onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ student, subject, records, onClose }) => {
    const presentCount = records.filter(r => ['PRESENT', 'LATE', 'EXCUSED'].includes(r.status)).length;
    const absentCount = records.filter(r => r.status === 'ABSENT').length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Detail View</div>
                             <div className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{subject}</div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{student.name}</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Historical Subject Logs</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                        <X className="w-6 h-6 text-slate-400"/>
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto scrollbar-hide space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Working Days</div>
                            <div className="text-3xl font-black text-blue-600">{total}</div>
                        </div>
                        <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Present</div>
                            <div className="text-3xl font-black text-emerald-600">{presentCount}</div>
                        </div>
                        <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100">
                            <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Absent</div>
                            <div className="text-3xl font-black text-rose-600">{absentCount}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 p-6 bg-slate-900 rounded-[2rem] text-white">
                        <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                            <TrendingUp className="w-10 h-10 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-4xl font-black tracking-tighter">{percentage}%</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Compliance Score</div>
                        </div>
                    </div>

                    {/* Timeline List */}
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Timeline</h4>
                        {records.length > 0 ? (
                            records.sort((a,b) => b.date.localeCompare(a.date)).map((rec, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xs font-black border border-slate-100 text-slate-400">P{rec.period}</div>
                                        <div>
                                            <div className="text-sm font-black text-slate-700">{new Date(rec.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institutional Session</div>
                                        </div>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                        rec.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                        rec.status === 'ABSENT' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                        'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                        {rec.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-slate-300 font-bold italic">No sessions recorded yet.</div>
                        )}
                    </div>
                </div>
                
                <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                        <Info className="w-3 h-3" /> System verified record • {student.rollNumber}
                    </p>
                </div>
            </div>
        </div>
    );
};

export const AttendanceReport: React.FC = () => {
  const { entities, students, timeSlots, attendanceRecords, primaryColor } = useData();
  const classes = entities.filter(e => e.type === 'CLASS');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('WEEKLY');
  const [viewMode, setViewMode] = useState<'log' | 'mastery'>('log');
  
  const [detailView, setDetailView] = useState<{ student: Student, subject: string, records: any[] } | null>(null);

  const [customStart, setCustomStart] = useState<string>(selectedDate);
  const [customEnd, setCustomEnd] = useState<string>(selectedDate);

  const selectedClass = entities.find(e => e.id === selectedClassId);
  const classStudents = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);

  const dateRange = useMemo(() => {
      // Create anchor dates using T12:00:00 to avoid UTC day-flip issues with date-only strings
      const anchorDate = new Date(selectedDate + "T12:00:00");
      let start = new Date(anchorDate);
      let end = new Date(anchorDate);

      switch (reportPeriod) {
          case 'DAILY':
              // Start and end are already set to selectedDate
              break;
          case 'WEEKLY':
              // "Last 7 days" relative to selected date
              start = new Date(anchorDate);
              start.setDate(anchorDate.getDate() - 6);
              end = new Date(anchorDate);
              break;
          case 'MONTHLY':
              start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
              end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
              break;
          case 'SEMESTER':
              const isFirstSemester = anchorDate.getMonth() < 6;
              start = new Date(anchorDate.getFullYear(), isFirstSemester ? 0 : 6, 1);
              end = new Date(anchorDate.getFullYear(), isFirstSemester ? 5 : 11, 31);
              break;
          case 'YEAR':
              start = new Date(anchorDate.getFullYear(), 0, 1);
              end = new Date(anchorDate.getFullYear(), 11, 31);
              break;
          case 'CUSTOM':
              start = new Date(customStart + "T00:00:00");
              end = new Date(customEnd + "T23:59:59");
              break;
      }
      
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return { start, end };
  }, [reportPeriod, selectedDate, customStart, customEnd]);

  const filteredRecords = useMemo(() => {
      return attendanceRecords.filter(r => {
          const rDate = new Date(r.date + "T12:00:00");
          return rDate >= dateRange.start && rDate <= dateRange.end && r.entityId === selectedClassId;
      });
  }, [attendanceRecords, dateRange, selectedClassId]);

  const subjectsList = useMemo(() => {
     if (!selectedClass || !selectedClass.schedule) return [];
     const set = new Set<string>();
     Object.values(selectedClass.schedule).forEach(day => {
        if (!day) return;
        Object.values(day).forEach(slot => { 
            if (slot?.subject) set.add(slot.subject.toUpperCase()); 
        });
     });
     return Array.from(set).sort();
  }, [selectedClass]);

  const studentStats = useMemo(() => {
    if (!selectedClass) return [];
    return classStudents.map(student => {
        const stats: Record<string, { present: number; total: number; logs: any[] }> = {};
        subjectsList.forEach(sub => stats[sub] = { present: 0, total: 0, logs: [] });
        
        const records = filteredRecords.filter(r => r.studentId === student.id);
        
        records.forEach(rec => {
            const subjectKey = (rec.subject || '').toUpperCase();
            if (subjectKey && stats[subjectKey]) {
                stats[subjectKey].total++;
                stats[subjectKey].logs.push(rec);
                if (['PRESENT', 'LATE', 'EXCUSED'].includes(rec.status)) stats[subjectKey].present++;
            }
        });

        const overall = { present: 0, total: 0 };
        const statsArray = subjectsList.map(sub => {
            overall.present += stats[sub].present;
            overall.total += stats[sub].total;
            return { subject: sub, ...stats[sub] };
        });

        return { student, stats: statsArray, overall };
    });
  }, [selectedClass, filteredRecords, classStudents, subjectsList]);

  const handleExportCSV = () => {
    let header: string[] = [];
    let rows: string[][] = [];
    let filename = "";

    if (viewMode === 'log') {
        header = ["Student Name", "Roll Number", ...timeSlots.map(s => `P${s.period}`)];
        rows = classStudents.map(student => {
            const periodData = timeSlots.map(slot => {
                const recs = filteredRecords.filter(r => r.studentId === student.id && r.period === slot.period);
                return recs.length > 0 ? recs[recs.length - 1].status : "-";
            });
            return [`"${student.name}"`, `"${student.rollNumber}"`, ...periodData];
        });
        filename = `Attendance_Log_${selectedClass?.name}_${reportPeriod}.csv`;
    } else {
        header = ["Student Name", "Roll Number", ...subjectsList, "Overall %"];
        rows = studentStats.map(({ student, stats, overall }) => {
            const subjectData = stats.map(s => s.total > 0 ? `${Math.round((s.present / s.total) * 100)}% (${s.present}/${s.total})` : "-");
            const overallPct = overall.total > 0 ? `${Math.round((overall.present / overall.total) * 100)}%` : "0%";
            return [`"${student.name}"`, `"${student.rollNumber}"`, ...subjectData, overallPct];
        });
        filename = `Subject_Mastery_${selectedClass?.name}_${reportPeriod}.csv`;
    }

    const csvContent = "\uFEFF" + [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col space-y-6 pb-20">
      {detailView && (
          <DetailModal 
            student={detailView.student} 
            subject={detailView.subject} 
            records={detailView.records} 
            onClose={() => setDetailView(null)} 
          />
      )}

      {/* Header Filters */}
      <div className="flex flex-col gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl w-full lg:w-fit border border-slate-100">
                  <button onClick={() => setViewMode('log')} className={`flex-1 lg:flex-none flex items-center justify-center px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'log' ? 'bg-slate-900 shadow-xl text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                      <Clock className="w-3.5 h-3.5 mr-2" /> Attendance Log
                  </button>
                  <button onClick={() => setViewMode('mastery')} className={`flex-1 lg:flex-none flex items-center justify-center px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'mastery' ? 'bg-slate-900 shadow-xl text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                      <PieChart className="w-3.5 h-3.5 mr-2" /> Subject Mastery
                  </button>
              </div>
              
              <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="appearance-none pl-5 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 transition-all">
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-slate-300 pointer-events-none" />
                  </div>
                  
                  <div className="relative">
                    <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value as ReportPeriod)} className="appearance-none pl-5 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 transition-all">
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly (7 Days)</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="SEMESTER">Semester</option>
                        <option value="YEAR">Annual</option>
                        <option value="CUSTOM">Custom Range</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-slate-300 pointer-events-none" />
                  </div>

                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
                  >
                      <Download className="w-4 h-4" /> Download CSV
                  </button>
              </div>
          </div>

          {(reportPeriod !== 'CUSTOM' || reportPeriod === 'CUSTOM') && (
              <div className="flex flex-wrap gap-4 p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 animate-in fade-in slide-in-from-top-2">
                {reportPeriod !== 'CUSTOM' ? (
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Date</span>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none bg-white focus:border-blue-300 transition-all" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Report is relative to this date</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</span>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none bg-white" />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</span>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none bg-white" />
                        </div>
                    </div>
                )}
              </div>
          )}
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white/50">
              <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {reportPeriod} REPORT • {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
                  </span>
              </div>
          </div>
          
          <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left min-w-[800px]">
                  <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-8">Student Detail</th>
                          {viewMode === 'log' ? (
                              timeSlots.map(s => <th key={s.period} className="p-4 text-center">P{s.period}</th>)
                          ) : (
                              <>
                                {subjectsList.map(sub => <th key={sub} className="p-4 text-center">{sub}</th>)}
                                <th className="p-8 text-right bg-slate-900 text-white">Compliance</th>
                              </>
                          )}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {viewMode === 'log' ? (
                          classStudents.map(student => (
                              <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="p-8">
                                      <div className="font-black text-slate-800 text-sm">{student.name}</div>
                                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 flex gap-3">
                                          <span>Roll: {student.rollNumber}</span>
                                      </div>
                                  </td>
                                  {timeSlots.map(slot => {
                                      const recs = filteredRecords.filter(r => r.studentId === student.id && r.period === slot.period);
                                      const latest = recs[recs.length - 1];
                                      
                                      return (
                                          <td key={slot.period} className="p-4 text-center">
                                              {recs.length > 0 ? (
                                                  <div className="flex flex-col items-center">
                                                      <span className={`inline-flex w-10 h-10 items-center justify-center rounded-xl text-[11px] font-black border ${
                                                          latest?.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                          latest?.status === 'ABSENT' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                                          'bg-blue-50 text-blue-600 border-blue-100'
                                                      }`}>
                                                          {latest?.status[0]}
                                                      </span>
                                                      {recs.length > 1 && (
                                                          <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">x{recs.length} Days</span>
                                                      )}
                                                  </div>
                                              ) : <span className="text-slate-100 font-black">-</span>}
                                          </td>
                                      );
                                  })}
                              </tr>
                          ))
                      ) : (
                          studentStats.map(({ student, stats, overall }) => (
                              <tr key={student.id} className="hover:bg-slate-50/30">
                                  <td className="p-8">
                                      <div className="font-black text-slate-800 text-sm">{student.name}</div>
                                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                        Roll No: {student.rollNumber}
                                      </div>
                                  </td>
                                  {stats.map(stat => {
                                      const pct = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : null;
                                      return (
                                          <td key={stat.subject} className="p-4 text-center">
                                              {pct !== null ? (
                                                  <button 
                                                    onClick={() => setDetailView({ student, subject: stat.subject, records: stat.logs })}
                                                    className="flex flex-col items-center group/cell w-full hover:bg-blue-50/50 p-2 rounded-xl transition-all"
                                                  >
                                                      <span className={`text-sm font-black ${pct < 75 ? 'text-rose-600' : 'text-slate-800'} group-hover/cell:scale-110 transition-transform`}>{pct}%</span>
                                                      <span className="text-[9px] text-slate-300 font-bold uppercase">{stat.present}/{stat.total}</span>
                                                  </button>
                                              ) : <span className="text-slate-100 font-black">-</span>}
                                          </td>
                                      );
                                  })}
                                  <td className="p-8 text-right border-l border-slate-100 bg-slate-50/30">
                                      <div className="flex flex-col items-end">
                                          <span className={`text-xl font-black flex items-center gap-2 ${overall.total > 0 && (overall.present/overall.total)*100 < 75 ? 'text-rose-600' : 'text-slate-900'}`}>
                                              {overall.total > 0 && (overall.present/overall.total)*100 < 75 && <ShieldAlert className="w-5 h-5" />}
                                              {overall.total > 0 ? Math.round((overall.present / overall.total) * 100) + '%' : '0%'}
                                          </span>
                                          <div className={`mt-1 h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden`}>
                                              <div className={`h-full ${overall.total > 0 && (overall.present/overall.total)*100 < 75 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: overall.total > 0 ? `${(overall.present / overall.total) * 100}%` : '0%' }}></div>
                                          </div>
                                      </div>
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
