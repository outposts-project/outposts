import {CommonModule} from '@angular/common';
import {Component, inject, Input} from '@angular/core';
import {Router, RouterModule} from '@angular/router';
import {StyleClassModule} from 'primeng/styleclass';
import type {MenuEntry} from './menu.defs';

@Component({
  selector: '[app-menuitem]',
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  standalone: true,
  imports: [CommonModule, StyleClassModule, RouterModule],
  host: {
    class: 'layout-menuitem',
    '[class.layout-menuitem-root]': 'root',
  },
})
export class MenuItemComponent {
  @Input() item!: MenuEntry;

  @Input() root: boolean = true;

  private readonly router = inject(Router);

  isActiveRootMenuItem(menuitem: MenuEntry): boolean {
    try {
      const url = new URL(this.router.url);
      const pathname = url.pathname;
      return !!menuitem.children &&
        !menuitem.children.some((item) => item.routerLink === pathname || (
          !!item.children && item.children.some((it) => it.routerLink === pathname)));
    } catch {
      return false;
    }
  }
}
