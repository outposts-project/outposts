import { Component, inject, signal } from '@angular/core';
import { AppConfigService } from './core/servces/app-config.service';
import { DomHandler } from 'primeng/dom';
import { AppOverlayService } from './core/servces/app-overlay.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly configService = inject(AppConfigService);
  readonly overlayService = inject(AppOverlayService);

  readonly title = 'outposts-web';

  readonly colorSchema = signal('light');

  get isMenuActive(): boolean {
    return !!this.configService.state.menuActive;
  }

  hideMenu() {
    this.configService.hideMenu();
    DomHandler.unblockBodyScroll('blocked-scroll');
  }
}
