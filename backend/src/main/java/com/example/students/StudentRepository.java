package com.example.students;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface StudentRepository extends JpaRepository<Student, Long> {
  @Query(
      "select s from Student s where lower(s.name) like lower(concat('%',:q,'%')) or lower(s.email)"
          + " like lower(concat('%',:q,'%'))")
  Page<Student> search(String q, Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from Student s where s.id = :id")
  Optional<Student> lockById(Long id);

  boolean existsByEmailAndIdNot(String email, Long id);
}
