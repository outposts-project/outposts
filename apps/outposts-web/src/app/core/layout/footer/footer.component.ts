import {Component} from '@angular/core';
import {environment} from "../../../../environments/environment";

@Component({
  selector: 'app-footer',
  standalone: true,
  styleUrl: './footer.component.scss',
  template: `
    <div class="layout-footer">
      <div>
        <a href="https://github.com/lonelyhentxi/outposts">Outposts</a>
        <span> {{ version }}, </span>
        <span>theme powered by </span>
        <a href="https://primeng.org/">PrimeNG</a>
      </div>
    </div>
  `
})
export class AppFooterComponent {
  version = environment.APP_VERSION;
}
