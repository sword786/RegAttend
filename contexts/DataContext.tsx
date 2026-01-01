
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { 
  EntityProfile, Student, TimeSlot, TimetableEntry, AttendanceRecord, 
  DayOfWeek, AiImportStatus, AiImportResult, SyncMetadata, SyncConnectionState,
  createEmptySchedule
} from '../types';
import { DEFAULT_DATA, DEFAULT_STUDENTS, DEFAULT_TIME_SLOTS } from '../constants';
import { processTimetableImport } from '../services/geminiService';
import { SyncRelayService } from '../services/syncRelayService';

interface DataContextType {
  schoolName: string;
  academicYear: string;
  entities: EntityProfile[];
  students: Student[];
  timeSlots: TimeSlot[];
  attendanceRecords: AttendanceRecord[];
  
  syncInfo: SyncMetadata;
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

// Local Channel for Cross-Tab Communication
const LOCAL_CHANNEL = new BroadcastChannel('mupini_local_sync');

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schoolName, setSchoolName] = useState('Mupini Combined School');
  const [academicYear, setAcademicYear] = useState('2025');
  const [entities, setEntities] = useState<EntityProfile[]>(DEFAULT_DATA);
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const skipNextBroadcast = useRef(false);

  const [syncInfo, setSyncInfo] = useState<SyncMetadata>({
    isPaired: false,
    pairCode: null,
    role: 'STANDALONE',
    lastSync: null,
    schoolId: null,
    deviceId: null,
    connectionState: 'OFFLINE'
  });

  const [aiImportStatus, setAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [aiImportResult, setAiImportResult] = useState<AiImportResult | null>(null);
  const [aiImportErrorMessage, setAiImportErrorMessage] = useState<string | null>(null);

  // Load persistence
  useEffect(() => {
    try {
      const sn = localStorage.getItem('mup_sn');
      const ay = localStorage.getItem('mup_ay');
      const en = localStorage.getItem('mup_en');
      const st = localStorage.getItem('mup_st');
      const ts = localStorage.getItem('mup_ts');
      const ar = localStorage.getItem('mup_ar');
      const sy = localStorage.getItem('mup_sy');

      if (sn) setSchoolName(JSON.parse(sn));
      if (ay) setAcademicYear(JSON.parse(ay));
      if (en) setEntities(JSON.parse(en));
      if (st) setStudents(JSON.parse(st));
      if (ts) setTimeSlots(JSON.parse(ts));
      if (ar) setAttendanceRecords(JSON.parse(ar));
      if (sy) setSyncInfo({ ...JSON.parse(sy), connectionState: 'CONNECTED' });
    } catch (e) {
      console.warn("Persistence load failed", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Sync Relay: Listen for Cross-Device Signals
  useEffect(() => {
    if (syncInfo.isPaired && syncInfo.schoolId) {
      const unsubscribe = SyncRelayService.subscribe(syncInfo.schoolId, (payload) => {
        // When we get a signal from another device, trigger a refresh
        console.log("Remote update detected:", payload.changeType);
        forceSync();
      });
      return unsubscribe;
    }
  }, [syncInfo.isPaired, syncInfo.schoolId]);

  // Save changes and Local Broadcast
  useEffect(() => {
    if (!isInitialized) return;

    localStorage.setItem('mup_sn', JSON.stringify(schoolName));
    localStorage.setItem('mup_ay', JSON.stringify(academicYear));
    localStorage.setItem('mup_en', JSON.stringify(entities));
    localStorage.setItem('mup_st', JSON.stringify(students));
    localStorage.setItem('mup_ts', JSON.stringify(timeSlots));
    localStorage.setItem('mup_ar', JSON.stringify(attendanceRecords));
    localStorage.setItem('mup_sy', JSON.stringify(syncInfo));

    if (!skipNextBroadcast.current) {
        LOCAL_CHANNEL.postMessage({ 
            type: 'DATA_UPDATE', 
            payload: { schoolName, academicYear, entities, students, timeSlots, attendanceRecords, syncInfo } 
        });
    }
    skipNextBroadcast.current = false;
  }, [schoolName, academicYear, entities, students, timeSlots, attendanceRecords, syncInfo, isInitialized]);

  // Listen for Local Tab Updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'DATA_UPDATE') {
        const p = event.data.payload;
        skipNextBroadcast.current = true;
        setSchoolName(p.schoolName);
        setAcademicYear(p.academicYear);
        setEntities(p.entities);
        setStudents(p.students);
        setTimeSlots(p.timeSlots);
        setAttendanceRecords(p.attendanceRecords);
        setSyncInfo(p.syncInfo);
      }
    };
    LOCAL_CHANNEL.addEventListener('message', handleMessage);
    return () => LOCAL_CHANNEL.removeEventListener('message', handleMessage);
  }, []);

  // --- REAL-TIME SYNC HANDLERS ---
  
  const broadcastToCloud = useCallback((changeType: string) => {
    if (syncInfo.isPaired && syncInfo.schoolId) {
      SyncRelayService.broadcastChange(syncInfo.schoolId, changeType);
    }
  }, [syncInfo.isPaired, syncInfo.schoolId]);

  const forceSync = async () => {
    if (!syncInfo.isPaired || !syncInfo.schoolId) return;
    setSyncInfo(prev => ({ ...prev, connectionState: 'SYNCING' }));
    
    // Simulation of fetching remote data
    await new Promise(r => setTimeout(r, 1000));
    
    setSyncInfo(prev => ({ 
        ...prev, 
        lastSync: new Date().toISOString(), 
        connectionState: 'CONNECTED' 
    }));
  };

  const generateSyncToken = () => {
    const masterId = syncInfo.schoolId || `sch-${Math.random().toString(36).substr(2, 9)}`;
    const payload = {
      v: "3.0",
      schoolName, academicYear, entities, students, timeSlots,
      masterId,
      timestamp: Date.now()
    };
    
    setSyncInfo({
        isPaired: true, pairCode: "ADMIN", role: 'ADMIN',
        lastSync: new Date().toISOString(),
        schoolId: masterId,
        deviceId: `master-${Date.now()}`,
        connectionState: 'CONNECTED'
    });

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
      
      setSyncInfo({
        isPaired: true, pairCode: "PAIRED", role: 'TEACHER',
        lastSync: new Date().toISOString(),
        schoolId: decoded.masterId,
        deviceId: `staff-${Date.now()}`,
        masterSourceId: decoded.masterId,
        connectionState: 'CONNECTED'
      });

      return true;
    } catch (e) {
      setSyncInfo(prev => ({ ...prev, connectionState: 'ERROR' }));
      return false;
    }
  };

  const disconnectSync = () => {
    setSyncInfo({
      isPaired: false, pairCode: null, role: 'STANDALONE',
      lastSync: null, schoolId: null, deviceId: null,
      connectionState: 'OFFLINE'
    });
  };

  // --- STANDARD DATA UPDATES ---
  const updateSchoolName = (name: string) => { setSchoolName(name); broadcastToCloud('SCHOOL_NAME'); };
  const updateAcademicYear = (year: string) => { setAcademicYear(year); broadcastToCloud('ACADEMIC_YEAR'); };
  
  const updateEntities = (newEntities: EntityProfile[]) => { setEntities(newEntities); broadcastToCloud('UPDATE_ENTITIES'); };
  const updateStudents = (newStudents: Student[]) => { setStudents(newStudents); broadcastToCloud('UPDATE_STUDENTS'); };
  const updateTimeSlots = (newTimeSlots: TimeSlot[]) => { setTimeSlots(newTimeSlots); broadcastToCloud('UPDATE_TIMESLOTS'); };
  
  const addEntity = (entity: EntityProfile) => { setEntities(prev => [...prev, entity]); broadcastToCloud('ADD_ENTITY'); };
  const updateEntity = (id: string, updates: Partial<EntityProfile>) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    broadcastToCloud('UPDATE_ENTITY');
  };
  const deleteEntity = (id: string) => {
    setEntities(prev => prev.filter(e => e.id !== id));
    broadcastToCloud('DELETE_ENTITY');
  };

  const addStudent = (student: Student) => { setStudents(prev => [...prev, student]); broadcastToCloud('ADD_STUDENT'); };
  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    broadcastToCloud('UPDATE_STUDENT');
  };
  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    broadcastToCloud('DELETE_STUDENT');
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

      // Simple mirroring logic
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
      return nextEntities;
    });
    broadcastToCloud('UPDATE_SCHEDULE');
  };

  const markAttendance = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => 
        !newRecords.some(nr => nr.date === r.date && nr.period === r.period && nr.studentId === r.studentId)
      );
      return [...filtered, ...newRecords];
    });
    broadcastToCloud('MARK_ATTENDANCE');
  };

  const getAttendanceForPeriod = (date: string, entityId: string, period: number) => {
    return attendanceRecords.filter(r => r.date === date && r.entityId === entityId && r.period === period);
  };

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
    setEntities(prev => [...prev, ...newEntities]);
    setAiImportStatus('COMPLETED');
    broadcastToCloud('IMPORT_TIMETABLE');
  };

  const resetData = () => {
    setSchoolName('Mupini Combined School');
    setAcademicYear('2025');
    setEntities(DEFAULT_DATA);
    setStudents(DEFAULT_STUDENTS);
    setTimeSlots(DEFAULT_TIME_SLOTS);
    setAttendanceRecords([]);
    disconnectSync();
  };

  return (
    <DataContext.Provider value={{
      schoolName, academicYear, entities, students, timeSlots, attendanceRecords,
      syncInfo, generateSyncToken, importSyncToken, disconnectSync, forceSync,
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
