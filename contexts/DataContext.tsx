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
  startAiImport: (files: { file: File, label: 'TEACHER' | 'CLASS' }[]) => Promise<void>;
  cancelAiImport: () => void;
  finalizeAiImport: () => void;

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

  const startAiImport = async (files: { file: File, label: 'TEACHER' | 'CLASS' }[]) => {
    setAiImportStatus('PROCESSING');
    setAiImportErrorMessage(null);
    try {
        const payload: { base64: string, mimeType: string, label: 'TEACHER' | 'CLASS' }[] = [];
        
        for (const item of files) {
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(item.file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
            });
            payload.push({ base64, mimeType: item.file.type, label: item.label });
        }

        const result = await processTimetableImport(payload);

        if (result && result.profiles.length > 0) {
            setAiImportResult(result);
            setAiImportStatus('REVIEW');
        } else {
            setAiImportStatus('ERROR');
            setAiImportErrorMessage("Gemini couldn't extract any schedules. Check file quality.");
        }
    } catch (err: any) {
        console.error("AI Import Error:", err);
        setAiImportStatus('ERROR');
        setAiImportErrorMessage(err.message || "Extraction failed.");
    }
  };

  const cancelAiImport = () => {
      setAiImportStatus('IDLE');
      setAiImportResult(null);
      setAiImportErrorMessage(null);
  };

  const finalizeAiImport = () => {
    if (!aiImportResult) return;

    const newEntities: EntityProfile[] = aiImportResult.profiles.map(p => ({
        id: `${p.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: p.name,
        shortCode: p.shortCode || p.name.substring(0, 3).toUpperCase(),
        type: p.type,
        schedule: p.schedule
    }));

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
            ...entry,
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
