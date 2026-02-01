
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  EntityProfile, Student, TimeSlot, TimetableEntry, AttendanceRecord, 
  DayOfWeek, AiImportStatus, AiImportResult, AiStudentImportResult, SyncMetadata, UserRole,
  createEmptySchedule
} from '../types';
import { DEFAULT_DATA, DEFAULT_STUDENTS, DEFAULT_TIME_SLOTS } from '../constants';
import { processTimetableImport, processStudentImport } from '../services/geminiService';
import { FirebaseSync, initFirebase } from '../services/firebaseService';

interface DataContextType {
  schoolName: string;
  academicYear: string;
  primaryColor: string;
  entities: EntityProfile[];
  students: Student[];
  timeSlots: TimeSlot[];
  attendanceRecords: AttendanceRecord[];
  
  userRole: UserRole | null;
  setUserRole: (role: UserRole) => void;
  logout: () => void;

  syncInfo: SyncMetadata;
  firebaseConfig: any;
  setFirebaseConfig: (config: any) => Promise<boolean>;
  generateSyncToken: () => string; 
  getPairingToken: () => string;
  importSyncToken: (token: string) => Promise<boolean>;
  disconnectSync: () => void;
  forceSync: () => Promise<void>;

  aiImportStatus: AiImportStatus;
  aiImportResult: AiImportResult | null;
  aiImportErrorMessage: string | null;
  startAiImport: (files: { file: File, label: 'TEACHER' | 'CLASS' }[]) => Promise<void>;
  cancelAiImport: () => void;
  finalizeAiImport: () => void;

  studentAiImportStatus: AiImportStatus;
  studentAiImportResult: AiStudentImportResult | null;
  startStudentAiImport: (files: File[]) => Promise<void>;
  cancelStudentAiImport: () => void;
  finalizeStudentAiImport: (targetClassId?: string) => void;

  updateSchoolName: (name: string) => void;
  updateAcademicYear: (year: string) => void;
  updatePrimaryColor: (color: string) => void;
  updateEntities: (entities: EntityProfile[]) => void;
  updateStudents: (students: Student[]) => void;
  updateTimeSlots: (slots: TimeSlot[]) => void;
  
  addEntity: (entity: EntityProfile) => void;
  addEntities: (newEntities: EntityProfile[]) => void;
  updateEntity: (id: string, updates: Partial<EntityProfile>) => void;
  deleteEntity: (id: string) => void;

  addStudent: (student: Student) => void;
  addStudents: (newStudents: Student[]) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;

  deleteTimeSlot: (period: number) => void;

  updateSchedule: (entityId: string, day: string, period: number, entry: TimetableEntry | null) => void;

  markAttendance: (records: AttendanceRecord[]) => void;
  getAttendanceForPeriod: (date: string, entityId: string, period: number) => AttendanceRecord[];
  resetData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schoolName, setSchoolName] = useState(() => {
    const sn = localStorage.getItem('mup_sn');
    return sn ? JSON.parse(sn) : 'Mupini Combined School';
  });
  const [academicYear, setAcademicYear] = useState(() => {
    const ay = localStorage.getItem('mup_ay');
    return ay ? JSON.parse(ay) : '2025';
  });
  const [primaryColor, setPrimaryColor] = useState(() => {
    const pc = localStorage.getItem('mup_pc');
    return pc ? JSON.parse(pc) : '#3b82f6';
  });
  const [entities, setEntities] = useState<EntityProfile[]>(() => {
    const en = localStorage.getItem('mup_en');
    return en ? JSON.parse(en) : DEFAULT_DATA;
  });
  const [students, setStudents] = useState<Student[]>(() => {
    const st = localStorage.getItem('mup_st');
    return st ? JSON.parse(st) : DEFAULT_STUDENTS;
  });
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => {
    const ts = localStorage.getItem('mup_ts');
    return ts ? JSON.parse(ts) : DEFAULT_TIME_SLOTS;
  });
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const ar = localStorage.getItem('mup_ar');
    return ar ? JSON.parse(ar) : [];
  });
  const [firebaseConfig, setFirebaseConfigState] = useState<any>(() => {
    const fb = localStorage.getItem('mup_fb');
    const parsed = fb ? JSON.parse(fb) : null;
    if (parsed) initFirebase(parsed);
    return parsed;
  });
  const [userRole, setUserRoleState] = useState<UserRole | null>(() => {
    const ur = localStorage.getItem('mup_ur');
    return ur ? (JSON.parse(ur) as UserRole) : null;
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [syncInfo, setSyncInfo] = useState<SyncMetadata>(() => {
    const sy = localStorage.getItem('mup_sy');
    const parsed = sy ? JSON.parse(sy) : null;
    return {
      isPaired: parsed?.isPaired || false,
      pairCode: parsed?.pairCode || null,
      role: parsed?.role || 'STANDALONE',
      lastSync: parsed?.lastSync || null,
      schoolId: parsed?.schoolId || null,
      deviceId: `dev-${Math.random().toString(36).substr(2, 9)}`,
      connectionState: parsed?.isPaired ? 'CONNECTING' : 'OFFLINE'
    };
  });

  const skipFirebaseSync = useRef(false);
  const [aiImportStatus, setAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [aiImportResult, setAiImportResult] = useState<AiImportResult | null>(null);
  const [aiImportErrorMessage, setAiImportErrorMessage] = useState<string | null>(null);

  const [studentAiImportStatus, setStudentAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [studentAiImportResult, setStudentAiImportResult] = useState<AiStudentImportResult | null>(null);

  useEffect(() => { setIsInitialized(true); }, []);

  useEffect(() => {
    if (syncInfo.isPaired && syncInfo.schoolId && firebaseConfig) {
      const unsubscribe = FirebaseSync.subscribe(syncInfo.schoolId, (data) => {
        if (skipFirebaseSync.current) {
          skipFirebaseSync.current = false;
          return;
        }
        if (data.schoolName) setSchoolName(data.schoolName);
        if (data.academicYear) setAcademicYear(data.academicYear);
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
        if (data.entities) setEntities(data.entities);
        if (data.students) setStudents(data.students);
        if (data.timeSlots) setTimeSlots(data.timeSlots);
        if (data.attendanceRecords) setAttendanceRecords(data.attendanceRecords);
        setSyncInfo(prev => ({ ...prev, lastSync: new Date().toISOString() }));
      });
      
      const connectionUnsub = FirebaseSync.monitorConnection((connected) => {
        setSyncInfo(prev => ({
            ...prev,
            connectionState: connected ? 'CONNECTED' : 'CONNECTING'
        }));
      });

      return () => {
        unsubscribe();
        connectionUnsub();
      };
    }
  }, [syncInfo.isPaired, syncInfo.schoolId, firebaseConfig]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('mup_sn', JSON.stringify(schoolName));
    localStorage.setItem('mup_ay', JSON.stringify(academicYear));
    localStorage.setItem('mup_pc', JSON.stringify(primaryColor));
    localStorage.setItem('mup_en', JSON.stringify(entities));
    localStorage.setItem('mup_st', JSON.stringify(students));
    localStorage.setItem('mup_ts', JSON.stringify(timeSlots));
    localStorage.setItem('mup_ar', JSON.stringify(attendanceRecords));
    localStorage.setItem('mup_sy', JSON.stringify(syncInfo));
    localStorage.setItem('mup_fb', JSON.stringify(firebaseConfig));
    localStorage.setItem('mup_ur', JSON.stringify(userRole));
  }, [schoolName, academicYear, primaryColor, entities, students, timeSlots, attendanceRecords, syncInfo, firebaseConfig, userRole, isInitialized]);

  const updateSchoolName = (name: string) => { 
    setSchoolName(name); 
    if(syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'schoolName', name);
    }
  };
  const updateAcademicYear = (year: string) => { 
    setAcademicYear(year); 
    if(syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'academicYear', year);
    }
  };
  const updatePrimaryColor = (color: string) => { 
    setPrimaryColor(color); 
    if(syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'primaryColor', color);
    }
  };

  const addEntity = (entity: EntityProfile) => {
    setEntities(prev => {
      const next = [...prev, entity];
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'entities', next); }
      return next;
    });
  };

  const addEntities = (newEntities: EntityProfile[]) => {
    setEntities(prev => {
      const next = [...prev, ...newEntities];
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'entities', next); }
      return next;
    });
  };

  const updateEntity = (id: string, updates: Partial<EntityProfile>) => {
    setEntities(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'entities', next); }
      return next;
    });
  };

  const deleteEntity = (id: string) => {
    setEntities(prev => {
      const next = prev.filter(e => e.id !== id);
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'entities', next); }
      return next;
    });
  };

  const addStudent = (student: Student) => {
    setStudents(prev => {
      const next = [...prev, student];
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'students', next); }
      return next;
    });
  };

  const addStudents = (newStudents: Student[]) => {
    setStudents(prev => {
      const next = [...prev, ...newStudents];
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'students', next); }
      return next;
    });
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'students', next); }
      return next;
    });
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => {
      const next = prev.filter(s => s.id !== id);
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'students', next); }
      return next;
    });
  };

  const updateTimeSlots = (newTimeSlots: TimeSlot[]) => {
    setTimeSlots(newTimeSlots);
    if (syncInfo.isPaired) {
      skipFirebaseSync.current = true;
      FirebaseSync.updateData(syncInfo.schoolId!, 'timeSlots', newTimeSlots);
    }
  };

  const deleteTimeSlot = (period: number) => {
    setTimeSlots(prev => {
      const next = prev.filter(s => s.period !== period);
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'timeSlots', next); }
      return next;
    });
  };

  const updateSchedule = (entityId: string, day: string, period: number, entry: TimetableEntry | null) => {
    setEntities(prev => {
      const dayKey = day as DayOfWeek;
      const currentEntity = prev.find(e => e.id === entityId);
      if (!currentEntity) return prev;

      let updatedEntities = prev.map(e => e.id === entityId ? {
        ...e,
        schedule: { 
            ...createEmptySchedule(), 
            ...(e.schedule || {}), 
            [dayKey]: { ...(e.schedule?.[dayKey] || {}), [period]: entry } 
        }
      } : e);

      const sourceCode = currentEntity.shortCode || currentEntity.name;
      const targetCode = entry?.teacherOrClass;

      if (entry && targetCode) {
        const targetIdx = updatedEntities.findIndex(e => 
            e.type !== currentEntity.type && (e.shortCode === targetCode || e.name === targetCode)
        );

        if (targetIdx !== -1) {
          const target = updatedEntities[targetIdx];
          updatedEntities[targetIdx] = {
            ...target,
            schedule: {
                ...createEmptySchedule(),
                ...(target.schedule || {}),
                [dayKey]: {
                    ...(target.schedule?.[dayKey] || {}),
                    [period]: {
                        subject: entry.subject,
                        room: entry.room,
                        teacherOrClass: sourceCode,
                        type: entry.type
                    }
                }
            }
          };
        }
      } else if (entry === null) {
          const prevEntry = currentEntity.schedule?.[dayKey]?.[period];
          if (prevEntry?.teacherOrClass) {
              const targetIdx = updatedEntities.findIndex(e => 
                  e.type !== currentEntity.type && (e.shortCode === prevEntry.teacherOrClass || e.name === prevEntry.teacherOrClass)
              );
              if (targetIdx !== -1) {
                  const target = updatedEntities[targetIdx];
                  const targetEntryAtSlot = target.schedule?.[dayKey]?.[period];
                  if (targetEntryAtSlot?.teacherOrClass === sourceCode) {
                      updatedEntities[targetIdx] = {
                        ...target,
                        schedule: {
                            ...createEmptySchedule(),
                            ...(target.schedule || {}),
                            [dayKey]: {
                                ...(target.schedule?.[dayKey] || {}),
                                [period]: null
                            }
                        }
                      };
                  }
              }
          }
      }

      if (syncInfo.isPaired) { 
        skipFirebaseSync.current = true; 
        FirebaseSync.updateData(syncInfo.schoolId!, 'entities', updatedEntities); 
      }
      return updatedEntities;
    });
  };

  const markAttendance = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => !newRecords.some(nr => nr.date === r.date && nr.period === r.period && nr.studentId === r.studentId));
      const next = [...filtered, ...newRecords];
      if (syncInfo.isPaired) { skipFirebaseSync.current = true; FirebaseSync.updateData(syncInfo.schoolId!, 'attendanceRecords', next); }
      return next;
    });
  };

  const getAttendanceForPeriod = useCallback((date: string, entityId: string, period: number) => {
    return attendanceRecords.filter(r => r.date === date && (r.entityId === entityId) && r.period === period);
  }, [attendanceRecords]);

  const startAiImport = async (files: { file: File, label: 'TEACHER' | 'CLASS' }[]) => {
    setAiImportStatus('PROCESSING');
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
          setAiImportErrorMessage("No profiles detected."); 
        }
    } catch (err: any) { 
      setAiImportStatus('ERROR'); 
      setAiImportErrorMessage(err.message); 
    }
  };

  const startStudentAiImport = async (files: File[]) => {
    setStudentAiImportStatus('PROCESSING');
    try {
        const payload: { base64?: string, mimeType?: string, text?: string }[] = [];
        for (const f of files) {
            const isExcel = f.name.match(/\.(xlsx|xls|csv)$/i);
            if (isExcel) {
                const data = await f.arrayBuffer();
                const workbook = XLSX.read(data);
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const csvData = XLSX.utils.sheet_to_csv(worksheet);
                payload.push({ text: `Content of ${f.name}:\n${csvData}` });
            } else {
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(f);
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                });
                payload.push({ base64, mimeType: f.type });
            }
        }
        const result = await processStudentImport(payload);
        if (result && result.students.length > 0) {
            setStudentAiImportResult(result);
            setStudentAiImportStatus('REVIEW');
        } else {
            setStudentAiImportStatus('ERROR');
        }
    } catch (err: any) {
        setStudentAiImportStatus('ERROR');
    }
  };

  const finalizeAiImport = () => {
    if (!aiImportResult) return;
    const newEntities: EntityProfile[] = aiImportResult.profiles.map(p => ({
        id: `${p.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: p.name,
        shortCode: p.shortCode || p.name.substring(0, 3).toUpperCase(),
        type: p.type,
        schedule: { ...createEmptySchedule(), ...(p.schedule || {}) }
    }));
    addEntities(newEntities);
    setAiImportStatus('COMPLETED');
  };

  const finalizeStudentAiImport = (targetClassId?: string) => {
    if (!studentAiImportResult) return;
    const classEntities = entities.filter(e => e.type === 'CLASS');
    
    const newStuds: Student[] = studentAiImportResult.students.map((s, idx) => {
        let resolvedClassId = targetClassId || '';
        if (!targetClassId && s.className) {
            const matched = classEntities.find(c => 
                c.name.toLowerCase().includes(s.className!.toLowerCase()) || 
                (c.shortCode && s.className!.toLowerCase().includes(c.shortCode.toLowerCase()))
            );
            if (matched) resolvedClassId = matched.id;
        }
        return {
            id: `student-${Date.now()}-${idx}`,
            name: s.name,
            rollNumber: s.rollNumber || '',
            classId: resolvedClassId,
            admissionNumber: s.admissionNumber,
            classNumber: s.rollNumber
        };
    });
    addStudents(newStuds);
    setStudentAiImportStatus('COMPLETED');
  };

  const importSyncToken = async (token: string): Promise<boolean> => {
    setSyncInfo(prev => ({ ...prev, connectionState: 'CONNECTING' }));
    try {
      const json = decodeURIComponent(escape(atob(token)));
      const decoded = JSON.parse(json);
      if (!decoded.schoolName) return false;
      setSchoolName(decoded.schoolName);
      setAcademicYear(decoded.academicYear || '2025');
      if (decoded.primaryColor) setPrimaryColor(decoded.primaryColor);
      setEntities(decoded.entities);
      setStudents(decoded.students || []);
      setTimeSlots(decoded.timeSlots || DEFAULT_TIME_SLOTS);
      setAttendanceRecords(decoded.attendanceRecords || []);
      if (decoded.firebaseConfig) { setFirebaseConfigState(decoded.firebaseConfig); initFirebase(decoded.firebaseConfig); }
      setSyncInfo(prev => ({ ...prev, isPaired: true, role: 'TEACHER', schoolId: decoded.masterId, connectionState: 'CONNECTED' }));
      return true;
    } catch (e) { 
      setSyncInfo(prev => ({ ...prev, connectionState: 'ERROR' })); 
      return false; 
    }
  };

  const resetData = () => { 
    setSchoolName('Mupini Combined School'); 
    setEntities(DEFAULT_DATA); 
    setStudents(DEFAULT_STUDENTS); 
    setTimeSlots(DEFAULT_TIME_SLOTS); 
    localStorage.clear();
    setSyncInfo(prev => ({ ...prev, isPaired: false, connectionState: 'OFFLINE' }));
  };

  const logout = () => {
    setUserRoleState(null);
  };

  const generateSyncToken = () => {
    const masterId = syncInfo.schoolId || `sch-${Math.random().toString(36).substr(2, 9)}`;
    setSyncInfo(p => ({ ...p, isPaired: true, role: 'ADMIN', lastSync: new Date().toISOString(), schoolId: masterId, connectionState: 'CONNECTED' }));
    if (firebaseConfig) FirebaseSync.setFullState(masterId, { schoolName, academicYear, entities, students, timeSlots, attendanceRecords, primaryColor });
    return btoa(unescape(encodeURIComponent(JSON.stringify({ schoolName, academicYear, entities, students, timeSlots, masterId, firebaseConfig, primaryColor }))));
  };

  const getPairingToken = () => {
    if (!syncInfo.schoolId || !firebaseConfig) return '';
    return btoa(unescape(encodeURIComponent(JSON.stringify({ schoolName, academicYear, entities, students, timeSlots, masterId: syncInfo.schoolId, firebaseConfig, primaryColor }))));
  };

  return (
    <DataContext.Provider value={{
      schoolName, academicYear, primaryColor, entities, students, timeSlots, attendanceRecords,
      userRole, setUserRole: (r) => { setUserRoleState(r); setSyncInfo(p => ({ ...p, role: r })); },
      logout,
      syncInfo, firebaseConfig, 
      setFirebaseConfig: async (c) => { 
        const success = await initFirebase(c);
        if (success) setFirebaseConfigState(c);
        return success;
      },
      generateSyncToken,
      getPairingToken,
      importSyncToken, disconnectSync: () => setSyncInfo(p => ({ ...p, isPaired: false, connectionState: 'OFFLINE' })), forceSync: async () => {},
      aiImportStatus, aiImportResult, aiImportErrorMessage, startAiImport, cancelAiImport: () => setAiImportStatus('IDLE'), finalizeAiImport,
      studentAiImportStatus, studentAiImportResult, startStudentAiImport, cancelStudentAiImport: () => setStudentAiImportStatus('IDLE'), finalizeStudentAiImport,
      updateSchoolName, updateAcademicYear, updatePrimaryColor, updateEntities: setEntities, updateStudents: setStudents, updateTimeSlots,
      addEntity, addEntities, updateEntity, deleteEntity, addStudent, addStudents, updateStudent, deleteStudent,
      deleteTimeSlot, updateSchedule, markAttendance, getAttendanceForPeriod, resetData
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
