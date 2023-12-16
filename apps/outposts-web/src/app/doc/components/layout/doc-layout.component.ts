import {Component} from '@angular/core';

@Component({
  selector: 'app-doc-layout',
  template: `
      <div #dashboardMain class="flex-1 min-w-0">
          <ng-content></ng-content>
      </div>
      <app-doc-toc [contentSourceContent]="dashboardMain"></app-doc-toc>
  `,
  host: {
    class: 'flex'
  }
})
export class DocLayoutComponent {
}
