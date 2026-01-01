
export type DayOfWeek = 'Sat' | 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu';

export interface TimeSlot {
  period: number;
  timeRange: string;
}

export interface TimetableEntry {
  subject: string;
  room?: string;
  teacherOrClass?: string;
  type?: 'split' | 'combined' | 'normal';
  teachers?: string[];
  targetClasses?: string[];
  venue?: string;
}

export type WeeklySchedule = Record<DayOfWeek, Record<number, TimetableEntry | null>>;

export interface EntityProfile {
  id: string;
  name: string;
  shortCode?: string;
  type: 'TEACHER' | 'CLASS';
  schedule: WeeklySchedule;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  date: string;
  period: number;
  entityId: string;
  studentId: string;
  status: AttendanceStatus;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type AiImportStatus = 'IDLE' | 'PROCESSING' | 'REVIEW' | 'COMPLETED' | 'ERROR';

export interface RawAiProfile {
  name: string; 
  type: 'TEACHER' | 'CLASS';
  shortCode?: string;
  schedule: WeeklySchedule;
}

export interface AiImportResult {
  profiles: RawAiProfile[];
  rawTextResponse?: string;
}

// REAL-TIME SYNC TYPES
export type SyncConnectionState = 'OFFLINE' | 'CONNECTING' | 'CONNECTED' | 'SYNCING' | 'ERROR';

export interface SyncMetadata {
  isPaired: boolean;
  pairCode: string | null;
  role: 'ADMIN' | 'TEACHER' | 'STANDALONE';
  lastSync: string | null;
  schoolId: string | null;
  deviceId: string | null;
  connectionState: SyncConnectionState;
  masterSourceId?: string;
}
