package com.example.students;

import jakarta.persistence.*;

@Entity
@Table(name = "students")
public class Student {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  Long id;

  @Column(nullable = false, length = 100)
  String name;

  @Column(nullable = false, unique = true, length = 254)
  String email;

  protected Student() {}

  Student(String name, String email) {
    this.name = name;
    this.email = email;
  }
}
