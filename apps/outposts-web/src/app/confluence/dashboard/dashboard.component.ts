import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `
    <app-doc-layout>
      <app-doc-section src="assets/md/examples/note1.md"></app-doc-section>
      <app-doc-section src="assets/md/examples/note9.md"></app-doc-section>
    </app-doc-layout>
  `
})
export class DashboardComponent {
}
