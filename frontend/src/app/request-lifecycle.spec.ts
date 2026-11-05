import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { EditorComponent } from './editor.component';
import { EnrollmentsComponent } from './enrollments.component';
import { ApiService } from './api.service';

const emptyPage = { content: [], number: 0, size: 10, totalPages: 0, totalElements: 0 };

describe('Enrollment request ordering', () => {
  let fixture: ComponentFixture<EnrollmentsComponent>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(EnrollmentsComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('kind', 'students');
    fixture.componentRef.setInput('id', 1);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('cancels the previous student roster and course lookup when switching students', () => {
    const previousRoster = http.expectOne('/api/students/1/enrollments');
    const previousCourses = http.expectOne((r) => r.url === '/api/courses');
    fixture.componentRef.setInput('id', 2);
    fixture.detectChanges();
    expect(previousRoster.cancelled).toBe(true);
    expect(previousCourses.cancelled).toBe(true);
    http.expectOne('/api/students/2/enrollments').flush([]);
    http.expectOne((r) => r.url === '/api/courses').flush(emptyPage);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.optionsLoading()).toBe(false);
  });

  it('keeps only the newest course search request', () => {
    http.expectOne('/api/students/1/enrollments').flush([]);
    const previous = http.expectOne((r) => r.url === '/api/courses');
    fixture.componentInstance.query = 'Algorithms';
    fixture.componentInstance.searchCourses();
    expect(previous.cancelled).toBe(true);
    const newest = http.expectOne(
      (r) => r.url === '/api/courses' && r.params.get('q') === 'Algorithms',
    );
    newest.flush({
      ...emptyPage,
      content: [
        {
          id: 3,
          code: 'CS202',
          name: 'Algorithms',
          description: '',
          capacity: 20,
          enrolledCount: 0,
        },
      ],
      totalElements: 1,
      totalPages: 1,
    });
    expect(fixture.componentInstance.options()?.content[0].name).toBe('Algorithms');
  });

  it('cancels an old roster refresh even when the student ID has not changed', () => {
    const previous = http.expectOne('/api/students/1/enrollments');
    const previousCourses = http.expectOne((r) => r.url === '/api/courses');
    TestBed.inject(ApiService).changed.next();
    expect(previous.cancelled).toBe(true);
    expect(previousCourses.cancelled).toBe(true);
    http.expectOne('/api/students/1/enrollments').flush([]);
    http.expectOne((r) => r.url === '/api/courses').flush(emptyPage);
  });
});

describe('Editor request lifecycle', () => {
  let fixture: ComponentFixture<EditorComponent>;
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ id: '1' }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { data: { kind: 'students' } } },
        },
      ],
    });
    fixture = TestBed.createComponent(EditorComponent);
    http = TestBed.inject(HttpTestingController);
    // Exercise route emissions directly; child enrollment requests are tested separately above.
    fixture.componentInstance.ngOnInit();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('cancels an unfinished detail request when another record is opened', () => {
    const previous = http.expectOne('/api/students/1');
    params.next(convertToParamMap({ id: '2' }));
    expect(previous.cancelled).toBe(true);
    http.expectOne('/api/students/2').flush({ id: 2, name: 'Grace', email: 'grace@example.com' });
    expect(fixture.componentInstance.tab.title).toBe('Grace');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('returns to a cached draft without a stale loading indicator or another response overwriting it', () => {
    http.expectOne('/api/students/1').flush({ id: 1, name: 'Ada', email: 'ada@example.com' });
    const editor = fixture.componentInstance;
    editor.tab.form.controls.name.setValue('Unsaved Ada');
    editor.tab.form.markAsDirty();
    params.next(convertToParamMap({ id: '2' }));
    const pending = http.expectOne('/api/students/2');
    expect(editor.loading()).toBe(true);
    params.next(convertToParamMap({ id: '1' }));
    expect(pending.cancelled).toBe(true);
    expect(editor.loading()).toBe(false);
    expect(editor.tab.form.controls.name.value).toBe('Unsaved Ada');
    expect(editor.tab.form.dirty).toBe(true);
    http.expectNone('/api/students/1');
  });
});
