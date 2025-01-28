import { afterNextRender, Component } from '@angular/core';
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
  standalone: false
})
export class AppComponent {
  constructor(
  ) {
    afterNextRender(() => {
      if (environment.production) {
        this.injectScripts();
      }
      setTimeout(() => {
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
      });

      this.bindRouteEvents();
    });
  }

  injectScripts() {
  }

  bindRouteEvents() { }
}
