import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { WorkspaceService } from './workspace.service';
import { WeatherComponent } from './weather.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, WeatherComponent],
  templateUrl: './app.html',
})
export class App {
  workspace = inject(WorkspaceService);
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.workspace.dirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
