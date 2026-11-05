package com.example.students;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface CourseRepository extends JpaRepository<Course, Long> {
  @Query(
      "select c from Course c where lower(c.name) like lower(concat('%',:q,'%')) or lower(c.code)"
          + " like lower(concat('%',:q,'%'))")
  Page<Course> search(String q, Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from Course c where c.id = :id")
  Optional<Course> lockById(Long id);

  boolean existsByCodeAndIdNot(String code, Long id);
}
