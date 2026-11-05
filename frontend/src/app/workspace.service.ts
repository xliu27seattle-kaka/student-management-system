import { inject, Injectable, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmService } from './confirm.service';
import { EntityKind } from './models';

export function editorForm(kind: EntityKind) {
  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/.*\S.*/)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators:
        kind === 'students'
          ? [Validators.required, Validators.email, Validators.maxLength(254)]
          : [],
    }),
    code: new FormControl('', {
      nonNullable: true,
      validators:
        kind === 'courses' ? [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{1,20}$/)] : [],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    capacity: new FormControl(20, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(100000),
        Validators.pattern(/^\d+$/),
      ],
    }),
  });
}
export interface WorkTab {
  key: string;
  kind: EntityKind;
  id: number | null;
  title: string;
  form: ReturnType<typeof editorForm>;
  loaded: boolean;
  busy?: boolean;
}
@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly tabs = signal<WorkTab[]>([]);
  private router = inject(Router);
  private confirm = inject(ConfirmService);
  ensure(kind: EntityKind, token: string): WorkTab {
    const key = `${kind}/${token}`;
    let tab = this.tabs().find((t) => t.key === key);
    if (!tab) {
      tab = {
        key,
        kind,
        id: token === 'new' ? null : Number(token),
        title:
          token === 'new'
            ? `New ${kind === 'students' ? 'student' : 'course'}`
            : `${kind === 'students' ? 'Student' : 'Course'} #${token}`,
        form: editorForm(kind),
        loaded: token === 'new',
      };
      this.tabs.update((t) => [...t, tab!]);
    }
    return tab;
  }
  async close(tab: WorkTab) {
    if (tab.busy) return;
    if (
      tab.form.dirty &&
      !(await this.confirm.ask(
        'Discard unsaved changes?',
        `Changes to ${tab.title} will be lost.`,
        'Discard changes',
      ))
    )
      return;
    tab.form.markAsPristine();
    const active = this.router.isActive(
      this.router.createUrlTree(['/', tab.kind, tab.id ?? 'new']),
      {
        paths: 'exact',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      },
    );
    this.tabs.update((t) => t.filter((x) => x !== tab));
    if (active) await this.router.navigate(['/', tab.kind]);
  }
  remove(kind: EntityKind, id: number) {
    this.tabs.update((t) => t.filter((x) => !(x.kind === kind && x.id === id)));
  }
  dirty() {
    return this.tabs().some((t) => t.form.dirty);
  }
}
