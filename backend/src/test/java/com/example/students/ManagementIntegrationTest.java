package com.example.students;

import static com.example.students.ApiModels.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties =
        "spring.datasource.url=jdbc:h2:mem:integration;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000")
@AutoConfigureMockMvc
class ManagementIntegrationTest {
  @Autowired ManagementService service;
  @Autowired StudentRepository students;
  @Autowired CourseRepository courses;
  @Autowired EnrollmentRepository enrollments;
  @Autowired MockMvc mvc;

  @BeforeEach
  void clean() {
    enrollments.deleteAll();
    students.deleteAll();
    courses.deleteAll();
  }

  StudentView student(String name) {
    return service.saveStudent(null, new StudentInput(name, name.toLowerCase() + "@example.com"));
  }

  CourseView course(int capacity) {
    return service.saveCourse(null, new CourseInput("CS1", "Algorithms", "Introduction", capacity));
  }

  @Test
  void crudAndBothEnrollmentDirections() {
    var s = student("Ada");
    var c = course(20);
    service.enroll(s.id(), c.id());
    assertEquals(1, service.studentCourses(s.id()).size());
    assertEquals(s.id(), service.courseStudents(c.id()).getFirst().student().id());
    assertEquals(
        "Grace",
        service.saveStudent(s.id(), new StudentInput("Grace", "grace@example.com")).name());
    assertEquals(
        30,
        service.saveCourse(c.id(), new CourseInput("CS2", "Advanced", "Updated", 30)).capacity());
    service.withdraw(s.id(), c.id());
    assertEquals(0, service.course(c.id()).enrolledCount());
  }

  @Test
  void deletingStudentRetainsCourse() {
    var s = student("Ada");
    var c = course(20);
    service.enroll(s.id(), c.id());
    service.deleteStudent(s.id());
    assertEquals(0, enrollments.count());
    assertTrue(courses.existsById(c.id()));
    assertFalse(students.existsById(s.id()));
  }

  @Test
  void deletingCourseRetainsStudent() {
    var s = student("Ada");
    var c = course(20);
    service.enroll(s.id(), c.id());
    service.deleteCourse(c.id());
    assertEquals(0, enrollments.count());
    assertTrue(students.existsById(s.id()));
    assertFalse(courses.existsById(c.id()));
  }

  @Test
  void lastSeatCannotBeOverbooked() throws Exception {
    var a = student("Ada");
    var b = student("Grace");
    var c = course(1);
    var start = new CountDownLatch(1);
    var success = new AtomicInteger();
    var conflict = new AtomicInteger();
    try (var pool = Executors.newFixedThreadPool(2)) {
      List<Future<?>> futures = new ArrayList<>();
      for (Long id : List.of(a.id(), b.id()))
        futures.add(
            pool.submit(
                () -> {
                  try {
                    start.await();
                    service.enroll(id, c.id());
                    success.incrementAndGet();
                  } catch (DomainException ex) {
                    assertEquals(409, ex.status.value());
                    conflict.incrementAndGet();
                  } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(ex);
                  }
                }));
      start.countDown();
      for (var f : futures) f.get(15, TimeUnit.SECONDS);
    }
    assertEquals(1, success.get());
    assertEquals(1, conflict.get());
    assertEquals(1, enrollments.countByCourseId(c.id()));
  }

  @Test
  void failedCapacityChangeRollsBack() {
    var s = student("Ada");
    var c = course(20);
    service.enroll(s.id(), c.id());
    assertThrows(
        DomainException.class,
        () -> service.saveCourse(c.id(), new CourseInput("CS1", "Changed", "Changed", 0)));
    assertEquals("Algorithms", service.course(c.id()).name());
    assertEquals(20, service.course(c.id()).capacity());
  }

  @Test
  void validatesRequestsAndMissingRecords() throws Exception {
    mvc.perform(
            post("/api/students")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\",\"email\":\"bad\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.email").exists());
    mvc.perform(get("/api/students/999999")).andExpect(status().isNotFound());
    mvc.perform(get("/api/courses?size=0")).andExpect(status().isBadRequest());
    mvc.perform(get("/api/courses?sort=description")).andExpect(status().isBadRequest());
    mvc.perform(get("/api/weather?latitude=100")).andExpect(status().isBadRequest());
  }

  @Test
  void normalizesAndRejectsDuplicateEmailsAndCodes() {
    student("Ada");
    assertThrows(
        DomainException.class,
        () -> service.saveStudent(null, new StudentInput("Other", "ADA@example.com")));
    course(20);
    assertThrows(
        DomainException.class,
        () -> service.saveCourse(null, new CourseInput("cs1", "Other", "", 20)));
  }

  @Test
  void paginatesSearchResults() throws Exception {
    student("Ada");
    student("Grace");
    mvc.perform(get("/api/students?q=ada&size=1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].name").value("Ada"));
  }
}
