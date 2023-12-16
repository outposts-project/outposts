import {afterNextRender, Component, ElementRef, OnDestroy} from '@angular/core';
import {PrimeIcons} from "primeng/api";
import {ButtonModule} from "primeng/button";
import {StyleClassModule} from "primeng/styleclass";
import {MenuRoot} from "./menu.defs";
import {NavigationEnd, Router} from "@angular/router";
import {DomHandler} from "primeng/dom";
import {MenuItemComponent} from "./menu-item.component";
import {map, Subscription, timer} from "rxjs";
import {AppConfigService} from "../../app-config.service";
import {CommonModule} from "@angular/common";
import {AutoCompleteModule} from "primeng/autocomplete";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";

@UntilDestroy()
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
export class MenuComponent implements OnDestroy {
  visible = true;
  menu!: MenuRoot;

  private routerSubscription?: Subscription;

  constructor(
    private configService: AppConfigService,
    private el: ElementRef,
    private router: Router,
  ) {
    this.menu = [{
      name: 'confluence',
      icon: PrimeIcons.TABLE,
      children: [
        {
          name: 'dashboard',
          routerLink: '/confluence/dashboard'
        }
      ]
    }]

    afterNextRender(() => {
      timer(1)
        .pipe(
          map(this.scrollToActiveItem.bind(this)),
          untilDestroyed(this)
        ).subscribe();

      this.routerSubscription = this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd && this.configService.state.menuActive) {
          this.configService.hideMenu();
          DomHandler.unblockBodyScroll('blocked-scroll');
        }
      })
    });
  }

  scrollToActiveItem () {
    let activeItem = DomHandler.findSingle(this.el.nativeElement, '.router-link-active');
    if (activeItem && !this.isInViewport(activeItem)) {
      activeItem.scrollIntoView({ block: 'center' });
    }
  }

  get isActive (): boolean {
    return !!this.configService.state.menuActive;
  }

  isInViewport (element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
      this.routerSubscription = undefined;
    }
  }
}
