
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { EntityProfile, Student, TimeSlot, TimetableEntry, AttendanceRecord, DayOfWeek, AiImportStatus, AiImportResult, SyncMetadata, PairedDevice } from '../types';
import { DEFAULT_DATA, DEFAULT_STUDENTS, DEFAULT_TIME_SLOTS } from '../constants';
import { processTimetableImport } from '../services/geminiService';

interface DataContextType {
  schoolName: string;
  academicYear: string;
  entities: EntityProfile[];
  students: Student[];
  timeSlots: TimeSlot[];
  attendanceRecords: AttendanceRecord[];
  
  // Sync Center
  syncInfo: SyncMetadata;
  pairedDevices: PairedDevice[];
  generatePairCode: () => string;
  joinSchool: (code: string) => Promise<boolean>;
  disconnectSync: () => void;
  syncNow: () => Promise<void>;
  removeDevice: (deviceId: string) => void;

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

  // Sync State
  const [syncInfo, setSyncInfo] = useState<SyncMetadata>({
    isPaired: false,
    pairCode: null,
    role: 'STANDALONE',
    lastSync: null,
    schoolId: null,
    deviceId: null
  });
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);

  const [aiImportStatus, setAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [aiImportResult, setAiImportResult] = useState<AiImportResult | null>(null);
  const [aiImportErrorMessage, setAiImportErrorMessage] = useState<string | null>(null);

  const isSyncingRef = useRef(false);

  // Load initial data from localStorage
  useEffect(() => {
    try {
      const savedSchoolName = localStorage.getItem('mupini_schoolName');
      const savedAcademicYear = localStorage.getItem('mupini_academicYear');
      const savedEntities = localStorage.getItem('mupini_entities');
      const savedStudents = localStorage.getItem('mupini_students');
      const savedTimeSlots = localStorage.getItem('mupini_timeSlots');
      const savedAttendance = localStorage.getItem('mupini_attendance');
      const savedSync = localStorage.getItem('mupini_sync');

      if (savedSchoolName) setSchoolName(JSON.parse(savedSchoolName));
      if (savedAcademicYear) setAcademicYear(JSON.parse(savedAcademicYear));
      if (savedEntities) setEntities(JSON.parse(savedEntities));
      if (savedStudents) setStudents(JSON.parse(savedStudents));
      if (savedTimeSlots) setTimeSlots(JSON.parse(savedTimeSlots));
      if (savedAttendance) setAttendanceRecords(JSON.parse(savedAttendance));
      if (savedSync) setSyncInfo(JSON.parse(savedSync));
    } catch (e) {
      console.error("Failed to load local data", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save changes to local storage
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('mupini_schoolName', JSON.stringify(schoolName));
    localStorage.setItem('mupini_academicYear', JSON.stringify(academicYear));
    localStorage.setItem('mupini_entities', JSON.stringify(entities));
    localStorage.setItem('mupini_students', JSON.stringify(students));
    localStorage.setItem('mupini_timeSlots', JSON.stringify(timeSlots));
    localStorage.setItem('mupini_attendance', JSON.stringify(attendanceRecords));
    localStorage.setItem('mupini_sync', JSON.stringify(syncInfo));
  }, [schoolName, academicYear, entities, students, timeSlots, attendanceRecords, syncInfo, isInitialized]);

  // LIVE SYNC: Automatic Push for Admins (Instant reactive sync)
  useEffect(() => {
    if (isInitialized && syncInfo.isPaired && syncInfo.role === 'ADMIN' && !isSyncingRef.current) {
        const timeout = setTimeout(() => {
            syncNow(); 
        }, 500); // Debounced push to cloud
        return () => clearTimeout(timeout);
    }
  }, [schoolName, academicYear, entities, students, timeSlots]);

  // LIVE SYNC: 2-Second Heartbeat Polling for all paired devices
  useEffect(() => {
    if (syncInfo.isPaired && syncInfo.pairCode) {
      const heartbeat = () => {
        if (isSyncingRef.current) return;
        
        const cloudDataStr = localStorage.getItem(`school_cloud_${syncInfo.pairCode}`);
        if (cloudDataStr) {
          const data = JSON.parse(cloudDataStr);
          
          // Refresh device list
          setPairedDevices(data.devices || []);
          
          // SECURITY: Revocation Check
          if (syncInfo.deviceId && data.devices) {
             const stillAuthorized = data.devices.some((d: PairedDevice) => d.deviceId === syncInfo.deviceId);
             if (!stillAuthorized) {
                disconnectSync();
                return;
             }
          }

          // TEACHER: Automatic Live Update Pull
          if (syncInfo.role === 'TEACHER') {
              isSyncingRef.current = true;
              setSchoolName(data.schoolName);
              setAcademicYear(data.academicYear);
              setEntities(data.entities);
              setStudents(data.students);
              setTimeSlots(data.timeSlots);
              setSyncInfo(prev => ({ ...prev, lastSync: new Date().toISOString() }));
              setTimeout(() => { isSyncingRef.current = false; }, 50);
          } else {
              // ADMIN: Update cloud with self heartbeat
              const updatedDevices = data.devices.map((d: PairedDevice) => 
                d.deviceId === syncInfo.deviceId ? { ...d, lastActive: new Date().toISOString() } : d
              );
              data.devices = updatedDevices;
              localStorage.setItem(`school_cloud_${syncInfo.pairCode}`, JSON.stringify(data));
          }
        } else if (syncInfo.role === 'TEACHER') {
            // Master school deleted or code expired
            disconnectSync();
        }
      };
      
      const interval = setInterval(heartbeat, 2000); 
      return () => clearInterval(interval);
    }
  }, [syncInfo.isPaired, syncInfo.pairCode, syncInfo.deviceId, syncInfo.role]);

  // --- SYNC ACTIONS ---

  const generatePairCode = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newSchoolId = `school-${Date.now()}`;
    const myDeviceId = `admin-${Date.now()}`;
    
    const adminDevice: PairedDevice = {
        deviceId: myDeviceId,
        deviceName: "Primary Admin Console",
        role: 'ADMIN',
        lastActive: new Date().toISOString()
    };

    const newSyncInfo: SyncMetadata = {
      isPaired: true,
      pairCode: newCode,
      role: 'ADMIN',
      lastSync: new Date().toISOString(),
      schoolId: newSchoolId,
      deviceId: myDeviceId
    };

    setSyncInfo(newSyncInfo);

    localStorage.setItem(`school_cloud_${newCode}`, JSON.stringify({
      schoolName, academicYear, entities, students, timeSlots,
      devices: [adminDevice]
    }));

    return newCode;
  };

  const joinSchool = async (code: string): Promise<boolean> => {
    const cloudDataStr = localStorage.getItem(`school_cloud_${code}`);
    if (!cloudDataStr) return false;

    try {
      const data = JSON.parse(cloudDataStr);
      const myDeviceId = `staff-${Date.now()}`;
      const myDeviceName = "Teacher Device";

      const newDevice: PairedDevice = {
        deviceId: myDeviceId,
        deviceName: myDeviceName,
        role: 'TEACHER',
        lastActive: new Date().toISOString()
      };

      data.devices = [...(data.devices || []), newDevice];
      localStorage.setItem(`school_cloud_${code}`, JSON.stringify(data));

      isSyncingRef.current = true;
      setSchoolName(data.schoolName);
      setAcademicYear(data.academicYear);
      setEntities(data.entities);
      setStudents(data.students);
      setTimeSlots(data.timeSlots);
      
      setSyncInfo({
        isPaired: true,
        pairCode: code,
        role: 'TEACHER',
        lastSync: new Date().toISOString(),
        schoolId: `school-${code}`,
        deviceId: myDeviceId
      });
      setTimeout(() => { isSyncingRef.current = false; }, 50);
      return true;
    } catch (e) {
      return false;
    }
  };

  const syncNow = async () => {
    if (!syncInfo.pairCode || !syncInfo.deviceId || isSyncingRef.current) return;
    
    const cloudDataStr = localStorage.getItem(`school_cloud_${syncInfo.pairCode}`);
    if (!cloudDataStr) return;
    
    isSyncingRef.current = true;
    const data = JSON.parse(cloudDataStr);

    if (data.devices) {
        data.devices = data.devices.map((d: PairedDevice) => 
            d.deviceId === syncInfo.deviceId ? { ...d, lastActive: new Date().toISOString() } : d
        );
    }

    if (syncInfo.role === 'ADMIN') {
        data.schoolName = schoolName;
        data.academicYear = academicYear;
        data.entities = entities;
        data.students = students;
        data.timeSlots = timeSlots;
        localStorage.setItem(`school_cloud_${syncInfo.pairCode}`, JSON.stringify(data));
        setSyncInfo(prev => ({ ...prev, lastSync: new Date().toISOString() }));
    }
    
    setTimeout(() => { isSyncingRef.current = false; }, 50);
  };

  const removeDevice = (idToRemove: string) => {
      if (syncInfo.role !== 'ADMIN' || !syncInfo.pairCode) return;
      const cloudDataStr = localStorage.getItem(`school_cloud_${syncInfo.pairCode}`);
      if (!cloudDataStr) return;
      
      const data = JSON.parse(cloudDataStr);
      data.devices = (data.devices || []).filter((d: PairedDevice) => d.deviceId !== idToRemove);
      localStorage.setItem(`school_cloud_${syncInfo.pairCode}`, JSON.stringify(data));
      setPairedDevices(data.devices);
  };

  const disconnectSync = () => {
    if (syncInfo.role === 'ADMIN' && syncInfo.pairCode) {
        localStorage.removeItem(`school_cloud_${syncInfo.pairCode}`);
    }
    setSyncInfo({
      isPaired: false,
      pairCode: null,
      role: 'STANDALONE',
      lastSync: null,
      schoolId: null,
      deviceId: null
    });
    setPairedDevices([]);
  };

  // --- CORE DATA UPDATE HANDLERS ---

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
            setAiImportErrorMessage("No data found in files.");
        }
    } catch (err: any) {
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

  const resetData = () => {
    setSchoolName('Mupini Combined School');
    setAcademicYear('2025');
    setEntities(DEFAULT_DATA);
    setStudents(DEFAULT_STUDENTS);
    setTimeSlots(DEFAULT_TIME_SLOTS);
    setAttendanceRecords([]);
    setSyncInfo({
      isPaired: false,
      pairCode: null,
      role: 'STANDALONE',
      lastSync: null,
      schoolId: null,
      deviceId: null
    });
    setPairedDevices([]);
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
      syncInfo, pairedDevices, generatePairCode, joinSchool, disconnectSync, syncNow, removeDevice,
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
