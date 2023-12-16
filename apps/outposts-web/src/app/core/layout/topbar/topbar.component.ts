import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  HostListener, inject,
  Inject, Input,
  OnDestroy,
  Renderer2,
  signal
} from '@angular/core';
import {CommonModule, DOCUMENT} from "@angular/common";
import {Router, RouterLink} from "@angular/router";
import {AppConfigService} from "../../servces/app-config.service";
import {DomHandler} from "primeng/dom";
import {FormsModule} from "@angular/forms";
import {StyleClassModule} from "primeng/styleclass";
import {WINDOW} from "@app/core/providers/window";

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    StyleClassModule,
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnDestroy {
  @Input() showMenuButton = true;

  scrollListener: VoidFunction | undefined;

  private readonly document = inject(DOCUMENT);
  private readonly el = inject(ElementRef);
  private readonly render = inject(Renderer2);
  private readonly router = inject(Router);
  private readonly configService = inject(AppConfigService);
  private readonly window = inject(WINDOW);


  constructor(
  ) {
    afterNextRender(() => {
      this.bindScrollListener();
    })
  }

  toggleMenu() {
    if (this.configService.state.menuActive) {
      this.configService.hideMenu();
      DomHandler.unblockBodyScroll('blocked-scroll');
    } else {
      this.configService.showMenu();
      DomHandler.blockBodyScroll('blocked-scroll');
    }
  }

  bindScrollListener () {
    if (!this.scrollListener) {
      this.scrollListener = this.render.listen(this.window, 'scroll', () => {
        if (this.window.scrollY > 0) {
          this.el.nativeElement.children[0].classList.add('layout-topbar-sticky');
        } else {
          this.el.nativeElement.children[0].classList.remove('layout-topbar-sticky');
        }
      })
    }
  }

  unbindScrollListener () {
    if (this.scrollListener) {
      this.scrollListener();
      this.scrollListener = undefined;
    }
  }

  ngOnDestroy() {
    this.unbindScrollListener();
  }
}
