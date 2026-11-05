package com.example.students;

import static org.junit.jupiter.api.Assertions.*;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:migrations;DB_CLOSE_DELAY=-1")
class MigrationTest {
  @Autowired CourseRepository courses;
  @Autowired Flyway flyway;

  @Test
  void seedsTenCoursesOnceAndDoesNotRestoreDeletedCourses() {
    assertEquals(10, courses.count());
    assertTrue(courses.findAll().stream().allMatch(c -> c.capacity == 20));
    courses.deleteById(courses.findAll().getFirst().id);
    flyway.migrate();
    assertEquals(9, courses.count());
  }
}
