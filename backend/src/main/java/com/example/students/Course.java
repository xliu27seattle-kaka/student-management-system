package com.example.students;

import jakarta.persistence.*;

@Entity
@Table(name = "courses")
public class Course {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  Long id;

  @Column(nullable = false, unique = true, length = 20)
  String code;

  @Column(nullable = false, length = 100)
  String name;

  @Column(nullable = false, length = 1000)
  String description;

  @Column(nullable = false)
  int capacity;

  protected Course() {}

  Course(String code, String name, String description, int capacity) {
    this.code = code;
    this.name = name;
    this.description = description;
    this.capacity = capacity;
  }
}
