package com.example.students;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "enrollments",
    uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "course_id"}))
public class Enrollment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "student_id")
  Student student;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "course_id")
  Course course;

  @Column(nullable = false)
  Instant enrolledAt;

  protected Enrollment() {}

  Enrollment(Student student, Course course) {
    this.student = student;
    this.course = course;
    this.enrolledAt = Instant.now();
  }
}
