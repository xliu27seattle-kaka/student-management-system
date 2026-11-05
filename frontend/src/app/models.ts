export type EntityKind = 'students' | 'courses';
export interface Student {
  id: number;
  name: string;
  email: string;
}
export interface Course {
  id: number;
  code: string;
  name: string;
  description: string;
  capacity: number;
  enrolledCount: number;
}
export interface Enrollment {
  id: number;
  student: Student;
  course: Course;
  enrolledAt: string;
}
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
export interface Location {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}
export interface Weather {
  localTime: string;
  timezone: string;
  temperature: number;
  weatherCode: number;
  isDay: boolean;
}
