import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  HostListener,
  Inject, Input,
  OnDestroy,
  Renderer2,
  signal
} from '@angular/core';
import {CommonModule, DOCUMENT} from "@angular/common";
import {Router, RouterLink} from "@angular/router";
import {AppConfigService} from "../../app-config.service";
import {DomHandler} from "primeng/dom";
import {FormsModule} from "@angular/forms";
import {StyleClassModule} from "primeng/styleclass";

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

  private window: Window;


  constructor(
    @Inject(DOCUMENT) private document: Document,
    private el: ElementRef,
    private render: Renderer2,
    private router: Router,
    private configService: AppConfigService
  ) {
    this.window = this.document.defaultView as Window;

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
