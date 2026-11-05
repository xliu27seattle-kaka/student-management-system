import { Component, DestroyRef, inject, Input, OnChanges, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { ApiService, errorMessage } from './api.service';
import { ConfirmService } from './confirm.service';
import { Course, Enrollment, EntityKind, Page } from './models';

@Component({
  selector: 'app-enrollments',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `<section class="surface mt-4">
    <div class="d-flex justify-content-between align-items-center gap-3">
      <div>
        <div class="eyebrow">{{ kind === 'students' ? 'LEARNING PATH' : 'CLASS ROSTER' }}</div>
        <h2 class="h5 mt-2">
          {{ kind === 'students' ? 'Enrolled courses' : 'Enrolled students' }}
          <span class="text-secondary">({{ rows().length }})</span>
        </h2>
      </div>
      <button class="btn btn-sm btn-outline-secondary" (click)="load()" [disabled]="busy()">
        Refresh
      </button>
    </div>
    @if (error()) {
      <div class="alert alert-danger mt-3" role="alert">{{ error() }}</div>
    }
    @if (notice()) {
      <div class="alert alert-success mt-3" role="status">{{ notice() }}</div>
    }
    @if (loading()) {
      <p role="status" class="mt-3">Loading enrollments…</p>
    } @else {
      <div class="list-group list-group-flush mt-3">
        @for (row of rows(); track row.id) {
          <div class="list-group-item px-0 d-flex justify-content-between align-items-center gap-3">
            <div>
              <a
                class="record-link"
                [routerLink]="
                  kind === 'students' ? ['/courses', row.course.id] : ['/students', row.student.id]
                "
                >{{ kind === 'students' ? row.course.name : row.student.name }}</a
              >
              <div class="small text-secondary">
                {{ kind === 'students' ? row.course.code : row.student.email }}
              </div>
            </div>
            <button
              class="btn btn-sm btn-outline-danger"
              (click)="withdraw(row)"
              [disabled]="busy()"
            >
              Withdraw
            </button>
          </div>
        } @empty {
          <p class="text-secondary py-3">No enrollments yet.</p>
        }
      </div>
    }
    @if (kind === 'students') {
      <hr />
      <h3 class="h6">Enroll in a course</h3>
      <form class="d-flex gap-2 mt-3" (ngSubmit)="searchCourses()">
        <input
          class="form-control"
          aria-label="Find a course"
          name="courseQuery"
          [(ngModel)]="query"
          placeholder="Search courses by name or code"
          maxlength="100"
        /><button class="btn btn-outline-secondary" [disabled]="busy()">Search</button>
      </form>
      @if (options(); as data) {
        <div class="list-group list-group-flush mt-2">
          @for (course of data.content; track course.id) {
            <div
              class="list-group-item px-0 d-flex align-items-center justify-content-between gap-2"
            >
              <div>
                <strong class="small">{{ course.code }} · {{ course.name }}</strong>
                <div class="small text-secondary">
                  {{ course.enrolledCount }} / {{ course.capacity }} enrolled
                </div>
              </div>
              <button
                class="btn btn-sm btn-outline-primary"
                (click)="enroll(course)"
                [disabled]="
                  busy() || enrolled(course.id) || course.enrolledCount >= course.capacity
                "
              >
                {{
                  enrolled(course.id)
                    ? 'Enrolled'
                    : course.enrolledCount >= course.capacity
                      ? 'Full'
                      : 'Enroll'
                }}
              </button>
            </div>
          } @empty {
            <p class="small mt-3 text-secondary">No courses found.</p>
          }
        </div>
        <div class="d-flex justify-content-end gap-2 mt-2">
          <button
            class="btn btn-sm btn-outline-secondary"
            [disabled]="page === 0 || busy()"
            (click)="move(-1)"
          >
            Previous</button
          ><button
            class="btn btn-sm btn-outline-secondary"
            [disabled]="page + 1 >= data.totalPages || busy()"
            (click)="move(1)"
          >
            Next
          </button>
        </div>
      }
    }
  </section>`,
})
export class EnrollmentsComponent implements OnChanges, OnInit {
  @Input({ required: true }) kind!: EntityKind;
  @Input({ required: true }) id!: number;
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);
  private destroy = inject(DestroyRef);
  rows = signal<Enrollment[]>([]);
  options = signal<Page<Course> | null>(null);
  error = signal('');
  notice = signal('');
  busy = signal(false);
  loading = signal(false);
  query = '';
  page = 0;
  ngOnInit() {
    this.api.changed.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.load());
  }
  ngOnChanges() {
    this.rows.set([]);
    this.options.set(null);
    this.page = 0;
    this.query = '';
    this.notice.set('');
    this.load();
  }
  load() {
    this.error.set('');
    this.loading.set(true);
    const id = this.id;
    this.api
      .enrollments(this.kind, id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          if (id === this.id) {
            this.rows.set(r);
            this.loading.set(false);
          }
        },
        error: (e) => {
          if (id === this.id) {
            this.error.set(errorMessage(e));
            this.loading.set(false);
          }
        },
      });
    if (this.kind === 'students') this.loadOptions();
  }
  loadOptions() {
    this.api
      .list<Course>('courses', this.query.trim(), this.page, 'code')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => this.options.set(c),
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  searchCourses() {
    this.page = 0;
    this.loadOptions();
  }
  move(delta: number) {
    this.page += delta;
    this.loadOptions();
  }
  enrolled(id: number) {
    return this.rows().some((r) => r.course.id === id);
  }
  enroll(course: Course) {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.api
      .enroll(this.id, course.id)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: () => {
          this.notice.set(`Enrolled in ${course.name}.`);
          this.api.changed.next();
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loadOptions();
        },
      });
  }
  async withdraw(row: Enrollment) {
    if (
      !(await this.confirm.ask(
        'Withdraw enrollment?',
        `Remove ${row.student.name} from ${row.course.name}?`,
        'Withdraw',
      ))
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.api
      .withdraw(row.student.id, row.course.id)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: () => {
          this.notice.set('Enrollment withdrawn.');
          this.api.changed.next();
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
}
