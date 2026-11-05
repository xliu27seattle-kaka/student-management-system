import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  merge,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService, errorMessage } from './api.service';
import { ConfirmService } from './confirm.service';
import { WorkspaceService } from './workspace.service';
import { Course, EntityKind, Page, Student } from './models';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">CAMPUS DIRECTORY</div>
        <h1>{{ kind === 'students' ? 'Students' : 'Courses' }}</h1>
        <p class="text-secondary mb-0">
          {{
            kind === 'students'
              ? 'A place for every student. A clear path to every course.'
              : 'Build the curriculum. Make room for what comes next.'
          }}
        </p>
      </div>
      <a class="btn btn-primary" [routerLink]="['/', kind, 'new']">+ Add {{ singular }}</a>
    </div>
    <section class="surface mt-4" [attr.aria-label]="kind + ' directory'">
      <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
        <div>
          <strong>{{ result()?.totalElements ?? 0 }}</strong
          ><span class="text-secondary"> {{ kind }} found</span>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <input
            class="form-control search-input"
            [attr.aria-label]="'Search ' + kind"
            placeholder="Search by name or {{ kind === 'students' ? 'email' : 'code' }}"
            [(ngModel)]="query"
            (ngModelChange)="search.next($event)"
            maxlength="100"
          />
          <select
            class="form-select sort-input"
            aria-label="Sort by"
            [(ngModel)]="sort"
            (ngModelChange)="reset()"
          >
            <option value="name">Name</option>
            @if (kind === 'students') {
              <option value="email">Email</option>
            } @else {
              <option value="code">Course code</option>
              <option value="capacity">Capacity</option>
            }
            <option value="id">ID</option>
          </select>
          <button
            class="btn btn-outline-secondary"
            (click)="toggleDirection()"
            [attr.aria-label]="direction === 'asc' ? 'Sort descending' : 'Sort ascending'"
          >
            {{ direction === 'asc' ? '↑' : '↓' }}
          </button>
        </div>
      </div>
      @if (error()) {
        <div class="alert alert-danger" role="alert">
          {{ error() }}
          <button class="btn btn-sm btn-outline-danger ms-2" (click)="refresh.next()">Retry</button>
        </div>
      }
      @if (notice()) {
        <div class="alert alert-success" role="status">{{ notice() }}</div>
      }
      @if (loading()) {
        <div class="py-5 text-center" role="status">Loading {{ kind }}…</div>
      } @else if (result(); as data) {
        @if (!data.content.length) {
          <div class="empty-state">
            <div class="empty-symbol">{{ kind === 'students' ? '◎' : '▤' }}</div>
            <h2 class="h5">{{ query ? 'No matches found' : 'Your directory starts here' }}</h2>
            <p class="text-secondary">
              {{
                query
                  ? 'Try a different name or clear your search.'
                  : 'Add your first ' + singular + ' to get started.'
              }}
            </p>
            @if (!query) {
              <a class="btn btn-primary" [routerLink]="['/', kind, 'new']">Add {{ singular }}</a>
            }
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table align-middle">
              <caption class="visually-hidden">
                {{
                  kind
                }}
                directory
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ kind === 'students' ? 'Student' : 'Course' }}</th>
                  <th scope="col">{{ kind === 'students' ? 'Email' : 'Enrollment' }}</th>
                  <th scope="col">ID</th>
                  <th scope="col"><span class="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                @for (item of data.content; track item.id) {
                  <tr>
                    <td>
                      <a class="record-link" [routerLink]="['/', kind, item.id]">{{ item.name }}</a>
                      @if (isCourse(item)) {
                        <div class="small text-secondary mt-1">{{ item.code }}</div>
                      }
                    </td>
                    <td>
                      @if (isCourse(item)) {
                        <span class="status-pill" [class.full]="item.enrolledCount >= item.capacity"
                          >{{ item.enrolledCount }} / {{ item.capacity }} enrolled</span
                        >
                      } @else {
                        {{ item.email }}
                      }
                    </td>
                    <td class="text-secondary">#{{ item.id }}</td>
                    <td class="text-end text-nowrap">
                      <a
                        class="btn btn-sm btn-outline-secondary me-2"
                        [routerLink]="['/', kind, item.id]"
                        >Open</a
                      ><button
                        class="btn btn-sm btn-outline-danger"
                        (click)="remove(item)"
                        [disabled]="deleting() !== null"
                        [attr.aria-label]="'Delete ' + item.name"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="small text-secondary"
              >Page {{ data.number + 1 }} of {{ data.totalPages }}</span
            >
            <nav aria-label="Directory pagination" class="d-flex gap-2">
              <button
                class="btn btn-sm btn-outline-secondary"
                [disabled]="page === 0"
                (click)="move(-1)"
              >
                Previous</button
              ><button
                class="btn btn-sm btn-outline-secondary"
                [disabled]="page + 1 >= data.totalPages"
                (click)="move(1)"
              >
                Next
              </button>
            </nav>
          </div>
        }
      }
    </section>`,
})
export class ListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);
  private workspace = inject(WorkspaceService);
  private destroy = inject(DestroyRef);
  kind: EntityKind = this.route.snapshot.data['kind'];
  get singular() {
    return this.kind === 'students' ? 'student' : 'course';
  }
  query = '';
  sort = this.kind === 'students' ? 'name' : 'code';
  direction = 'asc';
  page = 0;
  result = signal<Page<Student | Course> | null>(null);
  error = signal('');
  notice = signal('');
  loading = signal(true);
  deleting = signal<number | null>(null);
  search = new Subject<string>();
  refresh = new Subject<void>();
  ngOnInit() {
    this.search
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.reset());
    merge(this.refresh, this.api.changed)
      .pipe(
        startWith(undefined),
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap(() =>
          this.api
            .list<Student | Course>(
              this.kind,
              this.query.trim(),
              this.page,
              this.sort,
              this.direction,
            )
            .pipe(
              catchError((e) => {
                this.error.set(errorMessage(e));
                return of(null);
              }),
            ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((data) => {
        this.loading.set(false);
        this.result.set(data);
        if (data && !data.content.length && this.page > 0) {
          this.page--;
          this.refresh.next();
        }
      });
  }
  isCourse(item: Student | Course): item is Course {
    return 'code' in item;
  }
  reset() {
    this.page = 0;
    this.refresh.next();
  }
  move(delta: number) {
    this.page += delta;
    this.refresh.next();
  }
  toggleDirection() {
    this.direction = this.direction === 'asc' ? 'desc' : 'asc';
    this.reset();
  }
  async remove(item: Student | Course) {
    if (
      !(await this.confirm.ask(
        `Delete ${this.singular}?`,
        `Delete ${item.name} and all associated enrollments? This cannot be undone.`,
      ))
    )
      return;
    this.deleting.set(item.id);
    this.error.set('');
    this.api
      .delete(this.kind, item.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.workspace.remove(this.kind, item.id);
          this.deleting.set(null);
          this.notice.set(`${item.name} was deleted.`);
          this.api.changed.next();
        },
        error: (e) => {
          this.deleting.set(null);
          this.error.set(errorMessage(e));
        },
      });
  }
}
