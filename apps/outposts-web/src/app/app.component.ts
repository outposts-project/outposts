import {Component, inject, signal} from '@angular/core';
import {AppConfigService} from "./core/servces/app-config.service";
import {DomHandler} from "primeng/dom";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly title = 'outposts-web';

  private readonly configService = inject(AppConfigService);

  readonly colorSchema = signal('light');

  get isMenuActive (): boolean {
    return !!this.configService.state.menuActive;
  }

  hideMenu () {
    this.configService.hideMenu();
    DomHandler.unblockBodyScroll('blocked-scroll');
  }
}
