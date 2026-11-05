package com.example.students;

import static com.example.students.ApiModels.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@Validated
public class ManagementController {
  private final ManagementService service;

  public ManagementController(ManagementService service) {
    this.service = service;
  }

  @GetMapping("/students")
  public PageView<StudentView> students(
      @RequestParam(defaultValue = "") @Size(max = 100) String q,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size,
      @RequestParam(defaultValue = "name") String sort,
      @RequestParam(defaultValue = "asc") String direction) {
    return service.students(
        q, pageable(page, size, sort, direction, Set.of("id", "name", "email")));
  }

  @GetMapping("/courses")
  public PageView<CourseView> courses(
      @RequestParam(defaultValue = "") @Size(max = 100) String q,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size,
      @RequestParam(defaultValue = "code") String sort,
      @RequestParam(defaultValue = "asc") String direction) {
    return service.courses(
        q, pageable(page, size, sort, direction, Set.of("id", "name", "code", "capacity")));
  }

  @GetMapping("/students/{id}")
  public StudentView student(@PathVariable Long id) {
    return service.student(id);
  }

  @GetMapping("/courses/{id}")
  public CourseView course(@PathVariable Long id) {
    return service.course(id);
  }

  @PostMapping("/students")
  public ResponseEntity<StudentView> createStudent(@Valid @RequestBody StudentInput input) {
    var s = service.saveStudent(null, input);
    return ResponseEntity.created(URI.create("/api/students/" + s.id())).body(s);
  }

  @PostMapping("/courses")
  public ResponseEntity<CourseView> createCourse(@Valid @RequestBody CourseInput input) {
    var c = service.saveCourse(null, input);
    return ResponseEntity.created(URI.create("/api/courses/" + c.id())).body(c);
  }

  @PutMapping("/students/{id}")
  public StudentView updateStudent(@PathVariable Long id, @Valid @RequestBody StudentInput input) {
    return service.saveStudent(id, input);
  }

  @PutMapping("/courses/{id}")
  public CourseView updateCourse(@PathVariable Long id, @Valid @RequestBody CourseInput input) {
    return service.saveCourse(id, input);
  }

  @DeleteMapping("/students/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteStudent(@PathVariable Long id) {
    service.deleteStudent(id);
  }

  @DeleteMapping("/courses/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteCourse(@PathVariable Long id) {
    service.deleteCourse(id);
  }

  @GetMapping("/students/{id}/enrollments")
  public List<EnrollmentView> studentCourses(@PathVariable Long id) {
    return service.studentCourses(id);
  }

  @GetMapping("/courses/{id}/enrollments")
  public List<EnrollmentView> courseStudents(@PathVariable Long id) {
    return service.courseStudents(id);
  }

  @PostMapping("/students/{studentId}/courses/{courseId}")
  @ResponseStatus(HttpStatus.CREATED)
  public EnrollmentView enroll(@PathVariable Long studentId, @PathVariable Long courseId) {
    return service.enroll(studentId, courseId);
  }

  @DeleteMapping("/students/{studentId}/courses/{courseId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void withdraw(@PathVariable Long studentId, @PathVariable Long courseId) {
    service.withdraw(studentId, courseId);
  }

  private Pageable pageable(
      int page, int size, String sort, String direction, Set<String> allowed) {
    if (!allowed.contains(sort) || !(direction.equals("asc") || direction.equals("desc")))
      throw new DomainException(HttpStatus.BAD_REQUEST, "Invalid sort field or direction.");
    return PageRequest.of(
        page, size, Sort.by(Sort.Direction.fromString(direction), sort).and(Sort.by("id")));
  }
}
