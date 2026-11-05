package com.example.students;

import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/weather")
@Validated
public class WeatherController {
  private final WeatherService service;

  public WeatherController(WeatherService service) {
    this.service = service;
  }

  @GetMapping("/cities")
  public List<WeatherService.Location> cities(@RequestParam @Size(min = 2, max = 100) String name) {
    return service.cities(name);
  }

  @GetMapping
  public WeatherService.Weather current(
      @RequestParam(defaultValue = "38.9072") @DecimalMin("-90") @DecimalMax("90") double latitude,
      @RequestParam(defaultValue = "-77.0369") @DecimalMin("-180") @DecimalMax("180")
          double longitude) {
    return service.current(latitude, longitude);
  }
}
