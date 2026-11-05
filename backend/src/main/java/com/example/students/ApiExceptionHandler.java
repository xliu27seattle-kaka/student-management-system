package com.example.students;

import jakarta.validation.ConstraintViolationException;
import java.util.*;
import org.slf4j.*;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(DomainException.class)
  ResponseEntity<ProblemDetail> domain(DomainException ex) {
    return problem(ex.status, ex.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException ex) {
    var p =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST, "Please correct the highlighted fields.");
    Map<String, String> fields = new TreeMap<>();
    ex.getBindingResult()
        .getFieldErrors()
        .forEach(e -> fields.putIfAbsent(e.getField(), e.getDefaultMessage()));
    p.setProperty("errors", fields);
    return ResponseEntity.badRequest().body(p);
  }

  @ExceptionHandler({
    ConstraintViolationException.class,
    HandlerMethodValidationException.class,
    MethodArgumentTypeMismatchException.class,
    HttpMessageNotReadableException.class,
    MissingServletRequestParameterException.class
  })
  ResponseEntity<ProblemDetail> badRequest(Exception ex) {
    return problem(HttpStatus.BAD_REQUEST, "Invalid request parameters or body.");
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ProblemDetail> duplicate(DataIntegrityViolationException ex) {
    return problem(
        HttpStatus.CONFLICT,
        "A unique value is already in use or a related record has changed. Refresh and try again.");
  }

  @ExceptionHandler(PessimisticLockingFailureException.class)
  ResponseEntity<ProblemDetail> busy(Exception ex) {
    return problem(HttpStatus.CONFLICT, "This record is busy. Please try again.");
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ProblemDetail> unexpected(Exception ex) {
    if (ex instanceof ErrorResponse response) {
      return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
    }
    log.error("Unexpected request failure", ex);
    return problem(
        HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again.");
  }

  private ResponseEntity<ProblemDetail> problem(HttpStatus status, String detail) {
    return ResponseEntity.status(status).body(ProblemDetail.forStatusAndDetail(status, detail));
  }
}
