package com.example.students;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import org.junit.jupiter.api.*;
import org.springframework.boot.test.web.client.MockServerRestTemplateCustomizer;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.MediaType;

class WeatherServiceTest {
  MockServerRestTemplateCustomizer customizer;
  WeatherService service;

  @BeforeEach
  void setup() {
    customizer = new MockServerRestTemplateCustomizer();
    service =
        new WeatherService(
            new RestTemplateBuilder(customizer),
            "https://weather.test/forecast",
            "https://weather.test/search");
  }

  @Test
  void mapsCurrentWeatherAndLocalDate() {
    customizer
        .getServer()
        .expect(requestTo(org.hamcrest.Matchers.containsString("latitude=38.9072")))
        .andRespond(
            withSuccess(
                "{\"timezone\":\"America/New_York\",\"current\":{\"time\":\"2026-11-05T12:00\",\"temperature_2m\":18.5,\"weather_code\":3,\"is_day\":1}}",
                MediaType.APPLICATION_JSON));
    var w = service.current(38.9072, -77.0369);
    assertEquals(18.5, w.temperature());
    assertEquals("2026-11-05T12:00", w.localTime());
    customizer.getServer().verify();
  }

  @Test
  void weatherOutageIsServiceUnavailable() {
    customizer.getServer().expect(anything()).andRespond(withServerError());
    assertEquals(
        503, assertThrows(DomainException.class, () -> service.current(0, 0)).status.value());
  }

  @Test
  void emptyCityResultsAreSupported() {
    customizer
        .getServer()
        .expect(anything())
        .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
    assertTrue(service.cities("Unknown").isEmpty());
  }

  @Test
  void malformedWeatherFailsGracefully() {
    customizer
        .getServer()
        .expect(anything())
        .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
    assertEquals(
        503, assertThrows(DomainException.class, () -> service.current(0, 0)).status.value());
  }
}
