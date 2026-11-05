import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService, errorMessage } from './api.service';
import { Location, Weather } from './models';

export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return ['', 'Mainly clear', 'Partly cloudy', 'Overcast'][code];
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorms';
}
@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `<section class="weather-panel" aria-label="Local weather">
    <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
      <div>
        <div class="eyebrow">YOUR CAMPUS DAY</div>
        <h2 class="h6 mt-2 mb-1">{{ city() }}</h2>
        @if (weather(); as w) {
          <div class="small text-secondary">
            {{ w.localTime | date: 'EEEE, MMM d, y' }} · {{ w.timezone }}
          </div>
          <div class="mt-2">
            <strong class="fs-4">{{ w.temperature | number: '1.0-1' }}°C</strong
            ><span class="ms-2">{{ label(w.weatherCode) }}</span>
          </div>
        }
      </div>
      <button
        class="btn btn-sm btn-outline-secondary"
        (click)="expanded.set(!expanded())"
        [attr.aria-expanded]="expanded()"
      >
        Change location
      </button>
    </div>
    @if (busy()) {
      <p role="status" class="small mt-2 mb-0">Loading weather…</p>
    }
    @if (error()) {
      <p role="status" class="small text-danger mt-2 mb-0">
        {{ error() }}
        <button class="btn btn-link btn-sm p-0" (click)="load(latitude, longitude)">Retry</button>
      </p>
    }
    @if (expanded()) {
      <form (ngSubmit)="search()" class="d-flex gap-2 mt-3">
        <input
          class="form-control form-control-sm"
          aria-label="City name"
          name="city"
          [(ngModel)]="query"
          placeholder="Search a city"
          minlength="2"
          maxlength="100"
          required
        /><button
          class="btn btn-sm btn-primary"
          [disabled]="searching() || query.trim().length < 2"
        >
          Search
        </button>
      </form>
      <button class="btn btn-link btn-sm ps-0" (click)="locate()" [disabled]="locating()">
        {{ locating() ? 'Locating…' : 'Use my location' }}
      </button>
      <span class="small text-secondary">Location is used only to request weather.</span>
      @if (searchError()) {
        <p class="small text-danger" role="status">{{ searchError() }}</p>
      }
      @if (searched() && !cities().length && !searching() && !searchError()) {
        <p class="small">No cities found. Try a different name.</p>
      }
      <div class="list-group mt-1">
        @for (place of cities(); track $index) {
          <button class="list-group-item list-group-item-action small" (click)="select(place)">
            {{ place.name }}, {{ place.region }}, {{ place.country }}
          </button>
        }
      </div>
    }
    <div class="small text-secondary mt-2">
      Weather data: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>
    </div>
  </section>`,
})
export class WeatherComponent implements OnInit {
  private api = inject(ApiService);
  weather = signal<Weather | null>(null);
  city = signal('Washington, DC');
  error = signal('');
  busy = signal(false);
  expanded = signal(false);
  cities = signal<Location[]>([]);
  searching = signal(false);
  searched = signal(false);
  searchError = signal('');
  locating = signal(false);
  query = '';
  latitude = 38.9072;
  longitude = -77.0369;
  label = weatherLabel;
  private request = 0;
  ngOnInit() {
    this.load(this.latitude, this.longitude);
  }
  load(latitude: number, longitude: number) {
    this.latitude = latitude;
    this.longitude = longitude;
    const request = ++this.request;
    this.busy.set(true);
    this.error.set('');
    this.weather.set(null);
    this.api.weather(latitude, longitude).subscribe({
      next: (w) => {
        if (request === this.request) {
          this.weather.set(w);
          this.busy.set(false);
        }
      },
      error: (e) => {
        if (request === this.request) {
          this.error.set(errorMessage(e));
          this.busy.set(false);
        }
      },
    });
  }
  search() {
    if (this.query.trim().length < 2 || this.searching()) return;
    this.searching.set(true);
    this.searched.set(true);
    this.searchError.set('');
    this.cities.set([]);
    this.api
      .cities(this.query.trim())
      .pipe(finalize(() => this.searching.set(false)))
      .subscribe({
        next: (c) => this.cities.set(c),
        error: (e) => this.searchError.set(errorMessage(e)),
      });
  }
  select(place: Location) {
    this.city.set(`${place.name}, ${place.region || place.country}`);
    this.expanded.set(false);
    this.cities.set([]);
    this.load(place.latitude, place.longitude);
  }
  locate() {
    if (!navigator.geolocation) {
      this.searchError.set('Location is unavailable. Please search for a city.');
      return;
    }
    this.locating.set(true);
    this.searchError.set('');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        this.locating.set(false);
        this.city.set('Current location');
        this.expanded.set(false);
        this.load(p.coords.latitude, p.coords.longitude);
      },
      () => {
        this.locating.set(false);
        this.searchError.set('Could not access your location. Please search for a city.');
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }
}
