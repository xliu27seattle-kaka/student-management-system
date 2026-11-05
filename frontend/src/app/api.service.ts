import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { Course, Enrollment, EntityKind, Location, Page, Student, Weather } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly changed = new Subject<void>();
  list<T>(
    kind: EntityKind,
    q = '',
    page = 0,
    sort = kind === 'students' ? 'name' : 'code',
    direction = 'asc',
    size = 10,
  ) {
    return this.http.get<Page<T>>(`/api/${kind}`, { params: { q, page, size, sort, direction } });
  }
  get<T>(kind: EntityKind, id: number) {
    return this.http.get<T>(`/api/${kind}/${id}`);
  }
  save(kind: EntityKind, id: number | null, body: unknown) {
    return id === null
      ? this.http.post<Student | Course>(`/api/${kind}`, body)
      : this.http.put<Student | Course>(`/api/${kind}/${id}`, body);
  }
  delete(kind: EntityKind, id: number) {
    return this.http.delete<void>(`/api/${kind}/${id}`);
  }
  enrollments(kind: EntityKind, id: number) {
    return this.http.get<Enrollment[]>(`/api/${kind}/${id}/enrollments`);
  }
  enroll(student: number, course: number) {
    return this.http.post<Enrollment>(`/api/students/${student}/courses/${course}`, {});
  }
  withdraw(student: number, course: number) {
    return this.http.delete<void>(`/api/students/${student}/courses/${course}`);
  }
  cities(name: string) {
    return this.http.get<Location[]>('/api/weather/cities', { params: { name } });
  }
  weather(latitude: number, longitude: number) {
    return this.http.get<Weather>('/api/weather', { params: { latitude, longitude } });
  }
}
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Cannot reach the server. Check your connection and try again.';
    return error.error?.detail || 'The request failed. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
