
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { 
  EntityProfile, Student, TimeSlot, TimetableEntry, AttendanceRecord, 
  DayOfWeek, AiImportStatus, AiImportResult, SyncMetadata, SyncConnectionState,
  createEmptySchedule
} from '../types';
import { DEFAULT_DATA, DEFAULT_STUDENTS, DEFAULT_TIME_SLOTS } from '../constants';
import { processTimetableImport } from '../services/geminiService';
import { FirebaseSync, initFirebase } from '../services/firebaseService';

interface DataContextType {
  schoolName: string;
  academicYear: string;
  entities: EntityProfile[];
  students: Student[];
  timeSlots: TimeSlot[];
  attendanceRecords: AttendanceRecord[];
  
  syncInfo: SyncMetadata;
  firebaseConfig: any;
  setFirebaseConfig: (config: any) => void;
  generateSyncToken: () => string; 
  importSyncToken: (token: string) => Promise<boolean>;
  disconnectSync: () => void;
  forceSync: () => Promise<void>;

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const LOCAL_CHANNEL = new BroadcastChannel('mupini_local_sync');

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schoolName, setSchoolName] = useState('Mupini Combined School');
  const [academicYear, setAcademicYear] = useState('2025');
  const [entities, setEntities] = useState<EntityProfile[]>(DEFAULT_DATA);
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [firebaseConfig, setFirebaseConfigState] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [syncInfo, setSyncInfo] = useState<SyncMetadata>({
    isPaired: false,
    pairCode: null,
    role: 'STANDALONE',
    lastSync: null,
    schoolId: null,
    deviceId: `dev-${Math.random().toString(36).substr(2, 9)}`,
    connectionState: 'OFFLINE'
  });

  const skipFirebaseSync = useRef(false);

  const [aiImportStatus, setAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [aiImportResult, setAiImportResult] = useState<AiImportResult | null>(null);
  const [aiImportErrorMessage, setAiImportErrorMessage] = useState<string | null>(null);

  // Persistence Load
  useEffect(() => {
    try {
      const sn = localStorage.getItem('mup_sn');
      const ay = localStorage.getItem('mup_ay');
      const en = localStorage.getItem('mup_en');
      const st = localStorage.getItem('mup_st');
      const ts = localStorage.getItem('mup_ts');
      const ar = localStorage.getItem('mup_ar');
      const sy = localStorage.getItem('mup_sy');
      const fb = localStorage.getItem('mup_fb');

      if (sn) setSchoolName(JSON.parse(sn));
      if (ay) setAcademicYear(JSON.parse(ay));
      if (en) setEntities(JSON.parse(en));
      if (st) setStudents(JSON.parse(st));
      if (ts) setTimeSlots(JSON.parse(ts));
      if (ar) setAttendanceRecords(JSON.parse(ar));
      if (fb) {
        const parsedFb = JSON.parse(fb);
        setFirebaseConfigState(parsedFb);
        initFirebase(parsedFb);
      }
      if (sy) {
        const parsedSy = JSON.parse(sy);
        setSyncInfo(prev => ({ 
            ...parsedSy, 
            deviceId: prev.deviceId,
            // Don't mark as connected until firebase monitor says so
            connectionState: 'CONNECTING' 
        }));
      }
    } catch (e) {
      console.warn("Persistence load failed", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Sync to Persistence and Local Tabs
  useEffect(() => {
    if (!isInitialized) return;

    localStorage.setItem('mup_sn', JSON.stringify(schoolName));
    localStorage.setItem('mup_ay', JSON.stringify(academicYear));
    localStorage.setItem('mup_en', JSON.stringify(entities));
    localStorage.setItem('mup_st', JSON.stringify(students));
    localStorage.setItem('mup_ts', JSON.stringify(timeSlots));
    localStorage.setItem('mup_ar', JSON.stringify(attendanceRecords));
    localStorage.setItem('mup_sy', JSON.stringify(syncInfo));
    localStorage.setItem('mup_fb', JSON.stringify(firebaseConfig));

    LOCAL_CHANNEL.postMessage({ 
        type: 'DATA_UPDATE', 
        payload: { schoolName, academicYear, entities, students, timeSlots, attendanceRecords, syncInfo, firebaseConfig } 
    });
  }, [schoolName, academicYear, entities, students, timeSlots, attendanceRecords, syncInfo, firebaseConfig, isInitialized]);

  // Firebase Real-time Subscription and Connection Monitor
  useEffect(() => {
    if (syncInfo.isPaired && syncInfo.schoolId && firebaseConfig) {
      const unsubscribeMonitor = FirebaseSync.monitorConnection((isConnected) => {
        setSyncInfo(prev => ({ 
            ...prev, 
            connectionState: isConnected ? 'CONNECTED' : 'CONNECTING' 
        }));
      });

      const unsubscribeData = FirebaseSync.subscribe(syncInfo.schoolId, (remoteData) => {
        if (skipFirebaseSync.current) {
            skipFirebaseSync.current = false;
            return;
        }

        console.log("Cloud Push Received");
        if (remoteData.schoolName) setSchoolName(remoteData.schoolName);
        if (remoteData.academicYear) setAcademicYear(remoteData.academicYear);
        if (remoteData.entities) setEntities(remoteData.entities);
        if (remoteData.students) setStudents(remoteData.students);
        if (remoteData.timeSlots) setTimeSlots(remoteData.timeSlots);
        if (remoteData.attendanceRecords) setAttendanceRecords(remoteData.attendanceRecords);
        
        setSyncInfo(prev => ({ 
            ...prev, 
            lastSync: new Date().toISOString()
        }));
      });

      return () => {
        unsubscribeMonitor();
        unsubscribeData();
      };
    }
  }, [syncInfo.isPaired, syncInfo.schoolId, firebaseConfig]);

  const setFirebaseConfig = (config: any) => {
    setFirebaseConfigState(config);
    initFirebase(config);
  };

  // --- DATA ACTIONS ---
  // Granular updates to cloud

  const updateSchoolName = (name: string) => {
    setSchoolName(name);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'schoolName', name);
    }
  };

  const updateAcademicYear = (year: string) => {
    setAcademicYear(year);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'academicYear', year);
    }
  };

  const updateEntities = (newEntities: EntityProfile[]) => {
    setEntities(newEntities);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'entities', newEntities);
    }
  };

  const updateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'students', newStudents);
    }
  };

  const updateTimeSlots = (newTimeSlots: TimeSlot[]) => {
    setTimeSlots(newTimeSlots);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'timeSlots', newTimeSlots);
    }
  };
  
  const addEntity = (entity: EntityProfile) => {
    const next = [...entities, entity];
    setEntities(next);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'entities', next);
    }
  };

  const updateEntity = (id: string, updates: Partial<EntityProfile>) => {
    const next = entities.map(e => e.id === id ? { ...e, ...updates } : e);
    setEntities(next);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'entities', next);
    }
  };

  const deleteEntity = (id: string) => {
    const next = entities.filter(e => e.id !== id);
    setEntities(next);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'entities', next);
    }
  };

  const addStudent = (student: Student) => {
    const next = [...students, student];
    setStudents(next);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'students', next);
    }
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    const next = students.map(s => s.id === id ? { ...s, ...updates } : s);
    setStudents(next);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'students', next);
    }
  };

  const deleteStudent = (id: string) => {
    const next = students.filter(s => s.id !== id);
    setStudents(next);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'students', next);
    }
  };

  const updateSchedule = (entityId: string, day: string, period: number, entry: TimetableEntry | null) => {
    setEntities(prevEntities => {
      const sourceEntity = prevEntities.find(e => e.id === entityId);
      if (!sourceEntity) return prevEntities;
      const dayKey = day as DayOfWeek;

      const nextEntities = prevEntities.map(e => ({
        ...e,
        schedule: { ...e.schedule, [dayKey]: { ...(e.schedule[dayKey] || {}) } }
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
          (e.shortCode === targetCode || e.name === targetCode) && e.type !== sourceEntity.type
        );
        if (targetEntity) {
          const mirrorEntry: TimetableEntry = { ...entry, teacherOrClass: sourceIdentifier };
          setEntitySlot(targetEntity.id, mirrorEntry);
        }
      }
      
      if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'entities', nextEntities);
      }
      return nextEntities;
    });
  };

  const markAttendance = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => 
        !newRecords.some(nr => nr.date === r.date && nr.period === r.period && nr.studentId === r.studentId)
      );
      const next = [...filtered, ...newRecords];
      if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'attendanceRecords', next);
      }
      return next;
    });
  };

  const getAttendanceForPeriod = (date: string, entityId: string, period: number) => {
    return attendanceRecords.filter(r => r.date === date && r.entityId === entityId && r.period === period);
  };

  // AI Import
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

  const cancelAiImport = () => setAiImportStatus('IDLE');
  const finalizeAiImport = () => {
    if (!aiImportResult) return;
    const newEntities: EntityProfile[] = aiImportResult.profiles.map(p => ({
        id: `${p.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: p.name,
        shortCode: p.shortCode || p.name.substring(0, 3).toUpperCase(),
        type: p.type,
        schedule: p.schedule
    }));
    
    const next = [...entities, ...newEntities];
    setEntities(next);
    if (syncInfo.isPaired) {
        skipFirebaseSync.current = true;
        FirebaseSync.updateData(syncInfo.schoolId!, 'entities', next);
    }
    setAiImportStatus('COMPLETED');
  };

  const forceSync = async () => {
    if (!syncInfo.isPaired || !syncInfo.schoolId) return;
    setSyncInfo(prev => ({ ...prev, connectionState: 'SYNCING' }));
    await new Promise(r => setTimeout(r, 800));
    setSyncInfo(prev => ({ ...prev, connectionState: 'CONNECTED', lastSync: new Date().toISOString() }));
  };

  const generateSyncToken = () => {
    const masterId = syncInfo.schoolId || `sch-${Math.random().toString(36).substr(2, 9)}`;
    const payload = {
      v: "Firebase-v2",
      schoolName, academicYear, entities, students, timeSlots, attendanceRecords,
      masterId,
      firebaseConfig, // Staff will inherit this project config!
      timestamp: Date.now()
    };
    
    setSyncInfo(prev => ({
        ...prev,
        isPaired: true, pairCode: "ADMIN", role: 'ADMIN',
        lastSync: new Date().toISOString(),
        schoolId: masterId,
        connectionState: 'CONNECTED'
    }));

    if (firebaseConfig) {
        FirebaseSync.setFullState(masterId, {
            schoolName, academicYear, entities, students, timeSlots, attendanceRecords
        });
    }

    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  };

  const importSyncToken = async (token: string): Promise<boolean> => {
    setSyncInfo(prev => ({ ...prev, connectionState: 'CONNECTING' }));
    try {
      const json = decodeURIComponent(escape(atob(token)));
      const decoded = JSON.parse(json);
      
      if (!decoded.schoolName || !decoded.entities) return false;

      setSchoolName(decoded.schoolName);
      setAcademicYear(decoded.academicYear || '2025');
      setEntities(decoded.entities);
      setStudents(decoded.students || []);
      setTimeSlots(decoded.timeSlots || DEFAULT_TIME_SLOTS);
      setAttendanceRecords(decoded.attendanceRecords || []);
      
      if (decoded.firebaseConfig) {
        setFirebaseConfig(decoded.firebaseConfig);
      }

      setSyncInfo(prev => ({
        ...prev,
        isPaired: true, pairCode: "PAIRED", role: 'TEACHER',
        lastSync: new Date().toISOString(),
        schoolId: decoded.masterId,
        masterSourceId: decoded.masterId,
        connectionState: 'CONNECTED'
      }));

      return true;
    } catch (e) {
      setSyncInfo(prev => ({ ...prev, connectionState: 'ERROR' }));
      return false;
    }
  };

  const disconnectSync = () => {
    setSyncInfo(prev => ({
      ...prev,
      isPaired: false, pairCode: null, role: 'STANDALONE',
      lastSync: null, schoolId: null,
      connectionState: 'OFFLINE'
    }));
  };

  const resetData = () => {
    setSchoolName('Mupini Combined School');
    setAcademicYear('2025');
    setEntities(DEFAULT_DATA);
    setStudents(DEFAULT_STUDENTS);
    setTimeSlots(DEFAULT_TIME_SLOTS);
    setAttendanceRecords([]);
    setFirebaseConfigState(null);
    disconnectSync();
  };

  return (
    <DataContext.Provider value={{
      schoolName, academicYear, entities, students, timeSlots, attendanceRecords,
      syncInfo, firebaseConfig, setFirebaseConfig, generateSyncToken, importSyncToken, disconnectSync, forceSync,
      aiImportStatus, aiImportResult, aiImportErrorMessage, startAiImport, cancelAiImport, finalizeAiImport,
      updateSchoolName, updateAcademicYear, updateEntities, updateStudents, updateTimeSlots,
      addEntity, updateEntity, deleteEntity, addStudent, updateStudent, deleteStudent,
      updateSchedule, markAttendance, getAttendanceForPeriod, resetData
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
