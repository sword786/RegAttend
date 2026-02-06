import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  EntityProfile, Student, TimeSlot, TimetableEntry, AttendanceRecord, 
  DayOfWeek, AiImportStatus, AiImportResult, AiStudentImportResult, SyncMetadata, UserRole,
  createEmptySchedule, BulkImportPayload
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
  getPairingToken: () => string;
  importSyncToken: (token: string) => Promise<boolean>;
  disconnectSync: () => void;

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
  const [syncInfo, setSyncInfo] = useState<SyncMetadata>(() => {
    const sy = loadStored('sy', null, userRole);
    return {
      isPaired: sy?.isPaired || false,
      pairCode: sy?.pairCode || null,
      role: userRole || 'STANDALONE',
      lastSync: sy?.lastSync || null,
      schoolId: sy?.schoolId || null,
      deviceId: `dev-${Math.random().toString(36).substr(2, 9)}`,
      connectionState: sy?.isPaired ? 'CONNECTING' : 'OFFLINE'
    };
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const skipFirebaseSync = useRef(false);

  const [aiImportStatus, setAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [aiImportResult, setAiImportResult] = useState<AiImportResult | null>(null);
  const [aiImportErrorMessage, setAiImportErrorMessage] = useState<string | null>(null);
  const [studentAiImportStatus, setStudentAiImportStatus] = useState<AiImportStatus>('IDLE');
  const [studentAiImportResult, setStudentAiImportResult] = useState<AiStudentImportResult | null>(null);

  useEffect(() => { setIsInitialized(true); }, []);

  const setUserRole = (newRole: UserRole) => {
    localStorage.setItem('mup_role', JSON.stringify(newRole));
    setUserRoleState(newRole);
    const prefix = newRole === 'STANDALONE' ? 'local' : 'cloud';
    
    setSchoolName(loadStored('sn', 'Mupini Combined School', newRole));
    setAcademicYear(loadStored('ay', '2025', newRole));
    setPrimaryColor(loadStored('pc', '#3b82f6', newRole));
    setEntities(loadStored('en', DEFAULT_DATA, newRole));
    setStudents(loadStored('st', DEFAULT_STUDENTS, newRole));
    setTimeSlots(loadStored('ts', DEFAULT_TIME_SLOTS, newRole));
    setAttendanceRecords(loadStored('ar', [], newRole));
    
    const fbCfg = loadStored('fb', null, newRole);
    setFirebaseConfigState(fbCfg);
    
    const sy = loadStored('sy', null, newRole);
    setSyncInfo({
      isPaired: sy?.isPaired || false,
      pairCode: sy?.pairCode || null,
      role: newRole,
      lastSync: sy?.lastSync || null,
      schoolId: sy?.schoolId || null,
      deviceId: `dev-${Math.random().toString(36).substr(2, 9)}`,
      connectionState: sy?.isPaired ? 'CONNECTING' : 'OFFLINE'
    });

    if (fbCfg) initFirebase(fbCfg);
  };

  useEffect(() => {
    if (userRole !== 'STANDALONE' && syncInfo.isPaired && syncInfo.schoolId && firebaseConfig) {
      const unsubscribe = FirebaseSync.subscribe(syncInfo.schoolId, (data) => {
        if (skipFirebaseSync.current) { skipFirebaseSync.current = false; return; }
        
        // Organized mapping: Data is stored in folders to keep Admin console clean
        if (data.metadata) {
            if (data.metadata.schoolName) setSchoolName(data.metadata.schoolName);
            if (data.metadata.academicYear) setAcademicYear(data.metadata.academicYear);
            if (data.metadata.primaryColor) setPrimaryColor(data.metadata.primaryColor);
        }
        if (data.registry) {
            if (data.registry.entities) setEntities(data.registry.entities);
            if (data.registry.students) setStudents(data.registry.students);
        }
        if (data.timing?.timeSlots) setTimeSlots(data.timing.timeSlots);
        if (data.attendance?.records) setAttendanceRecords(data.attendance.records);
        
        setSyncInfo(prev => ({ ...prev, lastSync: new Date().toISOString() }));
      });

      const connectionUnsub = FirebaseSync.monitorConnection((connected) => {
        setSyncInfo(prev => ({ ...prev, connectionState: connected ? 'CONNECTED' : 'CONNECTING' }));
      });

      return () => { unsubscribe(); connectionUnsub(); };
    }
  }, [syncInfo.isPaired, syncInfo.schoolId, firebaseConfig, userRole]);

  useEffect(() => {
    if (!isInitialized || !userRole) return;
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
  }, [schoolName, academicYear, primaryColor, entities, students, timeSlots, attendanceRecords, syncInfo, firebaseConfig, userRole, isInitialized]);

  const pushToCloud = (folder: 'metadata' | 'registry' | 'timing' | 'attendance', field: string, data: any) => {
    if (userRole !== 'STANDALONE' && syncInfo.isPaired && syncInfo.schoolId) {
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
  
  // *** UPDATED FUNCTION WITH CASCADE UPDATE LOGIC ***
  const updateEntity = (id: string, updates: Partial<EntityProfile>) => {
    setEntities(prev => {
        const oldIdx = prev.findIndex(e => e.id === id);
        if (oldIdx === -1) return prev;

        const oldEntity = prev[oldIdx];
        const newEntity = { ...oldEntity, ...updates };
        
        // If names/codes didn't change, simple update
        if (oldEntity.name === newEntity.name && oldEntity.shortCode === newEntity.shortCode) {
            const next = [...prev];
            next[oldIdx] = newEntity;
            pushToCloud('registry', 'entities', next); 
            return next;
        }

        // identifiers changed, cascade update
        const oldCanonical = oldEntity.shortCode || oldEntity.name;
        const oldName = oldEntity.name;
        const newCanonical = newEntity.shortCode || newEntity.name;

        const next = prev.map(ent => {
            if (ent.id === id) return newEntity; // Update the entity itself

            // Deep clone schedule to check and update references
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

                    // Update main link
                    if (slot.teacherOrClass === oldCanonical || slot.teacherOrClass === oldName) {
                        slot.teacherOrClass = newCanonical;
                        slotModified = true;
                    }

                    // Update split teacher reference
                    if (slot.splitTeacher === oldCanonical || slot.splitTeacher === oldName) {
                        slot.splitTeacher = newCanonical;
                        slotModified = true;
                    }

                    // Update combined target classes
                    if (slot.targetClasses && slot.targetClasses.length > 0) {
                        const newTargets = slot.targetClasses.map((t: string) => 
                            (t === oldCanonical || t === oldName) ? newCanonical : t
                        );
                        if (JSON.stringify(newTargets) !== JSON.stringify(slot.targetClasses)) {
                            slot.targetClasses = newTargets;
                            slotModified = true;
                        }
                    }

                    if (slotModified) modified = true;
                });
            });

            return modified ? { ...ent, schedule: newSchedule } : ent;
        });

        pushToCloud('registry', 'entities', next);
        return next;
    });
  };

  const deleteEntity = (id: string) => {
    setEntities(prev => { const next = prev.filter(e => e.id !== id); pushToCloud('registry', 'entities', next); return next; });
  };
  const addStudent = (student: Student) => {
    setStudents(prev => { const next = [...prev, student]; pushToCloud('registry', 'students', next); return next; });
  };
  const addStudents = (newStudents: Student[]) => {
    setStudents(prev => { const next = [...prev, ...newStudents]; pushToCloud('registry', 'students', next); return next; });
  };
  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => { const next = prev.map(s => s.id === id ? { ...s, ...updates } : s); pushToCloud('registry', 'students', next); return next; });
  };
  const deleteStudent = (id: string) => {
    setStudents(prev => { const next = prev.filter(s => s.id !== id); pushToCloud('registry', 'students', next); return next; });
  };
  const updateTimeSlots = (newTimeSlots: TimeSlot[]) => {
    setTimeSlots(newTimeSlots); pushToCloud('timing', 'timeSlots', newTimeSlots);
  };
  const deleteTimeSlot = (period: number) => {
    setTimeSlots(prev => { const next = prev.filter(s => s.period !== period); pushToCloud('timing', 'timeSlots', next); return next; });
  };
  const updateSchedule = (entityId: string, day: string, period: number, entry: TimetableEntry | null) => {
    setEntities(prev => {
      const dayKey = day as DayOfWeek;
      const currentEntity = prev.find(e => e.id === entityId);
      if (!currentEntity) return prev;
      let updatedEntities = prev.map(e => e.id === entityId ? { ...e, schedule: { ...createEmptySchedule(), ...(e.schedule || {}), [dayKey]: { ...(e.schedule?.[dayKey] || {}), [period]: entry } } } : e);
      const sourceCode = currentEntity.shortCode || currentEntity.name;
      const targetCode = entry?.teacherOrClass;
      if (entry && targetCode) {
        const targetIdx = updatedEntities.findIndex(e => e.type !== currentEntity.type && (e.shortCode === targetCode || e.name === targetCode));
        if (targetIdx !== -1) {
          const target = updatedEntities[targetIdx];
          updatedEntities[targetIdx] = { ...target, schedule: { ...createEmptySchedule(), ...(target.schedule || {}), [dayKey]: { ...(target.schedule?.[dayKey] || {}), [period]: { subject: entry.subject, room: entry.room, teacherOrClass: sourceCode, type: entry.type } } } };
        }
      } else if (entry === null) {
          const prevEntry = currentEntity.schedule?.[dayKey]?.[period];
          if (prevEntry?.teacherOrClass) {
              const targetIdx = updatedEntities.findIndex(e => e.type !== currentEntity.type && (e.shortCode === prevEntry.teacherOrClass || e.name === prevEntry.teacherOrClass));
              if (targetIdx !== -1) {
                  const target = updatedEntities[targetIdx];
                  if (target.schedule?.[dayKey]?.[period]?.teacherOrClass === sourceCode) {
                      updatedEntities[targetIdx] = { ...target, schedule: { ...createEmptySchedule(), ...(target.schedule?.[dayKey] || {}), [period]: null } };
                  }
              }
          }
      }
      pushToCloud('registry', 'entities', updatedEntities);
      return updatedEntities;
    });
  };
  
  const bulkImportData = (payload: BulkImportPayload) => {
    setEntities(prev => {
      let next = [...prev];
      const dayMap: Record<string, DayOfWeek> = {
          'mon': 'Mon', 'monday': 'Mon', 'tue': 'Tue', 'tuesday': 'Tue', 'wed': 'Wed', 'wednesday': 'Wed', 'thu': 'Thu', 'thursday': 'Thu', 'sat': 'Sat', 'saturday': 'Sat', 'sun': 'Sun', 'sunday': 'Sun'
      };

      // Helper to find entity
      const findEntityIndex = (nameOrCode: string, type?: 'CLASS' | 'TEACHER') => {
          if (!nameOrCode) return -1;
          const clean = nameOrCode.trim().toLowerCase();
          return next.findIndex(e => 
              (type ? e.type === type : true) && 
              (e.name.toLowerCase() === clean || e.shortCode?.toLowerCase() === clean)
          );
      };

      // Helper to create entity
      const createEntity = (name: string, type: 'CLASS' | 'TEACHER'): number => {
          // Check if it exists again just in case (though logical flow prevents it, safety first)
          const existing = findEntityIndex(name, type);
          if (existing !== -1) return existing;

          const newEntity: EntityProfile = {
              id: `${type.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
              name: name,
              shortCode: name.length <= 3 ? name.toUpperCase() : name.substring(0,3).toUpperCase(),
              type: type,
              schedule: createEmptySchedule()
          };
          next.push(newEntity);
          return next.length - 1;
      };

      // PASS 1: Create entities from payload and apply direct schedules
      payload.profiles.forEach(profileData => {
          let idx = findEntityIndex(profileData.name, profileData.type);
          
          if (idx === -1) {
              idx = createEntity(profileData.name, profileData.type);
          }

          // Apply schedule from payload
          profileData.schedule.forEach(slot => {
              const cleanDay = slot.day.toLowerCase().trim();
              const mapKey = Object.keys(dayMap).find(k => cleanDay.startsWith(k));
              if (mapKey) {
                  const day = dayMap[mapKey];
                  if (!next[idx].schedule[day]) next[idx].schedule[day] = {};
                  
                  // Preserve existing data if subject is generic "LESSON" but we have better data already
                  const existing = next[idx].schedule[day][slot.period];
                  const isNewGeneric = slot.subject === "LESSON" || !slot.subject;
                  
                  if (!existing || !isNewGeneric) {
                      next[idx].schedule[day][slot.period] = {
                          subject: slot.subject || "LESSON",
                          teacherOrClass: slot.teacherOrClass,
                          type: 'normal'
                      };
                  } else if (existing && slot.teacherOrClass) {
                      // Just update the link if subject is generic
                      next[idx].schedule[day][slot.period] = {
                          ...existing,
                          teacherOrClass: slot.teacherOrClass
                      };
                  }
              }
          });
      });

      // PASS 2: Reciprocal Updates (Cross-Pollinate)
      payload.profiles.forEach(sourceProfile => {
          const sourceIdx = findEntityIndex(sourceProfile.name, sourceProfile.type);
          if (sourceIdx === -1) return;
          
          const sourceEntity = next[sourceIdx];
          const sourceCode = sourceEntity.shortCode || sourceEntity.name;

          sourceProfile.schedule.forEach(slot => {
              if (!slot.teacherOrClass) return;
              
              const targetCode = slot.teacherOrClass;
              const targetType = sourceProfile.type === 'CLASS' ? 'TEACHER' : 'CLASS';
              let targetIdx = findEntityIndex(targetCode, targetType);

              // *** CRITICAL: Create target if missing ***
              if (targetIdx === -1) {
                  targetIdx = createEntity(targetCode, targetType);
              }

              if (targetIdx !== -1) {
                  const targetEntity = next[targetIdx];
                  const cleanDay = slot.day.toLowerCase().trim();
                  const mapKey = Object.keys(dayMap).find(k => cleanDay.startsWith(k));
                  
                  if (mapKey) {
                      const day = dayMap[mapKey];
                      if (!targetEntity.schedule[day]) targetEntity.schedule[day] = {};
                      
                      const existingTargetSlot = targetEntity.schedule[day][slot.period];
                      
                      // Logic for merging subjects
                      let finalSubject = existingTargetSlot?.subject || "LESSON";
                      
                      if (sourceProfile.type === 'CLASS') {
                          // Push Subject from Class to Teacher
                          finalSubject = slot.subject;
                      } else {
                           // Source is Teacher.
                           if (!existingTargetSlot?.subject || existingTargetSlot.subject === "LESSON") {
                               finalSubject = slot.subject || "LESSON";
                           }
                      }

                      // Apply reciprocal update
                      targetEntity.schedule[day][slot.period] = {
                          subject: finalSubject,
                          teacherOrClass: sourceCode, // Point back to Source
                          type: 'normal',
                          room: existingTargetSlot?.room // Preserve room if it exists
                      };
                  }
              }
          });
      });
      
      pushToCloud('registry', 'entities', next);
      return next;
    });
  };

  const markAttendance = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => !newRecords.some(nr => nr.date === r.date && nr.period === r.period && nr.studentId === r.studentId));
      const next = [...filtered, ...newRecords];
      pushToCloud('attendance', 'records', next);
      return next;
    });
  };
  const getAttendanceForPeriod = useCallback((date: string, entityId: string, period: number) => {
    return attendanceRecords.filter(r => r.date === date && (r.entityId === entityId) && r.period === period);
  }, [attendanceRecords]);

  const startAiImport = async (files: { file: File, label: 'TEACHER' | 'CLASS' }[]) => {
    setAiImportStatus('PROCESSING');
    try {
        const payload: any[] = [];
        for (const item of files) {
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader(); reader.readAsDataURL(item.file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
            });
            payload.push({ base64, mimeType: item.file.type, label: item.label });
        }
        const result = await processTimetableImport(payload);
        if (result && result.profiles.length > 0) { setAiImportResult(result); setAiImportStatus('REVIEW'); } 
        else { setAiImportStatus('ERROR'); setAiImportErrorMessage("No profiles detected."); }
    } catch (err: any) { setAiImportStatus('ERROR'); setAiImportErrorMessage(err.message || "AI Error."); }
  };

  const startStudentAiImport = async (files: File[]) => {
    setStudentAiImportStatus('PROCESSING');
    try {
        const payload: any[] = [];
        for (const f of files) {
            if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
                const data = await f.arrayBuffer(); const workbook = XLSX.read(data);
                const csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
                payload.push({ text: `Roster (${f.name}):\n${csvData}` });
            } else {
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader(); reader.readAsDataURL(f);
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                });
                payload.push({ base64, mimeType: f.type });
            }
        }
        const result = await processStudentImport(payload);
        if (result && result.students.length > 0) { setStudentAiImportResult(result); setStudentAiImportStatus('REVIEW'); } 
        else { setStudentAiImportStatus('ERROR'); }
    } catch (err) { setStudentAiImportStatus('ERROR'); }
  };

  const finalizeAiImport = () => {
    if (!aiImportResult) return;
    const newEntities: EntityProfile[] = aiImportResult.profiles.map(p => ({
        id: `${p.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: p.name, shortCode: p.shortCode || p.name.substring(0, 3).toUpperCase(),
        type: p.type, schedule: { ...createEmptySchedule(), ...(p.schedule || {}) }
    }));
    setEntities(prev => { const next = [...prev, ...newEntities]; pushToCloud('registry', 'entities', next); return next; });
    setAiImportStatus('COMPLETED'); setAiImportResult(null);
  };

  const finalizeStudentAiImport = (targetClassId?: string) => {
    if (!studentAiImportResult) return;
    const classEntities = entities.filter(e => e.type === 'CLASS');
    const newStuds: Student[] = studentAiImportResult.students.map((s, idx) => {
        let resolvedClassId = targetClassId || '';
        if (!targetClassId && s.className) {
            const matchedClass = classEntities.find(c => c.name.toLowerCase().includes(s.className!.toLowerCase()) || (c.shortCode && s.className!.toLowerCase().includes(c.shortCode.toLowerCase())));
            if (matchedClass) resolvedClassId = matchedClass.id;
        }
        return { id: `student-${Date.now()}-${idx}`, name: s.name, rollNumber: s.rollNumber || '', classId: resolvedClassId, admissionNumber: s.admissionNumber, classNumber: s.rollNumber };
    });
    addStudents(newStuds); setStudentAiImportStatus('COMPLETED'); setStudentAiImportResult(null);
  };

  const importSyncToken = async (token: string): Promise<boolean> => {
    setSyncInfo(prev => ({ ...prev, connectionState: 'CONNECTING' }));
    try {
      const json = decodeURIComponent(escape(atob(token)));
      const decoded = JSON.parse(json);
      if (!decoded.schoolName || !decoded.entities) return false;
      
      setSchoolName(decoded.schoolName);
      setAcademicYear(decoded.academicYear || '2025');
      if (decoded.primaryColor) setPrimaryColor(decoded.primaryColor);
      setEntities(decoded.entities);
      setStudents(decoded.students || []);
      setTimeSlots(decoded.timeSlots || DEFAULT_TIME_SLOTS);
      setAttendanceRecords(decoded.attendanceRecords || []);
      
      if (decoded.firebaseConfig) { 
        setFirebaseConfigState(decoded.firebaseConfig); 
        await initFirebase(decoded.firebaseConfig); 
      }
      
      setSyncInfo(prev => ({ ...prev, isPaired: true, role: 'TEACHER', lastSync: new Date().toISOString(), schoolId: decoded.masterId, connectionState: 'CONNECTED' }));
      return true;
    } catch (e) { setSyncInfo(prev => ({ ...prev, connectionState: 'ERROR' })); return false; }
  };

  const resetData = () => { 
    const prefix = getPrefix(userRole);
    setSchoolName('Mupini Combined School'); setAcademicYear('2025'); setPrimaryColor('#3b82f6');
    setEntities(DEFAULT_DATA); setStudents(DEFAULT_STUDENTS); setTimeSlots(DEFAULT_TIME_SLOTS); setAttendanceRecords([]); 
    setFirebaseConfigState(null); setSyncInfo(prev => ({ ...prev, isPaired: false, connectionState: 'OFFLINE', schoolId: null }));
    const keysToRemove = [`mup_${prefix}_sn`, `mup_${prefix}_ay`, `mup_${prefix}_pc`, `mup_${prefix}_en`, `mup_${prefix}_st`, `mup_${prefix}_ts`, `mup_${prefix}_ar`, `mup_${prefix}_sy`, `mup_${prefix}_fb` ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
  };

  const logout = () => { localStorage.removeItem('mup_role'); setUserRoleState(null); };

  const getPairingToken = () => {
    if (!syncInfo.schoolId || !firebaseConfig) return '';
    return btoa(unescape(encodeURIComponent(JSON.stringify({ 
      v: "v2", schoolName, academicYear, entities, students, timeSlots, masterId: syncInfo.schoolId, firebaseConfig, primaryColor
    }))));
  };

  return (
    <DataContext.Provider value={{
      schoolName, academicYear, primaryColor, entities, students, timeSlots, attendanceRecords,
      userRole, setUserRole, logout, syncInfo, firebaseConfig, 
      setFirebaseConfig: async (c) => { 
        if (!c) { setFirebaseConfigState(null); setSyncInfo(p => ({ ...p, isPaired: false, connectionState: 'OFFLINE' })); return true; }
        const success = await initFirebase(c);
        if (success) {
            setFirebaseConfigState(c); 
            const masterId = syncInfo.schoolId || `sch-${Math.random().toString(36).substr(2, 9)}`;
            setSyncInfo(p => ({ ...p, isPaired: true, schoolId: masterId, connectionState: 'CONNECTED', role: userRole || 'ADMIN' }));
            
            // Initializing Firestore with organized folders
            FirebaseSync.setFullState(masterId, { 
              metadata: { schoolName, academicYear, primaryColor, lastActive: Date.now() },
              registry: { entities, students },
              timing: { timeSlots },
              attendance: { records: attendanceRecords }
            });
            return true;
        } else { setFirebaseConfigState(null); return false; }
      },
      getPairingToken, importSyncToken, disconnectSync: () => { setSyncInfo(p => ({ ...p, isPaired: false, connectionState: 'OFFLINE' })); }, 
      aiImportStatus, aiImportResult, aiImportErrorMessage, startAiImport, cancelAiImport: () => setAiImportStatus('IDLE'), finalizeAiImport,
      studentAiImportStatus, studentAiImportResult, startStudentAiImport, cancelStudentAiImport: () => setStudentAiImportStatus('IDLE'), finalizeStudentAiImport,
      updateSchoolName, updateAcademicYear, updatePrimaryColor, addEntity, updateEntity, deleteEntity, addStudent, addStudents, updateStudent, deleteStudent,
      updateTimeSlots, deleteTimeSlot, updateSchedule, bulkImportData, markAttendance, getAttendanceForPeriod, resetData
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