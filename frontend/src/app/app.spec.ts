import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkspaceService, editorForm } from './workspace.service';
import { ConfirmService } from './confirm.service';
import { weatherLabel } from './weather.component';
import { errorMessage } from './api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';

describe('Work tabs', () => {
  let workspace: WorkspaceService;
  const ask = vi.fn();
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ConfirmService, useValue: { ask } }],
    });
    workspace = TestBed.inject(WorkspaceService);
    ask.mockReset();
  });
  it('keeps independent unsaved forms when switching tabs', () => {
    const a = workspace.ensure('students', '1');
    const b = workspace.ensure('students', '2');
    a.form.controls.name.setValue('Unsaved Ada');
    a.form.markAsDirty();
    expect(workspace.ensure('students', '1')).toBe(a);
    expect(b.form.controls.name.value).toBe('');
    expect(workspace.ensure('students', '1').form.controls.name.value).toBe('Unsaved Ada');
    expect(workspace.tabs().length).toBe(2);
  });
  it('retains a dirty tab when discard is cancelled', async () => {
    const tab = workspace.ensure('courses', '1');
    tab.form.markAsDirty();
    ask.mockResolvedValue(false);
    await workspace.close(tab);
    expect(workspace.tabs()).toContain(tab);
    expect(ask).toHaveBeenCalledOnce();
  });
  it('closes a dirty tab after explicit discard', async () => {
    const tab = workspace.ensure('courses', '1');
    tab.form.markAsDirty();
    ask.mockResolvedValue(true);
    await workspace.close(tab);
    expect(workspace.tabs()).toHaveLength(0);
  });
  it('does not ask for confirmation when closing a pristine tab', async () => {
    await workspace.close(workspace.ensure('students', 'new'));
    expect(ask).not.toHaveBeenCalled();
  });
});
describe('Editor validation and feedback', () => {
  it('requires a valid student email and nonblank name', () => {
    const form = editorForm('students');
    form.patchValue({ name: '   ', email: 'bad' });
    expect(form.invalid).toBe(true);
    form.patchValue({ name: 'Ada', email: 'ada@example.com' });
    expect(form.valid).toBe(true);
  });
  it('requires a positive integer course capacity and a valid course code', () => {
    const form = editorForm('courses');
    form.patchValue({ name: 'Algorithms', code: 'CS1', capacity: 1.5 });
    expect(form.invalid).toBe(true);
    form.controls.capacity.setValue(20);
    expect(form.valid).toBe(true);
    form.controls.code.setValue('with spaces');
    expect(form.invalid).toBe(true);
  });
  it('shows server conflict details and connection failures', () => {
    expect(
      errorMessage(
        new HttpErrorResponse({ status: 409, error: { detail: 'This course is full.' } }),
      ),
    ).toBe('This course is full.');
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Cannot reach');
  });
  it('describes weather conditions in English', () => {
    expect(weatherLabel(0)).toBe('Clear sky');
    expect(weatherLabel(63)).toBe('Rain');
    expect(weatherLabel(95)).toBe('Thunderstorms');
  });
});
