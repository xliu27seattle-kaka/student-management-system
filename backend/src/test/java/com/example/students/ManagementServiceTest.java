package com.example.students;

import static com.example.students.ApiModels.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Optional;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

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
}
