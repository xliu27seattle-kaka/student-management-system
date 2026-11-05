package com.example.students;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
  long countByCourseId(Long id);

  interface CourseEnrollmentCount {
    Long getCourseId();

    long getTotal();
  }

  @Query(
      "select e.course.id as courseId, count(e) as total from Enrollment e where e.course.id in"
          + " :courseIds group by e.course.id")
  List<CourseEnrollmentCount> countForCourses(List<Long> courseIds);

  boolean existsByStudentIdAndCourseId(Long studentId, Long courseId);

  Optional<Enrollment> findByStudentIdAndCourseId(Long studentId, Long courseId);

  @EntityGraph(attributePaths = {"student", "course"})
  List<Enrollment> findByStudentIdOrderById(Long id);

  @EntityGraph(attributePaths = {"student", "course"})
  List<Enrollment> findByCourseIdOrderById(Long id);

  @Modifying
  @Query("delete from Enrollment e where e.student.id = :id")
  void deleteForStudent(Long id);

  @Modifying
  @Query("delete from Enrollment e where e.course.id = :id")
  void deleteForCourse(Long id);
}
