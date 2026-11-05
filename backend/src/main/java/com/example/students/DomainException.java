package com.example.students;

import org.springframework.http.HttpStatus;

public class DomainException extends RuntimeException {
  final HttpStatus status;

  DomainException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  static DomainException missing(String type) {
    return new DomainException(HttpStatus.NOT_FOUND, type + " not found.");
  }

  static DomainException conflict(String message) {
    return new DomainException(HttpStatus.CONFLICT, message);
  }
}
