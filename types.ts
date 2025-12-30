
export type DayOfWeek = 'Sat' | 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu';

export interface TimeSlot {
  period: number;
  timeRange: string;
}

export interface TimetableEntry {
  subject: string; // e.g., "ENG", "MATH", "AH", "ELV"
  room?: string; // Venue / Room number
  teacherOrClass?: string; // Primary code (e.g., "JD" or "10A")
  
  // Advanced session metadata
  type?: 'split' | 'combined' | 'normal';
  teachers?: string[]; // For "split" logic: list of participating teachers
  targetClasses?: string[]; // For "combined" logic: list of participating classes
  venue?: string; // Dedicated field for location (P-Hall, Lab, etc.)
}

// Map: Day -> Period Index (1-9) -> Entry
export type WeeklySchedule = Record<DayOfWeek, Record<number, TimetableEntry | null>>;

export interface EntityProfile {
  id: string;
  name: string;
  shortCode?: string; // Optional code (e.g. "JD" for John Doe)
  type: 'TEACHER' | 'CLASS';
  schedule: WeeklySchedule;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  classId: string; // Assigned class
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  date: string; // ISO Date
  period: number;
  entityId: string; // Class ID
  studentId: string;
  status: AttendanceStatus;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// AI Import Types
export type AiImportStatus = 'IDLE' | 'PROCESSING' | 'REVIEW' | 'COMPLETED' | 'ERROR';

export interface RawAiProfile {
  name: string; // The extracted name (e.g., "Mr. Smith" or "Grade 12")
  schedule: WeeklySchedule;
}

export interface AiImportResult {
  detectedType: 'TEACHER_WISE' | 'CLASS_WISE';
  profiles: RawAiProfile[];
  unknownCodes: string[]; // Codes found inside the slots (e.g., "10A" if teacher-wise, or "JD" if class-wise)
  rawTextResponse?: string;
}
