package com.example.students;

import static com.example.students.ApiModels.*;

import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ManagementService {
  private final StudentRepository students;
  private final CourseRepository courses;
  private final EnrollmentRepository enrollments;

  public ManagementService(
      StudentRepository students, CourseRepository courses, EnrollmentRepository enrollments) {
    this.students = students;
    this.courses = courses;
    this.enrollments = enrollments;
  }

  public PageView<StudentView> students(String q, Pageable page) {
    return PageView.of(students.search(q, page).map(StudentView::of));
  }

  public PageView<CourseView> courses(String q, Pageable page) {
    return PageView.of(courses.search(q, page).map(this::view));
  }

  public StudentView student(Long id) {
    return StudentView.of(requireStudent(id));
  }

  public CourseView course(Long id) {
    return view(requireCourse(id));
  }

  @Transactional
  public StudentView saveStudent(Long id, StudentInput input) {
    String email = input.email().strip().toLowerCase(Locale.ROOT);
    if (students.existsByEmailAndIdNot(email, id == null ? -1L : id))
      throw DomainException.conflict("Email is already in use.");
    Student student =
        id == null
            ? new Student()
            : students.lockById(id).orElseThrow(() -> DomainException.missing("Student"));
    student.name = input.name().strip();
    student.email = email;
    return StudentView.of(students.saveAndFlush(student));
  }

  @Transactional
  public CourseView saveCourse(Long id, CourseInput input) {
    String code = input.code().strip().toUpperCase(Locale.ROOT);
    if (courses.existsByCodeAndIdNot(code, id == null ? -1L : id))
      throw DomainException.conflict("Course code is already in use.");
    Course course =
        id == null
            ? new Course()
            : courses.lockById(id).orElseThrow(() -> DomainException.missing("Course"));
    if (id != null && input.capacity() < enrollments.countByCourseId(id))
      throw DomainException.conflict("Capacity cannot be lower than current enrollment.");
    course.code = code;
    course.name = input.name().strip();
    course.description = input.description().strip();
    course.capacity = input.capacity();
    return view(courses.saveAndFlush(course));
  }

  @Transactional
  public void deleteStudent(Long id) {
    Student s = students.lockById(id).orElseThrow(() -> DomainException.missing("Student"));
    enrollments.deleteForStudent(id);
    students.delete(s);
  }

  @Transactional
  public void deleteCourse(Long id) {
    Course c = courses.lockById(id).orElseThrow(() -> DomainException.missing("Course"));
    enrollments.deleteForCourse(id);
    courses.delete(c);
  }

  @Transactional
  public EnrollmentView enroll(Long studentId, Long courseId) {
    // All enrollment mutations lock student first, then course. The course lock serializes capacity
    // checks.
    Student s = students.lockById(studentId).orElseThrow(() -> DomainException.missing("Student"));
    Course c = courses.lockById(courseId).orElseThrow(() -> DomainException.missing("Course"));
    if (enrollments.existsByStudentIdAndCourseId(studentId, courseId))
      throw DomainException.conflict("Student is already enrolled in this course.");
    if (enrollments.countByCourseId(courseId) >= c.capacity)
      throw DomainException.conflict("This course is full.");
    return view(enrollments.saveAndFlush(new Enrollment(s, c)));
  }

  @Transactional
  public void withdraw(Long studentId, Long courseId) {
    students.lockById(studentId).orElseThrow(() -> DomainException.missing("Student"));
    courses.lockById(courseId).orElseThrow(() -> DomainException.missing("Course"));
    enrollments.delete(
        enrollments
            .findByStudentIdAndCourseId(studentId, courseId)
            .orElseThrow(() -> DomainException.missing("Enrollment")));
  }

  public List<EnrollmentView> studentCourses(Long id) {
    requireStudent(id);
    return enrollments.findByStudentIdOrderById(id).stream().map(this::view).toList();
  }

  public List<EnrollmentView> courseStudents(Long id) {
    requireCourse(id);
    return enrollments.findByCourseIdOrderById(id).stream().map(this::view).toList();
  }

  private Student requireStudent(Long id) {
    return students.findById(id).orElseThrow(() -> DomainException.missing("Student"));
  }

  private Course requireCourse(Long id) {
    return courses.findById(id).orElseThrow(() -> DomainException.missing("Course"));
  }

  private CourseView view(Course c) {
    return new CourseView(
        c.id, c.code, c.name, c.description, c.capacity, enrollments.countByCourseId(c.id));
  }

  private EnrollmentView view(Enrollment e) {
    return new EnrollmentView(e.id, StudentView.of(e.student), view(e.course), e.enrolledAt);
  }
}
