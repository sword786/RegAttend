import { DayOfWeek, EntityProfile, TimeSlot, Student } from './types';

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { period: 1, timeRange: '6:45 - 7:45' },
  { period: 2, timeRange: '7:45 - 8:30' },
  { period: 3, timeRange: '9:00 - 9:45' },
  { period: 4, timeRange: '9:45 - 10:30' },
  { period: 5, timeRange: '10:40 - 11:25' },
  { period: 6, timeRange: '11:25 - 12:10' },
  { period: 7, timeRange: '12:10 - 12:55' },
  { period: 8, timeRange: '2:00 - 3:00' },
  { period: 9, timeRange: '3:00 - 4:00' },
];

export const DAYS: DayOfWeek[] = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

// Empty defaults as requested for clean start
export const DEFAULT_STUDENTS: Student[] = [];

export const DEFAULT_DATA: EntityProfile[] = [
  {
    id: 't-new-1',
    name: 'New Teacher',
    shortCode: 'NT',
    type: 'TEACHER',
    schedule: {} as any
  },
  {
    id: 'c-new-1',
    name: 'New Class',
    shortCode: 'NC',
    type: 'CLASS',
    schedule: {} as any
  }
];