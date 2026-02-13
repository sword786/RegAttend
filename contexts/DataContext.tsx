
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  EntityProfile, Student, TimeSlot, TimetableEntry, AttendanceRecord, 
  DayOfWeek, AiImportStatus, AiImportResult, AiStudentImportResult, SyncMetadata, UserRole,
  createEmptySchedule, BulkImportPayload, ConnectedDevice
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
  connectedDevices: ConnectedDevice[];
  
  userRole: UserRole | null;
  setUserRole: (role: UserRole) => void;
  logout: () => void;

  syncInfo: SyncMetadata;
  firebaseConfig: any;
  setFirebaseConfig: (config: any, recoverSchoolId?: string) => Promise<boolean>;
  getPairingToken: () => string;
  importSyncToken: (token: string, name: string) => Promise<boolean>;
  disconnectSync: () => void;
  kickDevice: (deviceId: string) => void;

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
  addEntity: (entity: EntityProfile) => void;
  updateEntity: (id: string, updates: Partial<EntityProfile>) => void;
  deleteEntity: (id: string) => void;
  addStudent: (student: Student) => void;
  addStudents: (newStudents: Student[]) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  updateTimeSlots: (slots: TimeSlot[]) => void;
  deleteTimeSlot: (period: number) => void;
  updateSchedule: (entityId: string, day: string, period: number, entry: TimetableEntry | null) => void;
  bulkImportData: (payload: BulkImportPayload) => void;
  markAttendance: (records: AttendanceRecord[]) => void;
  getAttendanceForPeriod: (date: string, entityId: string, period: number) => AttendanceRecord[];
  resetData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRole, setUserRoleState] = useState<UserRole | null>(() => {
    const ur = localStorage.getItem('mup_role');
    return ur ? (JSON.parse(ur) as UserRole) : null;
  });

  const getPrefix = (role: UserRole | null) => role === 'STANDALONE' ? 'local' : 'cloud';

  const loadStored = (key: string, def: any, role: UserRole | null) => {
    if (!role) return def;
    const data = localStorage.getItem(`mup_${getPrefix(role)}_${key}`);
    return data ? JSON.parse(data) : def;
  };

  const [schoolName, setSchoolName] = useState(() => loadStored('sn', 'Mupini Combined School', userRole));
  const [academicYear, setAcademicYear] = useState(() => loadStored('ay', '2025', userRole));
  const [primaryColor, setPrimaryColor] = useState(() => loadStored('pc', '#3b82f6', userRole));
  const [entities, setEntities] = useState<EntityProfile[]>(() => loadStored('en', DEFAULT_DATA, userRole));
  const [students, setStudents] = useState<Student[]>(() => loadStored('st', DEFAULT_STUDENTS, userRole));
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => loadStored('ts', DEFAULT_TIME_SLOTS, userRole));
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => loadStored('ar', [], userRole));
  const [firebaseConfig, setFirebaseConfigState] = useState<any>(() => loadStored('fb', null, userRole));
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  
  const [syncInfo, setSyncInfo] = useState<SyncMetadata>(() => {
    const sy = loadStored('sy', null, userRole);
    return {
      isPaired: sy?.isPaired || false,
      pairCode: sy?.pairCode || null,
      role: userRole || 'STANDALONE',
      lastSync: sy?.lastSync || null,
      schoolId: sy?.schoolId || null,
      deviceId: sy?.deviceId || `dev-${Math.random().toString(36).substr(2, 9)}`,
      deviceName: sy?.deviceName || null,
      connectionState: sy?.isPaired ? 'CONNECTING' : 'OFFLINE'
    };
  });

  // New state to track if DB is ready for subscription
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const skipFirebaseSync = useRef(false);

  const [aiImportStatus, setAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [aiImportResult, setAiImportResult] = useState<AiImportResult | null>(null);
  const [aiImportErrorMessage, setAiImportErrorMessage] = useState<string | null>(null);
  const [studentAiImportStatus, setStudentAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [studentAiImportResult, setStudentAiImportResult] = useState<AiStudentImportResult | null>(null);

  const ensureReciprocalSchedules = useCallback((items: EntityProfile[]) => {
    const next = items.map(entity => ({
      ...entity,
      schedule: Object.keys(entity.schedule || {}).reduce((acc, day) => {
        acc[day as DayOfWeek] = { ...(entity.schedule?.[day as DayOfWeek] || {}) };
        return acc;
      }, {} as EntityProfile['schedule']),
    }));

    const teacherLookup = new Map<string, EntityProfile>();
    const classLookup = new Map<string, EntityProfile>();

    next.forEach(entity => {
      [entity.id, entity.name, entity.shortCode].filter(Boolean).forEach(key => {
        if (entity.type === 'TEACHER') teacherLookup.set(String(key), entity);
        if (entity.type === 'CLASS') classLookup.set(String(key), entity);
      });
    });

    next.forEach(source => {
      const sourceIdentifier = source.shortCode || source.name;
      const counterpartLookup = source.type === 'TEACHER' ? classLookup : teacherLookup;

      Object.keys(source.schedule || {}).forEach(day => {
        const dayKey = day as DayOfWeek;
        const daySlots = source.schedule?.[dayKey];
        if (!daySlots) return;

        Object.keys(daySlots).forEach(periodKey => {
          const period = Number(periodKey);
          const slot = daySlots[period];
          if (!slot?.teacherOrClass) return;

          const counterpart = counterpartLookup.get(slot.teacherOrClass);
          if (!counterpart) return;

          if (!counterpart.schedule[dayKey]) counterpart.schedule[dayKey] = {};
          counterpart.schedule[dayKey]![period] = {
            ...slot,
            teacherOrClass: sourceIdentifier,
          };
        });
      });
    });

    return next;
  }, []);

  // Initialize Firebase on mount if config exists
  useEffect(() => {
    if (firebaseConfig) {
      initFirebase(firebaseConfig).then(success => {
        if (success) setIsFirebaseReady(true);
      });
    }
  }, [firebaseConfig]);

  useEffect(() => {
    if (userRole !== 'STANDALONE' && syncInfo.isPaired && syncInfo.schoolId && isFirebaseReady) {
      const unsubscribe = FirebaseSync.subscribe(syncInfo.schoolId, (data) => {
        if (skipFirebaseSync.current) { skipFirebaseSync.current = false; return; }
        
        console.log("Received Sync Data", data);

        if (data.metadata) {
            if (data.metadata.schoolName) setSchoolName(data.metadata.schoolName);
            if (data.metadata.academicYear) setAcademicYear(data.metadata.academicYear);
            if (data.metadata.primaryColor) setPrimaryColor(data.metadata.primaryColor);
        }
        if (data.registry) {
            if (data.registry.entities) setEntities(ensureReciprocalSchedules(data.registry.entities));
            if (data.registry.students) setStudents(data.registry.students);
        }
        if (data.timing?.timeSlots) setTimeSlots(data.timing.timeSlots);
        if (data.attendance?.records) setAttendanceRecords(data.attendance.records);
        
        if (data.devices) {
            const devicesList = Object.values(data.devices) as ConnectedDevice[];
            setConnectedDevices(devicesList);
            
            if (userRole === 'TEACHER' && syncInfo.deviceId) {
                const isStillAllowed = devicesList.find(d => d.id === syncInfo.deviceId);
                if (!isStillAllowed && devicesList.length > 0) { 
                    logout();
                    alert("You have been disconnected by the administrator.");
                    return;
                }
            }
        }
        
        setSyncInfo(prev => ({ ...prev, lastSync: new Date().toISOString() }));
      });

      const connectionUnsub = FirebaseSync.monitorConnection((connected) => {
        setSyncInfo(prev => ({ ...prev, connectionState: connected ? 'CONNECTED' : 'OFFLINE' }));
      });

      return () => { unsubscribe(); connectionUnsub(); };
    }
  }, [syncInfo.isPaired, syncInfo.schoolId, isFirebaseReady, userRole, syncInfo.deviceId, ensureReciprocalSchedules]);

  useEffect(() => {
    if (!userRole) return;
    const prefix = getPrefix(userRole);
    localStorage.setItem(`mup_${prefix}_sn`, JSON.stringify(schoolName));
    localStorage.setItem(`mup_${prefix}_ay`, JSON.stringify(academicYear));
    localStorage.setItem(`mup_${prefix}_pc`, JSON.stringify(primaryColor));
    localStorage.setItem(`mup_${prefix}_en`, JSON.stringify(entities));
    localStorage.setItem(`mup_${prefix}_st`, JSON.stringify(students));
    localStorage.setItem(`mup_${prefix}_ts`, JSON.stringify(timeSlots));
    localStorage.setItem(`mup_${prefix}_ar`, JSON.stringify(attendanceRecords));
    localStorage.setItem(`mup_${prefix}_sy`, JSON.stringify(syncInfo));
    localStorage.setItem(`mup_${prefix}_fb`, JSON.stringify(firebaseConfig));
  }, [schoolName, academicYear, primaryColor, entities, students, timeSlots, attendanceRecords, syncInfo, firebaseConfig, userRole]);

  const pushToCloud = (folder: 'metadata' | 'registry' | 'timing' | 'attendance', field: string, data: any) => {
    if (userRole !== 'STANDALONE' && syncInfo.isPaired && syncInfo.schoolId && isFirebaseReady) {
      skipFirebaseSync.current = true;
      const path = `${folder}.${field}`;
      FirebaseSync.updateData(syncInfo.schoolId, { [path]: data });
    }
  };

  const updateSchoolName = (name: string) => { setSchoolName(name); pushToCloud('metadata', 'schoolName', name); };
  const updateAcademicYear = (year: string) => { setAcademicYear(year); pushToCloud('metadata', 'academicYear', year); };
  const updatePrimaryColor = (color: string) => { setPrimaryColor(color); pushToCloud('metadata', 'primaryColor', color); };

  const addEntity = (entity: EntityProfile) => {
    setEntities(prev => { const next = [...prev, entity]; pushToCloud('registry', 'entities', next); return next; });
  };
  
  const updateEntity = (id: string, updates: Partial<EntityProfile>) => {
    setEntities(prev => {
        const oldIdx = prev.findIndex(e => e.id === id);
        if (oldIdx === -1) return prev;
        const oldEntity = prev[oldIdx];
        const newEntity = { ...oldEntity, ...updates };
        
        if (oldEntity.name === newEntity.name && oldEntity.shortCode === newEntity.shortCode) {
            const next = [...prev]; next[oldIdx] = newEntity; pushToCloud('registry', 'entities', next); return next;
        }

        const oldCanonical = oldEntity.shortCode || oldEntity.name;
        const oldName = oldEntity.name;
        const newCanonical = newEntity.shortCode || newEntity.name;

        const next = prev.map(ent => {
            if (ent.id === id) return newEntity;
            const newSchedule = JSON.parse(JSON.stringify(ent.schedule)); 
            let modified = false;

            Object.keys(newSchedule).forEach(d => {
                const day = d as DayOfWeek;
                if (!newSchedule[day]) return;
                Object.keys(newSchedule[day]).forEach(p => {
                    const period = Number(p);
                    const slot = newSchedule[day][period];
                    if (!slot) return;
                    let slotModified = false;
                    if (slot.teacherOrClass === oldCanonical || slot.teacherOrClass === oldName) {
                        slot.teacherOrClass = newCanonical; slotModified = true;
                    }
                    if (slot.splitTeacher === oldCanonical || slot.splitTeacher === oldName) {
                        slot.splitTeacher = newCanonical; slotModified = true;
                    }
                    if (slot.targetClasses && slot.targetClasses.length > 0) {
                        const newTargets = slot.targetClasses.map((t: string) => (t === oldCanonical || t === oldName) ? newCanonical : t);
                        if (JSON.stringify(newTargets) !== JSON.stringify(slot.targetClasses)) {
                            slot.targetClasses = newTargets; slotModified = true;
                        }
                    }
                    if (slotModified) modified = true;
                });
            });
            return modified ? { ...ent, schedule: newSchedule } : ent;
        });
        pushToCloud('registry', 'entities', next); return next;
    });
  };

  const deleteEntity = (id: string) => {
    setEntities(prev => { 
        const filtered = prev.filter(e => e.id !== id); 
        const deleted = prev.find(e => e.id === id);
        if(!deleted) { pushToCloud('registry', 'entities', filtered); return filtered; }
        const identifier = deleted.shortCode || deleted.name;
        const cleaned = filtered.map(ent => {
            const newSchedule = { ...ent.schedule };
            let hasChanges = false;
            Object.keys(newSchedule).forEach(d => {
                const day = d as DayOfWeek;
                if(newSchedule[day]) {
                    Object.keys(newSchedule[day]!).forEach(p => {
                        const period = Number(p);
                        const slot = newSchedule[day]![period];
                        if (!slot) return;
                        
                        let slotModified = false;
                        if (slot.teacherOrClass === identifier) {
                            slot.teacherOrClass = undefined;
                            slotModified = true;
                        }
                        if (slot.splitTeacher === identifier) {
                            slot.splitTeacher = undefined;
                            slotModified = true;
                        }
                        if (slot.targetClasses && slot.targetClasses.includes(identifier!)) {
                            slot.targetClasses = slot.targetClasses.filter(t => t !== identifier);
                            slotModified = true;
                        }

                        if (slotModified) hasChanges = true;
                    });
                }
            });
            return hasChanges ? { ...ent, schedule: newSchedule } : ent;
        });
        pushToCloud('registry', 'entities', cleaned); 
        return cleaned;
    });
  };

  const addStudent = (student: Student) => {
    setStudents(prev => { const next = [...prev, student]; pushToCloud('registry', 'students', next); return next; });
  };
  
  const addStudents = (newStudents: Student[]) => {
    setStudents(prev => { const next = [...prev, ...newStudents]; pushToCloud('registry', 'students', next); return next; });
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => { 
        const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
        pushToCloud('registry', 'students', next); return next;
    });
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => { const next = prev.filter(s => s.id !== id); pushToCloud('registry', 'students', next); return next; });
  };

  const updateTimeSlots = (slots: TimeSlot[]) => {
    setTimeSlots(slots);
    pushToCloud('timing', 'timeSlots', slots);
  };

  const deleteTimeSlot = (period: number) => {
    setTimeSlots(prev => {
        const next = prev.filter(s => s.period !== period);
        pushToCloud('timing', 'timeSlots', next);
        return next;
    });
    setEntities(prev => {
        const next = prev.map(ent => {
             const newSchedule = { ...ent.schedule };
             let changed = false;
             Object.keys(newSchedule).forEach(d => {
                 const day = d as DayOfWeek;
                 if (newSchedule[day] && newSchedule[day]![period]) {
                     delete newSchedule[day]![period];
                     changed = true;
                 }
             });
             return changed ? { ...ent, schedule: newSchedule } : ent;
        });
        if (JSON.stringify(prev) !== JSON.stringify(next)) pushToCloud('registry', 'entities', next);
        return next;
    });
  };

  const updateSchedule = (entityId: string, day: string, period: number, entry: TimetableEntry | null) => {
    setEntities(prev => {
      const source = prev.find(e => e.id === entityId);
      if (!source) return prev;

      const dayKey = day as DayOfWeek;
      const sourceIdentifier = source.shortCode || source.name;
      const sourceType = source.type;
      const oppositeType = sourceType === 'TEACHER' ? 'CLASS' : 'TEACHER';

      const resolveCounterpart = (raw?: string) => {
        if (!raw) return undefined;
        return prev.find(e =>
          e.type === oppositeType && (e.id === raw || e.shortCode === raw || e.name === raw)
        );
      };

      const previousEntry = source.schedule?.[dayKey]?.[period] || null;
      const previousCounterpart = resolveCounterpart(previousEntry?.teacherOrClass);
      const nextCounterpart = resolveCounterpart(entry?.teacherOrClass);

      const next = prev.map(entity => {
        if (entity.id !== entityId && entity.id !== previousCounterpart?.id && entity.id !== nextCounterpart?.id) {
          return entity;
        }

        const newSchedule = {
          ...entity.schedule,
          [dayKey]: { ...(entity.schedule?.[dayKey] || {}) }
        };

        if (entity.id === entityId) {
          if (entry === null) {
            delete newSchedule[dayKey][period];
          } else {
            newSchedule[dayKey][period] = entry;
          }
        }

        if (entity.id === previousCounterpart?.id) {
          const currentMirror = newSchedule[dayKey][period];
          if (currentMirror?.teacherOrClass === sourceIdentifier) {
            delete newSchedule[dayKey][period];
          }
        }

        if (entity.id === nextCounterpart?.id && entry) {
          newSchedule[dayKey][period] = {
            ...entry,
            teacherOrClass: sourceIdentifier,
          };
        }

        return { ...entity, schedule: newSchedule };
      });

      pushToCloud('registry', 'entities', next);
      return next;
    });
  };

  const bulkImportData = (payload: BulkImportPayload) => {
      setEntities(prev => {
          const next = [...prev];
          payload.profiles.forEach(p => {
              const existingIndex = next.findIndex(e => e.name === p.name && e.type === p.type);
              let profile: EntityProfile;
              
              if (existingIndex >= 0) {
                  profile = { ...next[existingIndex] };
              } else {
                  profile = {
                      id: `${p.type.toLowerCase()}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                      name: p.name,
                      shortCode: p.name.substring(0,3).toUpperCase(),
                      type: p.type,
                      schedule: createEmptySchedule()
                  };
              }

              if (p.schedule) {
                 p.schedule.forEach(s => {
                     const day = s.day as DayOfWeek;
                     if (!profile.schedule[day]) profile.schedule[day] = {};
                     profile.schedule[day]![s.period] = {
                         subject: s.subject,
                         teacherOrClass: s.teacherOrClass,
                         type: 'normal'
                     };
                 });
              }

              if (existingIndex >= 0) next[existingIndex] = profile;
              else next.push(profile);
          });
          const normalized = ensureReciprocalSchedules(next);
          pushToCloud('registry', 'entities', normalized);
          return normalized;
      });
  };

  const markAttendance = (records: AttendanceRecord[]) => {
      setAttendanceRecords(prev => {
          const newRecs = prev.filter(r => 
              !records.some(nr => 
                  nr.date === r.date && 
                  nr.period === r.period && 
                  nr.studentId === r.studentId
              )
          );
          const next = [...newRecs, ...records];
          pushToCloud('attendance', 'records', next);
          return next;
      });
  };

  const getAttendanceForPeriod = useCallback((date: string, entityId: string, period: number) => {
      return attendanceRecords.filter(r => r.date === date && r.entityId === entityId && r.period === period);
  }, [attendanceRecords]);

  const resetData = () => {
      setSchoolName('Mupini Combined School');
      setAcademicYear('2025');
      setEntities([]);
      setStudents([]);
      setAttendanceRecords([]);
      if (syncInfo.schoolId) {
         FirebaseSync.setFullState(syncInfo.schoolId, {
             metadata: { schoolName: 'Mupini Combined School', academicYear: '2025' },
             registry: { entities: [], students: [] },
             attendance: { records: [] },
             timing: { timeSlots: DEFAULT_TIME_SLOTS }
         });
      }
  };

  const startAiImport = async (files: { file: File, label: 'TEACHER' | 'CLASS' }[]) => {
     setAiImportStatus('PROCESSING');
     setAiImportErrorMessage(null);
     try {
         const inputs = await Promise.all(files.map(async f => {
             const base64 = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onload = () => resolve(reader.result as string);
                 reader.readAsDataURL(f.file);
             });
             const data = base64.split(',')[1];
             return { base64: data, mimeType: f.file.type, label: f.label };
         }));
         
         const result = await processTimetableImport(inputs);
         if (result) {
             setAiImportResult(result);
             setAiImportStatus('REVIEW');
         } else {
             throw new Error("No data extracted");
         }
     } catch (e: any) {
         setAiImportStatus('ERROR');
         setAiImportErrorMessage(e.message);
     }
  };

  const cancelAiImport = () => {
      setAiImportStatus('IDLE');
      setAiImportResult(null);
  };

  const finalizeAiImport = () => {
      if (aiImportResult) {
          bulkImportData({ profiles: aiImportResult.profiles.map(p => ({
              ...p,
              type: p.type as 'CLASS' | 'TEACHER',
              schedule: [] // Logic inside bulkImportData handles structure adaptation usually, or we pass simplified
          })) as any }); 
          // Note: The bulkImportData handles full structure if passed, but processTimetableImport returns EntityProfile format.
          // We need to bridge them.
          // Actually bulkImportData expects BulkImportPayload.
          // Let's adapt here quickly or update bulkImportData to accept EntityProfile[] style input.
          // For simplicity, let's just map manually:
          
          setEntities(prev => {
               const next = [...prev];
               aiImportResult.profiles.forEach((p: any) => {
                    const idx = next.findIndex(e => e.name === p.name && e.type === p.type);
                    if (idx >= 0) {
                         // Merge
                         const merged = { ...next[idx], schedule: { ...next[idx].schedule } };
                         Object.keys(p.schedule).forEach(d => {
                             merged.schedule[d as DayOfWeek] = { ...merged.schedule[d as DayOfWeek], ...p.schedule[d] };
                         });
                         next[idx] = merged;
                    } else {
                         next.push({
                             id: `${p.type.toLowerCase()}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                             name: p.name,
                             shortCode: p.shortCode,
                             type: p.type,
                             schedule: p.schedule
                         });
                    }
               });
               const normalized = ensureReciprocalSchedules(next);
               pushToCloud('registry', 'entities', normalized);
               return normalized;
          });
          
          setAiImportStatus('IDLE');
          setAiImportResult(null);
      }
  };

  const startStudentAiImport = async (files: File[]) => {
      setStudentAiImportStatus('PROCESSING');
      try {
          const inputs = await Promise.all(files.map(async f => {
             const base64 = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onload = () => resolve(reader.result as string);
                 reader.readAsDataURL(f);
             });
             const data = base64.split(',')[1];
             return { base64: data, mimeType: f.type };
          }));
          const result = await processStudentImport(inputs);
          if (result) {
              setStudentAiImportResult(result);
              setStudentAiImportStatus('REVIEW');
          } else {
              throw new Error("No students found");
          }
      } catch (e: any) {
          setStudentAiImportStatus('ERROR');
          alert(e.message);
      }
  };

  const cancelStudentAiImport = () => {
      setStudentAiImportStatus('IDLE');
      setStudentAiImportResult(null);
  };

  const finalizeStudentAiImport = (targetClassId?: string) => {
      if (studentAiImportResult && targetClassId) {
          const newStudents = studentAiImportResult.students.map((s, idx) => ({
              id: `ai-student-${Date.now()}-${idx}`,
              name: s.name,
              rollNumber: s.rollNumber || '',
              admissionNumber: s.admissionNumber,
              classId: targetClassId,
          }));
          addStudents(newStudents);
          setStudentAiImportStatus('IDLE');
          setStudentAiImportResult(null);
      }
  };

  const setFirebaseConfig = async (config: any, recoverSchoolId?: string) => {
      const success = await initFirebase(config);
      if (success) {
          setFirebaseConfigState(config);
          setIsFirebaseReady(true);
          
          let schoolId = recoverSchoolId;
          if (!schoolId) {
              schoolId = `sch-${Math.random().toString(36).substr(2, 9)}`;
              await FirebaseSync.setFullState(schoolId, {
                  metadata: { schoolName, academicYear, primaryColor, setupDate: Date.now() },
                  registry: { entities, students },
                  timing: { timeSlots },
                  attendance: { records: attendanceRecords }
              });
          }
          
          setSyncInfo(prev => ({
              ...prev,
              isPaired: true,
              role: 'ADMIN',
              schoolId: schoolId!,
              connectionState: 'CONNECTED',
              deviceName: 'Admin Console'
          }));
          return true;
      }
      return false;
  };

  const getPairingToken = useCallback(() => {
      if (!syncInfo.schoolId || !firebaseConfig) return '';
      const payload = JSON.stringify({ ...firebaseConfig, schoolId: syncInfo.schoolId });
      return btoa(payload);
  }, [syncInfo.schoolId, firebaseConfig]);

  const importSyncToken = async (token: string, name: string) => {
      try {
          const payload = JSON.parse(atob(token));
          const { schoolId, ...config } = payload;
          const success = await initFirebase(config);
          if (success) {
              setFirebaseConfigState(config);
              setIsFirebaseReady(true);
              
              const deviceId = `dev-${Date.now()}`;
              setSyncInfo({
                  isPaired: true,
                  pairCode: null,
                  role: 'TEACHER',
                  lastSync: new Date().toISOString(),
                  schoolId,
                  deviceId,
                  deviceName: name,
                  connectionState: 'CONNECTED'
              });

              await FirebaseSync.registerDevice(schoolId, {
                  id: deviceId,
                  name,
                  role: 'TEACHER',
                  joinedAt: Date.now(),
                  lastActive: Date.now()
              });

              return true;
          }
      } catch (e) {
          console.error("Invalid Token", e);
      }
      return false;
  };

  const disconnectSync = () => {
      if (syncInfo.schoolId && syncInfo.deviceId) {
          FirebaseSync.removeDevice(syncInfo.schoolId, syncInfo.deviceId);
      }
      setSyncInfo(prev => ({ ...prev, isPaired: false, schoolId: null, connectionState: 'OFFLINE' }));
      setFirebaseConfigState(null);
      setIsFirebaseReady(false);
      setUserRoleState('STANDALONE');
  };

  const kickDevice = (deviceId: string) => {
      if (syncInfo.schoolId) {
          FirebaseSync.removeDevice(syncInfo.schoolId, deviceId);
      }
  };

  const logout = () => {
      disconnectSync();
      setUserRoleState(null);
  };

  return (
    <DataContext.Provider value={{
      schoolName, academicYear, primaryColor, entities, students, timeSlots, attendanceRecords, connectedDevices,
      userRole, setUserRole: setUserRoleState, logout,
      syncInfo, firebaseConfig, setFirebaseConfig, getPairingToken, importSyncToken, disconnectSync, kickDevice,
      aiImportStatus, aiImportResult, aiImportErrorMessage, startAiImport, cancelAiImport, finalizeAiImport,
      studentAiImportStatus, studentAiImportResult, startStudentAiImport, cancelStudentAiImport, finalizeStudentAiImport,
      updateSchoolName, updateAcademicYear, updatePrimaryColor,
      addEntity, updateEntity, deleteEntity,
      addStudent, addStudents, updateStudent, deleteStudent,
      updateTimeSlots, deleteTimeSlot, updateSchedule, bulkImportData,
      markAttendance, getAttendanceForPeriod, resetData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
