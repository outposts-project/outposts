import { Injectable } from '@angular/core';
import type { AppState } from '../defs/app-state.defs';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {

  state: AppState = {
    menuActive: false,
  };

  showMenu() {
    this.state.menuActive = true;
  }

  hideMenu() {
    this.state.menuActive = false;
  }
}
