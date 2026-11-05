package com.example.students;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;

public final class ApiModels {
  private ApiModels() {}

  public record StudentInput(
      @NotBlank @Size(max = 100) String name, @NotBlank @Email @Size(max = 254) String email) {}

  public record CourseInput(
      @NotBlank @Pattern(regexp = "[A-Za-z0-9-]{1,20}") String code,
      @NotBlank @Size(max = 100) String name,
      @NotNull @Size(max = 1000) String description,
      @NotNull @Min(1) @Max(100000) Integer capacity) {}

  public record StudentView(Long id, String name, String email) {
    static StudentView of(Student s) {
      return new StudentView(s.id, s.name, s.email);
    }
  }

  public record CourseView(
      Long id, String code, String name, String description, int capacity, long enrolledCount) {}

  public record EnrollmentView(
      Long id, StudentView student, CourseView course, Instant enrolledAt) {}

  public record PageView<T>(
      List<T> content, long totalElements, int totalPages, int number, int size) {
    static <T> PageView<T> of(Page<T> page) {
      return new PageView<>(
          page.getContent(),
          page.getTotalElements(),
          page.getTotalPages(),
          page.getNumber(),
          page.getSize());
    }
  }
}
