import {afterNextRender, Component, DestroyRef, ElementRef, inject} from '@angular/core';
import {PrimeIcons} from "primeng/api";
import {ButtonModule} from "primeng/button";
import {StyleClassModule} from "primeng/styleclass";
import {MenuRoot} from "./menu.defs";
import {NavigationEnd, Router} from "@angular/router";
import {DomHandler} from "primeng/dom";
import {MenuItemComponent} from "./menu-item.component";
import {map, timer} from "rxjs";
import {AppConfigService} from "../../servces/app-config.service";
import {CommonModule} from "@angular/common";
import {AutoCompleteModule} from "primeng/autocomplete";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    StyleClassModule,
    AutoCompleteModule,
    MenuItemComponent
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  host: {
    class: 'layout-sidebar',
    '[class.active]': 'isActive'
  },
})
export class MenuComponent {
  private readonly configService = inject(AppConfigService);
  private readonly el = inject(ElementRef);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // visible = true;

  menu: MenuRoot = [{
    name: 'confluence',
    icon: PrimeIcons.TABLE,
    children: [
      {
        name: 'dashboard',
        routerLink: '/confluence/dashboard'
      }
    ]
  }];

  constructor() {
    afterNextRender(() => {
      timer(1)
        .pipe(
          map(this.scrollToActiveItem.bind(this)),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe();

      this.router
        .events
        .pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe((event) => {
        if (event instanceof NavigationEnd && this.configService.state.menuActive) {
          this.configService.hideMenu();
          DomHandler.unblockBodyScroll('blocked-scroll');
        }
      })
    });
  }

  scrollToActiveItem() {
    let activeItem = DomHandler.findSingle(this.el.nativeElement, '.router-link-active');
    if (activeItem && !this.isInViewport(activeItem)) {
      activeItem.scrollIntoView({block: 'center'});
    }
  }

  get isActive(): boolean {
    return !!this.configService.state.menuActive;
  }

  isInViewport(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
  }
}
