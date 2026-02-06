
export type DayOfWeek = 'Sat' | 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STANDALONE';

export interface TimeSlot {
  period: number;
  timeRange: string;
}

export interface TimetableEntry {
  subject: string;
  room?: string;
  teacherOrClass?: string;
  type?: 'split' | 'combined' | 'normal';
  targetClasses?: string[]; 
  splitSubject?: string;
  splitTeacher?: string;
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
  admissionNumber?: string;
  classNumber?: string;
  group?: 'A' | 'B' | string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  date: string;
  period: number;
  entityId: string;
  studentId: string;
  status: AttendanceStatus;
  subject?: string;
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

export interface RawAiStudent {
  name: string;
  rollNumber?: string;
  admissionNumber?: string;
  className?: string;
}

export interface AiImportResult {
  profiles: RawAiProfile[];
  rawTextResponse?: string;
}

export interface AiStudentImportResult {
  students: RawAiStudent[];
}

export type SyncConnectionState = 'OFFLINE' | 'CONNECTING' | 'CONNECTED' | 'SYNCING' | 'ERROR';

export interface SyncMetadata {
  isPaired: boolean;
  pairCode: string | null;
  role: UserRole;
  lastSync: string | null;
  schoolId: string | null;
  deviceId: string | null;
  connectionState: SyncConnectionState;
  masterSourceId?: string;
}

export interface BulkImportPayload {
  profiles: {
    name: string;
    type: 'CLASS' | 'TEACHER';
    schedule: {
      day: string;
      period: number;
      subject: string;
      teacherOrClass?: string;
    }[];
  }[];
}

export const createEmptySchedule = (): WeeklySchedule => ({
  'Sat': {},
  'Sun': {},
  'Mon': {},
  'Tue': {},
  'Wed': {},
  'Thu': {}
});