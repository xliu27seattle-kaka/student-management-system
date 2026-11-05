package com.example.students;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class WeatherService {
  private final RestTemplate client;
  private final String forecastUrl;
  private final String geocodingUrl;

  public WeatherService(
      RestTemplateBuilder builder,
      @Value("${weather.forecast-url}") String forecastUrl,
      @Value("${weather.geocoding-url}") String geocodingUrl) {
    client =
        builder.connectTimeout(Duration.ofSeconds(3)).readTimeout(Duration.ofSeconds(5)).build();
    this.forecastUrl = forecastUrl;
    this.geocodingUrl = geocodingUrl;
  }

  public record Location(
      String name, String region, String country, double latitude, double longitude) {}

  public record Weather(
      String localTime, String timezone, double temperature, int weatherCode, boolean isDay) {}

  public List<Location> cities(String name) {
    var uri =
        UriComponentsBuilder.fromUriString(geocodingUrl)
            .queryParam("name", name)
            .queryParam("count", 5)
            .queryParam("language", "en")
            .queryParam("format", "json")
            .build()
            .encode()
            .toUri();
    JsonNode root = get(uri);
    List<Location> locations = new ArrayList<>();
    for (JsonNode r : root.path("results"))
      locations.add(
          new Location(
              r.path("name").asText(),
              r.path("admin1").asText(),
              r.path("country").asText(),
              r.path("latitude").asDouble(),
              r.path("longitude").asDouble()));
    return locations;
  }

  public Weather current(double latitude, double longitude) {
    var uri =
        UriComponentsBuilder.fromUriString(forecastUrl)
            .queryParam("latitude", latitude)
            .queryParam("longitude", longitude)
            .queryParam("current", "temperature_2m,weather_code,is_day")
            .queryParam("timezone", "auto")
            .build()
            .encode()
            .toUri();
    JsonNode root = get(uri);
    JsonNode current = root.path("current");
    if (!current.hasNonNull("time")
        || !current.hasNonNull("temperature_2m")
        || !current.hasNonNull("weather_code")) throw unavailable();
    return new Weather(
        current.path("time").asText(),
        root.path("timezone").asText(),
        current.path("temperature_2m").asDouble(),
        current.path("weather_code").asInt(),
        current.path("is_day").asInt() == 1);
  }

  private JsonNode get(java.net.URI uri) {
    try {
      JsonNode response = client.getForObject(uri, JsonNode.class);
      if (response == null) throw unavailable();
      return response;
    } catch (RestClientException ex) {
      throw unavailable();
    }
  }

  private DomainException unavailable() {
    return new DomainException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "Weather is temporarily unavailable. Please try again later.");
  }
}
