import {inject, Injectable, DestroyRef, NgZone, EnvironmentInjector, signal, afterNextRender} from "@angular/core";
import {DocTableOfContentsLoader} from "@app/doc/services/doc-table-of-contents-loader.service";
import {DOCUMENT, ViewportScroller} from "@angular/common";
import {WINDOW} from "@app/core/providers/window";
import {auditTime, debounceTime, fromEvent, startWith} from "rxjs";
import {RESIZE_EVENT_DELAY, SCROLL_EVENT_DELAY} from "@app/core/defs/delay";
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {shouldReduceMotion} from "@app/core/utils/animation.utils";

@Injectable()
export class DocTableOfContentsScrollSpy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly tableOfContentsLoader = inject(DocTableOfContentsLoader);
  private readonly document = inject(DOCUMENT);
  private readonly window = inject(WINDOW);
  private readonly ngZone = inject(NgZone);
  private readonly viewportScroller = inject(ViewportScroller);
  private readonly injector = inject(EnvironmentInjector);
  private contentSourceElement: HTMLElement | null = null;
  private lastContentWidth = 0;

  activeItemId = signal<string | null>(null);
  scrollbarThumbOnTop = signal(true);

  startListeningToScroll (contentSourceElement: HTMLElement | null): void {
    this.contentSourceElement = contentSourceElement;
    this.lastContentWidth = this.getContentWidth();

    this.setScrollEventHandlers();
    this.setResizeEventHandlers();
  }

  scrollToTop () : void {
    this.viewportScroller.scrollToPosition([0, 0]);
  }

  scrollToSection (id: string): void {
    if (shouldReduceMotion()) {
      this.offsetToSection(id);
    } else {
      const section = this.document.getElementById(id);
      section?.scrollIntoView?.({ block: "start" });
      // We don't want to set the active item here, it would mess up the animation
      // The scroll event handler will handle it for us
    }
  }

  private offsetToSection (id: string) {
    const section = this.document.getElementById(id);
    section?.scrollIntoView?.({ block: 'start' });
    // Here we need to set the active item manually because scroll events might not be fired
    this.activeItemId.set(id);
  }

  private setResizeEventHandlers () {
    fromEvent(this.window, 'resize')
      .pipe(
        debounceTime(RESIZE_EVENT_DELAY),
        takeUntilDestroyed(this.destroyRef),
        startWith(undefined),
      ).subscribe(() => {
        this.ngZone.run(() => this.updateHeadingsTopAfterResize());
    });

    const docsViewer = this.contentSourceElement;
    if (docsViewer) {
      afterNextRender(() => {
        const resizeObserver = new ResizeObserver(() => this.updateHeadingsTopAfterResize());
        resizeObserver.observe(docsViewer);
        this.destroyRef.onDestroy(() => resizeObserver.disconnect());
      }, {
        injector: this.injector
      });
    }
  }

  private updateHeadingsTopAfterResize () {
    this.lastContentWidth = this.getContentWidth();
    const contentElement = this.contentSourceElement;
    if (contentElement) {
      this.tableOfContentsLoader.updateHeadingsTopValue(contentElement);
      this.setActiveItemId();
    }
  }

  private setScrollEventHandlers () {
    const scroll$ = fromEvent(this.document, 'scroll')
      .pipe(
        auditTime(SCROLL_EVENT_DELAY),
        takeUntilDestroyed(this.destroyRef)
      );

    this.ngZone.runOutsideAngular(() => {
      scroll$.subscribe(this.setActiveItemId.bind(this))
    })
  }

  private setActiveItemId () {
    const tableOfContentItems = this.tableOfContentsLoader.tableOfContentsItems;

    if (tableOfContentItems.length === 0) {
      return;
    }

    if (this.lastContentWidth !== this.getContentWidth()) {
      return;
    }

    const scrollOffset = this.getScrollOffset();

    if (scrollOffset === null) {
      return;
    }

    for (const [i, currentLink] of tableOfContentItems.entries()) {
      const nextLink = tableOfContentItems[i + 1];

      const isActive = scrollOffset >= currentLink.top && (!nextLink || nextLink.top >= scrollOffset);

      if (isActive && this.activeItemId() !== currentLink.id) {
        this.ngZone.run(() => this.activeItemId.set(currentLink.id));
        return;
      }
    }

    if (scrollOffset < tableOfContentItems[0].top && this.activeItemId() !== null) {
      this.ngZone.run(() => this.activeItemId.set(null));
    }

    const scrollOffsetZero = scrollOffset === 0;
    if (scrollOffsetZero !== this.scrollbarThumbOnTop()) {
      this.ngZone.run(() => this.scrollbarThumbOnTop.set(scrollOffsetZero));
    }
  }

  private getScrollOffset () {
    return this.window.scrollY;
  }

  private getContentWidth (): number {
    return this.document.body.clientWidth || Number.MAX_SAFE_INTEGER;
  }
}
