package com.example.students;

import static com.example.students.ApiModels.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class ManagementServiceTest {
  @Mock StudentRepository students;
  @Mock CourseRepository courses;
  @Mock EnrollmentRepository enrollments;
  @InjectMocks ManagementService service;
  Student student;
  Course course;

  @BeforeEach
  void setup() {
    student = new Student("Ada", "ada@example.com");
    student.id = 1L;
    course = new Course("CS101", "Programming", "Basics", 1);
    course.id = 2L;
  }

  void locks() {
    when(students.lockById(1L)).thenReturn(Optional.of(student));
    when(courses.lockById(2L)).thenReturn(Optional.of(course));
  }

  @Test
  void fullCourseRejectsEnrollment() {
    locks();
    when(enrollments.countByCourseId(2L)).thenReturn(1L);
    assertEquals(
        "This course is full.",
        assertThrows(DomainException.class, () -> service.enroll(1L, 2L)).getMessage());
    verify(enrollments, never()).saveAndFlush(any());
  }

  @Test
  void duplicateEnrollmentRejected() {
    locks();
    when(enrollments.existsByStudentIdAndCourseId(1L, 2L)).thenReturn(true);
    assertThrows(DomainException.class, () -> service.enroll(1L, 2L));
    verify(enrollments, never()).saveAndFlush(any());
  }

  @Test
  void cannotShrinkBelowCurrentEnrollment() {
    when(courses.lockById(2L)).thenReturn(Optional.of(course));
    when(enrollments.countByCourseId(2L)).thenReturn(2L);
    assertThrows(
        DomainException.class,
        () -> service.saveCourse(2L, new CourseInput("CS101", "Programming", "Basics", 1)));
    verify(courses, never()).saveAndFlush(any());
  }

  @Test
  void studentEmailIsNormalized() {
    when(students.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    var result = service.saveStudent(null, new StudentInput(" Ada ", "ADA@EXAMPLE.COM"));
    assertEquals("Ada", result.name());
    assertEquals("ada@example.com", result.email());
  }

  @Test
  void missingStudentHasMeaningfulError() {
    assertEquals(
        "Student not found.",
        assertThrows(DomainException.class, () -> service.student(99L)).getMessage());
  }

  @Test
  void courseDirectoryBatchesCountsAndIncludesEmptyCourses() {
    var empty = new Course("CS2", "Empty", "", 20);
    empty.id = 3L;
    var page = PageRequest.of(0, 10);
    when(courses.search("", page)).thenReturn(new PageImpl<>(List.of(course, empty), page, 2));
    var count = mock(EnrollmentRepository.CourseEnrollmentCount.class);
    when(count.getCourseId()).thenReturn(2L);
    when(count.getTotal()).thenReturn(1L);
    when(enrollments.countForCourses(List.of(2L, 3L))).thenReturn(List.of(count));
    var result = service.courses("", page).content();
    assertEquals(1, result.get(0).enrolledCount());
    assertEquals(0, result.get(1).enrolledCount());
    verify(enrollments, never()).countByCourseId(anyLong());
  }

  @Test
  void courseRosterCountsItsCourseOnlyOnce() {
    var second = new Student("Grace", "grace@example.com");
    second.id = 3L;
    when(courses.findById(2L)).thenReturn(Optional.of(course));
    when(enrollments.countByCourseId(2L)).thenReturn(2L);
    when(enrollments.findByCourseIdOrderById(2L))
        .thenReturn(List.of(new Enrollment(student, course), new Enrollment(second, course)));
    var result = service.courseStudents(2L);
    assertEquals(2, result.size());
    assertTrue(result.stream().allMatch(e -> e.course().enrolledCount() == 2));
    verify(enrollments, times(1)).countByCourseId(2L);
  }
}
