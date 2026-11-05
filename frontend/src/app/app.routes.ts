import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router, Routes } from '@angular/router';
import { EditorComponent } from './editor.component';
import { ListComponent } from './list.component';
import { ConfirmService } from './confirm.service';

const validRecord: CanActivateFn = (route) => {
  const token = route.paramMap.get('id') ?? '';
  if (token === 'new' || (/^[1-9]\d*$/.test(token) && Number.isSafeInteger(Number(token))))
    return true;
  return inject(Router).createUrlTree(['/', route.data['kind']]);
};

const leaveEditor: CanDeactivateFn<EditorComponent> = (component, _route, _state, next) => {
  if (component.saving()) return false;
  // Switching work tabs keeps their forms alive in WorkspaceService.
  if (/^\/(students|courses)\/(new|[1-9]\d*)$/.test(next.url)) return true;
  if (!component.tab?.form.dirty) return true;
  return inject(ConfirmService).ask(
    'Leave this editor?',
    'Your unsaved changes will remain in the open work tab until you close or reload it.',
    'Leave editor',
    false,
  );
};
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'students' },
  {
    path: 'students',
    component: ListComponent,
    data: { kind: 'students' },
    title: 'Students | Campus',
  },
  {
    path: 'courses',
    component: ListComponent,
    data: { kind: 'courses' },
    title: 'Courses | Campus',
  },
  {
    path: 'students/:id',
    component: EditorComponent,
    data: { kind: 'students' },
    canActivate: [validRecord],
    canDeactivate: [leaveEditor],
    title: 'Student workspace | Campus',
  },
  {
    path: 'courses/:id',
    component: EditorComponent,
    data: { kind: 'courses' },
    canActivate: [validRecord],
    canDeactivate: [leaveEditor],
    title: 'Course workspace | Campus',
  },
  { path: '**', redirectTo: 'students' },
];
