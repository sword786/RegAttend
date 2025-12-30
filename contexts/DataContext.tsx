
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EntityProfile, Student, TimeSlot, TimetableEntry, AttendanceRecord, DayOfWeek, AiImportStatus, AiImportResult } from '../types';
import { DEFAULT_DATA, DEFAULT_STUDENTS, DEFAULT_TIME_SLOTS } from '../constants';
import { processTimetableImport } from '../services/geminiService';

interface DataContextType {
  schoolName: string;
  academicYear: string;
  entities: EntityProfile[];
  students: Student[];
  timeSlots: TimeSlot[];
  attendanceRecords: AttendanceRecord[];
  
  // AI Import State
  aiImportStatus: AiImportStatus;
  aiImportResult: AiImportResult | null;
  aiImportErrorMessage: string | null;
  startAiImport: (file?: File, text?: string) => Promise<void>;
  cancelAiImport: () => void;
  finalizeAiImport: (mappings: Record<string, string>) => void;

  updateSchoolName: (name: string) => void;
  updateAcademicYear: (year: string) => void;
  updateEntities: (entities: EntityProfile[]) => void;
  updateStudents: (students: Student[]) => void;
  updateTimeSlots: (slots: TimeSlot[]) => void;
  
  addEntity: (entity: EntityProfile) => void;
  updateEntity: (id: string, updates: Partial<EntityProfile>) => void;
  deleteEntity: (id: string) => void;

  addStudent: (student: Student) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;

  updateSchedule: (entityId: string, day: string, period: number, entry: TimetableEntry | null) => void;

  markAttendance: (records: AttendanceRecord[]) => void;
  getAttendanceForPeriod: (date: string, entityId: string, period: number) => AttendanceRecord[];

  resetData: () => void;
  importData: (data: any) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schoolName, setSchoolName] = useState('Mupini Combined School');
  const [academicYear, setAcademicYear] = useState('2025');
  const [entities, setEntities] = useState<EntityProfile[]>(DEFAULT_DATA);
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // AI State
  const [aiImportStatus, setAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [aiImportResult, setAiImportResult] = useState<AiImportResult | null>(null);
  const [aiImportErrorMessage, setAiImportErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedSchoolName = localStorage.getItem('mupini_schoolName');
      const savedAcademicYear = localStorage.getItem('mupini_academicYear');
      const savedEntities = localStorage.getItem('mupini_entities');
      const savedStudents = localStorage.getItem('mupini_students');
      const savedTimeSlots = localStorage.getItem('mupini_timeSlots');
      const savedAttendance = localStorage.getItem('mupini_attendance');

      if (savedSchoolName) setSchoolName(JSON.parse(savedSchoolName));
      if (savedAcademicYear) setAcademicYear(JSON.parse(savedAcademicYear));
      if (savedEntities) setEntities(JSON.parse(savedEntities));
      if (savedStudents) setStudents(JSON.parse(savedStudents));
      if (savedTimeSlots) setTimeSlots(JSON.parse(savedTimeSlots));
      if (savedAttendance) setAttendanceRecords(JSON.parse(savedAttendance));
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('mupini_schoolName', JSON.stringify(schoolName));
    localStorage.setItem('mupini_academicYear', JSON.stringify(academicYear));
    localStorage.setItem('mupini_entities', JSON.stringify(entities));
    localStorage.setItem('mupini_students', JSON.stringify(students));
    localStorage.setItem('mupini_timeSlots', JSON.stringify(timeSlots));
    localStorage.setItem('mupini_attendance', JSON.stringify(attendanceRecords));
  }, [schoolName, academicYear, entities, students, timeSlots, attendanceRecords, isInitialized]);

  const startAiImport = async (file?: File, text?: string) => {
    setAiImportStatus('PROCESSING');
    setAiImportErrorMessage(null);
    try {
        let result: AiImportResult | null = null;
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise<void>((resolve, reject) => {
                reader.onload = async (event) => {
                    try {
                        const base64 = (event.target?.result as string).split(',')[1];
                        result = await processTimetableImport({ base64, mimeType: file.type });
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                };
            });
        } else if (text) {
            result = await processTimetableImport({ text });
        }

        if (result && result.profiles.length > 0) {
            setAiImportResult(result);
            setAiImportStatus('REVIEW');
        } else if (result && result.profiles.length === 0) {
            setAiImportStatus('ERROR');
            setAiImportErrorMessage("Gemini recognized the file but couldn't find any timetable profiles. Please ensure the names/headers are clear.");
        } else {
            setAiImportStatus('ERROR');
            setAiImportErrorMessage("Failed to process document. Try a different format or clearer file.");
        }
    } catch (err: any) {
        console.error("AI Import Error:", err);
        setAiImportStatus('ERROR');
        const msg = err.message || "";
        if (msg.includes('429') || err.status === 'RESOURCE_EXHAUSTED') {
            setAiImportErrorMessage("Quota exceeded for Gemini 3 Pro. Please wait a minute or use a paid API Key.");
        } else {
            setAiImportErrorMessage(`Extraction failed: ${msg.substring(0, 100)}`);
        }
    }
  };

  const cancelAiImport = () => {
      setAiImportStatus('IDLE');
      setAiImportResult(null);
      setAiImportErrorMessage(null);
  };

  const finalizeAiImport = (mappings: Record<string, string>) => {
    if (!aiImportResult) return;

    const newEntities: EntityProfile[] = [];
    const { detectedType, profiles } = aiImportResult;

    profiles.forEach(p => {
        const type = detectedType === 'TEACHER_WISE' ? 'TEACHER' : 'CLASS';
        const code = detectedType === 'TEACHER_WISE' 
            ? p.name.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase()
            : p.name.substring(0, 5).toUpperCase().replace(/ /g, '');
            
        newEntities.push({
            id: `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: p.name,
            shortCode: code,
            type: type,
            schedule: p.schedule
        });
    });

    const secondaryType = detectedType === 'TEACHER_WISE' ? 'CLASS' : 'TEACHER';
    
    Object.entries(mappings).forEach(([code, realName]) => {
        if (!realName.trim()) return;

        const newId = `${secondaryType.toLowerCase()}-${Date.now()}-${code}`;
        const secondaryEntity: EntityProfile = {
            id: newId,
            name: realName,
            shortCode: code,
            type: secondaryType,
            schedule: {} as any
        };

        profiles.forEach((mainProfile) => {
            const mainEntity = newEntities.find(e => e.name === mainProfile.name);
            if (!mainEntity) return;

            Object.entries(mainProfile.schedule).forEach(([day, slots]: [string, any]) => {
                if (!slots) return;
                Object.entries(slots).forEach(([periodStr, entry]: [string, any]) => {
                    const period = parseInt(periodStr);
                    if (entry && entry.teacherOrClass === code) {
                        if (!secondaryEntity.schedule[day as DayOfWeek]) secondaryEntity.schedule[day as DayOfWeek] = {};
                        secondaryEntity.schedule[day as DayOfWeek][period] = {
                            subject: entry.subject,
                            room: entry.room,
                            teacherOrClass: mainEntity.shortCode || mainEntity.name
                        };
                    }
                });
            });
        });

        newEntities.push(secondaryEntity);
    });

    setEntities(prev => [...prev, ...newEntities]);
    setAiImportStatus('COMPLETED');
    setAiImportResult(null);
  };

  const updateSchoolName = (name: string) => setSchoolName(name);
  const updateAcademicYear = (year: string) => setAcademicYear(year);
  const updateEntities = (newEntities: EntityProfile[]) => setEntities([...newEntities]);
  const updateStudents = (newStudents: Student[]) => setStudents([...newStudents]);
  const updateTimeSlots = (newSlots: TimeSlot[]) => setTimeSlots([...newSlots]);

  const addEntity = (entity: EntityProfile) => setEntities(prev => [...prev, entity]);
  const updateEntity = (id: string, updates: Partial<EntityProfile>) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };
  const deleteEntity = (id: string) => {
    setEntities(prev => prev.filter(e => e.id !== id));
    setAttendanceRecords(prev => prev.filter(r => r.entityId !== id));
  };

  const addStudent = (student: Student) => setStudents(prev => [...prev, student]);
  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };
  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setAttendanceRecords(prev => prev.filter(r => r.studentId !== id));
  };

  const updateSchedule = (entityId: string, day: string, period: number, entry: TimetableEntry | null) => {
    setEntities(prevEntities => {
      const sourceEntity = prevEntities.find(e => e.id === entityId);
      if (!sourceEntity) return prevEntities;
      const dayKey = day as DayOfWeek;

      const nextEntities = prevEntities.map(e => ({
        ...e,
        schedule: { 
          ...e.schedule,
          [dayKey]: { ...(e.schedule[dayKey] || {}) }
        }
      }));

      const nextSourceEntity = nextEntities.find(e => e.id === entityId);
      if (!nextSourceEntity) return nextEntities;

      const setEntitySlot = (targetId: string, newSlotVal: TimetableEntry | null) => {
        const target = nextEntities.find(e => e.id === targetId);
        if (target) {
          if (!target.schedule[dayKey]) target.schedule[dayKey] = {};
          if (newSlotVal === null) delete target.schedule[dayKey][period];
          else target.schedule[dayKey][period] = newSlotVal;
        }
      };

      setEntitySlot(entityId, entry);

      const sourceIdentifier = sourceEntity.shortCode || sourceEntity.name;
      if (entry?.teacherOrClass) {
        const targetCode = entry.teacherOrClass;
        const targetEntity = nextEntities.find(e => 
          (e.shortCode === targetCode || e.name === targetCode) &&
          e.type !== sourceEntity.type
        );
        if (targetEntity) {
          const mirrorEntry: TimetableEntry = {
            subject: entry.subject,
            room: entry.room,
            teacherOrClass: sourceIdentifier
          };
          setEntitySlot(targetEntity.id, mirrorEntry);
        }
      }
      return nextEntities;
    });
  };

  const markAttendance = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => 
        !newRecords.some(nr => 
          nr.date === r.date && nr.period === r.period && nr.entityId === r.entityId && nr.studentId === r.studentId
        )
      );
      return [...filtered, ...newRecords];
    });
  };

  const getAttendanceForPeriod = (date: string, entityId: string, period: number) => {
    return attendanceRecords.filter(r => r.date === date && r.entityId === entityId && r.period === period);
  };

  const resetData = () => {
    setSchoolName('Mupini Combined School');
    setAcademicYear('2025');
    setEntities(DEFAULT_DATA);
    setStudents(DEFAULT_STUDENTS);
    setTimeSlots(DEFAULT_TIME_SLOTS);
    setAttendanceRecords([]);
  };

  const importData = (data: any) => {
    if (data.schoolName) setSchoolName(data.schoolName);
    if (data.academicYear) setAcademicYear(data.academicYear);
    if (data.entities) setEntities(data.entities);
    if (data.students) setStudents(data.students);
    if (data.timeSlots) setTimeSlots(data.timeSlots);
    if (data.attendanceRecords) setAttendanceRecords(data.attendanceRecords);
  };

  return (
    <DataContext.Provider value={{
      schoolName, academicYear, entities, students, timeSlots, attendanceRecords,
      aiImportStatus, aiImportResult, aiImportErrorMessage, startAiImport, cancelAiImport, finalizeAiImport,
      updateSchoolName, updateAcademicYear, updateEntities, updateStudents, updateTimeSlots,
      addEntity, updateEntity, deleteEntity, addStudent, updateStudent, deleteStudent,
      updateSchedule, markAttendance, getAttendanceForPeriod, resetData, importData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
