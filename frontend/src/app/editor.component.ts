import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { ApiService, errorMessage } from './api.service';
import { Course, EntityKind, Student } from './models';
import { WorkTab, WorkspaceService } from './workspace.service';
import { EnrollmentsComponent } from './enrollments.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, EnrollmentsComponent],
  template: `@if (tab; as t) {
    <div class="page-heading">
      <div>
        <a class="back-link" [routerLink]="['/', t.kind]">← All {{ t.kind }}</a>
        <h1 class="mt-2">{{ t.id === null ? 'Add ' + singular : t.title }}</h1>
        <p class="text-secondary mb-0">
          {{
            t.id === null
              ? 'Start with the essentials. You can update them anytime.'
              : 'Manage details and enrollments in one place.'
          }}
        </p>
      </div>
      @if (t.id !== null) {
        <span class="id-badge">{{ singular }} #{{ t.id }}</span>
      }
    </div>
    @if (error()) {
      <div class="alert alert-danger mt-4" role="alert">
        {{ error() }}
        @if (!t.loaded) {
          <button class="btn btn-sm btn-outline-danger ms-2" (click)="load()">Retry</button>
        }
      </div>
    }
    @if (notice()) {
      <div class="alert alert-success mt-4" role="status">{{ notice() }}</div>
    }
    <section class="surface mt-4">
      <div class="eyebrow">{{ singular.toUpperCase() }} DETAILS</div>
      @if (loading()) {
        <p class="py-4" role="status">Loading details…</p>
      }
      @if (t.loaded) {
        <form [formGroup]="t.form" (ngSubmit)="save()" class="mt-4" novalidate>
          <fieldset [disabled]="saving()">
            <div class="row g-4">
              <div class="col-md-6">
                <label class="form-label" for="record-name"
                  >{{ t.kind === 'students' ? 'Full name' : 'Course name' }}
                  <span class="text-danger" aria-hidden="true">*</span></label
                ><input
                  class="form-control"
                  id="record-name"
                  aria-required="true"
                  formControlName="name"
                  maxlength="100"
                  [class.is-invalid]="invalid('name')"
                  [attr.aria-invalid]="invalid('name')"
                  aria-describedby="name-error"
                />
                <div id="name-error" class="invalid-feedback">
                  Enter a name (up to 100 characters).
                </div>
              </div>
              @if (t.kind === 'students') {
                <div class="col-md-6">
                  <label class="form-label" for="record-email"
                    >Email <span class="text-danger" aria-hidden="true">*</span></label
                  ><input
                    class="form-control"
                    id="record-email"
                    aria-required="true"
                    type="email"
                    formControlName="email"
                    maxlength="254"
                    [class.is-invalid]="invalid('email')"
                    [attr.aria-invalid]="invalid('email')"
                    aria-describedby="email-error"
                  />
                  <div id="email-error" class="invalid-feedback">Enter a valid email address.</div>
                </div>
              } @else {
                <div class="col-md-6">
                  <label class="form-label" for="record-code"
                    >Course code <span class="text-danger" aria-hidden="true">*</span></label
                  ><input
                    class="form-control"
                    id="record-code"
                    aria-required="true"
                    formControlName="code"
                    maxlength="20"
                    [class.is-invalid]="invalid('code')"
                    [attr.aria-invalid]="invalid('code')"
                    aria-describedby="code-error"
                  />
                  <div id="code-error" class="invalid-feedback">
                    Use 1–20 letters, numbers, or hyphens.
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="record-capacity"
                    >Capacity <span class="text-danger" aria-hidden="true">*</span></label
                  ><input
                    class="form-control"
                    id="record-capacity"
                    aria-required="true"
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    formControlName="capacity"
                    [class.is-invalid]="invalid('capacity')"
                    [attr.aria-invalid]="invalid('capacity')"
                    aria-describedby="capacity-help capacity-error"
                  />
                  <div id="capacity-help" class="form-text">
                    Must be at least the current enrollment count.
                  </div>
                  <div id="capacity-error" class="invalid-feedback">
                    Enter a whole number from 1 to 100,000.
                  </div>
                </div>
                <div class="col-12">
                  <label class="form-label" for="record-description">Description</label
                  ><textarea
                    class="form-control"
                    id="record-description"
                    rows="4"
                    formControlName="description"
                    maxlength="1000"
                  ></textarea>
                  <div class="form-text">Up to 1,000 characters.</div>
                </div>
              }
            </div>
            <div class="d-flex align-items-center gap-3 mt-4 pt-3 border-top">
              <button
                class="btn btn-primary"
                type="submit"
                [disabled]="saving() || (!t.form.dirty && t.id !== null)"
              >
                {{
                  saving() ? 'Saving…' : t.id === null ? 'Create ' + singular : 'Save changes'
                }}</button
              ><button
                class="btn btn-outline-secondary"
                type="button"
                (click)="workspace.close(t)"
                [disabled]="saving()"
              >
                Close tab
              </button>
              @if (t.form.dirty) {
                <span class="small text-secondary" role="status">Unsaved changes</span>
              }
            </div>
          </fieldset>
        </form>
      }
    </section>
    @if (t.loaded && t.id !== null) {
      <app-enrollments [kind]="t.kind" [id]="t.id" />
    }
  }`,
})
export class EditorComponent implements OnInit {
  workspace = inject(WorkspaceService);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private router = inject(Router);
  private destroy = inject(DestroyRef);
  tab!: WorkTab;
  private detailRequest?: Subscription;
  error = signal('');
  notice = signal('');
  loading = signal(false);
  saving = signal(false);
  get singular() {
    return this.tab?.kind === 'students' ? 'student' : 'course';
  }
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      this.detailRequest?.unsubscribe();
      this.loading.set(false);
      const kind = this.route.snapshot.data['kind'] as EntityKind;
      const token = params.get('id')!;
      this.error.set('');
      this.notice.set('');
      this.tab = this.workspace.ensure(kind, token);
      if (!this.tab.loaded) this.load();
    });
  }
  load() {
    const tab = this.tab;
    if (tab.id === null) return;
    this.detailRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.detailRequest = this.api
      .get<Student | Course>(tab.kind, tab.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (entity) => {
          tab.form.patchValue(entity);
          tab.form.markAsPristine();
          tab.loaded = true;
          tab.title = entity.name;
          if (tab === this.tab) this.loading.set(false);
        },
        error: (e) => {
          if (tab === this.tab) {
            this.error.set(errorMessage(e));
            this.loading.set(false);
          }
        },
      });
  }
  invalid(field: keyof WorkTab['form']['controls']) {
    const c = this.tab.form.controls[field];
    return c.invalid && c.touched;
  }
  save() {
    const tab = this.tab;
    tab.form.markAllAsTouched();
    if (tab.form.invalid || this.saving()) return;
    const v = tab.form.getRawValue();
    const body =
      tab.kind === 'students'
        ? { name: v.name.trim(), email: v.email.trim() }
        : {
            name: v.name.trim(),
            code: v.code.trim(),
            description: v.description.trim(),
            capacity: v.capacity,
          };
    tab.busy = true;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    this.api
      .save(tab.kind, tab.id, body)
      .pipe(
        finalize(() => {
          tab.busy = false;
          this.saving.set(false);
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (entity) => {
          tab.form.patchValue(entity);
          tab.form.markAsPristine();
          tab.title = entity.name;
          if (tab.id === null) {
            tab.id = entity.id;
            tab.key = `${tab.kind}/${entity.id}`;
            this.router.navigate(['/', tab.kind, entity.id], { replaceUrl: true });
          }
          this.notice.set(
            `${this.singular === 'student' ? 'Student' : 'Course'} saved successfully.`,
          );
          this.api.changed.next();
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
}
